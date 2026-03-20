'use client';

import { useState, useRef, useCallback } from 'react';
import { useSafarStore } from '@/lib/store';
import { TripInput } from '@/lib/types';
import LandingPage from '@/components/LandingPage';
import TripDashboard from '@/components/TripDashboard';
import LoadingOverlay from '@/components/LoadingOverlay';
import { ChatPanel } from '@/components/ChatPanel';

type Message = {
    id: string;
    role: 'assistant' | 'user';
    text: string;
    isStreaming?: boolean;
};

export default function Home() {
    const {
        activeStep, isLoading,
        setIsLoading, setLoadingMessage, setActiveStep,
        setLocalitySplit, setAgentData, setItinerary, setBudget,
        setSelectedHotel, setTripInput,
        tripInput: storeTripInput, itinerary,
    } = useSafarStore();

    // 🔑 Chat state lives here — survives the view transition
    const [messages, setMessages] = useState<Message[]>([]);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [chatWidth, setChatWidth] = useState(320);

    // --- Planning pipeline (triggered by ChatPanel when LLM signals TRIP_READY) ---
    const handleTripReady = useCallback(async (tripData: any) => {
        const tripInput: TripInput = {
            destination: tripData.destination,
            source: tripData.source,
            departureDate: tripData.departureDate,
            returnDate: tripData.returnDate,
            budget: tripData.budget,
            preferences: tripData.preferences || [],
            maxHoursPerDay: 14,
            isDateFlexible: tripData.isDateFlexible || false,
            minDays: tripData.minDays || 3,
            maxDays: tripData.maxDays || 7,
            mustExclude: tripData.mustExclude || [],
            additionalNotes: tripData.additionalNotes || "",
        };

        setTripInput(tripInput);
        setIsLoading(true);
        setActiveStep('planning');

        try {
            setLoadingMessage('🧠 Initializing LangGraph Orchestrator...');
            
            // Send the entire trip intent to the unified backend LangGraph
            const orchestratorRes = await fetch('/api/orchestrator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...tripInput }),
            });
            const orchestratorData = await orchestratorRes.json();
            
            if (!orchestratorData.success) {
                throw new Error(orchestratorData.error || 'Orchestrator failed to compile itinerary');
            }

            setLoadingMessage('✨ Finalizing your itinerary...');

            // Map the unified LangGraph State Payload directly into Zustand
            setLocalitySplit(orchestratorData.localities || []);
            setAgentData(orchestratorData.agentData || {});
            
            const { setSuggestions } = useSafarStore.getState();
            setSuggestions(orchestratorData.suggestions || []);

            const finalItinerary = orchestratorData.itinerary;
            setItinerary(finalItinerary);
            
            // Sync budget and hotels from the compiled itinerary
            if (finalItinerary) {
                const totalVariables = finalItinerary.totalCost - finalItinerary.days.reduce((sum: number, dp: any) => sum + dp.totalCost, 0);
                const hotelMap: Record<string, any> = {};
                finalItinerary.days.forEach((dp: any) => {
                    if (dp.hotel) hotelMap[dp.locality] = dp.hotel;
                });

                for (const [locality, hotel] of Object.entries(hotelMap)) {
                    setSelectedHotel(locality, hotel as any);
                }
            }

            setActiveStep('results');
        } catch (error) {
            console.error('LangGraph orchestration failed:', error);
            setLoadingMessage('❌ Something went wrong. Please try again.');
            setTimeout(() => {
                setIsLoading(false);
                setActiveStep('input');
            }, 2000);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setLoadingMessage, setActiveStep, setLocalitySplit, setAgentData, setItinerary, setBudget, setSelectedHotel, setTripInput]);

    const isResults = activeStep === 'results';

    return (
        <>
            <style>{`
                @keyframes msgIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes blink { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
                @keyframes slideInLeft { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes fadeInMain { from { opacity: 0; } to { opacity: 1; } }
                .sidebar-anim { animation: slideInLeft 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
                .main-anim { animation: fadeInMain 0.6s ease forwards; }
                .collapse-btn { 
                    background: rgba(22,22,38,0.9); border: 1px solid rgba(99,102,241,0.2);
                    color: #818cf8; cursor: pointer; border-radius: 10px;
                    padding: 6px 10px; font-size: 12px; font-family: Inter,sans-serif;
                    display: flex; align-items: center; gap: 6px;
                    transition: all 0.2s; white-space: nowrap;
                }
                .collapse-btn:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); }
                .chat-sidebar {
                    transition: width 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
                }
            `}</style>

            {isLoading && <LoadingOverlay />}

            {/* PRE-RESULTS: Full-screen chat */}
            {activeStep === 'input' && (
                <LandingPage
                    messages={messages}
                    setMessages={setMessages}
                    onTripReady={handleTripReady}
                />
            )}

            {/* RESULTS: Side-by-side layout */}
            {isResults && (
                <div style={{
                    display: 'flex',
                    height: '100dvh',
                    background: 'var(--bg-primary)',
                }}>
                    {/* ── CHAT SIDEBAR ── */}
                    <div
                        className="chat-sidebar sidebar-anim"
                        style={{
                            width: isChatCollapsed ? 0 : chatWidth,
                            minWidth: isChatCollapsed ? 0 : chatWidth,
                            overflow: 'hidden',
                            borderRight: isChatCollapsed ? 'none' : '1px solid rgba(99,102,241,0.12)',
                            background: 'rgba(10,10,20,0.97)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                        }}
                    >
                        {!isChatCollapsed && (
                            <>
                                {/* Sidebar header */}
                                <div style={{
                                    padding: '14px 16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(20px)',
                                    flexShrink: 0,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12,
                                        }}>✈️</div>
                                        <span style={{
                                            fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700,
                                            background: 'linear-gradient(135deg, #f0f0ff, #e879f9)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                        }}>Safar AI</span>
                                    </div>
                                    <button
                                        className="collapse-btn"
                                        onClick={() => setIsChatCollapsed(true)}
                                        title="Collapse chat"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Hide
                                    </button>
                                </div>

                                {/* Chat content */}
                                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <ChatPanel
                                        messages={messages}
                                        setMessages={setMessages}
                                        onTripReady={handleTripReady}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── DRAG HANDLER ── */}
                    {!isChatCollapsed && (
                        <div
                            onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                const startX = e.clientX;
                                const startWidth = chatWidth;
                                const onMove = (moveEvent: PointerEvent) => {
                                    const newWidth = Math.max(250, Math.min(startWidth + (moveEvent.clientX - startX), 600));
                                    setChatWidth(newWidth);
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
                    )}

                    {/* ── ITINERARY MAIN AREA ── */}
                    {/* Uses flex column so the restore-bar + dashboard stack properly */}
                    <div className="main-anim" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                        {/* TripDashboard fills remaining height */}
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <TripDashboard
                                isChatCollapsed={isChatCollapsed}
                                setIsChatCollapsed={setIsChatCollapsed}
                                chatWidth={chatWidth}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
