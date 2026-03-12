'use client'

import React from 'react'
import { useAuth } from './AuthContext'
import { useLanguage } from './LanguageContext'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { signInWithGoogle } = useAuth()
    const { t } = useLanguage()

    if (!isOpen) return null

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div className="modal-content animate-fade-in-up" style={{
                background: 'var(--bg-card)', padding: '2rem',
                borderRadius: 'var(--radius-2xl)', maxWidth: '400px', width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                textAlign: 'center', border: '1px solid var(--border-color)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '32px',
                    background: 'var(--blue-50)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem auto'
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>lock</span>
                </div>
                
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                    {t('auth.login_required_title')}
                </h3>
                
                <p style={{ color: 'var(--text-light)', marginBottom: '2rem', lineHeight: 1.5 }}>
                    {t('auth.login_required_desc')}
                </p>

                <button 
                    onClick={() => {
                        signInWithGoogle()
                        onClose()
                    }}
                    style={{
                        width: '100%', padding: '0.875rem', borderRadius: 'var(--radius-xl)',
                        background: 'var(--primary)', color: 'white', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.75rem', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
                    {t('auth.login_google')}
                </button>

                <button 
                    onClick={onClose}
                    style={{
                        marginTop: '1rem', background: 'none', border: 'none',
                        color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    Vazgeç
                </button>
            </div>
        </div>
    )
}
