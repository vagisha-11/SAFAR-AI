'use client';

import { useSafarStore } from '@/lib/store';
import { useState } from 'react';

export default function SpotExplorer() {
    const { itinerary, selectedDay, addSpotToDay } = useSafarStore();
    const [search, setSearch] = useState('');

    if (!itinerary || !itinerary.unselectedSpots || itinerary.unselectedSpots.length === 0) {
        return null;
    }

    // Determine target day & locality from the currently selected day
    const activeDayPlan = selectedDay
        ? itinerary.days.find(d => d.dayNumber === selectedDay && !d.isTransitDay)
        : itinerary.days.find(d => !d.isTransitDay); // default to first non-transit day

    const activeLocality = activeDayPlan?.locality;
    const targetDay = activeDayPlan?.dayNumber || 1;

    // LOCALITY FILTER: Only show spots that belong to the active day's locality.
    // Prevents showing Darjeeling spots when user is on a Gangtok day, etc.
    const localityFilteredSpots = activeLocality
        ? itinerary.unselectedSpots.filter(s => {
            const locality = activeLocality.toLowerCase();
            // Match against address field (which is set to the locality name by dataEngine)
            return s.address?.toLowerCase().includes(locality) || s.address === activeLocality;
        })
        : itinerary.unselectedSpots;

    const filteredSpots = localityFilteredSpots.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    );

    if (filteredSpots.length === 0 && !search) return null;

    return (
        <div style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 16,
            background: 'rgba(30, 30, 60, 0.4)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h3 style={{
                        fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600,
                        color: '#f0f0ff', marginBottom: 4
                    }}>Explore More Places</h3>
                    <p style={{ fontSize: 12, color: '#a0a0cc' }}>
                        {activeLocality
                            ? `Qualified alternatives for ${activeLocality} · Day ${targetDay}`
                            : `Didn't find what you like? Add these qualified alternatives.`}
                    </p>
                </div>
                <div style={{
                    padding: '4px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.15)',
                    fontSize: 12, color: '#818cf8', fontWeight: 600
                }}>
                    {filteredSpots.length} in {activeLocality || 'trip'}
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    placeholder="Search by name or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: 'rgba(10, 10, 26, 0.5)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 12,
                        color: '#f0f0ff',
                        fontSize: 14,
                        outline: 'none',
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
                {filteredSpots.map(spot => (
                    <div key={spot.id} style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'rgba(40, 40, 80, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.2s ease',
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{spot.name}</span>
                                <span style={{
                                    padding: '2px 6px', borderRadius: 4, background: 'rgba(139, 92, 246, 0.2)',
                                    color: '#a78bfa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
                                }}>{spot.category}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#8b8bb9', lineHeight: 1.4, marginBottom: 4 }}>
                                {spot.description.length > 80 ? spot.description.substring(0, 80) + '...' : spot.description}
                            </div>
                            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                                <span style={{ color: '#f59e0b' }}>⭐ {spot.rating}</span>
                                <span style={{ color: '#10b981' }}>₹{spot.entryFee} entry</span>
                                <span style={{ color: '#6366f1' }}>⏱️ {spot.timeToSpend}h</span>
                            </div>
                        </div>
                        <button
                            onClick={() => addSpotToDay(targetDay, spot)}
                            className="btn-secondary"
                            style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10, whiteSpace: 'nowrap' }}
                        >
                            + Day {targetDay}
                        </button>
                    </div>
                ))}
                {filteredSpots.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b6b99', fontSize: 13 }}>
                        No spots match your search.
                    </div>
                )}
            </div>
        </div>
    );
}
