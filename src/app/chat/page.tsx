'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import { useToast } from '@/components/ToastContext'
import LoginModal from '@/components/LoginModal'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface Note {
    id: string
    title: string
    transcript: string | null
    created_at: string
}

interface Message {
    id?: string
    role: 'user' | 'assistant'
    content: string
}

interface ChatHistory {
    id: string
    title: string
    updated_at: string
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
    
    // History & Session
    const [chats, setChats] = useState<ChatHistory[]>([])
    const [currentChatId, setCurrentChatId] = useState<string | null>(null)
    const [loadingHistory, setLoadingHistory] = useState(false)

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
            fetchHistory()
        }
    }, [user])

    const fetchNotes = async () => {
        const { data, error } = await supabase
            .from('notes')
            .select('id, title, transcript, created_at')
            .not('transcript', 'is', null)
            .order('created_at', { ascending: false })
        
        if (!error) setAllNotes(data || [])
    }

    const fetchHistory = async () => {
        if (!user) return
        setLoadingHistory(true)
        try {
            const res = await fetch(`/api/chat/history?userId=${user.id}`)
            const data = await res.json()
            if (data.chats) {
                // Sort: Pinned first, then by updated_at
                const sorted = [...data.chats].sort((a, b) => {
                    if (a.is_pinned && !b.is_pinned) return -1
                    if (!a.is_pinned && b.is_pinned) return 1
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                })
                setChats(sorted)
            }
        } catch (err) {
            console.error('History fetch error:', err)
        }
        setLoadingHistory(false)
    }

    const loadChat = async (chatId: string) => {
        setCurrentChatId(chatId)
        setLoading(true)
        try {
            const res = await fetch(`/api/chat/history/${chatId}`)
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const contentType = res.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Yanıt JSON formatında değil')
            }
            const data = await res.json()
            if (data.messages) setMessages(data.messages)
        } catch (err: any) {
            console.error('Chat load error:', err)
            showToast(`Sohbet yüklenemedi: ${err.message}`, 'error')
        }
        setLoading(false)
    }

    const handleNewChat = () => {
        setCurrentChatId(null)
        setMessages([])
        setSelectedNotes([])
    }

    const saveMessage = async (chatId: string, role: string, content: string) => {
        if (!user) return
        try {
            await fetch(`/api/chat/history/${chatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, role, content })
            })
        } catch (err) {
            console.error('Message save error:', err)
        }
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!user) { setShowLoginModal(true); return }
        if (!inputValue.trim() || loading) return

        const userMsgContent = inputValue.trim()
        const userMessage = { role: 'user', content: userMsgContent } as Message
        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setLoading(true)

        try {
            let chatId = currentChatId
            
            // If no active chat, create one
            if (!chatId) {
                const chatRes = await fetch('/api/chat/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId: user.id, 
                        title: userMsgContent.length > 30 ? userMsgContent.substring(0, 30) + '...' : userMsgContent 
                    })
                })
                if (!chatRes.ok) {
                    const errorText = await chatRes.text()
                    throw new Error(`Sohbet oturumu oluşturulamadı (${chatRes.status}): ${errorText.substring(0, 50)}`)
                }
                const chatData = await chatRes.json()
                if (chatData.chat) {
                    chatId = chatData.chat.id
                    setCurrentChatId(chatId)
                    fetchHistory() // Refresh the list
                } else {
                    throw new Error('Sohbet oturumu verisi alınamadı')
                }
            }

            // Save user message to DB
            await saveMessage(chatId!, 'user', userMsgContent)

            const contextTranscripts = selectedNotes.map(n => `Başlık: ${n.title}\nİçerik: ${n.transcript}`)
            
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    context: contextTranscripts
                })
            })

            if (!res.ok) {
                // If not ok, try to get error message from JSON or fallback to text/status
                let errorMsg = `Sunucu hatası (${res.status})`
                try {
                    const contentType = res.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await res.json()
                        errorMsg = errorData.message || errorData.error || errorMsg
                    } else {
                        const text = await res.text()
                        if (text) errorMsg = text.substring(0, 100)
                    }
                } catch (e) {}
                throw new Error(errorMsg)
            }

            const data = await res.json()
            if (data.message) {
                const assistantMessage = { role: 'assistant', content: data.message } as Message
                setMessages(prev => [...prev, assistantMessage])
                // Save assistant message to DB
                await saveMessage(chatId!, 'assistant', data.message)
            } else {
                throw new Error('AI yanıtı alınamadı')
            }
        } catch (err: any) {
            showToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handlePinChat = async (id: string, currentPinned: boolean) => {
        try {
            const res = await fetch(`/api/chat/history/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_pinned: !currentPinned })
            })
            if (res.ok) {
                fetchHistory()
            }
        } catch (err) {
            console.error('Pin error:', err)
        }
    }

    const handleDeleteChat = async (id: string) => {
        if (!confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) return
        try {
            const res = await fetch(`/api/chat/history/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                if (currentChatId === id) {
                    handleNewChat()
                }
                fetchHistory()
            }
        } catch (err) {
            console.error('Delete error:', err)
        }
    }

    const handleExportPDF = () => {
        if (messages.length === 0) return
        
        try {
            const doc = new jsPDF()
            
            // PDF Header
            doc.setFillColor(37, 99, 235) // Primary color
            doc.rect(0, 0, 210, 40, 'F')
            
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(24)
            doc.text('Wois AI', 14, 20)
            doc.setFontSize(12)
            doc.text('Sohbet Analizi ve Notları', 14, 30)
            
            doc.setTextColor(100, 116, 139)
            doc.setFontSize(9)
            doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')}`, 14, 48)
            
            const tableData = messages.map(m => [
                m.role === 'user' ? 'SORU' : 'WOIS',
                m.content
            ])

            autoTable(doc, {
                startY: 55,
                head: [['KİM', 'MESAJ']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10, fontStyle: 'bold' },
                bodyStyles: { fontSize: 9, cellPadding: 5 },
                columnStyles: {
                    0: { cellWidth: 25, fontStyle: 'bold' },
                    1: { cellWidth: 'auto' }
                },
                margin: { left: 14, right: 14 }
            })

            doc.save(`wois-analiz-${new Date().getTime()}.pdf`)
            showToast('PDF Hazırlandı ve İndirildi', 'success')
        } catch (err) {
            console.error('PDF Error:', err)
            showToast('PDF oluşturulurken bir hata oluştu', 'error')
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
                            <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>Wois'e Sor ile notlarınız üzerine sohbet edin.</p>
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
                <div className="page-content" style={{ height: 'calc(100vh - 100px)', display: 'flex', gap: '1.5rem' }}>
                    
                    {/* Left Sidebar for History */}
                    <div className="chat-history-sidebar" style={{ 
                        width: '240px', background: 'var(--bg-card)', 
                        borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-color)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                            <button 
                                onClick={handleNewChat}
                                style={{ 
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                    padding: '0.75rem', borderRadius: 'var(--radius-xl)', 
                                    background: 'var(--primary)', color: 'white', border: 'none',
                                    fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>add</span>
                                Yeni Sohbet
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                            ) : (
                                chats.map(c => (
                                    <div 
                                        key={c.id}
                                        onClick={() => loadChat(c.id)}
                                        className={`chat-history-item ${currentChatId === c.id ? 'active' : ''}`}
                                        style={{ 
                                            padding: '0.75rem', borderRadius: 'var(--radius-lg)', 
                                            background: currentChatId === c.id ? 'var(--bg-surface)' : 'transparent',
                                            border: `1px solid ${currentChatId === c.id ? 'var(--border-color)' : 'transparent'}`,
                                            cursor: 'pointer', marginBottom: '0.25rem', position: 'relative',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: c.is_pinned ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {c.is_pinned ? 'push_pin' : 'chat_bubble'}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                                {c.title}
                                            </p>
                                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>{new Date(c.updated_at).toLocaleDateString()}</p>
                                        </div>
                                        
                                        <div className="chat-actions" style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handlePinChat(c.id, !!c.is_pinned); }}
                                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: c.is_pinned ? 'var(--primary)' : 'var(--text-light)', display: 'flex' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>push_pin</span>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(c.id); }}
                                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-light)', display: 'flex' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {/* Chat Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-invert)', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>psychology</span>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Wois'e Sor</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Derinlemesine öğretici analizler</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {messages.length > 0 && (
                                    <button 
                                        onClick={handleExportPDF}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                            padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', 
                                            background: 'white', border: '1px solid var(--border-color)',
                                            color: 'var(--text-main)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>picture_as_pdf</span>
                                        PDF İndir
                                    </button>
                                )}
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
                        </div>

                        {/* Messages Container */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                            {messages.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.6 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '1rem' }}>forum</span>
                                    <p style={{ fontWeight: 600 }}>Wois'e Sor</p>
                                    <p style={{ fontSize: '0.875rem' }}>Sohbete başlamak için bir mesaj yazın veya hafızadan not seçin.</p>
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
                                                fontSize: '0.9375rem'
                                            }}>
                                                {msg.content.split('\n').map((line, lineIdx) => (
                                                    <div key={lineIdx} style={{ marginBottom: line.trim() === '' ? '0.75rem' : '0' }}>
                                                        {line.split(/(\*\*.*?\*\*)/).map((part, partIdx) => {
                                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                                return <strong key={partIdx} style={{ fontWeight: 800, color: msg.role === 'user' ? 'inherit' : 'var(--text-main)' }}>{part.slice(2, -2)}</strong>
                                                            }
                                                            return part
                                                        })}
                                                    </div>
                                                ))}
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

                <style jsx>{`
                    @media (max-width: 768px) {
                        .chat-history-sidebar {
                            display: none !important;
                        }
                    }
                    .chat-history-item .chat-actions {
                        opacity: 0;
                        transition: opacity 0.2s;
                    }
                    .chat-history-item:hover .chat-actions {
                        opacity: 1;
                    }
                `}</style>
            </main>
        </>
    )
}
