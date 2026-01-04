import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    error: Error | null
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
    profile: any | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let mounted = true;
        let initialLoadDone = false;

        // Safety timeout: Never let the app hang on "Loading..." for more than 4 seconds
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth loading safety timeout reached.");
                setLoading(false);
            }
        }, 4000);

        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (mounted) {
                    if (error) console.error("Error fetching profile:", error);
                    setProfile(data);
                }
            } catch (err) {
                console.error("Profile fetch failed:", err);
            } finally {
                if (mounted) {
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                }
            }
        };

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session) {
                    await fetchProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Auth init failed:", err);
                if (mounted) setLoading(false);
            } finally {
                initialLoadDone = true;
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            // Only act if this is a meaningful change after the initial load,
            // or if the event is specifically SIGNED_IN/SIGNED_OUT.
            if (initialLoadDone || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setSession(session);
                setUser(session?.user ?? null);

                if (session) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                }
            }
        });

        initAuth();

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        }
    }, []);

    // Real-time listener for profile changes (Bans, Deletions)
    useEffect(() => {
        let mounted = true;
        if (!user) return;

        const channel = supabase
            .channel(`profile-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    if (mounted) {
                        if (payload.eventType === 'DELETE') {
                            setProfile(null);
                        } else {
                            setProfile(payload.new);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const signInWithGoogle = async () => {
        // Use production URL if available, fallback to current origin
        const redirectUrl = window.location.hostname === 'localhost'
            ? `${window.location.origin}/`
            : `${window.location.origin}/`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        })
        if (error) throw error
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, error, signInWithGoogle, signOut, profile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
