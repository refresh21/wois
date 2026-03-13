'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastContext'

interface Note {
    id: string
    title: string
    transcript: string | null
    summary: string | null
    type: string
    created_at: string
}

export default function SummarizePage() {
    const { showToast } = useToast()
    const [tab, setTab] = useState<'upload' | 'memory'>('upload')
    const [notes, setNotes] = useState<Note[]>([])
    const [selectedNotes, setSelectedNotes] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loadingNotes, setLoadingNotes] = useState(false)
    const [summarizing, setSummarizing] = useState(false)
    const [transcribing, setTranscribing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [summaryResult, setSummaryResult] = useState('')
    const [sourceText, setSourceText] = useState('')
    const [fileName, setFileName] = useState('')

    useEffect(() => {
        if (tab === 'memory') fetchNotes()
    }, [tab])

    const fetchNotes = async () => {
        setLoadingNotes(true)
        const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false })
        setNotes(data || [])
        setLoadingNotes(false)
    }

    const toggleNote = (id: string) => {
        setSelectedNotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setSummaryResult('')
        setSourceText('')

        // If it's an audio file, transcribe first
        if (file.type.startsWith('audio/')) {
            setTranscribing(true)
            try {
                const formData = new FormData()
                formData.append('audio', file, file.name)
                const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
                const data = await res.json()
                if (data.transcript) {
                    setSourceText(data.transcript)
                    showToast('Transkripsiyon tamamlandı', 'success')
                } else {
                    showToast('Transkripsiyon başarısız: ' + (data.error || 'Bilinmeyen hata'), 'error')
                }
            } catch (err: any) {
                showToast('Transkripsiyon hatası: ' + err.message, 'error')
            }
            setTranscribing(false)
        } else {
            // For text files, read content
            try {
                const text = await file.text()
                setSourceText(text)
            } catch {
                showToast('Dosya okunamadı. Lütfen metin veya ses dosyası yükleyin.', 'error')
            }
        }
    }

    const handleSummarize = async (text?: string) => {
        const textToSummarize = text || sourceText
        if (!textToSummarize) {
            showToast('Özetlenecek metin yok!', 'error')
            return
        }
        setSummarizing(true)
        try {
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSummarize }),
            })
            const data = await res.json()
            if (data.summary && res.ok) {
                setSummaryResult(data.summary)
                showToast('Özetleme tamamlandı', 'success')
            } else {
                const errorMsg = data.message || data.error || 'Bilinmeyen hata'
                showToast('Özetleme başarısız: ' + errorMsg, 'error')
            }
        } catch (err: any) {
            showToast('Özetleme hatası: ' + err.message, 'error')
        }
        setSummarizing(false)
    }

    const handleSummarizeFromMemory = () => {
        const selected = notes.filter(n => selectedNotes.includes(n.id))
        const combined = selected.map(n => {
            const parts = [`## ${n.title}`]
            if (n.transcript) parts.push(n.transcript)
            if (n.summary) parts.push(n.summary)
            return parts.join('\n')
        }).join('\n\n---\n\n')

        if (!combined.trim()) {
            showToast('Seçilen notlarda metin bulunamadı!', 'error')
            return
        }
        setSourceText(combined)
        handleSummarize(combined)
    }

    const handleSaveSummary = async () => {
        if (!summaryResult) return
        setSaving(true)
        try {
            const title = fileName
                ? `Özet: ${fileName}`
                : selectedNotes.length > 0
                    ? `Özet: ${selectedNotes.length} not`
                    : `Özet - ${new Date().toLocaleDateString('tr-TR')}`

            const { error } = await supabase.from('notes').insert({
                title,
                summary: summaryResult,
                transcript: sourceText,
                type: 'summary',
            })
            if (error) {
                showToast('Kaydetme hatası: ' + error.message, 'error')
            } else {
                showToast('Özet başarıyla kaydedildi!', 'success')
                setSummaryResult('')
                setSourceText('')
                setFileName('')
                setSelectedNotes([])
            }
        } catch (err: any) {
            showToast('Kaydetme hatası: ' + err.message, 'error')
        }
        setSaving(false)
    }

    const filteredNotes = notes.filter(n => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return n.title.toLowerCase().includes(q) || n.transcript?.toLowerCase().includes(q)
    })

    const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                <div className="page-content">
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>auto_awesome</span>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Summarize</h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Dosya yükle veya notlarından seç, AI ile özetle</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                        {[
                            { key: 'upload' as const, label: 'Dosya Yükle', icon: 'upload_file' },
                            { key: 'memory' as const, label: 'Memory\'den Seç', icon: 'inventory_2' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setTab(t.key); setSummaryResult(''); setSourceText(''); setFileName(''); setSelectedNotes([]) }}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.625rem', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.875rem',
                                    background: tab === t.key ? 'var(--primary)' : 'transparent',
                                    color: tab === t.key ? 'var(--primary-invert)' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                        {tab === 'upload' ? (
                            <>
                                {/* Upload Area */}
                                <div
                                    style={{
                                        border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-xl)',
                                        padding: '3rem 2rem', cursor: 'pointer', textAlign: 'center',
                                        background: 'var(--bg-surface)', transition: 'all 0.2s',
                                    }}
                                    onClick={() => document.getElementById('summarize-upload')?.click()}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem' }}>
                                        {transcribing ? 'hourglass_empty' : fileName ? 'check_circle' : 'cloud_upload'}
                                    </span>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                        {transcribing ? 'Transkripsiyon yapılıyor...' : fileName || 'Dosya Yükle'}
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                        {fileName ? 'Başka dosya seçmek için tıkla' : 'Ses, metin veya belge dosyası yükle'}
                                    </p>
                                    <p style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                        MP3, WAV, WebM, TXT, MD
                                    </p>
                                </div>
                                <input id="summarize-upload" type="file" accept="audio/*,.txt,.md,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />

                                {/* Source Text Preview */}
                                {sourceText && (
                                    <div style={{ marginTop: '1.25rem' }}>
                                        <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Kaynak Metin</h4>
                                        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--border-color)', fontSize: '0.8125rem', lineHeight: 1.6, maxHeight: '150px', overflow: 'auto', color: 'var(--text-light)' }}>
                                            {sourceText.substring(0, 500)}{sourceText.length > 500 ? '...' : ''}
                                        </div>
                                    </div>
                                )}

                                {/* Summarize Button */}
                                {sourceText && !summaryResult && (
                                    <button
                                        onClick={() => handleSummarize()}
                                        disabled={summarizing}
                                        style={{
                                            width: '100%', marginTop: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-xl)',
                                            background: summarizing ? 'var(--slate-400)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                            color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        }}
                                    >
                                        <span className="material-symbols-outlined">{summarizing ? 'hourglass_empty' : 'auto_awesome'}</span>
                                        {summarizing ? 'AI Özetliyor...' : 'AI ile Özetle'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Memory Search */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-light)' }}>search</span>
                                        <input
                                            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Notlarda ara..."
                                            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                {/* Selected Count */}
                                {selectedNotes.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#8b5cf6' }}>{selectedNotes.length} not seçildi</span>
                                        <button onClick={() => setSelectedNotes([])} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temizle</button>
                                    </div>
                                )}

                                {/* Notes List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '350px', overflow: 'auto' }}>
                                    {loadingNotes ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            <span className="material-symbols-outlined animate-pulse">hourglass_empty</span>
                                        </div>
                                    ) : filteredNotes.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            <p style={{ fontSize: '0.875rem' }}>Not bulunamadı</p>
                                        </div>
                                    ) : filteredNotes.map(note => (
                                        <div
                                            key={note.id}
                                            onClick={() => toggleNote(note.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                                background: selectedNotes.includes(note.id) ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-surface)',
                                                borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                                                border: selectedNotes.includes(note.id) ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--border-color)',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{
                                                width: '1.25rem', height: '1.25rem', borderRadius: '4px', flexShrink: 0,
                                                border: selectedNotes.includes(note.id) ? 'none' : '2px solid var(--border-color)',
                                                background: selectedNotes.includes(note.id) ? '#8b5cf6' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {selectedNotes.includes(note.id) && (
                                                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#fff' }}>check</span>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</p>
                                                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                                    {formatDate(note.created_at)} • {note.type}
                                                    {note.transcript ? ` • ${note.transcript.substring(0, 40)}...` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summarize Selected Button */}
                                {selectedNotes.length > 0 && !summaryResult && (
                                    <button
                                        onClick={handleSummarizeFromMemory}
                                        disabled={summarizing}
                                        style={{
                                            width: '100%', marginTop: '1.25rem', padding: '0.875rem', borderRadius: 'var(--radius-xl)',
                                            background: summarizing ? 'var(--slate-400)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                            color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        }}
                                    >
                                        <span className="material-symbols-outlined">{summarizing ? 'hourglass_empty' : 'auto_awesome'}</span>
                                        {summarizing ? 'AI Özetliyor...' : `${selectedNotes.length} Notu Özetle`}
                                    </button>
                                )}
                            </>
                        )}

                        {/* Summary Result */}
                        {summaryResult && (
                            <div style={{ marginTop: '1.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#8b5cf6' }}>auto_awesome</span>
                                    <h4 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>AI Özet</h4>
                                </div>
                                <div style={{ padding: '1.25rem', fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {summaryResult}
                                </div>
                                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={handleSaveSummary}
                                        disabled={saving}
                                        style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            padding: '0.625rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)',
                                            color: 'var(--primary-invert)', fontWeight: 600, fontSize: '0.8125rem',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>save</span>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(summaryResult)
                                            showToast('Özet kopyalandı!', 'success')
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            padding: '0.625rem 1rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)',
                                            border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.8125rem',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>content_copy</span>
                                        Kopyala
                                    </button>
                                    <button
                                        onClick={() => { setSummaryResult(''); setSourceText(''); setFileName(''); setSelectedNotes([]) }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            padding: '0.625rem 1rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)',
                                            border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.8125rem',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                                        Yeni
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
