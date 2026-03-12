'use client'

import { sanitizeFilename } from '@/lib/utils'
import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useToast } from '@/components/ToastContext'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import LoginModal from '@/components/LoginModal'

function UploadContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { showToast } = useToast()
    const { user } = useAuth()
    const { t, locale } = useLanguage()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const isMediaMode = searchParams.get('type') === 'media'

    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [noteTitle, setNoteTitle] = useState('')
    const [noteText, setNoteText] = useState('')
    const [uploading, setUploading] = useState(false)
    const [transcribing, setTranscribing] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (selectedFiles: FileList | null) => {
        if (!selectedFiles) return
        const newFiles = Array.from(selectedFiles)
        setFiles(prev => [...prev, ...newFiles])
        newFiles.forEach(file => {
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                setPreviews(prev => [...prev, URL.createObjectURL(file)])
            } else {
                setPreviews(prev => [...prev, ''])
            }
        })
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        if (!user) {
            setShowLoginModal(true)
            return
        }
        if (files.length === 0) { showToast(t('upload.select_files_error'), 'error'); return }
        setUploading(true)
        setProgress(0)
        try {
            const mediaUrls: string[] = []
            let audioUrl: string | null = null
            let transcript: string | null = null

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const isAudio = file.type.startsWith('audio/')
                const bucket = isAudio ? 'recordings' : 'media'
                const sanitizedName = sanitizeFilename(file.name)
                const fileName = `${Date.now()}_${sanitizedName}`
                const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { contentType: file.type })
                if (error) { console.error('Upload error:', error); continue }
                const publicUrl = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
                if (isAudio) {
                    audioUrl = publicUrl
                    setTranscribing(true)
                    const formData = new FormData()
                    formData.append('audio', file, file.name)
                    const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
                    const resData = await res.json()
                    if (resData.transcript) transcript = resData.transcript
                    setTranscribing(false)
                } else {
                    mediaUrls.push(publicUrl)
                }
                setProgress(Math.round(((i + 1) / files.length) * 100))
            }

            const title = noteTitle.trim() || (isMediaMode ? `${t('nav.media')} - ${new Date().toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}` : `${t('nav.upload')} - ${new Date().toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}`)
            const { data: noteData, error: noteError } = await supabase.from('notes').insert({
                title, transcript: transcript || noteText || null, type: isMediaMode ? 'media' : 'upload',
                audio_url: audioUrl, media_urls: mediaUrls.length > 0 ? mediaUrls : null, personal_notes: noteText || null,
                user_id: user.id
            }).select().single()

            if (noteError) showToast('Kaydetme hatası: ' + noteError.message, 'error')
            else { showToast('Başarıyla yüklendi ve kaydedildi', 'success'); router.push(`/note/${noteData.id}`) }
        } catch (err: any) {
            showToast('Hata: ' + err.message, 'error')
        } finally {
            setUploading(false)
            setTranscribing(false)
        }
    }

    return (
        <>
            <Sidebar />
            <main className="main-area">
                <Header />
                <div className="page-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-invert)', padding: '0.5rem', borderRadius: 'var(--radius-default)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{isMediaMode ? 'photo_library' : 'upload_file'}</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
                            {isMediaMode ? t('upload.media_title') : t('upload.files_title')}
                        </h2>
                    </div>

                    <div style={{ maxWidth: '600px' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder={t('record.title_placeholder')}
                                style={{ width: '100%', fontSize: '1rem', fontWeight: 600, padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', outline: 'none', color: 'var(--text-main)' }} />
                        </div>

                        <div
                            style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '3rem 2rem', cursor: 'pointer', textAlign: 'center', background: 'var(--bg-surface)', marginBottom: '1.25rem' }}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)' }}
                            onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)' }}
                            onDrop={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; handleFileSelect(e.dataTransfer.files) }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.5rem' }}>cloud_upload</span>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                {isMediaMode ? t('upload.drag_media') : t('upload.drag_files')}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('upload.or_click')}</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept={isMediaMode ? 'image/*,video/*' : 'audio/*,image/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.webm'} multiple style={{ display: 'none' }} onChange={(e) => handleFileSelect(e.target.files)} />

                        {files.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                {files.map((file, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                        {previews[i] ? (
                                            <img src={previews[i]} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-default)' }} />
                                        ) : (
                                            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', borderRadius: 'var(--radius-default)' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{file.type.startsWith('audio/') ? 'audio_file' : 'insert_drive_file'}</span>
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                        <button onClick={() => removeFile(i)} style={{ color: 'var(--text-light)', padding: '0.25rem' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={t('note.notes_placeholder')}
                            style={{ width: '100%', minHeight: '100px', padding: '0.875rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', fontSize: '0.9375rem', lineHeight: 1.6, resize: 'vertical', outline: 'none', color: 'var(--text-main)', marginBottom: '1.25rem' }} />

                        <button onClick={handleUpload} disabled={uploading || files.length === 0}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', borderRadius: 'var(--radius-xl)', height: '3.25rem', background: uploading || files.length === 0 ? 'var(--slate-300)' : 'var(--primary)', color: 'var(--primary-invert)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                            {uploading ? (<><span className="material-symbols-outlined animate-pulse">hourglass_empty</span>{transcribing ? t('common.loading') : `${t('upload.uploading')} ${progress}%`}</>) : (<><span className="material-symbols-outlined">cloud_upload</span>{t('upload.button')}</>)}
                        </button>
                        {uploading && (
                            <div style={{ marginTop: '0.75rem' }}><div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div></div>
                        )}
                    </div>
                </div>
            </main>
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    )
}

export default function UploadPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>}>
            <UploadContent />
        </Suspense>
    )
}
