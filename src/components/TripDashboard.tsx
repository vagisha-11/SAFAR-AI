'use client';

import { useSafarStore } from '@/lib/store';
import dynamic from 'next/dynamic';
import ItineraryPanel from './ItineraryPanel';
import BudgetPanel from './BudgetPanel';
import PromptBar from './PromptBar';
import HotelList from './HotelList';
import TravelOptions from './TravelOptions';
import ResiliencePanel from './ResiliencePanel';
import SpotExplorer from './SpotExplorer';

// Leaflet must be loaded client-side only (no SSR)
const MapView = dynamic(() => import('./MapView'), { ssr: false });

export default function TripDashboard() {
    const { tripInput, itinerary, selectedDay, setSelectedDay, setActiveStep, currentCost, budget } = useSafarStore();

    if (!itinerary || !tripInput) return null;

    const totalDays = itinerary.days.length;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top Navigation Bar */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 24px',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
                background: 'rgba(10,10,26,0.95)',
                backdropFilter: 'blur(20px)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => setActiveStep('input')}
                        className="btn-icon"
                        title="Back to search"
                    >
                        ←
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18,
                                background: 'linear-gradient(135deg, #f0f0ff, #818cf8)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>Safar AI</span>
                            <span style={{ color: '#6b6b99' }}>|</span>
                            <span style={{ color: '#a0a0cc', fontSize: 14 }}>
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

                {/* Day Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        onClick={() => setSelectedDay(null)}
                        className={selectedDay === null ? 'btn-primary' : 'btn-secondary'}
                        style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                        Entire Trip
                    </button>
                    {itinerary.days.map(day => (
                        <button
                            key={day.dayNumber}
                            onClick={() => setSelectedDay(day.dayNumber)}
                            className={selectedDay === day.dayNumber ? 'btn-primary' : 'btn-secondary'}
                            style={{ padding: '8px 12px', fontSize: 13, minWidth: 36 }}
                        >
                            D{day.dayNumber}
                        </button>
                    ))}
                </div>

                {/* Budget summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#6b6b99', textTransform: 'uppercase', letterSpacing: 1 }}>Budget</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#818cf8' }}>
                            ₹{tripInput.budget.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div style={{
                        width: 1, height: 32, background: 'rgba(99,102,241,0.15)',
                    }} />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#6b6b99', textTransform: 'uppercase', letterSpacing: 1 }}>Cost</div>
                        <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: currentCost > tripInput.budget ? '#ef4444' : '#10b981',
                        }}>
                            ₹{currentCost.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', minHeight: 0 }}>
                {/* Left Panel — Map */}
                <div style={{ position: 'relative', minHeight: 'calc(100vh - 60px)' }}>
                    <MapView />
                </div>

                {/* Right Panel — Itinerary + Hotels + Budget */}
                <div style={{
                    borderLeft: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(17,17,40,0.98)',
                    overflow: 'hidden',
                }}>
                    {/* Scrollable content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                        <ResiliencePanel />
                        <SpotExplorer />
                        <ItineraryPanel />
                        <div style={{ marginTop: 20 }}>
                            <TravelOptions />
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <HotelList />
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <BudgetPanel />
                        </div>
                    </div>

                    {/* Prompt bar at bottom */}
                    <PromptBar />
                </div>
            </div>

            {/* Floating Cost Badge */}
            <div className="cost-badge glass" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                bottom: 80, right: 440,
            }}>
                <span className="label">Total Cost</span>
                <span style={{
                    color: currentCost > tripInput.budget ? '#ef4444' : '#10b981',
                }}>
                    ₹{currentCost.toLocaleString('en-IN')}
                </span>
            </div>
        </div>
    );
}
