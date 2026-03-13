'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

interface DriveFile {
    id: string
    name: string
    mimeType: string
    size?: string
    createdTime: string
    webViewLink?: string
    webContentLink?: string
    thumbnailLink?: string
}

export default function DrivePage() {
    const [connected, setConnected] = useState(false)
    const [loading, setLoading] = useState(true)
    const [files, setFiles] = useState<DriveFile[]>([])
    const [folderId, setFolderId] = useState<string | null>(null)

    useEffect(() => { checkConnection() }, [])

    const checkConnection = async () => {
        const token = localStorage.getItem('google_access_token')
        const expiry = localStorage.getItem('google_token_expiry')
        const refreshToken = localStorage.getItem('google_refresh_token')

        if (token && expiry && Date.now() < parseInt(expiry)) { 
            setConnected(true); 
            fetchFiles(token) 
            return;
        }

        if (refreshToken) {
            console.log('Token expired, attempting refresh in Drive page...')
            try {
                const res = await fetch('/api/drive/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                })
                const data = await res.json()
                if (data.access_token) {
                    localStorage.setItem('google_access_token', data.access_token)
                    localStorage.setItem('google_token_expiry', String(Date.now() + data.expires_in * 1000))
                    if (data.refresh_token) {
                        localStorage.setItem('google_refresh_token', data.refresh_token)
                    }
                    setConnected(true)
                    fetchFiles(data.access_token)
                    return
                }
            } catch (err) {
                console.error('Failed to refresh google token in Drive page:', err)
            }
        }

        setConnected(false); 
        setLoading(false);
    }

    const connectDrive = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const redirectUri = `${window.location.origin}/drive/callback`
        const scope = 'https://www.googleapis.com/auth/drive.file'
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`
    }

    const disconnectDrive = () => {
        localStorage.removeItem('google_access_token'); localStorage.removeItem('google_refresh_token'); localStorage.removeItem('google_token_expiry')
        setConnected(false); setFiles([])
    }

    const fetchFiles = async (token: string) => {
        setLoading(true)
        try {
            const res = await fetch('/api/drive/upload', { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json(); setFiles(data.files || []); setFolderId(data.folderId)
        } catch (err) { console.error('Failed to fetch Drive files:', err) }
        setLoading(false)
    }

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
    const formatSize = (bytes?: string) => { if (!bytes) return ''; const b = parseInt(bytes); if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB' }
    const getIcon = (mimeType: string) => { if (mimeType.startsWith('audio/')) return 'audio_file'; if (mimeType.startsWith('image/')) return 'image'; if (mimeType.startsWith('video/')) return 'video_file'; if (mimeType === 'application/pdf') return 'picture_as_pdf'; return 'insert_drive_file' }

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                <div className="page-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-invert)', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>cloud</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Google Drive</h2>
                    </div>

                    {!connected ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '5rem', color: 'var(--text-light)', display: 'block', marginBottom: '1.5rem' }}>cloud_off</span>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Google Drive'a Bağlan</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                                Kayıtlarını ve notlarını Google Drive'da otomatik olarak yedekle
                            </p>
                            <button onClick={connectDrive} className="btn-primary" style={{ display: 'inline-flex', gap: '0.75rem', padding: '0.75rem 2rem', fontSize: '1rem' }}>
                                <span className="material-symbols-outlined">link</span> Google Drive'a Bağlan
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '9999px', backgroundColor: '#22c55e' }}></div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Connected</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => fetchFiles(localStorage.getItem('google_access_token')!)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span> Refresh
                                    </button>
                                    <button onClick={disconnectDrive}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', fontSize: '0.8125rem', fontWeight: 600, color: '#dc2626' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>link_off</span> Disconnect
                                    </button>
                                </div>
                            </div>

                            {folderId && (
                                <a href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                                    <div style={{
                                        padding: '0.875rem 1.125rem', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', cursor: 'pointer', transition: 'background 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}>
                                        <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>folder</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>Wois</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginLeft: 'auto' }}>{files.length} files</span>
                                        <span className="material-symbols-outlined" style={{ color: 'var(--text-light)', fontSize: '1.125rem', marginLeft: '0.5rem' }}>open_in_new</span>
                                    </div>
                                </a>
                            )}

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>hourglass_empty</span>Loading...
                                </div>
                            ) : files.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }}>cloud_queue</span>
                                    <p style={{ fontWeight: 600 }}>No files yet</p>
                                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Use "Save to Drive" on any note to start syncing</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {files.map(file => (
                                        <a key={file.id} href={file.webViewLink} target="_blank" rel="noopener noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                            <div style={{ width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)' }}>
                                                <span className="material-symbols-outlined">{getIcon(file.mimeType)}</span>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{formatDate(file.createdTime)} {file.size ? `• ${formatSize(file.size)}` : ''}</p>
                                            </div>
                                            <span className="material-symbols-outlined" style={{ color: 'var(--text-light)', fontSize: '1.125rem' }}>open_in_new</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </>
    )
}
