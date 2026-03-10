'use client';

import { useSafarStore } from '@/lib/store';
import { Flight, Train, InterCityOption } from '@/lib/types';

export default function TravelOptions() {
    const { itinerary, setSelectedTravel, setSelectedInterCitySegment, tripInput } = useSafarStore();

    if (!itinerary || !tripInput) return null;

    const { allFlights, allTrains } = itinerary;
    if ((!allFlights || allFlights.length === 0) && (!allTrains || allTrains.length === 0)) {
        return (
            <div className="glass-card" style={{ padding: 16, color: '#6b6b99', fontSize: 13 }}>
                No inter-city travel options found for this route.
            </div>
        );
    }

    // Filter flights and trains by outbound/return based on source/destination
    const outboundFlights = allFlights.filter(f => f.source.toLowerCase() === tripInput.source.toLowerCase());
    const returnFlights = allFlights.filter(f => f.destination.toLowerCase() === tripInput.source.toLowerCase());

    const outboundTrains = allTrains.filter(t => t.source.toLowerCase() === tripInput.source.toLowerCase());
    const returnTrains = allTrains.filter(t => t.destination.toLowerCase() === tripInput.source.toLowerCase());

    const selectedOutbound = itinerary.outboundTravel;
    const selectedReturn = itinerary.returnTravel;

    const renderCard = (item: Flight | Train, type: 'flight' | 'train', selectionType: 'outbound' | 'return') => {
        const isSelected = (selectionType === 'outbound' ? selectedOutbound : selectedReturn)?.data.id === item.id;
        const accentColor = type === 'flight' ? '#10b981' : '#f59e0b';
        const bgOpacity = isSelected ? 0.12 : 0.04;

        return (
            <div
                key={item.id}
                onClick={() => setSelectedTravel(selectionType, { type, data: item })}
                className="glass-card"
                style={{
                    minWidth: 200, padding: 12, flexShrink: 0, cursor: 'pointer',
                    border: isSelected ? `1px solid ${accentColor}` : '1px solid rgba(99,102,241,0.1)',
                    background: isSelected ? `rgba(${type === 'flight' ? '16,185,129' : '245,158,11'}, 0.08)` : 'rgba(26,26,62,0.4)',
                    transition: 'all 0.2s ease',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                    <span className="badge" style={{
                        fontSize: 9,
                        background: isSelected ? accentColor : 'rgba(99,102,241,0.2)',
                        color: isSelected ? '#000' : '#818cf8'
                    }}>
                        {isSelected ? '✓ Selected' : (type === 'flight' ? '✈️ Flight' : '🚆 Train')}
                    </span>
                    <div style={{ fontWeight: 700, color: accentColor }}>
                        ₹{item.price.toLocaleString('en-IN')}
                    </div>
                </div>

                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                    {type === 'flight' ? (item as Flight).airline : (item as Train).trainName}
                </div>
                <div style={{ fontSize: 11, color: '#6b6b99', marginBottom: 6 }}>
                    {type === 'flight' ? (item as Flight).flightNo : `#${(item as Train).trainNo}`}
                </div>

                <div style={{ fontSize: 12, color: '#f0f0ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{new Date(item.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: '#6b6b99', fontSize: 10 }}>→</span>
                    <span>{new Date(item.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <a href={item.bookingLink} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#818cf8', textDecoration: 'none' }}>
                    Book Now →
                </a>
            </div>
        );
    };

    const renderInterCityCard = (locality: string, item: InterCityOption) => {
        const transitDay = itinerary.days.find(d => d.locality === locality && d.isTransitDay);
        const selectedOption = transitDay?.items.find(i => i.type === 'intercity')?.data as InterCityOption | undefined;
        const isSelected = selectedOption?.id === item.id;

        const icon = item.type === 'bus' ? '🚌' : item.type === 'shared_taxi' ? '🚐' : '🚕';
        const accentColor = item.type === 'bus' ? '#6366f1' : item.type === 'shared_taxi' ? '#10b981' : '#f59e0b';

        return (
            <div
                key={item.id}
                onClick={() => setSelectedInterCitySegment(locality, item)}
                className="glass-card"
                style={{
                    minWidth: 180, padding: 12, flexShrink: 0, cursor: 'pointer',
                    border: isSelected ? `2px solid ${accentColor}` : '1px solid rgba(99,102,241,0.1)',
                    background: isSelected ? `rgba(${item.type === 'bus' ? '99,102,241' : '16,185,129'}, 0.08)` : 'rgba(26,26,62,0.4)',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 15px ${accentColor}33` : 'none',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                    <span className="badge" style={{
                        fontSize: 9,
                        background: isSelected ? accentColor : 'rgba(99,102,241,0.2)',
                        color: isSelected ? '#fff' : '#818cf8',
                        fontWeight: 700
                    }}>
                        {isSelected ? '✓ SELECTED' : item.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>
                        ₹{item.price}
                    </div>
                </div>

                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{icon}</span>
                    <span style={{ color: '#f0f0ff' }}>{item.modeName}</span>
                </div>

                <div style={{ fontSize: 11, color: '#6b6b99', marginBottom: 4 }}>
                    ⏱️ ~{Math.floor(item.duration / 60)}h {item.duration % 60}m
                </div>

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.departureTimes.map((time, i) => (
                        <span key={i} style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4, color: '#a0a0cc' }}>
                            {time}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
                color: '#f0f0ff', marginBottom: 16,
            }}>
                ✈️ Travel Options
            </h2>

            {/* Outbound Section */}
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: '#a0a0cc', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Outbound: {tripInput.source} → {tripInput.destination}
                </h3>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                    {outboundFlights.map(f => renderCard(f, 'flight', 'outbound'))}
                    {outboundTrains.map(t => renderCard(t, 'train', 'outbound'))}
                </div>
            </div>

            {/* Return Section */}
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: '#a0a0cc', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Return: {tripInput.destination} → {tripInput.source}
                </h3>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                    {returnFlights.map(f => renderCard(f, 'flight', 'return'))}
                    {returnTrains.map(t => renderCard(t, 'train', 'return'))}
                </div>
            </div>

            {/* Inter-City Transit Sections */}
            {itinerary.interCityOptions && Object.entries(itinerary.interCityOptions).map(([locality, options]) => (
                <div key={locality} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 600, color: '#a0a0cc', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Transit: {locality}
                    </h3>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                        {options.map(opt => renderInterCityCard(locality, opt))}
                    </div>
                </div>
            ))}
        </div>
    );
}
