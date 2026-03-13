'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'

interface Note {
    id: string
    title: string
    transcript: string | null
    summary: string | null
    duration: string | null
    type: string
    audio_url: string | null
    media_urls: string[] | null
    created_at: string
}

export default function MemoryPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const { user, loading: authLoading, signInWithGoogle } = useAuth()
    const { t } = useLanguage()

    useEffect(() => { 
        if (!authLoading && user) {
            fetchNotes() 
        }
    }, [user, authLoading])

    const fetchNotes = async () => {
        if (!user) return
        setLoading(true)
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            
        if (!error) setNotes(data || [])
        setLoading(false)
    }

    const deleteNote = async (id: string) => {
        await supabase.from('notes').delete().eq('id', id)
        setNotes(prev => prev.filter(n => n.id !== id))
    }

    const deleteAllNotes = async () => {
        if (!window.confirm('Emin misiniz? Tüm notlar ve yüklü dosyalar kalıcı olarak silinecek.')) return
        await supabase.from('notes').delete().neq('id', '0') // Delete all rows
        setNotes([])
    }

    const filteredNotes = notes.filter(n => {
        if (filter !== 'all' && n.type !== filter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return n.title.toLowerCase().includes(q) || n.transcript?.toLowerCase().includes(q) || n.summary?.toLowerCase().includes(q)
        }
        return true
    })

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const stats = {
        all: notes.length,
        voice: notes.filter(n => n.type === 'voice').length,
        upload: notes.filter(n => n.type === 'upload').length,
        media: notes.filter(n => n.type === 'media').length,
        text: notes.filter(n => !n.audio_url && !n.media_urls?.length).length,
    }

    const filters = [
        { key: 'all', label: 'All', count: stats.all, icon: 'inventory_2' },
        { key: 'voice', label: 'Voice', count: stats.voice, icon: 'mic' },
        { key: 'upload', label: 'Uploads', count: stats.upload, icon: 'upload_file' },
        { key: 'media', label: 'Media', count: stats.media, icon: 'photo_library' },
    ]

    if (authLoading) {
        return (
            <>
                <Sidebar />
                <main className="main-area">
                    <Header />
                    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                        <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                            <span className="material-symbols-outlined">hourglass_empty</span> {t('common.loading')}
                        </div>
                    </div>
                </main>
            </>
        )
    }

    if (!user) {
        return (
            <>
                <Sidebar />
                <main className="main-area">
                    <Header />
                    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                        <div className="animate-fade-in-up" style={{ 
                            background: 'var(--bg-card)', padding: '3rem 2rem', 
                            borderRadius: 'var(--radius-2xl)', maxWidth: '450px', width: '100%',
                            textAlign: 'center', border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-xl)'
                        }}>
                            <div style={{ 
                                width: '80px', height: '80px', borderRadius: '40px', 
                                background: 'var(--blue-50)', color: 'var(--primary)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem auto' 
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>lock</span>
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                                {t('auth.login_required_title')}
                            </h2>
                            <p style={{ color: 'var(--text-light)', marginBottom: '2.5rem', lineHeight: 1.6, fontSize: '1rem' }}>
                                {t('auth.login_required_desc')}
                            </p>
                            <button 
                                onClick={signInWithGoogle}
                                style={{ 
                                    width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', 
                                    background: 'var(--primary)', color: 'white', fontWeight: 700, 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    gap: '1rem', border: 'none', cursor: 'pointer', fontSize: '1.125rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '24px', height: '24px' }} />
                                {t('auth.login_google')}
                            </button>
                        </div>
                    </div>
                </main>
            </>
        )
    }

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                <div className="page-content">
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-invert)', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>inventory_2</span>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Memory</h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>All your saved notes, recordings, and media</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-light)' }}>search</span>
                            <input
                                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search notes, transcripts, summaries..."
                                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9375rem', color: 'var(--text-main)' }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-light)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Chips & Delete All */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {filters.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem',
                                        borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem', fontWeight: 600,
                                        background: filter === f.key ? 'var(--primary)' : 'var(--bg-surface)',
                                        color: filter === f.key ? 'var(--primary-invert)' : 'var(--text-muted)',
                                        border: filter === f.key ? 'none' : '1px solid var(--border-color)',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{f.icon}</span>
                                    {f.label}
                                    <span style={{ opacity: 0.7, fontSize: '0.6875rem' }}>({f.count})</span>
                                </button>
                            ))}
                        </div>
                        {notes.length > 0 && (
                            <button onClick={deleteAllNotes} className="btn-primary" style={{ background: '#dc2626', color: 'white', border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete_forever</span>
                                Tümünü Sil
                            </button>
                        )}
                    </div>

                    {/* Notes List */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>hourglass_empty</span>
                            Loading...
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }}>search_off</span>
                            <p style={{ fontWeight: 600 }}>{searchQuery ? 'No results found' : 'No items in memory'}</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{searchQuery ? 'Try a different search term' : 'Start recording or uploading to build your memory'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredNotes.map(note => (
                                <div key={note.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', transition: 'border-color 0.2s' }}>
                                    <Link href={`/note/${note.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                                        <div style={{ width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)', flexShrink: 0 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                                                {note.type === 'voice' ? 'mic' : note.type === 'media' ? 'image' : note.type === 'upload' ? 'audio_file' : 'description'}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                                {formatDate(note.created_at)}
                                                {note.duration ? ` • ${note.duration}` : ''}
                                                {note.summary ? ' • Summarized' : ''}
                                            </p>
                                            {note.transcript && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {note.transcript.substring(0, 100)}...
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                        <button onClick={() => deleteNote(note.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', borderRadius: 'var(--radius-default)', color: 'var(--text-light)' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats Footer */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.all} total items</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.voice} voice notes</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.upload} uploads</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.media} media</span>
                    </div>
                </div>
            </main>
        </>
    )
}
