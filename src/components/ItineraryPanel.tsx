'use client';

import { useSafarStore } from '@/lib/store';
import { Spot, P2PTravel, Restaurant, Flight, Train } from '@/lib/types';
import FeedbackForm from './FeedbackForm';
import { useState } from 'react';

export default function ItineraryPanel() {
    const { itinerary, selectedDay, setSelectedDay } = useSafarStore();
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [feedbackSpotId, setFeedbackSpotId] = useState<string | null>(null);

    if (!itinerary) return null;

    const daysToShow = selectedDay
        ? itinerary.days.filter(d => d.dayNumber === selectedDay)
        : itinerary.days;

    const removeSpot = async (spotId: string) => {
        try {
            const res = await fetch('/api/deltaUpdate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remove_place',
                    itinerary,
                    payload: { spotId },
                }),
            });
            const data = await res.json();
            if (data.success) {
                useSafarStore.getState().setItinerary(data.itinerary);
            }
        } catch (err) {
            console.error('Failed to remove place:', err);
        }
    };

    return (
        <div>
            <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
                color: '#f0f0ff', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                📋 Your Itinerary
                <span className="badge" style={{ fontSize: 11 }}>{itinerary.days.length} days</span>
            </h2>

            {daysToShow.map(day => {
                const isExpanded = expandedDay === day.dayNumber || selectedDay === day.dayNumber;
                const spotCount = day.items.filter(i => i.type === 'spot').length;

                return (
                    <div key={day.dayNumber} style={{ marginBottom: 12 }} className="animate-fade-in">
                        {/* Day Header */}
                        <div
                            className={`day-header ${selectedDay === day.dayNumber ? 'active' : ''}`}
                            onClick={() => {
                                setExpandedDay(isExpanded ? null : day.dayNumber);
                                setSelectedDay(day.dayNumber);
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        fontWeight: 700, fontSize: 15,
                                        background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>
                                        Day {day.dayNumber}
                                    </span>
                                    {day.isTransitDay && (
                                        <span className="badge badge-warning" style={{ fontSize: 10 }}>🚗 Transit</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b6b99', marginTop: 2 }}>
                                    {new Date(day.date).toLocaleDateString('en-IN', {
                                        weekday: 'short', day: 'numeric', month: 'short'
                                    })}
                                    {' · '}{day.locality}
                                    {' · '}{spotCount} places
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#10b981' }}>
                                    ₹{day.totalCost.toLocaleString('en-IN')}
                                </div>
                                <div style={{
                                    fontSize: 16, transition: 'transform 0.2s',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                }}>▾</div>
                            </div>
                        </div>

                        {/* Day Content */}
                        {isExpanded && (
                            <div style={{
                                padding: '12px 0 0 8px',
                                animation: 'fadeIn 0.3s ease-out',
                            }}>
                                {day.items.length === 0 && day.isTransitDay && (
                                    <div style={{
                                        padding: 16, textAlign: 'center',
                                        color: '#6b6b99', fontSize: 13,
                                    }}>
                                        🚗 Travel day — moving to the next destination
                                    </div>
                                )}

                                {day.items.map((item, idx) => {
                                    if (item.type === 'spot') {
                                        const spot = item.data as Spot;
                                        return (
                                            <div key={`${spot.id}-${idx}`} className="timeline-item spot">
                                                <div className="glass-card" style={{ padding: '12px 14px', marginBottom: 4 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{spot.name}</span>
                                                                <span className="badge" style={{ fontSize: 10 }}>{spot.category}</span>
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b6b99', marginTop: 4 }}>
                                                                {item.startTime} — {item.endTime}
                                                                {' · '}{spot.timeToSpend}h
                                                                {spot.entryFee > 0 && ` · ₹${spot.entryFee}`}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#a0a0cc', marginTop: 2 }}>
                                                                ⭐ {spot.rating.toFixed(1)} · Open {spot.openingTime}–{spot.closingTime}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setFeedbackSpotId(feedbackSpotId === spot.id ? null : spot.id); }}
                                                                className="btn-icon"
                                                                style={{ width: 28, height: 28, fontSize: 12 }}
                                                                title="Leave feedback"
                                                            >💬</button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeSpot(spot.id); }}
                                                                className="btn-icon"
                                                                style={{ width: 28, height: 28, fontSize: 12, borderColor: 'rgba(239,68,68,0.3)' }}
                                                                title="Remove from itinerary"
                                                            >✕</button>
                                                        </div>
                                                    </div>
                                                    {feedbackSpotId === spot.id && (
                                                        <FeedbackForm spotId={spot.id} onClose={() => setFeedbackSpotId(null)} />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (item.type === 'restaurant') {
                                        const rest = item.data as Restaurant;
                                        return (
                                            <div key={`${rest.id}-${idx}`} className="timeline-item food">
                                                <div style={{
                                                    padding: '8px 14px', marginBottom: 4,
                                                    background: 'rgba(16,185,129,0.06)',
                                                    borderRadius: 8, border: '1px solid rgba(16,185,129,0.12)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <span style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>
                                                                {item.notes || '🍽️'} {rest.name}
                                                            </span>
                                                            <div style={{ fontSize: 11, color: '#6b6b99', marginTop: 2 }}>
                                                                {rest.cuisine} · ₹{rest.avgCostForTwo} for two · {item.startTime}–{item.endTime}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (item.type === 'p2p') {
                                        const p2p = item.data as P2PTravel;
                                        return (
                                            <div key={`p2p-${idx}`} className="timeline-item travel">
                                                <div style={{
                                                    padding: '6px 14px', marginBottom: 4,
                                                    fontSize: 11, color: '#6b6b99',
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                }}>
                                                    {p2p.mode === 'cab' ? '🚕' : p2p.mode === 'rickshaw' ? '🛺' : '🚶'}
                                                    {p2p.fromName} → {p2p.toName}
                                                    <span style={{ color: '#a0a0cc' }}>
                                                        {p2p.distance}km · {p2p.duration}min · ₹{p2p.cost}
                                                    </span>
                                                    {item.notes && <span style={{ color: '#818cf8' }}>{item.notes}</span>}
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (item.type === 'flight') {
                                        const flight = item.data as Flight;
                                        return (
                                            <div key={`flight-${idx}`} className="timeline-item travel">
                                                <div className="glass-card" style={{
                                                    padding: '12px 14px', marginBottom: 4,
                                                    background: 'rgba(99,102,241,0.06)',
                                                    border: '1px solid rgba(99,102,241,0.2)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontSize: 18 }}>✈️</span>
                                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{flight.airline}</span>
                                                                <span className="badge" style={{ fontSize: 10 }}>Flight</span>
                                                                <span style={{ fontSize: 12, color: '#6b6b99' }}>{flight.flightNo}</span>
                                                            </div>
                                                            <div style={{ fontSize: 13, color: '#a0a0cc', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontWeight: 600, color: '#f0f0ff' }}>{flight.source}</span>
                                                                <span style={{ color: '#6b6b99' }}>→</span>
                                                                <span style={{ fontWeight: 600, color: '#f0f0ff' }}>{flight.destination}</span>
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b6b99', marginTop: 4 }}>
                                                                🕐 {item.startTime} — {item.endTime}
                                                            </div>
                                                            {item.notes && <div style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>{item.notes}</div>}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{
                                                                fontWeight: 700, fontSize: 16,
                                                                background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                            }}>
                                                                ₹{flight.price.toLocaleString('en-IN')}
                                                            </div>
                                                            <a href={flight.bookingLink} target="_blank" rel="noopener noreferrer"
                                                                style={{ fontSize: 11, color: '#818cf8', textDecoration: 'none' }}>
                                                                Book now →
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (item.type === 'train') {
                                        const train = item.data as Train;
                                        return (
                                            <div key={`train-${idx}`} className="timeline-item travel">
                                                <div className="glass-card" style={{
                                                    padding: '12px 14px', marginBottom: 4,
                                                    background: 'rgba(245,158,11,0.06)',
                                                    border: '1px solid rgba(245,158,11,0.2)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontSize: 18 }}>🚆</span>
                                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{train.trainName}</span>
                                                                <span className="badge badge-warning" style={{ fontSize: 10 }}>Train</span>
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b6b99', marginTop: 4 }}>#{train.trainNo}</div>
                                                            <div style={{ fontSize: 13, color: '#a0a0cc', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontWeight: 600, color: '#f0f0ff' }}>{train.source}</span>
                                                                <span style={{ color: '#6b6b99' }}>→</span>
                                                                <span style={{ fontWeight: 600, color: '#f0f0ff' }}>{train.destination}</span>
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b6b99', marginTop: 4 }}>
                                                                🕐 {item.startTime} — {item.endTime}
                                                            </div>
                                                            {item.notes && <div style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>{item.notes}</div>}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{
                                                                fontWeight: 700, fontSize: 16,
                                                                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                            }}>
                                                                ₹{train.price.toLocaleString('en-IN')}
                                                            </div>
                                                            <a href={train.bookingLink} target="_blank" rel="noopener noreferrer"
                                                                style={{ fontSize: 11, color: '#f59e0b', textDecoration: 'none' }}>
                                                                Book on IRCTC →
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return null;
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
