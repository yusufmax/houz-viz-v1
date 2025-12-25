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

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
        })

        // Race between actual auth check and timeout
        Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
        ])
            .then((result: any) => {
                if (!mounted) return
                // Check if result is from getSession (has data property)
                if (result && result.data) {
                    const { session } = result.data
                    setSession(session)
                    setUser(session?.user ?? null)
                }
            })
            .catch((err) => {
                console.warn("Auth check failed or timed out:", err)
                if (mounted) setError(err instanceof Error ? err : new Error(String(err)))
                // Even on error, we must stop loading to show the app (likely Login page)
            })
            .finally(() => {
                if (mounted) setLoading(false)
            })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (mounted) {
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle();
                    setProfile(profile);
                } else {
                    setProfile(null);
                }

                setLoading(false)
            }
        })

        const fetchProfile = async (userId: string) => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            if (mounted) setProfile(data);
        }

        // Initial fetch
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted && session?.user) {
                fetchProfile(session.user.id);
            }
        });

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

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
