'use client';

import { useSafarStore } from '@/lib/store';
import { Spot, P2PTravel, Restaurant, Flight, Train, InterCityOption } from '@/lib/types';
import FeedbackForm from './FeedbackForm';
import { useState } from 'react';

export default function ItineraryPanel() {
    const { itinerary, selectedDay, setSelectedDay, removeSpotFromDay, setSelectedPlaceId, selectedPlaceId } = useSafarStore();
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [feedbackSpotId, setFeedbackSpotId] = useState<string | null>(null);

    if (!itinerary) return null;

    const daysToShow = selectedDay
        ? itinerary.days.filter(d => d.dayNumber === selectedDay)
        : itinerary.days;

    const removeSpot = (dayNumber: number, spotId: string) => {
        removeSpotFromDay(dayNumber, spotId);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
                    color: '#f0f0ff',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    📋 Your Itinerary
                    <span className="badge" style={{ fontSize: 11 }}>{itinerary.days.length} days</span>
                </h2>
                <button 
                    onClick={() => window.print()} 
                    style={{
                        padding: '6px 12px', fontSize: 12, borderRadius: 8,
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                        color: '#a0a0cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s', fontFamily: 'Inter, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99,102,241,0.25)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
                        e.currentTarget.style.color = '#a0a0cc';
                    }}
                >
                    🖨️ Save / Print
                </button>
            </div>

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
                                        const isSelected = selectedPlaceId === spot.id;
                                        return (
                                            <div key={`${spot.id}-${idx}`} className="timeline-item spot">
                                                <div
                                                    className="glass-card"
                                                    style={{
                                                        padding: '12px 14px',
                                                        marginBottom: 4,
                                                        cursor: 'pointer',
                                                        border: isSelected ? '1px solid #6366f1' : '1px solid rgba(99,102,241,0.1)',
                                                        background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onClick={() => setSelectedPlaceId(spot.id)}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                                                    }}
                                                >
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
                                                                onClick={(e) => { e.stopPropagation(); removeSpot(day.dayNumber, spot.id); }}
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
                                        const isSelected = selectedPlaceId === rest.id;
                                        return (
                                            <div key={`${rest.id}-${idx}`} className="timeline-item food">
                                                <div
                                                    style={{
                                                        padding: '8px 14px', marginBottom: 4,
                                                        background: isSelected ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.06)',
                                                        borderRadius: 8,
                                                        border: isSelected ? '1px solid #10b981' : '1px solid rgba(16,185,129,0.12)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onClick={() => setSelectedPlaceId(rest.id)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <span style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>
                                                                {item.notes || '🍽️'} {rest.name}
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                                                {rest.isPureVeg && (
                                                                    <span style={{ 
                                                                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                                                        background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)'
                                                                    }}>🟢 Pure Veg</span>
                                                                )}
                                                                {rest.hasJainFood && (
                                                                    <span style={{ 
                                                                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                                                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)'
                                                                    }}>🔶 Jain Food</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#6b6b99', marginTop: 4 }}>
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

                                    if (item.type === 'intercity') {
                                        const transit = item.data as InterCityOption;
                                        const icon = transit.type === 'bus' ? '🚌' : transit.type === 'shared_taxi' ? '🚐' : '🚕';
                                        const accentColor = transit.type === 'bus' ? '#6366f1' : transit.type === 'shared_taxi' ? '#10b981' : '#f59e0b';

                                        return (
                                            <div key={`intercity-${idx}`} className="timeline-item travel">
                                                <div className="glass-card" style={{
                                                    padding: '12px 14px', marginBottom: 4,
                                                    background: `rgba(${transit.type === 'bus' ? '99,102,241' : transit.type === 'shared_taxi' ? '16,185,129' : '245,158,11'}, 0.08)`,
                                                    border: `1px solid ${accentColor}44`,
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontSize: 18 }}>{icon}</span>
                                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{transit.modeName}</span>
                                                                <span className="badge" style={{ fontSize: 10, background: accentColor, color: '#fff' }}>
                                                                    {transit.type.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: 13, color: '#a0a0cc', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontWeight: 600, color: '#f0f0ff' }}>{transit.source}</span>
                                                                <span style={{ color: '#6b6b99' }}>→</span>
                                                                <span style={{ fontWeight: 600, color: '#f0f0ff' }}>{transit.destination}</span>
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#6b6b99', marginTop: 4 }}>
                                                                ⏱️ ~{Math.floor(transit.duration / 60)}h {transit.duration % 60}m
                                                                {item.notes && <span style={{ color: accentColor, marginLeft: 8 }}>{item.notes}</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>
                                                                ₹{transit.price.toLocaleString('en-IN')}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: '#6b6b99', marginTop: 2 }}>Ready for departure</div>
                                                        </div>
                                                    </div>
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
