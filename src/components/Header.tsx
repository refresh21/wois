'use client'

import Link from 'next/link'
import { useSidebar } from '@/components/SidebarContext'

export default function Header() {
    const { isOpen, toggleSidebar, isMobile } = useSidebar()

    return (
        <header className="top-header">
            <div className="header-left">
                <button 
                    className="btn-icon" 
                    onClick={toggleSidebar}
                    aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <span className="material-symbols-outlined">
                        {isOpen ? 'menu_open' : 'menu'}
                    </span>
                </button>
                
                {!isMobile && (
                    <div className="search-container">
                        <span className="material-symbols-outlined">search</span>
                        <input
                            className="search-input"
                            placeholder="Search voice notes..."
                            type="text"
                        />
                    </div>
                )}
            </div>

            <div className={`header-center ${!isOpen || isMobile ? 'visible' : ''}`}>
                <span className="logo-text">Wois</span>
            </div>

            <div className="header-actions">
                <Link href="/record" className="btn-primary">
                    <span className="material-symbols-outlined">add</span>
                    {isMobile ? '' : 'New Record'}
                </Link>
            </div>
        </header>
    )
}
