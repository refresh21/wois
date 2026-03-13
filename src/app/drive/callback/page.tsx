'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastContext'
import { useAuth } from '@/components/AuthContext'
import { supabase } from '@/lib/supabase'

export default function DriveCallbackPage() {
    const router = useRouter()
    const { showToast } = useToast()
    const { user } = useAuth()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const error = params.get('error')

        if (error) {
            showToast('Google Drive authorization failed: ' + error, 'error')
            router.push('/')
            return
        }

        if (code) {
            // Exchange code for tokens
            fetch('/api/drive/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            })
                .then(res => res.json())
                .then(async tokens => {
                    if (tokens.access_token) {
                        localStorage.setItem('google_access_token', tokens.access_token)
                        localStorage.setItem('google_token_expiry', String(Date.now() + tokens.expires_in * 1000))
                        
                        if (tokens.refresh_token) {
                            localStorage.setItem('google_refresh_token', tokens.refresh_token)
                            
                            // Save to Supabase for persistence
                            if (user) {
                                await supabase
                                    .from('user_settings')
                                    .upsert({
                                        user_id: user.id,
                                        google_refresh_token: tokens.refresh_token,
                                        google_drive_connected: true,
                                        updated_at: new Date().toISOString()
                                    })
                            }
                        }
                        
                        router.push('/drive')
                    } else {
                        showToast('Token exchange failed', 'error')
                        router.push('/')
                    }
                })
                .catch(err => {
                    showToast('Error: ' + err.message, 'error')
                    router.push('/')
                })
        } else {
            router.push('/')
        }
    }, [router])

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-body)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>cloud_sync</span>
                <p style={{ fontWeight: 600 }}>Google Drive'a bağlanılıyor...</p>
            </div>
        </div>
    )
}
