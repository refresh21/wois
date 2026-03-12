'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
})

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, message, type }])

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 9999,
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="animate-fade-in-up"
                        style={{
                            background: 'var(--bg-surface)',
                            border: `1px solid ${toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : 'var(--border-color)'}`,
                            borderLeft: `4px solid ${toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : 'var(--primary)'}`,
                            color: 'var(--text-main)',
                            padding: '1rem 1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            minWidth: '300px',
                            maxWidth: '400px',
                            pointerEvents: 'auto',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{
                            color: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : 'var(--primary)',
                            fontSize: '1.25rem'
                        }}>
                            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
                        </span>
                        <p style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
                            {toast.message}
                        </p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', display: 'flex' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
