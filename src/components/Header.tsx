'use client'

import Link from 'next/link'
import { useTheme } from '@/components/ThemeContext'

export default function Header() {
    const { theme, toggleTheme } = useTheme()

    return (
        <header className="top-header">
            <div className="search-container">
                <span className="material-symbols-outlined">search</span>
                <input
                    className="search-input"
                    placeholder="Search voice notes..."
                    type="text"
                />
            </div>

            <div className="header-actions">
                <button className="btn-icon" onClick={toggleTheme} title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
                    <span className="material-symbols-outlined">
                        {theme === 'light' ? 'dark_mode' : 'light_mode'}
                    </span>
                </button>
                <Link href="/record" className="btn-primary">
                    <span className="material-symbols-outlined">add</span>
                    New Record
                </Link>
            </div>
        </header>
    )
}
