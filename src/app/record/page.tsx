'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastContext'
import { sanitizeFilename } from '@/lib/utils'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import LoginModal from '@/components/LoginModal'

import { supabase } from '@/lib/supabase'

export default function RecordPage() {
    const router = useRouter()
    const [savedNote, setSavedNote] = useState<{ id: string, title: string, transcript: string, audio_url: string | null, duration: string } | null>(null)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const { user } = useAuth()
    const { t } = useLanguage()
    const { showToast } = useToast()

    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [seconds, setSeconds] = useState(0)
    const [transcript, setTranscript] = useState('')
    const [saving, setSaving] = useState(false)
    const [transcribing, setTranscribing] = useState(false)
    const [noteTitle, setNoteTitle] = useState('')
    const [uploadMode, setUploadMode] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
    const secs = String(seconds % 60).padStart(2, '0')

    const startRecording = async () => {
        if (!user) {
            setShowLoginModal(true)
            return
        }
        try {
            // Default constraints let the browser apply AGC + noise suppression — amplifies quiet input
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []
            setSavedNote(null) // Reset previous result

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data)
            }

            mediaRecorder.start(250)
            setIsRecording(true)
            setIsPaused(false)
            setSeconds(0)
            setTranscript('')
            timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000)
        } catch (err) {
            showToast('Mikrofona erişilemedi. Lütfen izin verin.', 'error')
        }
    }

    const stopRecording = () => {
        return new Promise<Blob>((resolve) => {
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.onstop = () => {
                    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

                    streamRef.current?.getTracks().forEach(t => t.stop())
                    setIsRecording(false)
                    setIsPaused(false)
                    if (timerRef.current) clearInterval(timerRef.current)

                    resolve(audioBlob)
                }
                mediaRecorderRef.current.stop()
            }
        })
    }

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.pause()
            setIsPaused(true)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const resumeRecording = () => {
        if (mediaRecorderRef.current && isPaused) {
            mediaRecorderRef.current.resume()
            setIsPaused(false)
            timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000)
        }
    }

    const transcribeAudio = async (audioBlob: Blob) => {
        setTranscribing(true)
        try {
            console.log('Transcribing blob:', audioBlob.size, 'bytes, type:', audioBlob.type, 'chunks:', audioChunksRef.current.length)
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')
            const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.transcript !== undefined) {
                setTranscript(data.transcript)
                return data.transcript
            } else {
                showToast('Transkripsiyon başarısız: ' + (data.error || 'Bilinmeyen hata'), 'error')
                return null
            }
        } catch (err: any) {
            showToast('Transkripsiyon hatası: ' + err.message, 'error')
            return null
        } finally {
            setTranscribing(false)
        }
    }

    const saveNote = async (audioBlob: Blob, transcriptText: string) => {
        setSaving(true)
        try {
            const fileName = `recording_${Date.now()}.webm`
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('recordings')
                .upload(fileName, audioBlob, { contentType: 'audio/webm' })

            if (uploadError) console.error('Upload error:', uploadError)

            const audioUrl = uploadData
                ? supabase.storage.from('recordings').getPublicUrl(uploadData.path).data.publicUrl
                : null

            const durationStr = `${hours}:${minutes}:${secs}`
            const title = noteTitle.trim() || `${t('nav.voice_notes')} - ${new Date().toLocaleDateString('tr-TR')}`

            const { data: noteData, error: noteError } = await supabase.from('notes').insert({
                title, transcript: transcriptText, duration: durationStr, type: 'voice', audio_url: audioUrl,
                user_id: user?.id
            }).select().single()

            if (noteError) {
                showToast('Not kaydedilemedi: ' + noteError.message, 'error')
            } else {
                showToast('Ses notu başarıyla kaydedildi!', 'success')
                setSavedNote({
                    id: noteData.id,
                    title,
                    transcript: transcriptText,
                    audio_url: audioUrl,
                    duration: durationStr,
                })

                // Auto-sync to Google Drive if connected
                const googleToken = localStorage.getItem('google_access_token')
                if (googleToken) {
                    try {
                        const formData = new FormData()
                        // Use a proper File object for Drive upload
                        const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' })
                        formData.append('file', audioFile)
                        formData.append('accessToken', googleToken)
                        formData.append('fileName', title + '.webm') // Add context to filename

                        // Don't await the fetch so it uploads in background
                        fetch('/api/drive/upload', {
                            method: 'POST',
                            body: formData
                        }).catch(err => console.error('Auto-sync to Drive failed (network):', err))
                    } catch (err) {
                        console.error('Auto-sync to Drive failed (prep):', err)
                    }
                }
            }
        } catch (err: any) {
            showToast('Kaydetme hatası: ' + err.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleFinishRecording = async () => {
        const audioBlob = await stopRecording()
        const transcriptText = await transcribeAudio(audioBlob)
        if (transcriptText !== null) {
            await saveNote(audioBlob, transcriptText)
        } else {
            setSeconds(0)
            setNoteTitle('')
        }
    }

    const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setTranscribing(true)
        setSaving(true)
        try {
            const transcriptText = await transcribeAudio(file)
            if (transcriptText === null) return;
            
            const sanitizedName = sanitizeFilename(file.name)
            const fileName = `upload_${Date.now()}_${sanitizedName}`
            const { data: uploadData } = await supabase.storage
                .from('recordings')
                .upload(fileName, file, { contentType: file.type })

            const audioUrl = uploadData
                ? supabase.storage.from('recordings').getPublicUrl(uploadData.path).data.publicUrl
                : null

            const title = noteTitle.trim() || file.name.replace(/\.[^/.]+$/, '')
            const { data: noteData, error: noteError } = await supabase.from('notes').insert({
                title, transcript: transcriptText, type: 'upload', audio_url: audioUrl,
            }).select().single()

            if (noteError) { showToast('Not kaydedilemedi: ' + noteError.message, 'error') }
            else if (noteData) {
                showToast('Dosya başarıyla kaydedildi!', 'success')
                setSavedNote({
                    id: noteData.id,
                    title: title,
                    transcript: transcriptText || '',
                    audio_url: audioUrl,
                    duration: '',
                })

                // Auto-sync to Google Drive if connected
                const googleToken = localStorage.getItem('google_access_token')
                if (googleToken) {
                    try {
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('accessToken', googleToken)
                        formData.append('fileName', title + file.name.substring(file.name.lastIndexOf('.')))

                        // Upload in background
                        fetch('/api/drive/upload', {
                            method: 'POST',
                            body: formData
                        }).catch(err => console.error('Upload auto-sync to Drive failed:', err))
                    } catch (err) {
                        console.error('Drive sync failed:', err)
                    }
                }
            }
        } catch (err: any) {
            showToast('Hata: ' + err.message, 'error')
        } finally {
            setTranscribing(false)
            setSaving(false)
        }
    }

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop()
                streamRef.current?.getTracks().forEach(t => t.stop())
            }
        }
    }, [])

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                <div className="page-content">
                    {/* Page Title */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-invert)', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>graphic_eq</span>
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
                                {uploadMode ? 'Upload Audio' : 'Voice Recording'}
                            </h2>
                        </div>
                        <button
                            onClick={() => setUploadMode(!uploadMode)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{uploadMode ? 'mic' : 'upload_file'}</span>
                            {uploadMode ? t('record.recording_mode') : t('record.upload_mode')}
                        </button>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                        <input
                            type="text"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder={t('record.title_placeholder')}
                            style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, background: 'var(--bg-surface)' }}
                        />

                        {uploadMode ? (
                            /* UPLOAD MODE */
                            <div>
                                <div
                                    style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', cursor: 'pointer', textAlign: 'center', background: 'var(--bg-surface)', transition: 'all 0.2s' }}
                                    onClick={() => document.getElementById('audio-upload')?.click()}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: 'var(--text-light)', display: 'block', marginBottom: '1rem' }}>cloud_upload</span>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t('nav.upload')}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sürükleyip bırak veya tıkla</p>
                                    <p style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '0.5rem' }}>MP3, WAV, M4A, WebM, OGG, FLAC</p>
                                </div>
                                <input id="audio-upload" type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUploadAudio} />
                                {(transcribing || saving) && (
                                    <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <span className="material-symbols-outlined animate-pulse">hourglass_empty</span>
                                        <p style={{ marginTop: '0.5rem' }}>{transcribing ? t('common.loading') : t('common.save')}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                        /* RECORD MODE */
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            {/* Timer */}
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                {isRecording && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ position: 'relative', display: 'flex', width: '0.625rem', height: '0.625rem' }}>
                                            <span className="animate-ping" style={{ position: 'absolute', display: 'inline-flex', width: '100%', height: '100%', borderRadius: '9999px', backgroundColor: '#f87171', opacity: 0.75 }}></span>
                                            <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '9999px', width: '0.625rem', height: '0.625rem', backgroundColor: '#dc2626' }}></span>
                                        </span>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                                            {isPaused ? 'Paused' : 'Live Recording'}
                                        </span>
                                    </div>
                                )}
                                <h3 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                    {hours}:{minutes}:{secs}
                                </h3>
                            </div>

                            {/* Audio Visualizer - CSS animated, no WebAudio API */}
                            <style>{`
                                @keyframes wois-bar {
                                    0%, 100% { height: 4px; }
                                    50% { height: 48px; }
                                }
                            `}</style>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                height: '80px', padding: '0 1rem', marginBottom: '1.5rem',
                                background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)',
                                overflow: 'hidden',
                            }}>
                                {Array.from({ length: 36 }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: '3px',
                                            height: isRecording && !isPaused ? undefined : '4px',
                                            borderRadius: '9999px',
                                            backgroundColor: isRecording && !isPaused ? 'var(--primary)' : 'var(--slate-300)',
                                            opacity: isRecording && !isPaused ? 0.8 : 0.3,
                                            animation: isRecording && !isPaused
                                                ? `wois-bar ${0.5 + (i % 7) * 0.12}s ease-in-out ${(i * 0.04) % 0.5}s infinite`
                                                : 'none',
                                            minHeight: '4px',
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {isRecording && (
                                    <button
                                        onClick={isPaused ? resumeRecording : pauseRecording}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-xl)',
                                            background: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <span className="material-symbols-outlined">{isPaused ? 'play_arrow' : 'pause'}</span>
                                    </button>
                                )}
                                <button
                                    onClick={isRecording ? handleFinishRecording : startRecording}
                                    disabled={saving || transcribing}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '0.75rem', borderRadius: 'var(--radius-xl)', height: '3.5rem',
                                        background: (saving || transcribing) ? 'var(--slate-400)' : 'var(--primary)',
                                        color: 'var(--primary-invert)', fontWeight: 700, fontSize: '1rem',
                                    }}
                                >
                                    <span className="material-symbols-outlined">{isRecording ? 'stop_circle' : 'mic'}</span>
                                    {saving ? t('common.save') : transcribing ? t('common.loading') : isRecording ? t('record.finish_transcribe') : t('record.start_recording')}
                                </button>
                            </div>

                            {/* Transcript Result */}
                            {(transcribing || saving) && (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                    <span className="material-symbols-outlined animate-pulse">hourglass_empty</span>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                        {transcribing ? t('record.transcribing_with_whisper') : t('record.saving_to_supabase')}
                                    </p>
                                </div>
                            )}

                            {/* Saved Note Result - Inline */}
                            {savedNote && (
                                <div style={{ marginTop: '2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                    {/* Header */}
                                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-default)', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.25rem' }}>check_circle</span>
                                            </div>
                                            <div>
                                                <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{savedNote.title}</h4>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {savedNote.duration && `${savedNote.duration} • `}{t('common.success')}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/note/${savedNote.id}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', color: 'var(--primary-invert)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
                                            {t('record.go_to_note')}
                                        </Link>
                                    </div>

                                    {/* Audio Player */}
                                    {savedNote.audio_url && (
                                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                            <audio controls src={savedNote.audio_url} style={{ width: '100%', borderRadius: '8px', height: '40px' }} />
                                        </div>
                                    )}

                                    {/* Transcript */}
                                    <div style={{ padding: '1.25rem 1.5rem' }}>
                                        <h5 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>{t('note.transcript')}</h5>
                                        {savedNote.transcript ? (
                                            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-main)' }}>{savedNote.transcript}</p>
                                        ) : (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontStyle: 'italic' }}>{t('note.no_transcript')}</p>
                                        )}
                                    </div>

                                    {/* New Recording Button */}
                                    <div style={{ padding: '0 1.5rem 1.25rem' }}>
                                        <button
                                            onClick={() => { setSavedNote(null); setTranscript(''); setSeconds(0); setNoteTitle('') }}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>mic</span>
                                            {t('record.new_recording')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>

                    {/* Footer Info */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-light)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>mic</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Internal Mic</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-light)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>high_quality</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Groq Whisper</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-light)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>translate</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Türkçe</span>
                        </div>
                    </div>
                </div>
            </main>
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    )
}
