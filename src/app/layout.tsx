import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthContext'
import { ToastProvider } from '@/components/ToastContext'
import { SidebarProvider } from '@/components/SidebarContext'

export const metadata: Metadata = {
  title: 'Wois - Voice Dashboard',
  description: 'Wois: Voice recording, transcription, and memory tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body>
        <SidebarProvider>
          <ToastProvider>
            <AuthProvider>
              <div className="app-layout">
                {children}
              </div>
            </AuthProvider>
          </ToastProvider>
        </SidebarProvider>
      </body>
    </html>
  )
}
