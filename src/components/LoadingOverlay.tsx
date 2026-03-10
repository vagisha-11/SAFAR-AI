'use client';

import { useSafarStore } from '@/lib/store';

export default function LoadingOverlay() {
    const { loadingMessage } = useSafarStore();

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 26, 0.9)',
            backdropFilter: 'blur(10px)',
        }}>
            {/* Animated rings */}
            <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 32 }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    border: '3px solid transparent',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 8,
                    border: '3px solid transparent',
                    borderTopColor: '#f59e0b',
                    borderRadius: '50%',
                    animation: 'spin 1.2s linear infinite reverse',
                }} />
                <div style={{
                    position: 'absolute', inset: 16,
                    border: '3px solid transparent',
                    borderTopColor: '#10b981',
                    borderRadius: '50%',
                    animation: 'spin 1.6s linear infinite',
                }} />
                {/* Center icon */}
                <div style={{
                    position: 'absolute', inset: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                }}>
                    ✈️
                </div>
            </div>

            {/* Agent status messages */}
            <h3 style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                fontSize: 20,
                color: '#f0f0ff',
                marginBottom: 8,
            }}>
                Crafting Your Perfect Trip
            </h3>
            <p style={{
                color: '#a0a0cc',
                fontSize: 14,
                textAlign: 'center',
                maxWidth: 400,
                lineHeight: 1.5,
            }}>
                {loadingMessage || 'Our AI agents are collaborating to build your itinerary...'}
            </p>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
                {['Agent A: Fetching Data', 'Agent B: Planning', 'Agent C: Budgeting'].map((label, i) => (
                    <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px',
                        borderRadius: 9999,
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        fontSize: 12,
                        color: '#818cf8',
                        animation: `fadeIn 0.5s ease-out ${i * 0.3}s both`,
                    }}>
                        <span style={{
                            width: 6, height: 6,
                            borderRadius: '50%',
                            background: ['#6366f1', '#f59e0b', '#10b981'][i],
                            animation: 'pulse-glow 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.5}s`,
                        }} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}
