'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatPanel } from './ChatPanel';

type Message = {
    id: string;
    role: 'assistant' | 'user';
    text: string;
    isStreaming?: boolean;
};

interface LandingPageProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    onTripReady: (tripData: any) => void;
}

// Curated Unsplash photos — dynamically scraped from live Indian collections. 40 guaranteed fresh IDs with no blank 404s.
const PHOTO_POOL = [
    { id: 'photo-1477587458883-47145ed94245', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1e3a8a,#1e40af)' },
    { id: 'photo-1491497895121-1334fc14d8c9', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#064e3b,#065f46)' },
    { id: 'photo-1496372412473-e8548ffd82bc', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#451a03,#713f12)' },
    { id: 'photo-1506461883276-594a12b11cf3', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
    { id: 'photo-1514222134-b57cbb8ce073', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#78350f,#d97706)' },
    { id: 'photo-1515091943-9d5c0ad475af', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#7c2d12,#b45309)' },
    { id: 'photo-1517330357046-3ab5a5dd42a1', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1c1917,#3f3f46)' },
    { id: 'photo-1519955266818-0231b63402bc', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#312e81,#4338ca)' },
    { id: 'photo-1524228529766-4d7fe5dc55ca', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0c4a6e,#0369a1)' },
    { id: 'photo-1524230507669-5ff97982bb5e', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#14532d,#166534)' },
    { id: 'photo-1524309784716-6a4be8299c7f', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#065f46,#047857)' },
    { id: 'photo-1524492412937-b28074a5d7da', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#134e4a,#0f766e)' },
    { id: 'photo-1524613032530-449a5d94c285', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#44403c,#78716c)' },
    { id: 'photo-1532375810709-75b1da00537c', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0c4a6e,#1d4ed8)' },
    { id: 'photo-1532664189809-02133fee698d', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#92400e,#b45309)' },
    { id: 'photo-1545126178-862cdb469409', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#f0f9ff,#0ea5e9)' },
    { id: 'photo-1548013146-72479768bada', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
    { id: 'photo-1557062975-96113e46608b', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
    { id: 'photo-1561042771-abb14f50b8f4', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1c1917,#3f3f46)' },
    { id: 'photo-1561359313-0639aad49ca6', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#14532d,#166534)' },
    { id: 'photo-1566816874952-efe670a52a9a', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#065f46,#059669)' },
    { id: 'photo-1566915682737-3e97a7eed93b', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#451a03,#713f12)' },
    { id: 'photo-1580818135730-ebd11086660b', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#14532d,#15803d)' },
    { id: 'photo-1582998451055-5ce52763e246', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#064e3b,#065f46)' },
    { id: 'photo-1583513645242-25a32d451084', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1e3a8a,#3730a3)' },
    { id: 'photo-1584455145637-f73a5b58f47f', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0c4a6e,#0891b2)' },
    { id: 'photo-1589983846997-04788035bc83', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1a1a4e,#3730a3)' },
    { id: 'photo-1590050752117-238cb0fb12b1', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#7c2d12,#b45309)' },
    { id: 'photo-1590622055142-4313e2f6935c', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#312e81,#4338ca)' },
    { id: 'photo-1591946522651-90fbace43004', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0c4a6e,#0891b2)' },
    { id: 'photo-1593693397690-362cb9666fc2', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
    { id: 'photo-1593693411515-c20261bcad6e', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' },
    { id: 'photo-1593872356907-d67e8587d0f9', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#14532d,#166534)' },
    { id: 'photo-1596901224267-67ca38199090', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#451a03,#92400e)' },
    { id: 'photo-1597735881932-d9664c9bbcea', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#9f1239,#db2777)' },
    { id: 'photo-1598518620362-52ff96e5dcc5', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)' },
    { id: 'photo-1602216056096-3b40cc0c9944', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#14532d,#15803d)' },
    { id: 'photo-1608412525748-e06621067e23', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#78350f,#d97706)' },
    { id: 'photo-1610817201767-793a9130ce07', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#713f12,#ca8a04)' },
    { id: 'photo-1621246935353-ff54e60ab837', label: 'Indian Landmark', grad: 'linear-gradient(135deg,#1e40af,#3b82f6)' },
];

const GRID_COLS = 4;
const ROWS_PER_COL = 5;

function getShuffled<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

function buildGrid(pool: typeof PHOTO_POOL) {
    // Shuffle the pool and take exactly GRID_COLS * ROWS_PER_COL unique entries — no repeats possible
    const total = GRID_COLS * ROWS_PER_COL;
    const shuffled = getShuffled(pool);
    // If pool is large enough (>=20), just slice — guaranteed unique
    return shuffled.slice(0, total);
}

// ── Travel backdrop grid ─────────────────────────────────────────────────────
function TravelBackdrop({ interactionCount }: { interactionCount: number }) {
    // SSR output strictly uses the first 20 items so the HTML payload perfectly matches the hydration pass
    const [grid, setGrid] = useState<typeof PHOTO_POOL>(() => PHOTO_POOL.slice(0, GRID_COLS * ROWS_PER_COL));
    const [mounted, setMounted] = useState(false);
    const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
    const prevCount = useRef(interactionCount);

    useEffect(() => {
        setGrid(buildGrid(PHOTO_POOL));
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || interactionCount === prevCount.current) return;
        prevCount.current = interactionCount;
        const positions = Array.from({ length: GRID_COLS * ROWS_PER_COL }, (_, i) => i);
        const toSwap = getShuffled(positions).slice(0, 3);
        toSwap.forEach((pos, i) => {
            setTimeout(() => {
                setSwappingIdx(pos);
                setTimeout(() => {
                    setGrid(prev => {
                        const next = [...prev];
                        // Build a set of ALL ids currently displayed in the grid
                        const displayedIds = new Set(prev.map(p => p.id));
                        // Eligible = photos not displayed anywhere in the grid right now
                        const available = PHOTO_POOL.filter(p => !displayedIds.has(p.id));
                        if (available.length === 0) return next; // grid is full of all unique photos, no-op
                        next[pos] = available[Math.floor(Math.random() * available.length)];
                        return next;
                    });
                    setSwappingIdx(null);
                }, 400);
            }, i * 180);
        });
    }, [interactionCount, mounted]);

    const cols: typeof PHOTO_POOL[] = Array.from({ length: GRID_COLS }, (_, c) =>
        grid.slice(c * ROWS_PER_COL, (c + 1) * ROWS_PER_COL)
    );
    const rowHeights = [22, 18, 26, 16, 18];

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'flex', gap: 4, padding: 4, overflow: 'hidden' }}>
            {cols.map((col, ci) => (
                <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginTop: ci % 2 === 1 ? '-4%' : '0' }}>
                    {col.map((photo, ri) => {
                        const globalIdx = ci * ROWS_PER_COL + ri;
                        const isSwapping = swappingIdx === globalIdx;
                        const animDelay = (ci * 0.08 + ri * 0.06).toFixed(2);
                        return (
                            <div key={`${photo.id}-${globalIdx}`} style={{
                                flex: `0 0 ${rowHeights[ri % rowHeights.length]}%`,
                                borderRadius: 12, overflow: 'hidden', position: 'relative',
                                transition: 'opacity 0.4s ease, transform 0.4s ease',
                                // Gradient fallback colour shown when image fails
                                background: photo.grad,
                                opacity: isSwapping ? 0 : 1,
                                transform: isSwapping ? 'scale(0.96)' : 'scale(1)',
                                animation: `gridItemIn 0.7s ${animDelay}s cubic-bezier(0.16,1,0.3,1) both`,
                            }}>
                                <img
                                    src={`https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=480&q=75`}
                                    alt={photo.label}
                                    loading="lazy"
                                    onError={(e) => {
                                        // Hide broken img; parent div's gradient shows through
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                        animation: `kenBurns ${14 + (globalIdx % 5) * 3}s ease-in-out infinite alternate`,
                                    }}
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,4,14,0.1) 0%, rgba(4,4,14,0.38) 100%)' }} />
                            </div>

                        );
                    })}
                </div>
            ))}
            {/* Full-screen overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,14,0.72)', backdropFilter: 'blur(2px)' }} />
        </div>
    );
}

// ── Intro phases ─────────────────────────────────────────────────────────────
// 'splash'  → centered logo only, fills screen
// 'rise'    → logo rises + shrinks toward header (CSS transition)
// 'chat'    → normal layout, header stays in place, chat fades in
type IntroPhase = 'splash' | 'rise' | 'chat';

export default function LandingPage({ messages, setMessages, onTripReady }: LandingPageProps) {
    const [phase, setPhase] = useState<IntroPhase>('splash');
    const [interactionCount, setInteractionCount] = useState(0);
    const [isChatActive, setIsChatActive] = useState(false);
    const prevMsgLen = useRef(messages.length);

    // Drive the intro sequence
    useEffect(() => {
        // Phase 1 → 2: show splash for 1.8 s, then start rising
        const t1 = setTimeout(() => setPhase('rise'), 1800);
        // Phase 2 → 3: rise animation takes ~0.7 s, then reveal chat
        const t2 = setTimeout(() => setPhase('chat'), 2600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Count interactions to trigger image swaps
    useEffect(() => {
        if (messages.length > prevMsgLen.current) {
            setInteractionCount(c => c + 1);
        }
        prevMsgLen.current = messages.length;
    }, [messages.length]);

    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

            <style>{`
                @keyframes gridItemIn {
                    from { opacity: 0; transform: scale(0.88) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes kenBurns {
                    from { transform: scale(1) translate(0, 0); }
                    to   { transform: scale(1.12) translate(-2%, -2%); }
                }
                @keyframes splashLogoIn {
                    0%   { opacity: 0; transform: scale(0.7) translateY(30px); }
                    60%  { opacity: 1; transform: scale(1.04) translateY(-4px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes splashSubIn {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes msgIn {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes blink { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
                @keyframes chatReveal {
                    from { opacity: 0; transform: translateY(32px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes headerReveal {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes pulseRing {
                    0%   { box-shadow: 0 0 0 0 rgba(217,70,239,0.4); }
                    70%  { box-shadow: 0 0 0 22px rgba(217,70,239,0); }
                    100% { box-shadow: 0 0 0 0 rgba(217,70,239,0); }
                }
            `}</style>

            {/* ── TRAVEL PHOTO GRID BACKDROP ── */}
            <TravelBackdrop interactionCount={interactionCount} />

            {/* ════════════════════════════════════════
                SPLASH PHASE — centered logo
            ════════════════════════════════════════ */}
            {(phase === 'splash' || phase === 'rise') && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 20,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    // During 'rise', animate the whole block upward and shrink it
                    transition: phase === 'rise'
                        ? 'transform 0.75s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease'
                        : 'none',
                    transform: phase === 'rise' ? 'translateY(-38vh) scale(0.45)' : 'translateY(0) scale(1)',
                    opacity: phase === 'rise' ? 0 : 1,
                    transformOrigin: 'center top',
                    pointerEvents: 'none',
                }}>
                    <img
                        src="/erasebg-transformed.png"
                        alt="Safar Logo"
                        style={{
                            width: 360, height: 'auto', objectFit: 'contain',
                            filter: 'drop-shadow(0 0 50px rgba(99,102,241,0.6))',
                        }}
                    />
                </div>
            )}

            {/* ════════════════════════════════════════
                CHAT PHASE — normal header + chat
            ════════════════════════════════════════ */}

            {/* Header — fades in once splash is done */}
            <header style={{
                padding: '16px 28px', position: 'relative', zIndex: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(4,4,14,0.55)',
                backdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
                opacity: phase === 'chat' ? 1 : 0,
                transition: 'opacity 0.5s ease',
                animation: phase === 'chat' ? 'headerReveal 0.5s ease forwards' : 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 340, height: 48 }}>
                    {/* Tagline */}
                    <div style={{
                        position: 'absolute', left: 0, top: '50%',
                        transform: `translateY(-50%) ${isChatActive ? 'translateY(-10px)' : 'translateY(0)'}`,
                        opacity: isChatActive ? 0 : 1,
                        transition: 'opacity 0.4s ease, transform 0.4s ease',
                        fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 500,
                        color: 'rgba(255,255,255,0.9)', fontStyle: 'italic',
                        whiteSpace: 'nowrap',
                        pointerEvents: isChatActive ? 'none' : 'auto',
                    }}>
                        "Safar khoobsurat hai manzil se bhi!"
                    </div>

                    {/* Logo (Fades in when typing starts) */}
                    <img
                        src="/erasebg-transformed.png"
                        alt="Safar Logo"
                        style={{ 
                            position: 'absolute', left: 0, top: '50%',
                            height: 48, width: 'auto', objectFit: 'contain',
                            transform: `translateY(-50%) ${isChatActive ? 'translateY(0)' : 'translateY(10px)'}`,
                            opacity: isChatActive ? 1 : 0,
                            transition: 'opacity 0.4s ease, transform 0.4s ease',
                            pointerEvents: isChatActive ? 'auto' : 'none',
                        }}
                    />
                </div>
                
                {/* User Profile Outline Appended to Header Right */}
                <div style={{
                    minWidth: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background 0.2s',
                    color: 'rgba(255,255,255,0.8)'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                </div>
            </header>

            {/* Chat panel — slides up after splash */}
            <div style={{
                flex: 1,
                minHeight: 0,          /* ← CRITICAL: allows flex child to shrink below content size */
                position: 'relative', zIndex: 5,
                display: 'flex', flexDirection: 'column',
                maxWidth: 800, width: '100%', margin: '0 auto',
                padding: '20px 20px 0',
                opacity: phase === 'chat' ? 1 : 0,
                transform: phase === 'chat' ? 'translateY(0)' : 'translateY(40px)',
                transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)',
                pointerEvents: phase === 'chat' ? 'auto' : 'none',
            }}>
                {/* Frosted glass card */}
                <div style={{
                    flex: 1,
                    minHeight: 0,      /* ← CRITICAL: same reason */
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(8,8,22,0.65)',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '24px 24px 0 0',
                    overflow: 'hidden',
                    boxShadow: '0 -4px 60px rgba(99,102,241,0.12), 0 0 0 1px rgba(255,255,255,0.04)',
                }}>
                    <ChatPanel
                        messages={messages}
                        setMessages={setMessages}
                        onTripReady={onTripReady}
                        fontSize={16}
                        onActiveChange={setIsChatActive}
                    />
                </div>
            </div>

            {/* Footer hint */}
            <div style={{
                position: 'relative', zIndex: 10,
                padding: '10px', textAlign: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
                background: 'rgba(4,4,14,0.6)',
                backdropFilter: 'blur(20px)',
                maxWidth: 800, width: '100%', margin: '0 auto',
                borderRadius: '0 0 20px 20px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                opacity: phase === 'chat' ? 1 : 0,
                transition: 'opacity 0.5s 0.3s ease',
            }}>
                ✨ Safar is AI and can make mistakes.
            </div>
        </div>
    );
}
