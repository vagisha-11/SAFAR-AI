'use client';

import { useSafarStore } from '@/lib/store';
import { Flight, Train } from '@/lib/types';

export default function TravelOptions() {
    const { itinerary } = useSafarStore();

    if (!itinerary) return null;

    const { allFlights, allTrains } = itinerary;
    if ((!allFlights || allFlights.length === 0) && (!allTrains || allTrains.length === 0)) return null;

    // Group flights by route
    const flightsByRoute: Record<string, Flight[]> = {};
    for (const f of allFlights || []) {
        const key = `${f.source} → ${f.destination}`;
        if (!flightsByRoute[key]) flightsByRoute[key] = [];
        flightsByRoute[key].push(f);
    }

    // Group trains by route
    const trainsByRoute: Record<string, Train[]> = {};
    for (const t of allTrains || []) {
        const key = `${t.source} → ${t.destination}`;
        if (!trainsByRoute[key]) trainsByRoute[key] = [];
        trainsByRoute[key].push(t);
    }

    const selectedOutbound = itinerary.outboundTravel;
    const selectedReturn = itinerary.returnTravel;

    return (
        <div>
            <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
                color: '#f0f0ff', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                ✈️ Travel Options
                {selectedOutbound && (
                    <span className="badge badge-success" style={{ fontSize: 10 }}>
                        {selectedOutbound.type === 'flight' ? '✈️' : '🚆'} Booked
                    </span>
                )}
            </h2>

            {/* Selected Travel Summary */}
            {(selectedOutbound || selectedReturn) && (
                <div style={{
                    padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.15)',
                }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>
                        ✓ Selected Travel
                    </div>
                    {selectedOutbound && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{selectedOutbound.type === 'flight' ? '✈️' : '🚆'}</span>
                            <span style={{ fontSize: 13, color: '#f0f0ff' }}>
                                Outbound: {selectedOutbound.data.source} → {selectedOutbound.data.destination}
                            </span>
                            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                                ₹{selectedOutbound.data.price.toLocaleString('en-IN')}
                            </span>
                        </div>
                    )}
                    {selectedReturn && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>{selectedReturn.type === 'flight' ? '✈️' : '🚆'}</span>
                            <span style={{ fontSize: 13, color: '#f0f0ff' }}>
                                Return: {selectedReturn.data.source} → {selectedReturn.data.destination}
                            </span>
                            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                                ₹{selectedReturn.data.price.toLocaleString('en-IN')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* All flights grouped by route */}
            {Object.entries(flightsByRoute).map(([route, flights]) => (
                <div key={route} style={{ marginBottom: 16 }}>
                    <h3 style={{
                        fontSize: 12, fontWeight: 600, color: '#a0a0cc',
                        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                        ✈️ Flights: {route}
                    </h3>
                    <div style={{
                        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
                    }}>
                        {flights.sort((a, b) => a.price - b.price).map(flight => {
                            const isSelected = selectedOutbound?.data.id === flight.id || selectedReturn?.data.id === flight.id;
                            return (
                                <div key={flight.id} className="glass-card" style={{
                                    minWidth: 200, padding: 12, flexShrink: 0,
                                    border: isSelected ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(99,102,241,0.1)',
                                    background: isSelected ? 'rgba(16,185,129,0.06)' : undefined,
                                }}>
                                    {isSelected && (
                                        <span className="badge badge-success" style={{ fontSize: 10, marginBottom: 6 }}>✓ Selected</span>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{flight.airline}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b6b99' }}>{flight.flightNo}</div>
                                    <div style={{ fontSize: 12, color: '#a0a0cc', marginTop: 4 }}>
                                        {new Date(flight.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        {' → '}
                                        {new Date(flight.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div style={{
                                        fontWeight: 700, fontSize: 16, marginTop: 6,
                                        color: '#10b981',
                                    }}>
                                        ₹{flight.price.toLocaleString('en-IN')}
                                    </div>
                                    <a href={flight.bookingLink} target="_blank" rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#818cf8', textDecoration: 'none' }}>
                                        Book on MakeMyTrip →
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* All trains grouped by route */}
            {Object.entries(trainsByRoute).map(([route, trains]) => (
                <div key={route} style={{ marginBottom: 16 }}>
                    <h3 style={{
                        fontSize: 12, fontWeight: 600, color: '#a0a0cc',
                        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                        🚆 Trains: {route}
                    </h3>
                    <div style={{
                        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
                    }}>
                        {trains.sort((a, b) => a.price - b.price).map(train => {
                            const isSelected = selectedOutbound?.data.id === train.id || selectedReturn?.data.id === train.id;
                            return (
                                <div key={train.id} className="glass-card" style={{
                                    minWidth: 200, padding: 12, flexShrink: 0,
                                    border: isSelected ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(99,102,241,0.1)',
                                    background: isSelected ? 'rgba(245,158,11,0.06)' : undefined,
                                }}>
                                    {isSelected && (
                                        <span className="badge badge-warning" style={{ fontSize: 10, marginBottom: 6 }}>✓ Selected</span>
                                    )}
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{train.trainName}</div>
                                    <div style={{ fontSize: 11, color: '#6b6b99' }}>#{train.trainNo}</div>
                                    <div style={{ fontSize: 12, color: '#a0a0cc', marginTop: 4 }}>
                                        {new Date(train.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        {' → '}
                                        {new Date(train.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div style={{
                                        fontWeight: 700, fontSize: 16, marginTop: 6,
                                        color: '#f59e0b',
                                    }}>
                                        ₹{train.price.toLocaleString('en-IN')}
                                    </div>
                                    <a href={train.bookingLink} target="_blank" rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#f59e0b', textDecoration: 'none' }}>
                                        Book on IRCTC →
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
