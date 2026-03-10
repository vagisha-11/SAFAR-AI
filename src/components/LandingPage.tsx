'use client';

import { useState } from 'react';
import { useSafarStore } from '@/lib/store';
import { TripInput } from '@/lib/types';

const POPULAR_DESTINATIONS = [
    { name: 'Goa', emoji: '🏖️', tagline: 'Beaches & Nightlife' },
    { name: 'Manali', emoji: '🏔️', tagline: 'Mountains & Snow' },
    { name: 'Jaipur', emoji: '🏰', tagline: 'Royal Heritage' },
    { name: 'Kerala', emoji: '🌴', tagline: 'Backwaters & Tea' },
    { name: 'Udaipur', emoji: '🏛️', tagline: 'City of Lakes' },
    { name: 'Varanasi', emoji: '🕉️', tagline: 'Spiritual Capital' },
];

const INTERESTS = [
    'Adventure', 'Heritage', 'Nature', 'Beach', 'Temple', 'Shopping',
    'Food', 'Photography', 'Nightlife', 'Trekking', 'Wildlife', 'Cultural',
];

export default function LandingPage() {
    const { setTripInput, setIsLoading, setLoadingMessage, setActiveStep, setLocalitySplit, setAgentData, setItinerary, setBudget, setSelectedHotel } = useSafarStore();

    const [destination, setDestination] = useState('');
    const [source, setSource] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [budget, setBudgetLocal] = useState('50000');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const handlePlanTrip = async () => {
        if (!destination || !source || !departureDate || !returnDate) return;

        const tripInput: TripInput = {
            destination,
            source,
            departureDate,
            returnDate,
            budget: parseInt(budget) || 50000,
            preferences: selectedInterests,
            maxHoursPerDay: 14,
        };

        setTripInput(tripInput);
        setIsLoading(true);
        setActiveStep('planning');

        try {
            // Step 1: Locality Splitter
            setLoadingMessage('🗺️ Agent A is analyzing your destination...');
            const splitRes = await fetch('/api/localitySplitter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination, source, departureDate, returnDate }),
            });
            const splitData = await splitRes.json();
            if (!splitData.success) throw new Error('Locality split failed');
            setLocalitySplit(splitData.split);

            // Step 2: Agent A — Fetch Data
            setLoadingMessage('📡 Agent A is fetching hotels, flights, and attractions...');
            const agentARes = await fetch('/api/agentA', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localities: splitData.split,
                    source,
                    destination,
                    departureDate,
                    returnDate,
                }),
            });
            const agentAData = await agentARes.json();
            if (!agentAData.success) throw new Error('Agent A failed');
            setAgentData(agentAData.data);

            // Step 3: Agent B — Build Itinerary
            setLoadingMessage('🧠 Agent B is crafting your day-by-day itinerary...');
            const agentBRes = await fetch('/api/agentB', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localities: splitData.split,
                    agentData: agentAData.data,
                    startDate: departureDate,
                    maxHoursPerDay: 14,
                    userPreferences: selectedInterests,
                }),
            });
            const agentBData = await agentBRes.json();
            if (!agentBData.success) throw new Error('Agent B failed');

            // Step 4: Agent C — Budget Optimization
            setLoadingMessage('💰 Agent C is optimizing your budget...');
            const agentCRes = await fetch('/api/agentC', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayPlans: agentBData.dayPlans,
                    agentData: agentAData.data,
                    tripInput,
                    localities: splitData.split,
                }),
            });
            const agentCData = await agentCRes.json();
            if (!agentCData.success) throw new Error('Agent C failed');

            setItinerary(agentCData.itinerary);
            setBudget(agentCData.budgetAllocation);

            // Set selected hotels
            if (agentCData.selectedHotels) {
                for (const [locality, hotel] of Object.entries(agentCData.selectedHotels)) {
                    setSelectedHotel(locality, hotel as any);
                }
            }

            setActiveStep('results');
        } catch (error) {
            console.error('Trip planning failed:', error);
            setLoadingMessage('❌ Something went wrong. Please try again.');
            setTimeout(() => {
                setIsLoading(false);
                setActiveStep('input');
            }, 2000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            {/* Ambient background effects */}
            <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
            }}>
                <div style={{
                    position: 'absolute', top: -200, right: -200, width: 600, height: 600,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }} />
                <div style={{
                    position: 'absolute', bottom: -100, left: -100, width: 500, height: 500,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
                {/* Header */}
                <nav style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 60,
                }} className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                        }}>✈️</div>
                        <span style={{
                            fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 700,
                            background: 'linear-gradient(135deg, #f0f0ff, #818cf8)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Safar AI</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <span className="badge">🤖 3 AI Agents</span>
                        <span className="badge badge-success">Microsoft AI Unlocked</span>
                    </div>
                </nav>

                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 48 }} className="animate-slide-up">
                    <h1 className="hero-title" style={{ marginBottom: 16 }}>
                        Your AI-Powered<br />Travel Companion
                    </h1>
                    <p className="hero-subtitle" style={{ margin: '0 auto 32px' }}>
                        Three intelligent agents collaborate to create your perfect itinerary —
                        with smart budgeting, map-based exploration, and real-time updates.
                    </p>
                </div>

                {/* Main Input Form */}
                <div className="glass" style={{
                    maxWidth: 900, margin: '0 auto', padding: 36,
                    animation: 'slideUp 0.8s ease-out 0.2s both',
                }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 20, marginBottom: 24,
                    }}>
                        {/* Source */}
                        <div className="input-group">
                            <label>📍 Starting Point</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g., Delhi"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                list="cities"
                            />
                        </div>

                        {/* Destination */}
                        <div className="input-group">
                            <label>🎯 Destination</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g., Goa, Rajasthan"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                list="cities"
                            />
                        </div>

                        {/* Departure Date */}
                        <div className="input-group">
                            <label>🛫 Departure</label>
                            <input
                                type="date"
                                className="input-field"
                                value={departureDate}
                                onChange={(e) => setDepartureDate(e.target.value)}
                            />
                        </div>

                        {/* Return Date */}
                        <div className="input-group">
                            <label>🛬 Return</label>
                            <input
                                type="date"
                                className="input-field"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="input-group" style={{ marginBottom: 24 }}>
                        <label>💰 Budget (INR)</label>
                        <input
                            type="number"
                            className="input-field"
                            placeholder="e.g., 50000"
                            value={budget}
                            onChange={(e) => setBudgetLocal(e.target.value)}
                            min="5000"
                            step="5000"
                        />
                    </div>

                    {/* Interests */}
                    <div style={{ marginBottom: 28 }}>
                        <label style={{
                            fontSize: 12, fontWeight: 600, color: '#a0a0cc',
                            textTransform: 'uppercase', letterSpacing: 0.5,
                            display: 'block', marginBottom: 10,
                        }}>🎨 Your Interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {INTERESTS.map(interest => (
                                <button
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 9999,
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'Inter, sans-serif',
                                        border: selectedInterests.includes(interest)
                                            ? '1px solid #6366f1'
                                            : '1px solid rgba(99,102,241,0.15)',
                                        background: selectedInterests.includes(interest)
                                            ? 'rgba(99,102,241,0.2)'
                                            : 'rgba(99,102,241,0.05)',
                                        color: selectedInterests.includes(interest)
                                            ? '#818cf8'
                                            : '#a0a0cc',
                                    }}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        className="btn-primary"
                        onClick={handlePlanTrip}
                        disabled={!destination || !source || !departureDate || !returnDate}
                        style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px 32px' }}
                    >
                        ✨ Plan My Trip with AI
                    </button>
                </div>

                {/* Popular Destinations */}
                <div style={{ marginTop: 48, textAlign: 'center' }} className="animate-fade-in" >
                    <h3 style={{
                        fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600,
                        color: '#a0a0cc', marginBottom: 20,
                    }}>Popular Destinations</h3>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 12, maxWidth: 800, margin: '0 auto',
                    }}>
                        {POPULAR_DESTINATIONS.map(dest => (
                            <button
                                key={dest.name}
                                onClick={() => setDestination(dest.name)}
                                className="glass-card"
                                style={{
                                    padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                                    border: destination === dest.name
                                        ? '1px solid #6366f1'
                                        : '1px solid rgba(99,102,241,0.15)',
                                }}
                            >
                                <div style={{ fontSize: 28, marginBottom: 8 }}>{dest.emoji}</div>
                                <div style={{ fontWeight: 600, fontSize: 15, color: '#f0f0ff' }}>{dest.name}</div>
                                <div style={{ fontSize: 12, color: '#a0a0cc', marginTop: 4 }}>{dest.tagline}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* City Datalist */}
                <datalist id="cities">
                    {['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Jaipur', 'Goa',
                        'Manali', 'Shimla', 'Udaipur', 'Varanasi', 'Kerala', 'Agra', 'Lucknow', 'Amritsar',
                        'Rishikesh', 'Darjeeling', 'Leh', 'Srinagar', 'Jodhpur', 'Mysore', 'Ooty', 'Munnar',
                        'Pondicherry', 'Pushkar', 'Jaisalmer', 'Pune', 'Ahmedabad',
                    ].map(city => <option key={city} value={city} />)}
                </datalist>

                {/* Footer */}
                <footer style={{
                    textAlign: 'center', marginTop: 60, padding: '24px 0',
                    borderTop: '1px solid rgba(99,102,241,0.1)',
                    color: '#6b6b99', fontSize: 13,
                }}>
                    <p>Built with 🤖 AutoGen Agents + Azure AI for Microsoft AI Unlocked Hackathon</p>
                </footer>
            </div>
        </div>
    );
}
