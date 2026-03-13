'use client'

import React from 'react'

interface FormattedTextProps {
    text: string
    style?: React.CSSProperties
    className?: string
}

/**
 * A robust component that converts basic Markdown syntax into HTML.
 * Handles: Headers (#, ##, ###), Bold (**), Italic (*), Lists (-), and HR (---).
 */
export default function FormattedText({ text, style, className }: FormattedTextProps) {
    if (!text) return null

    const lines = text.split('\n')

    const renderInline = (content: string) => {
        // Handle bold and italic (***text*** or **text** or *text*)
        // Using a non-greedy regex that works better across words
        const parts = content.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g)
        
        return parts.map((part, i) => {
            if (part.startsWith('***') && part.endsWith('***')) {
                return <strong key={i}><em>{part.slice(3, -3)}</em></strong>
            }
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i}>{part.slice(1, -1)}</em>
            }
            return <span key={i}>{part}</span>
        })
    }

    return (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...style }} className={className}>
            {lines.map((line, idx) => {
                const trimmed = line.trim()
                
                // Horizontal Rule
                if (trimmed === '---' || trimmed === '***') {
                    return <hr key={idx} style={{ margin: '1rem 0', opacity: 0.2, border: 'none', borderTop: '1px solid currentColor' }} />
                }

                // Headers
                if (trimmed.startsWith('### ')) {
                    return <h3 key={idx} style={{ fontSize: '1.25rem', fontWeight: 800, margin: '1.25rem 0 0.5rem', color: 'var(--text-main)' }}>
                        {renderInline(trimmed.slice(4))}
                    </h3>
                }
                if (trimmed.startsWith('## ')) {
                    return <h2 key={idx} style={{ fontSize: '1.5rem', fontWeight: 800, margin: '1.5rem 0 0.75rem', color: 'var(--text-main)' }}>
                        {renderInline(trimmed.slice(3))}
                    </h2>
                }
                if (trimmed.startsWith('# ')) {
                    return <h1 key={idx} style={{ fontSize: '1.875rem', fontWeight: 900, margin: '2rem 0 1rem', color: 'var(--text-main)' }}>
                        {renderInline(trimmed.slice(2))}
                    </h1>
                }

                // List items
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return (
                        <div key={idx} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                            <span>{renderInline(trimmed.slice(2))}</span>
                        </div>
                    )
                }

                // Empty line
                if (trimmed === '') {
                    return <div key={idx} style={{ minHeight: '0.75rem' }} />
                }

                // Regular Paragraph
                return <p key={idx} style={{ marginBottom: '0.75rem', lineHeight: 1.7 }}>{renderInline(line)}</p>
            })}
        </div>
    )
}
