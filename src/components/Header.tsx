'use client'

import React from 'react'
import { useSidebar } from '@/components/SidebarContext'
import { useLanguage } from '@/components/LanguageContext'

export default function Header() {
    const { toggleSidebar, isOpen, isMobile } = useSidebar()
    const { locale, setLocale } = useLanguage()

    return (
        <header className="header" style={{
            height: '64px',
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            justifyContent: 'space-between'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                    onClick={toggleSidebar}
                    className="sidebar-toggle"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </div>

            {/* Logo area - only visible when sidebar is collapsed or on mobile */}
            {(!isOpen || isMobile) && (
                <div style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    fontWeight: 900,
                    fontSize: '1.875rem',
                    letterSpacing: '-0.05em',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    Wois
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
                    style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '2rem',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>translate</span>
                    {locale === 'tr' ? 'English' : 'Türkçe'}
                </button>
            </div>
        </header>
    )
}
