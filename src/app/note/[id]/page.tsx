'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
// We will require pdfmake inside the handlers to bypass ESM proxies
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useToast } from '@/components/ToastContext'
import { getPdfFontsVfs } from '@/lib/fonts/pdfUtils'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import LoginModal from '@/components/LoginModal'

interface Note {
    id: string
    title: string
    transcript: string | null
    summary: string | null
    personal_notes: string | null
    duration: string | null
    type: string
    audio_url: string | null
    media_urls: string[] | null
    user_id: string
    created_at: string
    updated_at: string
}

export default function NoteDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { showToast } = useToast()
    const { user, loading: authLoading } = useAuth()
    const { t, locale } = useLanguage()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [note, setNote] = useState<Note | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('summary')
    const [summarizing, setSummarizing] = useState(false)
    const [personalNotes, setPersonalNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [audioDuration, setAudioDuration] = useState(0)
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState('')
    const [savingPdf, setSavingPdf] = useState(false)
    const [savingAudio, setSavingAudio] = useState(false)
    const [savingTranscript, setSavingTranscript] = useState(false)
    const [savingSummary, setSavingSummary] = useState(false)
    const audioRef = useRef<HTMLAudioElement>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => { 
        if (!authLoading) {
            if (!user) {
                setShowLoginModal(true)
                setLoading(false)
            } else {
                fetchNote() 
            }
        }
    }, [params.id, user, authLoading])
 
    const fetchNote = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('notes').select('*').eq('id', params.id).single()
        if (error || !data) { 
            console.error('Error:', error); 
            showToast(t('common.error'), 'error'); 
            router.push('/'); 
            return 
        }
        
        // Security check
        if (data.user_id !== user?.id) {
            showToast(t('common.error'), 'error');
            router.push('/');
            return
        }

        setNote(data); setPersonalNotes(data.personal_notes || ''); setTitleInput(data.title); setLoading(false)
    }

    const handleSummarize = async () => {
        if (!note?.transcript && (!note?.media_urls || note.media_urls.length === 0)) {
            showToast('Özetlenecek metin veya görsel yok', 'error');
            return;
        }
        setSummarizing(true)
        try {
            const payload: any = { text: note.transcript }
            if (note.media_urls && note.media_urls.length > 0) {
                payload.mediaUrl = note.media_urls[0] // Pass the first media URL for vision analysis
            }

            const res = await fetch('/api/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const data = await res.json()
            if (data.summary) { await supabase.from('notes').update({ summary: data.summary }).eq('id', note.id); setNote(prev => prev ? { ...prev, summary: data.summary } : null); showToast(t('common.success'), 'success'); }
            else showToast(t('common.error') + ': ' + (data.details || data.error || 'Bilinmeyen hata'), 'error')
        } catch (err: any) { showToast(t('common.error') + ': ' + err.message, 'error') }
        finally { setSummarizing(false) }
    }

    const handleNotesChange = (text: string) => {
        setPersonalNotes(text)
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(async () => {
            if (!note) return; setSavingNotes(true)
            await supabase.from('notes').update({ personal_notes: text }).eq('id', note.id)
            setNote(prev => prev ? { ...prev, personal_notes: text } : null); setSavingNotes(false)
        }, 1000)
    }

    const saveTitle = async () => {
        if (!note || !titleInput.trim()) return
        await supabase.from('notes').update({ title: titleInput.trim() }).eq('id', note.id)
        setNote(prev => prev ? { ...prev, title: titleInput.trim() } : null); setEditingTitle(false)
    }

    const getDocDefinition = () => {
        if (!note) return null
        const content: any[] = []

        content.push({ text: note.title, style: 'header' })
        content.push({ text: new Date(note.created_at).toLocaleString(), style: 'date' })

        if (note.summary) {
            content.push({ text: 'Summary', style: 'subheader' })
            content.push({ text: note.summary, style: 'body' })
        }
        if (note.transcript) {
            content.push({ text: 'Transcript', style: 'subheader' })
            content.push({ text: note.transcript, style: 'body' })
        }
        if (note.personal_notes) {
            content.push({ text: t('note.notes_placeholder').replace('...', ''), style: 'subheader' })
            content.push({ text: note.personal_notes, style: 'body' })
        }

        return {
            content,
            defaultStyle: { font: 'Poppins' },
            styles: {
                header: { fontSize: 22, bold: true, margin: [0, 0, 0, 5] },
                date: { fontSize: 10, color: 'gray', margin: [0, 0, 0, 20] },
                subheader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5] },
                body: { fontSize: 10, margin: [0, 0, 0, 10], lineHeight: 1.5 }
            }
        }
    }

    const exportPDF = () => {
        const docDef = getDocDefinition()
        if (!docDef || !note) return

        const pdfMake = require('pdfmake/build/pdfmake')
        const decodedVfs = getPdfFontsVfs()

        pdfMake.vfs = decodedVfs;
        
        if (pdfMake.virtualfs && pdfMake.virtualfs.storage) {
            Object.assign(pdfMake.virtualfs.storage, decodedVfs)
        }

        pdfMake.fonts = {
            Poppins: {
                normal: 'Poppins-Regular.ttf',
                bold: 'Poppins-Bold.ttf',
                italics: 'Poppins-Medium.ttf',
                bolditalics: 'Poppins-SemiBold.ttf'
            }
        }

        pdfMake.createPdf(docDef as any).download(`${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
    }

    const t_drive = (key: string, resource?: string) => {
        const dict: any = {
            tr: {
                'connect_required': 'Önce Google Drive\'a bağlanmanız gerekiyor.',
                'success': `${resource} Google Drive'a başarıyla kaydedildi!`,
                'error': `Drive'a kaydetme hatası`,
                'saving': 'Kaydediliyor...',
                'save_pdf': 'PDF\'i Drive\'a Kaydet',
                'save_media': 'Medyayı Drive\'a Kaydet',
                'regenerating': 'Yeniden oluşturuluyor...',
                'regenerate': 'Yeniden Oluştur',
                'now_playing': 'Şu An Çalıyor',
                'no_summary': 'Henüz özet yok',
                'generate_summary': 'Özet Oluştur',
                'loading': 'Yükleniyor...',
                'delete_confirm': 'Bu notu silmek istediğinize emin misiniz?',
                'transcript': 'Transkript',
                'summary': 'Özet',
                'media': 'Medya',
                'export_pdf': 'PDF Dışa Aktar',
                'export_media': 'Medyayı İndir',
            },
            en: {
                'connect_required': 'You need to connect to Google Drive first.',
                'success': `${resource} saved to Google Drive successfully!`,
                'error': `Drive save error`,
                'saving': 'Saving...',
                'save_pdf': 'Save PDF to Drive',
                'save_media': 'Save Media to Drive',
                'regenerating': 'Regenerating...',
                'regenerate': 'Regenerate',
                'now_playing': 'Now Playing',
                'no_summary': 'No summary yet',
                'generate_summary': 'Generate Summary',
                'loading': 'Loading...',
                'delete_confirm': 'Are you sure you want to delete this note?',
                'transcript': 'Transcript',
                'summary': 'Summary',
                'media': 'Media',
                'export_pdf': 'Export PDF',
                'export_media': 'Download Media',
            }
        }
        return dict[locale][key] || key
    }

    const checkGoogleToken = () => {
        const token = localStorage.getItem('google_access_token')
        const expiry = localStorage.getItem('google_token_expiry')
        if (!token || !expiry || Date.now() >= parseInt(expiry)) {
            showToast(t_drive('connect_required'), 'error');
            router.push('/drive');
            return null;
        }
        return token;
    }

    const uploadToDrive = async (blob: Blob, fileName: string, setIsSaving: (s: boolean) => void, resourceType: string) => {
        const token = checkGoogleToken()
        if (!token) return

        setIsSaving(true)
        try {
            const form = new FormData();
            form.append('file', blob, fileName);
            form.append('accessToken', token);
            form.append('fileName', fileName)

            const res = await fetch('/api/drive/upload', { method: 'POST', body: form });
            const data = await res.json()

            if (data.success) {
                showToast(t_drive('success', resourceType), 'success')
            } else {
                showToast(`${t_drive('error')}: ${data.error || 'Bilinmeyen hata'}`, 'error')
                console.error('Drive upload API error:', data)
            }
        } catch (err: any) {
            console.error('Drive Save Catch:', err)
            showToast(`Drive hatası: ${err.message}`, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const savePdfToDrive = async () => {
        if (!note) return
        const docDef = getDocDefinition()
        if (!docDef) return

        if (!checkGoogleToken()) return;

        setSavingPdf(true)
        try {
            const pdfBlob = await new Promise<Blob>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('PDF generation timed out (60s)'))
                }, 60000)

                try {
                    const pdfMake = require('pdfmake/build/pdfmake')
                    const decodedVfs = getPdfFontsVfs()

                    pdfMake.vfs = decodedVfs;
                    if (pdfMake.virtualfs && pdfMake.virtualfs.storage) {
                        Object.assign(pdfMake.virtualfs.storage, decodedVfs)
                    }

                    pdfMake.fonts = {
                        Poppins: {
                            normal: 'Poppins-Regular.ttf',
                            bold: 'Poppins-Bold.ttf',
                            italics: 'Poppins-Medium.ttf',
                            bolditalics: 'Poppins-SemiBold.ttf'
                        }
                    }
                    const pdf = pdfMake.createPdf(docDef as any) as any
                    pdf.getBlob((blob: Blob) => {
                        clearTimeout(timeout)
                        console.log('PDF generated successfully via getBlob')
                        resolve(blob)
                    })
                } catch (e) {
                    clearTimeout(timeout)
                    console.error('PDF Generation Error:', e)
                    reject(e)
                }
            })

            await uploadToDrive(pdfBlob, `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, setSavingPdf, 'PDF')
        } catch (err: any) {
            console.error('Drive PDF Save Catch:', err)
            showToast('Drive hatası: ' + err.message, 'error')
            setSavingPdf(false)
        }
    }

    const saveAudioToDrive = async () => {
        if (!note || !note.audio_url) return;
        try {
            const audioRes = await fetch(note.audio_url);
            if (!audioRes.ok) throw new Error('Audio fetch failed');
            const audioBlob = await audioRes.blob()
            await uploadToDrive(audioBlob, `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`, setSavingAudio, 'Ses Kaydı')
        } catch (err: any) {
            showToast('Ses indirelemedi: ' + err.message, 'error')
        }
    }

    const exportMedia = async () => {
        if (!note || !note.media_urls || note.media_urls.length === 0) return;
        try {
            const url = note.media_urls[0];
            const res = await fetch(url);
            if (!res.ok) throw new Error('Media fetch failed');
            const blob = await res.blob();
            const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
            const a = document.createElement('url');
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch (err: any) {
            showToast('Medya dışa aktarılamadı: ' + err.message, 'error')
        }
    }

    const saveMediaToDrive = async () => {
        if (!note || !note.media_urls || note.media_urls.length === 0) return;
        try {
            const url = note.media_urls[0];
            const res = await fetch(url);
            if (!res.ok) throw new Error('Media fetch failed');
            const blob = await res.blob();
            const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
            await uploadToDrive(blob, `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`, setSavingAudio, 'Medya')
        } catch (err: any) {
            showToast('Medya Drive\'a kaydedilemedi: ' + err.message, 'error')
        }
    }

    const saveTranscriptToDrive = async () => {
        if (!note || !note.transcript) return;
        const blob = new Blob([note.transcript], { type: 'text/plain;charset=utf-8' })
        await uploadToDrive(blob, `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}_Transcript.txt`, setSavingTranscript, 'Transkript')
    }

    const saveSummaryToDrive = async () => {
        if (!note || !note.summary) return;
        const blob = new Blob([note.summary], { type: 'text/plain;charset=utf-8' })
        await uploadToDrive(blob, `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}_Summary.txt`, setSavingSummary, t_drive('summary'))
    }

    const deleteNote = async () => { 
        if (!note) return; 
        if (confirm(t_drive('delete_confirm'))) {
            await supabase.from('notes').delete().eq('id', note.id); 
            router.push('/') 
        }
    }
    const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    const togglePlay = () => { if (!audioRef.current) return; isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying) }
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => { if (!audioRef.current || !audioDuration) return; const rect = e.currentTarget.getBoundingClientRect(); audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioDuration }

    const tabs = [
        { key: 'summary', label: t('nav.summarize') }, { key: 'notes', label: t('nav.memory') }, { key: 'transcript', label: t('note.transcript') },
        ...(note?.media_urls && note.media_urls.length > 0 ? [{ key: 'media', label: t('nav.media') }] : []),
    ]

    if (loading) {
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
                <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            </>
        )
    }

    if (!note) return null

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                {note.audio_url && (
                    <audio ref={audioRef} src={note.audio_url}
                        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => {
                            let d = audioRef.current?.duration || 0;
                            if (d === Infinity && note.duration) {
                                const parts = note.duration.split(':').map(Number);
                                if (parts.length === 3) d = parts[0] * 3600 + parts[1] * 60 + parts[2];
                                else if (parts.length === 2) d = parts[0] * 60 + parts[1];
                            }
                            setAudioDuration(d);
                        }}
                        onEnded={() => setIsPlaying(false)} />
                )}
                <div className="page-content" style={{ paddingBottom: note.audio_url ? '6rem' : undefined }}>
                    {/* Note Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', width: '2rem', height: '2rem', background: 'var(--primary)', color: 'var(--primary-invert)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>arrow_back</span>
                        </Link>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Wois Note</h2>
                        <div style={{ marginLeft: 'auto' }}>
                            <button onClick={deleteNote} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', width: '2.5rem', height: '2.5rem', background: 'var(--bg-hover)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>delete</span>
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        {editingTitle ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveTitle()} autoFocus
                                    style={{ fontSize: '1.75rem', fontWeight: 800, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', width: '100%', fontFamily: 'var(--font-display)' }} />
                                <button onClick={saveTitle} className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>Save</button>
                            </div>
                        ) : (
                            <h1 onClick={() => setEditingTitle(true)} style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2, cursor: 'pointer' }} title="Click to edit">{note.title}</h1>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>calendar_today</span>
                                {new Date(note.created_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {note.duration && <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>• {note.duration}</span>}
                            <span style={{ fontSize: '0.625rem', background: 'var(--bg-hover)', color: 'var(--text-muted)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-default)', fontWeight: 700, textTransform: 'uppercase' }}>{note.type}</span>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            {note.type === 'media' && note.media_urls && note.media_urls.length > 0 ? (
                                <>
                                    <button onClick={exportMedia} className="btn-primary" style={{ gap: '0.5rem' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>download</span> Export Media
                                    </button>
                                    <button onClick={saveMediaToDrive} disabled={savingAudio} className="btn-primary" style={{ gap: '0.5rem', background: savingAudio ? 'var(--slate-400)' : 'var(--primary)', border: '1px solid var(--border-color)', color: savingAudio ? 'white' : 'white' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{savingAudio ? 'hourglass_empty' : 'cloud_upload'}</span>
                                        {savingAudio ? 'Saving...' : 'Save Media to Drive'}
                                    </button>
                                </>
                            ) : null}

                            {/* Show PDF Export only if there's textual content (transcript, summary, or personal notes). If it's pure media, hiding the PDF export until an AI summary is generated makes sense. */}
                            {(note.transcript || note.summary || note.personal_notes || note.type !== 'media') && (
                                <>
                                    <button onClick={exportPDF} className="btn-primary" style={{ gap: '0.5rem', background: note.type === 'media' ? 'var(--bg-surface)' : 'var(--primary)', color: note.type === 'media' ? 'var(--text-main)' : 'white', border: note.type === 'media' ? '1px solid var(--border-color)' : 'none' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>picture_as_pdf</span> {t_drive('export_pdf')}
                                    </button>
                                    <button onClick={savePdfToDrive} disabled={savingPdf} className="btn-primary" style={{ gap: '0.5rem', background: savingPdf ? 'var(--slate-400)' : (note.type === 'media' ? 'var(--bg-surface)' : 'var(--primary)'), border: note.type === 'media' && !savingPdf ? '1px solid var(--border-color)' : 'none', color: savingPdf ? 'white' : (note.type === 'media' ? 'var(--text-main)' : 'white') }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{savingPdf ? 'hourglass_empty' : 'cloud_upload'}</span>
                                        {savingPdf ? t_drive('saving') : t_drive('save_pdf')}
                                    </button>
                                </>
                            )}

                            {/* Always show Summarize if it hasn't been summarized yet but has content that can be (transcript or media) */}
                            {(!note.summary && (note.transcript || (note.media_urls && note.media_urls.length > 0))) && (
                                <button onClick={handleSummarize} disabled={summarizing} className="btn-primary" style={{ gap: '0.5rem', background: summarizing ? 'var(--slate-400)' : 'var(--primary)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{summarizing ? 'hourglass_empty' : 'auto_awesome'}</span>
                                    {summarizing ? 'Summarizing...' : 'AI Summarize'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', overflowX: 'auto' }}>
                            {tabs.map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    style={{ position: 'relative', padding: '0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-light)', background: 'none', border: 'none', whiteSpace: 'nowrap' }}>
                                    {tab.label}
                                    {activeTab === tab.key && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 3, background: 'var(--primary)', borderRadius: '1.5px 1.5px 0 0' }}></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'summary' && (
                        <div>
                            {note.summary ? (
                                <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className="material-symbols-outlined">auto_awesome</span> AI Summary
                                        </h3>
                                        <button onClick={saveSummaryToDrive} disabled={savingSummary} style={{ fontSize: '0.75rem', color: savingSummary ? 'var(--text-light)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{savingSummary ? 'hourglass_empty' : 'cloud_upload'}</span> Save to Drive
                                        </button>
                                    </div>
                                    <div style={{ color: 'var(--slate-700)', fontSize: '1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{note.summary}</div>
                                    <button onClick={handleSummarize} disabled={summarizing} style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>refresh</span> {summarizing ? 'Regenerating...' : 'Regenerate'}
                                    </button>
                                </div>
                            ) : (note.transcript || (note.media_urls && note.media_urls.length > 0)) ? (
                                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.75rem' }}>auto_awesome</span>
                                    <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No summary yet</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Generate an AI summary from your {note.media_urls?.length ? 'media' : 'transcript'}</p>
                                    <button onClick={handleSummarize} disabled={summarizing} className="btn-primary" style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{summarizing ? 'hourglass_empty' : 'auto_awesome'}</span>
                                        {summarizing ? 'Summarizing...' : 'Generate Summary'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }}>description</span>
                                    <p>No content available to summarize</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div style={{ position: 'relative' }}>
                            <textarea value={personalNotes} onChange={(e) => handleNotesChange(e.target.value)} placeholder="Write your personal notes here..."
                                style={{ width: '100%', minHeight: '400px', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', fontFamily: 'var(--font-display)', fontSize: '1rem', lineHeight: 1.8, resize: 'vertical', outline: 'none', color: 'var(--text-main)' }} />
                            {savingNotes && <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', background: 'var(--bg-hover)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-default)' }}>Saving...</div>}
                        </div>
                    )}

                    {activeTab === 'transcript' && (
                        <div>
                            {note.transcript ? (
                                <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="material-symbols-outlined">subtitles</span> Transcript</h3>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button onClick={saveTranscriptToDrive} disabled={savingTranscript} style={{ fontSize: '0.75rem', color: savingTranscript ? 'var(--text-light)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{savingTranscript ? 'hourglass_empty' : 'cloud_upload'}</span> Save to Drive
                                            </button>
                                            <button onClick={() => navigator.clipboard.writeText(note.transcript!)} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>content_copy</span> Copy
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--slate-700)', whiteSpace: 'pre-wrap' }}>{note.transcript}</p>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }}>subtitles_off</span>
                                    <p>No transcript available</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'media' && note.media_urls && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                            {note.media_urls.map((url, i) => (
                                <div key={i} style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                                    {url.match(/\.(mp4|webm|mov)/) ? (
                                        <video src={url} controls style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                                    ) : (
                                        <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Media ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} /></a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fixed Audio Player */}
                {note.audio_url && (
                    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0.75rem 1rem', zIndex: 50 }}>
                        <div style={{ maxWidth: '700px', margin: '0 auto', background: 'black', color: 'white', borderRadius: '1rem', boxShadow: 'var(--shadow-2xl)', padding: '0.75rem 1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div onClick={handleSeek} style={{ position: 'relative', width: '100%', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: '9999px', overflow: 'hidden', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%`, background: 'white', transition: 'width 0.1s' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <button onClick={togglePlay} style={{ width: '2rem', height: '2rem', background: 'white', color: 'black', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{isPlaying ? 'pause' : 'play_arrow'}</span>
                                    </button>
                                    <div>
                                        <p style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, fontWeight: 700 }}>Now Playing</p>
                                        <p style={{ fontSize: '0.6875rem', fontWeight: 600 }}>{note.title}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <button onClick={saveAudioToDrive} disabled={savingAudio} title="Save Audio to Drive" style={{ background: 'none', border: 'none', color: savingAudio ? 'rgba(255,255,255,0.3)' : 'white', cursor: savingAudio ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{savingAudio ? 'hourglass_empty' : 'cloud_upload'}</span>
                                    </button>
                                    <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', opacity: 0.6 }}>{formatTime(currentTime)} / {formatTime(audioDuration)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    )
}
