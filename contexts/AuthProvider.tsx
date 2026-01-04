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
    profile: any | null | undefined
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<any | null | undefined>(undefined)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (mounted) {
                    if (error) console.error("Error fetching profile:", error);
                    setProfile(data || null); // explicit null if not found
                }
            } catch (err) {
                console.error("Profile fetch failed:", err);
                if (mounted) setProfile(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        const handleAuthChange = async (session: Session | null) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);

            if (session) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        };

        // Get initial session and then listen for changes
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthChange(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuthChange(session);
        });

        // Safety timeout to prevent infinite Loading...
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth loading safety timeout reached.");
                setLoading(false);
            }
        }, 5000);

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
