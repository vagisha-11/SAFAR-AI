'use client';

import { useSafarStore } from '@/lib/store';

export default function ResiliencePanel() {
    const { suggestions, applySuggestion } = useSafarStore();

    if (suggestions.length === 0) return null;

    return (
        <div style={{
            margin: '20px 0',
            padding: '20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            animation: 'fadeIn 0.5s ease-out',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                    fontSize: 24, padding: '8px', borderRadius: '12px',
                    background: 'rgba(245,158,11,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    💡
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{
                        fontFamily: 'Outfit, sans-serif', fontWeight: 600,
                        fontSize: 16, color: '#f59e0b', marginBottom: 4
                    }}>Resilience Optimization</h4>
                    <p style={{ fontSize: 13, color: '#a0a0cc', lineHeight: 1.5 }}>
                        {suggestions[0].message}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                    onClick={() => useSafarStore.setState({ suggestions: [] })}
                    style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: 13,
                        background: 'transparent', border: '1px solid rgba(160,160,204,0.3)',
                        color: '#a0a0cc', cursor: 'pointer'
                    }}
                >
                    Keep as is
                </button>
                <button
                    onClick={() => applySuggestion(suggestions[0])}
                    className="btn-primary"
                    style={{
                        padding: '8px 20px', borderRadius: '8px', fontSize: 13,
                        background: '#f59e0b', border: 'none', color: '#0a0a1a', fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(245,158,11,0.2)', cursor: 'pointer'
                    }}
                >
                    ✨ Shorten Trip
                </button>
            </div>
        </div>
    );
}
