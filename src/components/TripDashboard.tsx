'use client';

import { useState, useEffect, useRef } from 'react';
import { useSafarStore } from '@/lib/store';
import dynamic from 'next/dynamic';
import ItineraryPanel from './ItineraryPanel';
import BudgetPanel from './BudgetPanel';
import HotelList from './HotelList';
import TravelOptions from './TravelOptions';
import ResiliencePanel from './ResiliencePanel';
import SpotExplorer from './SpotExplorer';

// Leaflet must be loaded client-side only (no SSR)
const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface TripDashboardProps {
    isChatCollapsed: boolean;
    setIsChatCollapsed: (val: boolean) => void;
    chatWidth: number;
}

export default function TripDashboard({ isChatCollapsed, setIsChatCollapsed, chatWidth }: TripDashboardProps) {
    const { tripInput, itinerary, selectedDay, setSelectedDay, reset, currentCost } = useSafarStore();
    const [rightPanelWidth, setRightPanelWidth] = useState(420);
    const prevCollapsedRef = useRef(isChatCollapsed);

    useEffect(() => {
        if (isChatCollapsed !== prevCollapsedRef.current) {
            if (isChatCollapsed) {
                setRightPanelWidth(prev => prev + chatWidth);
            } else {
                setRightPanelWidth(prev => Math.max(420, prev - chatWidth));
            }
            prevCollapsedRef.current = isChatCollapsed;
        }
    }, [isChatCollapsed, chatWidth]);

    if (!itinerary || !tripInput) return null;

    const totalDays = itinerary.days.length;

    return (
        // This component fills whatever container page.tsx gives it.
        // The container in page.tsx must be: flex, flexDirection: column, height: 100%, overflow: hidden
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── TOP NAVIGATION BAR ── */}
            {/* z-index 50 keeps it ABOVE leaflet tiles (z ~= 400 internally, but the map div clips it) */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
                background: 'rgba(10,10,26,0.98)',
                backdropFilter: 'blur(20px)',
                flexShrink: 0,          // ← never shrink; header always visible
                zIndex: 50,
                position: 'relative',   // ← establishes stacking context above map
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => reset()}
                        className="btn-icon"
                        title="Start a new trip"
                    >
                        ←
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44 }}>
                            <span style={{ color: '#a0a0cc', fontSize: 14, fontWeight: 500 }}>
                                {tripInput.source} → {tripInput.destination}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b6b99' }}>
                            {new Date(tripInput.departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {' — '}
                            {new Date(tripInput.returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{totalDays} days
                        </div>
                    </div>
                </div>

                {/* Day Selector - Horizontally Scrollable */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    overflowX: 'auto', maxWidth: '40%', padding: '4px 0',
                    scrollbarWidth: 'none',
                }}>
                    <button
                        onClick={() => setSelectedDay(null)}
                        className={selectedDay === null ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '7px 14px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        Entire Trip
                    </button>
                    {itinerary.days.map(day => (
                        <button
                            key={day.dayNumber}
                            onClick={() => setSelectedDay(day.dayNumber)}
                            className={selectedDay === day.dayNumber ? 'btn-primary' : 'btn-secondary'}
                            style={{ padding: '7px 12px', fontSize: 13, minWidth: 36, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            D{day.dayNumber}
                        </button>
                    ))}
                </div>

                {/* Budget summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#6b6b99', textTransform: 'uppercase', letterSpacing: 1 }}>Budget</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#818cf8' }}>
                            ₹{tripInput.budget.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'rgba(99,102,241,0.15)' }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#6b6b99', textTransform: 'uppercase', letterSpacing: 1 }}>Cost</div>
                        <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: currentCost > tripInput.budget ? '#ef4444' : '#10b981',
                        }}>
                            ₹{currentCost.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'rgba(99,102,241,0.15)' }} />
                    <div style={{
                        minWidth: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'background 0.2s',
                        color: 'rgba(255,255,255,0.8)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    title="User Login"
                    >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                </div>
            </header>

            {/* ── RESTORE CHAT BAR ── */}
            {isChatCollapsed && (
                <div style={{
                    flexShrink: 0, padding: '8px 20px',
                    background: 'rgba(10,10,20,0.95)',
                    borderBottom: '1px solid rgba(99,102,241,0.12)',
                    display: 'flex', alignItems: 'center',
                }}>
                    <button
                        className="collapse-btn"
                        onClick={() => setIsChatCollapsed(false)}
                        style={{
                            background: 'rgba(22,22,38,0.9)', border: '1px solid rgba(99,102,241,0.2)',
                            color: '#818cf8', cursor: 'pointer', borderRadius: '10px',
                            padding: '6px 10px', fontSize: '12px', fontFamily: 'Inter,sans-serif',
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        Show Chat
                    </button>
                </div>
            )}

            {/* ── MAIN CONTENT AREA ── */}
            {/* flex: 1, minHeight: 0 is the key — lets children control their own scroll */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

                {/* Left Panel — Map */}
                {/* flex: 1 fills remaining space. overflow: hidden clips the Leaflet canvas */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <MapView />
                </div>

                {/* ── DRAG HANDLER ── */}
                <div
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const startX = e.clientX;
                        const startWidth = rightPanelWidth;
                        const onMove = (moveEvent: PointerEvent) => {
                            const newWidth = Math.max(300, Math.min(startWidth - (moveEvent.clientX - startX), 1000));
                            setRightPanelWidth(newWidth);
                        };
                        const onUp = (upEvent: PointerEvent) => {
                            e.currentTarget?.releasePointerCapture(upEvent.pointerId);
                            window.removeEventListener('pointermove', onMove);
                            window.removeEventListener('pointerup', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                    }}
                    style={{
                        width: 12, cursor: 'col-resize', background: 'transparent',
                        zIndex: 100, marginLeft: -6, marginRight: -6,
                        position: 'relative'
                    }}
                />

                {/* Right Panel — Itinerary + Hotels + Budget */}
                <div style={{
                    width: rightPanelWidth,
                    borderLeft: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(17,17,40,0.98)',
                    minHeight: 0,        // ← allow flex child to shrink below content height
                    overflow: 'hidden',  // ← clip; actual scroll is on the inner div
                }}>
                    {/* Scrollable content area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', minHeight: 0 }}>
                        <ItineraryPanel />
                        <div style={{ marginTop: 20 }}><ResiliencePanel /></div>
                        <div style={{ marginTop: 20 }}><SpotExplorer /></div>
                        <div style={{ marginTop: 20 }}><TravelOptions /></div>
                        <div style={{ marginTop: 20 }}><HotelList /></div>
                        <div style={{ marginTop: 20, marginBottom: 20 }}><BudgetPanel /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
