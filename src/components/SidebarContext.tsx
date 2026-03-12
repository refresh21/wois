'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
    isOpen: boolean
    toggleSidebar: () => void
    closeSidebar: () => void
    openSidebar: () => void
    isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024
            setIsMobile(mobile)
            if (mobile) {
                setIsOpen(false)
            } else {
                setIsOpen(true)
            }
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const toggleSidebar = () => setIsOpen(!isOpen)
    const closeSidebar = () => setIsOpen(false)
    const openSidebar = () => setIsOpen(true)

    return (
        <SidebarContext.Provider value={{ isOpen, toggleSidebar, closeSidebar, openSidebar, isMobile }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}
