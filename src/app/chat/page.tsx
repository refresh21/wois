'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import { useToast } from '@/components/ToastContext'
import LoginModal from '@/components/LoginModal'

interface Note {
    id: string
    title: string
    transcript: string | null
    created_at: string
}

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth()
    const { t, locale } = useLanguage()
    const { showToast } = useToast()
    
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    
    // Context Selection
    const [allNotes, setAllNotes] = useState<Note[]>([])
    const [selectedNotes, setSelectedNotes] = useState<Note[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (user) {
            fetchNotes()
        }
    }, [user])

    const fetchNotes = async () => {
        const { data, error } = await supabase
            .from('notes')
            .select('id, title, transcript, created_at')
            .not('transcript', 'is', null) // Only notes with transcripts
            .order('created_at', { ascending: false })
        
        if (!error) setAllNotes(data || [])
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!user) { setShowLoginModal(true); return }
        if (!inputValue.trim() || loading) return

        const userMessage = { role: 'user', content: inputValue } as Message
        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setLoading(true)

        try {
            const contextTranscripts = selectedNotes.map(n => `Başlık: ${n.title}\nİçerik: ${n.transcript}`)
            
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    context: contextTranscripts
                })
            })

            const data = await res.json()
            if (data.message) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
            } else {
                const errorMsg = data.details?.error?.message || data.error || t('common.error')
                showToast(errorMsg, 'error')
            }
        } catch (err: any) {
            showToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const toggleNoteSelection = (note: Note) => {
        setSelectedNotes(prev => 
            prev.find(n => n.id === note.id) 
                ? prev.filter(n => n.id !== note.id) 
                : [...prev, note]
        )
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return
        
        setUploading(true)
        try {
            const fileName = `chat_upload_${Date.now()}_${file.name}`
            const bucket = file.type.startsWith('audio/') ? 'recordings' : 'media'
            
            const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
            if (error) throw error
            
            const publicUrl = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
            
            // Transcribe if audio
            let transcript = ''
            if (file.type.startsWith('audio/')) {
                const res = await fetch('/api/transcribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioUrl: publicUrl })
                })
                const resData = await res.json()
                transcript = resData.transcript || ''
            }

            // Add to selected context automatically
            const newNote = { id: data.path, title: file.name, transcript, created_at: new Date().toISOString() }
            setSelectedNotes(prev => [...prev, newNote])
            showToast(t('common.success'), 'success')
        } catch (err: any) {
            showToast(err.message, 'error')
        } finally {
            setUploading(false)
        }
    }

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
                            <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'var(--blue-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>psychology</span>
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>{t('nav.chat')}</h2>
                            <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>{t('chat.subtitle')}</p>
                            <button onClick={() => setShowLoginModal(true)} className="btn-primary" style={{ width: '100%' }}>{t('auth.login_google')}</button>
                        </div>
                    </div>
                </main>
                <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            </>
        )
    }

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                <div className="page-content" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Chat Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-invert)', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>psychology</span>
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>{t('chat.title')}</h2>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('chat.subtitle')}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsModalOpen(true)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', 
                                background: selectedNotes.length > 0 ? 'var(--blue-50)' : 'var(--bg-hover)',
                                border: `1px solid ${selectedNotes.length > 0 ? 'var(--primary)' : 'var(--border-color)'}`,
                                color: selectedNotes.length > 0 ? 'var(--primary)' : 'var(--text-main)',
                                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>auto_stories</span>
                            {selectedNotes.length > 0 ? `${selectedNotes.length} ${t('nav.memory')}` : t('chat.select_context')}
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                        {messages.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '1rem' }}>forum</span>
                                <p style={{ fontWeight: 600 }}>{t('chat.title')}</p>
                                <p style={{ fontSize: '0.875rem' }}>{t('chat.subtitle')}</p>
                                {selectedNotes.length === 0 && (
                                    <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem', border: '1px solid var(--border-color)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.5rem' }}>info</span>
                                        {t('chat.no_context')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {messages.map((msg, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ 
                                            maxWidth: '80%', padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-xl)',
                                            background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                                            color: msg.role === 'user' ? 'var(--primary-invert)' : 'var(--text-main)',
                                            border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                                            boxShadow: msg.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
                                            lineHeight: 1.6,
                                            whiteSpace: 'pre-wrap',
                                            fontSize: '0.9375rem'
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{ padding: '0.875rem 1.25rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', display: 'flex', gap: '4px' }}>
                                            <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }}></div>
                                            <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animationDelay: '0.2s' }}></div>
                                            <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                        {selectedNotes.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0 0.5rem' }}>
                                {selectedNotes.map(n => (
                                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', background: 'var(--blue-50)', color: 'var(--primary)', borderRadius: 'var(--radius-lg)', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--primary)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>description</span>
                                        <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                                        <button onClick={() => toggleNoteSelection(n)} style={{ color: 'var(--primary)', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>close</span></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-xl)', background: 'var(--bg-hover)', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
                            >
                                <span className={`material-symbols-outlined ${uploading ? 'animate-spin' : ''}`}>
                                    {uploading ? 'sync' : 'add_circle'}
                                </span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                accept="audio/*"
                            />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('chat.placeholder')}
                                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0.75rem 0.5rem', fontSize: '1rem', color: 'var(--text-main)' }}
                            />
                            <button 
                                type="submit"
                                disabled={!inputValue.trim() || loading || uploading}
                                title={t('chat.send')}
                                style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-xl)', 
                                    background: !inputValue.trim() || loading || uploading ? 'var(--slate-300)' : 'var(--primary)',
                                    color: 'var(--primary-invert)', border: 'none', cursor: 'pointer',
                                    transition: 'all 0.2s', flexShrink: 0
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>send</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Context Selector Modal */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                        <div className="animate-fade-in-up" style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '600px', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-2xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('chat.modal_title')}</h3>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t('chat.modal_desc')}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-light)', padding: '0.5rem' }}><span className="material-symbols-outlined">close</span></button>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {allNotes.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('dashboard.no_notes')}</p>
                                ) : (
                                    allNotes.map(note => (
                                        <div 
                                            key={note.id} 
                                            onClick={() => toggleNoteSelection(note)}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', 
                                                background: selectedNotes.find(n => n.id === note.id) ? 'var(--blue-50)' : 'var(--bg-surface)',
                                                borderRadius: 'var(--radius-lg)', border: `1px solid ${selectedNotes.find(n => n.id === note.id) ? 'var(--primary)' : 'var(--border-color)'}`,
                                                cursor: 'pointer', transition: 'all 0.1s'
                                            }}
                                        >
                                            <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '4px', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedNotes.find(n => n.id === note.id) ? 'var(--primary)' : 'transparent', borderColor: selectedNotes.find(n => n.id === note.id) ? 'var(--primary)' : 'var(--border-color)' }}>
                                                {selectedNotes.find(n => n.id === note.id) && <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: 'white' }}>check</span>}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(note.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsModalOpen(false)} className="btn-primary">{t('common.save')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}
