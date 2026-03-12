'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Locale = 'tr' | 'en'

interface LanguageContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

const translations = {
    tr: {
        'nav.dashboard': 'Dashboard',
        'nav.voice_notes': 'Ses Notları',
        'nav.upload': 'Yükle',
        'nav.summarize': 'Özetle',
        'nav.memory': 'Hafıza',
        'nav.google_drive': 'Google Drive',
        'header.search_placeholder': 'Ses notlarında ara...',
        'header.new_record': 'Yeni Kayıt',
        'dashboard.greeting_morning': 'Günaydın',
        'dashboard.greeting_day': 'İyi günler',
        'dashboard.greeting_evening': 'İyi akşamlar',
        'dashboard.subtitle': 'Ses aktivitenizin günlük özeti.',
        'dashboard.total_notes': 'Toplam Not',
        'dashboard.voice_memos': 'Ses Kayıtları',
        'dashboard.media_files': 'Medya Dosyaları',
        'dashboard.recent_notes': 'Son Notlar',
        'dashboard.no_notes': 'Henüz notunuz bulunmuyor.',
        'dashboard.no_notes_desc': 'Bir kayıt başlatın veya dosya yükleyin.',
        'dashboard.connected': 'BAĞLI',
        'dashboard.offline': 'ÇEVRİMDIŞI',
        'dashboard.active': 'Aktif',
        'dashboard.disconnected': 'Bağlı Değil',
        'dashboard.auto_sync': 'Otomatik senkronizasyon aktif',
        'dashboard.connect_now': 'Şimdi Bağlan',
        'dashboard.quick_actions': 'Hızlı İşlemler',
        'dashboard.record_voice': 'Ses Kaydet',
        'dashboard.record_desc': 'Kaydet & transkript et',
        'dashboard.upload_audio': 'Ses Yükle',
        'dashboard.upload_desc': 'Yükle & transkript et',
        'dashboard.upload_media_desc': 'Fotoğraflar & videolar',
        'dashboard.memory_desc': 'Tüm kaydedilenler',
        'dashboard.ai_summarization': 'AI Özetleme',
        'dashboard.ai_summarization_desc': 'Tek tıkla transkriptlerinizi özetleyin.',
        'auth.login_google': 'Google ile Giriş Yap',
        'auth.logout': 'Çıkış Yap',
        'auth.login_required_title': 'Giriş Yapmanız Gerekiyor',
        'auth.login_required_desc': 'Ses kaydı alabilmek veya notlarınızı saklayabilmek için lütfen Google hesabınızla giriş yapın.',
        'record.start': 'Kayda Başla',
        'record.stop': 'Bitir & Transkript Et',
        'record.pause': 'Duraklat',
        'record.resume': 'Devam Et',
        'record.title_placeholder': 'Not başlığı girin (isteğe bağlı)...',
        'record.upload_mode': 'Yükleme Modu',
        'record.recording_mode': 'Kayıt Modu',
        'record.finish_transcribe': 'Bitir & Transkript Et',
        'record.start_recording': 'Kayda Başla',
        'record.transcribing_with_whisper': 'Groq Whisper ile transkripsiyon yapılıyor...',
        'record.saving_to_supabase': 'Supabase\'e kaydediliyor...',
        'record.go_to_note': 'Nota Git',
        'record.new_recording': 'Yeni Kayıt Al',
        'upload.select_files_error': 'Lütfen en az bir dosya seçin',
        'upload.media_title': 'Medya Yükle',
        'upload.files_title': 'Dosya Yükle',
        'upload.drag_media': 'Fotoğraf & Video Sürükle',
        'upload.drag_files': 'Dosya Sürükle',
        'upload.or_click': 'veya tıkla',
        'upload.uploading': 'Yükleniyor...',
        'upload.button': 'Yükle & Kaydet',
        'note.notes_placeholder': 'Not ekle (opsiyonel)...',
        'note.transcript': 'Transkript',
        'note.no_transcript': 'Transkript bulunamadı',
        'common.loading': 'Yükleniyor...',
        'common.save': 'Kaydet',
        'common.error': 'Hata',
        'common.success': 'Başarılı',
    },
    en: {
        'nav.dashboard': 'Dashboard',
        'nav.voice_notes': 'Voice Notes',
        'nav.upload': 'Upload',
        'nav.summarize': 'Summarize',
        'nav.memory': 'Memory',
        'nav.google_drive': 'Google Drive',
        'header.search_placeholder': 'Search voice notes...',
        'header.new_record': 'New Record',
        'dashboard.greeting_morning': 'Good Morning',
        'dashboard.greeting_day': 'Good Day',
        'dashboard.greeting_evening': 'Good Evening',
        'dashboard.subtitle': 'Daily summary of your voice activity.',
        'dashboard.total_notes': 'Total Notes',
        'dashboard.voice_memos': 'Voice Memos',
        'dashboard.media_files': 'Media Files',
        'dashboard.recent_notes': 'Recent Notes',
        'dashboard.no_notes': 'You don\'t have any notes yet.',
        'dashboard.no_notes_desc': 'Start a recording or upload a file.',
        'dashboard.connected': 'CONNECTED',
        'dashboard.offline': 'OFFLINE',
        'dashboard.active': 'Active',
        'dashboard.disconnected': 'Disconnected',
        'dashboard.auto_sync': 'Auto-sync enabled',
        'dashboard.connect_now': 'Connect Now',
        'dashboard.quick_actions': 'Quick Actions',
        'dashboard.record_voice': 'Record Voice',
        'dashboard.record_desc': 'Record & transcribe',
        'dashboard.upload_audio': 'Upload Audio',
        'dashboard.upload_desc': 'Upload & transcribe',
        'dashboard.upload_media_desc': 'Photos & videos',
        'dashboard.memory_desc': 'All saved items',
        'dashboard.ai_summarization': 'AI Summarization',
        'dashboard.ai_summarization_desc': 'Summarize your transcripts with one click.',
        'auth.login_google': 'Login with Google',
        'auth.logout': 'Logout',
        'auth.login_required_title': 'Login Required',
        'auth.login_required_desc': 'Please login with your Google account to record audio or save your notes.',
        'record.start': 'Start Recording',
        'record.stop': 'Finish & Transcribe',
        'record.pause': 'Pause',
        'record.resume': 'Resume',
        'record.title_placeholder': 'Enter note title (optional)...',
        'record.upload_mode': 'Upload Mode',
        'record.recording_mode': 'Recording Mode',
        'record.finish_transcribe': 'Finish & Transcribe',
        'record.start_recording': 'Start Recording',
        'record.transcribing_with_whisper': 'Transcribing with Groq Whisper...',
        'record.saving_to_supabase': 'Saving to Supabase...',
        'record.go_to_note': 'Go to Note',
        'record.new_recording': 'New Recording',
        'upload.select_files_error': 'Please select at least one file',
        'upload.media_title': 'Upload Media',
        'upload.files_title': 'Upload Files',
        'upload.drag_media': 'Drag Photos & Videos',
        'upload.drag_files': 'Drag Files',
        'upload.or_click': 'or click',
        'upload.uploading': 'Uploading...',
        'upload.button': 'Upload & Save',
        'note.notes_placeholder': 'Add notes (optional)...',
        'note.transcript': 'Transcript',
        'note.no_transcript': 'No transcript found',
        'common.loading': 'Loading...',
        'common.save': 'Save',
        'common.error': 'Error',
        'common.success': 'Success',
    }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<Locale>('tr')

    useEffect(() => {
        const savedLocale = localStorage.getItem('locale') as Locale | null
        if (savedLocale) {
            setLocale(savedLocale)
        }
    }, [])

    const handleSetLocale = (newLocale: Locale) => {
        setLocale(newLocale)
        localStorage.setItem('locale', newLocale)
    }

    const t = (key: string): string => {
        return translations[locale][key as keyof typeof translations['tr']] || key
    }

    return (
        <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
