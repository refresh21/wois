'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

export default function Sidebar() {
    const pathname = usePathname()
    const { user, userName, userAvatar, signInWithGoogle, signOut, loading } = useAuth()

    const navItems = [
        { href: '/', label: 'Dashboard', icon: 'space_dashboard' },
        { href: '/record', label: 'Voice Notes', icon: 'mic' },
        { href: '/upload', label: 'Upload', icon: 'upload_file' },
        { href: '/summarize', label: 'Summarize', icon: 'auto_awesome' },
        { href: '/memory', label: 'Memory', icon: 'inventory_2' },
        { href: '/drive', label: 'Google Drive', icon: 'cloud' },
    ]

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <span className="logo-text" style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.05em', marginLeft: '0.5rem' }}>Wois</span>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Profile */}
            <div className="sidebar-profile">
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div className="profile-avatar">
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>...</span>
                        </div>
                        <div className="profile-info">
                            <p className="profile-name">Yükleniyor...</p>
                        </div>
                    </div>
                ) : user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%' }}>
                        {userAvatar ? (
                            <img
                                src={userAvatar}
                                alt=""
                                style={{ width: '2rem', height: '2rem', borderRadius: '9999px', objectFit: 'cover', flexShrink: 0 }}
                            />
                        ) : (
                            <div className="profile-avatar">
                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{userName?.[0]?.toUpperCase() || 'U'}</span>
                            </div>
                        )}
                        <div className="profile-info" style={{ flex: 1, minWidth: 0 }}>
                            <p className="profile-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || 'User'}</p>
                            <p className="profile-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                        </div>
                        <button
                            onClick={signOut}
                            title="Çıkış yap"
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem', height: '1.75rem', borderRadius: 'var(--radius-default)', color: 'var(--text-light)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>logout</span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={signInWithGoogle}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%',
                            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-lg)',
                            background: 'var(--primary)', color: 'var(--primary-invert)',
                            fontWeight: 600, fontSize: '0.8125rem', border: 'none', cursor: 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>login</span>
                        Google ile Giriş Yap
                    </button>
                )}
            </div>
        </aside>
    )
}
