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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (!session) {
                    setProfile(null);
                    setLoading(false);
                }
            }
        });

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        }
    }, []);

    // Fetch profile whenever the user ID changes and listen for real-time updates
    useEffect(() => {
        let mounted = true;
        if (!user) return;

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (mounted) {
                    if (error) {
                        console.error("Error fetching profile:", error);
                    }
                    setProfile(data);
                }
            } catch (err) {
                console.error("Profile fetch failed:", err);
            }
        };

        fetchProfile();

        // Subscribe to real-time changes
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
