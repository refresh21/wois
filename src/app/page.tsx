'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthContext'

interface Note {
  id: string
  title: string
  transcript: string | null
  summary: string | null
  duration: string | null
  type: string
  audio_url: string | null
  media_urls: string[]
  created_at: string
}

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, audioCount: 0, mediaCount: 0 })
  const [driveConnected, setDriveConnected] = useState(false)
  const { userName } = useAuth()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  useEffect(() => {
    fetchNotes()
    checkDriveStatus()
  }, [])

  const checkDriveStatus = () => {
    const token = localStorage.getItem('google_access_token')
    const expiry = localStorage.getItem('google_token_expiry')
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setDriveConnected(true)
    } else {
      setDriveConnected(false)
    }
  }

  const fetchNotes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
    } else {
      setNotes(data || [])
      const all = data || []
      setStats({
        total: all.length,
        audioCount: all.filter(n => n.audio_url).length,
        mediaCount: all.filter(n => n.media_urls && n.media_urls.length > 0).length,
      })
    }
    setLoading(false)
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id))
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      <Sidebar />
      <main className="main-area">
        <Header />
        <div className="page-content">
          <div className="animate-fade-in-up">
            <h2 className="welcome-title">{greeting}{userName ? `, ${userName}` : ''}</h2>
            <p className="welcome-subtitle">Ses aktivitenizin günlük özeti.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card animate-fade-in-up delay-100">
              <div className="stat-card-header">
                <span className="material-symbols-outlined">keyboard_voice</span>
                <span className="stat-badge">TOTAL</span>
              </div>
              <p className="stat-label">Total Notes</p>
              <h3 className="stat-value">{stats.total}</h3>
              <div className="stat-trend">
                <span className="material-symbols-outlined">trending_up</span>
                <span>{stats.audioCount} voice notes</span>
              </div>
            </div>
            <div className="stat-card animate-fade-in-up delay-200">
              <div className="stat-card-header">
                <span className="material-symbols-outlined">cloud_done</span>
                <span className="stat-badge">MEDIA</span>
              </div>
              <p className="stat-label">Media Files</p>
              <h3 className="stat-value">{stats.mediaCount}</h3>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${Math.min(stats.mediaCount * 10, 100)}%` }}></div>
              </div>
            </div>
            <div className="stat-card animate-fade-in-up delay-300">
              <div className="stat-card-header">
                <span className="material-symbols-outlined">add_to_drive</span>
                <span className="stat-badge" style={{ background: driveConnected ? 'var(--primary)' : 'var(--bg-hover)', color: driveConnected ? 'var(--primary-invert)' : 'var(--text-light)' }}>
                  {driveConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              <p className="stat-label">Google Drive</p>
              <h3 className="stat-value" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {driveConnected ? <><span className="material-symbols-outlined" style={{ color: '#10b981' }}>check_circle</span> Active</> : <><span className="material-symbols-outlined" style={{ color: '#ef4444' }}>error</span> Disconnected</>}
              </h3>
              <div className="stat-trend" style={{ color: 'var(--text-light)' }}>
                {driveConnected ? <span>Auto-sync enabled</span> : <Link href="/drive" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Connect Now</Link>}
              </div>
            </div>
          </div>

          <div className="content-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="section-heading">Recent Notes</h3>
                <Link href="/record" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>+ New</Link>
              </div>
              <div className="notes-list">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>hourglass_empty</span>
                    Loading...
                  </div>
                ) : notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }}>mic_off</span>
                    <p style={{ fontWeight: 600 }}>No notes yet</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Start a recording or upload a file</p>
                    <Link href="/record" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                      <span className="material-symbols-outlined">add</span> New Record
                    </Link>
                  </div>
                ) : (
                  notes.slice(0, 10).map((note) => (
                    <div key={note.id} className="note-item">
                      <Link href={`/note/${note.id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                        <div className="note-play-icon">
                          <span className="material-symbols-outlined">
                            {note.type === 'media' ? 'image' : note.audio_url ? 'play_arrow' : 'description'}
                          </span>
                        </div>
                        <div className="note-info">
                          <h4 className="note-title">{note.title}</h4>
                          <p className="note-meta">{formatDate(note.created_at)}{note.duration ? ` • ${note.duration}` : ''} • {note.type}</p>
                        </div>
                      </Link>
                      <div className="note-actions">
                        <button onClick={() => deleteNote(note.id)} title="Delete"><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="integrations-panel">
              <h3 className="section-heading">Quick Actions</h3>
              <div className="integration-card animate-fade-in-up">
                <Link href="/record" className="integration-item" style={{ cursor: 'pointer' }}>
                  <div className="integration-info">
                    <div className="integration-icon"><span className="material-symbols-outlined">mic</span></div>
                    <div><p className="integration-name">Record Voice</p><p className="integration-desc">Record & transcribe</p></div>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-light)' }}>arrow_forward</span>
                </Link>
                <Link href="/upload" className="integration-item" style={{ cursor: 'pointer' }}>
                  <div className="integration-info">
                    <div className="integration-icon"><span className="material-symbols-outlined">upload_file</span></div>
                    <div><p className="integration-name">Upload Audio</p><p className="integration-desc">Upload & transcribe</p></div>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-light)' }}>arrow_forward</span>
                </Link>
                <Link href="/upload?type=media" className="integration-item" style={{ cursor: 'pointer' }}>
                  <div className="integration-info">
                    <div className="integration-icon"><span className="material-symbols-outlined">photo_library</span></div>
                    <div><p className="integration-name">Upload Media</p><p className="integration-desc">Photos & videos</p></div>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-light)' }}>arrow_forward</span>
                </Link>
                <Link href="/memory" className="integration-item" style={{ cursor: 'pointer' }}>
                  <div className="integration-info">
                    <div className="integration-icon"><span className="material-symbols-outlined">inventory_2</span></div>
                    <div><p className="integration-name">Memory</p><p className="integration-desc">All saved items</p></div>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-light)' }}>arrow_forward</span>
                </Link>
              </div>

              <div className="pro-card animate-fade-in-up delay-300">
                <div style={{ position: 'relative', zIndex: 10 }}>
                  <p className="pro-card-label">AI POWERED</p>
                  <h4 className="pro-card-title">AI Summarization</h4>
                  <p className="pro-card-desc">Summarize your transcripts with one click.</p>
                </div>
                <div className="pro-card-wave">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="white"><path d="M0,50 Q25,0 50,50 T100,50 L100,100 L0,100 Z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
