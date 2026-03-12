'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { useToast } from '@/components/ToastContext'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    userName: string
    userAvatar: string
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    userName: '',
    userAvatar: '',
    signInWithGoogle: async () => { },
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const { showToast } = useToast()

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)

            // Store Google OAuth provider token for Drive access
            if (session?.provider_token) {
                localStorage.setItem('google_access_token', session.provider_token)
                // Set expiry to 1 hour from now
                localStorage.setItem('google_token_expiry', String(Date.now() + 3600000))
            }
            if (session?.provider_refresh_token) {
                localStorage.setItem('google_refresh_token', session.provider_refresh_token)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''
    const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
                scopes: 'https://www.googleapis.com/auth/drive.file',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
        if (error) {
            console.error('Google sign-in error:', error)
            showToast('Giriş hatası: ' + error.message, 'error')
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        localStorage.removeItem('google_access_token')
        localStorage.removeItem('google_refresh_token')
        localStorage.removeItem('google_token_expiry')
        setUser(null)
        setSession(null)
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, userName, userAvatar, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
