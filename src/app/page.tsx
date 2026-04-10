'use client';

import { useState, useRef, useCallback } from 'react';
import { useSafarStore } from '@/lib/store';
import { TripInput } from '@/lib/types';
import LandingPage from '@/components/LandingPage';
import TripDashboard from '@/components/TripDashboard';
import LoadingOverlay from '@/components/LoadingOverlay';
import { ChatPanel } from '@/components/ChatPanel';


// Destination-keyed fun facts (fallback to general India facts)
const FUN_FACTS: Record<string, string[]> = {
    default: [
        "India has the largest number of vegetarians in the world — nearly 40% of the population!",
        "The game of Chess was invented in India around the 6th century AD.",
        "India is the world's largest democracy with over 900 million eligible voters.",
        "The number zero was invented by the Indian mathematician Brahmagupta in 628 AD.",
        "India has the most post offices in the world — over 155,000 of them!",
    ],
    jaipur: [
        "Jaipur is called the Pink City because Maharaja Ram Singh painted the entire old city pink in 1876 to welcome the Prince of Wales.",
        "The Amber Fort in Jaipur took over 100 years to build and was completed in 1727.",
        "Jaipur was the first planned city of India, designed in 1727 by Maharaja Sawai Jai Singh II.",
        "The Hawa Mahal has 953 small windows designed so royal ladies could observe street festivals without being seen.",
        "Jaipur is one of the few cities in Asia with an underground drainage system from the 18th century.",
    ],
    goa: [
        "Goa has the highest per-capita income among all Indian states.",
        "Goa was a Portuguese colony for 451 years — longer than India was under British rule.",
        "The Basilica of Bom Jesus in Goa holds the remains of St. Francis Xavier and is a UNESCO World Heritage Site.",
        "Goa has over 100 km of stunning coastline with more than 40 beaches.",
        "Goa liberalized from Portugal and joined India only in 1961, 14 years after Independence.",
    ],
    kerala: [
        "Kerala has India's highest literacy rate at over 96%, the highest in the country.",
        "Kerala is home to the world's longest canoe race — the Nehru Trophy Boat Race on Punnamada Lake.",
        "Ayurveda, the ancient Indian system of medicine, originated in Kerala over 3,000 years ago.",
        "Kerala's backwaters span over 900 km of waterways, lagoons, lakes, and canals.",
        "Kerala is nicknamed 'God's Own Country' and is one of the top 10 paradises in the world by National Geographic.",
    ],
    delhi: [
        "Delhi has been the capital of at least 8 major empires in over 5,000 years of history.",
        "The Qutub Minar in Delhi is the tallest brick minaret in the world at 73 metres.",
        "Delhi Metro is one of the largest and busiest metro systems in the world.",
        "India Gate in Delhi commemorates 84,000 Indian soldiers who died in the First World War.",
        "Humayun's Tomb in Delhi preceded the Taj Mahal and was its primary inspiration.",
    ],
    mumbai: [
        "Mumbai is built on what was originally seven separate islands — they were joined by land reclamation projects.",
        "The Dharavi slum in Mumbai has one of the highest population densities in the world — over 300,000 people per km².",
        "Mumbai's Dabbawala system delivers over 200,000 lunches daily with an accuracy rate of near 99.99%.",
        "The Gateway of India was built to commemorate the visit of King George V and Queen Mary in 1911.",
        "Mumbai's local train network carries over 7.5 million passengers daily — more than most countries' entire rail systems.",
    ],
    agra: [
        "The Taj Mahal took 22 years and over 20,000 artisans to build between 1632 and 1653.",
        "The Taj Mahal appears to change color depending on the time of day — pinkish in the morning, white at noon, golden at sunset.",
        "Agra Fort was used as both a palace and a prison — Shah Jahan spent the last 8 years of his life imprisoned here with a view of the Taj Mahal.",
        "Emperor Shah Jahan built the Taj Mahal as a mausoleum for his beloved wife Mumtaz Mahal who died in 1631.",
        "It is said the minarets of the Taj Mahal were built at a slight outward angle so they would fall away from the main tomb if an earthquake struck.",
    ],
    manali: [
        "Manali was named after Manu, the Hindu law-giver, who is believed to have saved humanity from a great flood here.",
        "The Rohtang Pass near Manali is one of the highest motorable mountain passes in the world at 3,978 metres.",
        "Solang Valley near Manali is known as the 'Snow Point' and offers skiing, zorbing, and paragliding year-round.",
        "The Hidimba Devi Temple in Manali is over 500 years old and dedicated to the wife of Bhima from the Mahabharata.",
        "Manali experiences temperatures as low as -15°C in winter, making it one of the coldest inhabited places in India.",
    ],
};

function getFunFacts(destination: string): string[] {
    const key = destination.toLowerCase().replace(/[^a-z]/g, '');
    for (const [city, facts] of Object.entries(FUN_FACTS)) {
        if (city !== 'default' && key.includes(city)) return facts;
    }
    return FUN_FACTS.default;
}

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
        setSelectedHotel, setTripInput, setLoadingFunFacts,
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
            travelers: tripData.travelers || 1,
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
        
        // Parallel: Fetch AI-generated fun facts (with local fallback)
        const fetchFacts = async () => {
            try {
                const localFacts = getFunFacts(tripInput.destination);
                setLoadingFunFacts(localFacts); // Initial set from local dictionary

                const res = await fetch('/api/getFacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: tripInput.destination }),
                });
                const data = await res.json();
                if (data.facts && Array.isArray(data.facts)) {
                    setLoadingFunFacts(data.facts);
                }
            } catch (err) {
                console.error("Failed to fetch AI fun facts, sticking to local:", err);
            }
        };
        fetchFacts();

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
                                        <img src="/erasebg-transformed.png" alt="Safar AI" style={{ height: 34, width: 'auto' }} />
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
