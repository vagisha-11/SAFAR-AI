'use client';

import { useSafarStore } from '@/lib/store';
import { Hotel } from '@/lib/types';

export default function HotelList() {
    const { agentData, selectedHotels, setSelectedHotel, itinerary } = useSafarStore();

    if (!agentData || !itinerary) return null;

    const localities = Object.keys(agentData.hotels);
    if (localities.length === 0) return null;

    return (
        <div>
            <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
                color: '#f0f0ff', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                🏨 Hotels
            </h2>

            {localities.map(locality => {
                const hotels = agentData.hotels[locality];
                if (!hotels || hotels.length === 0) return null;

                // Sort: selected first, then by price closeness to budget
                const selected = selectedHotels[locality];
                const sorted = [...hotels].sort((a, b) => {
                    if (selected) {
                        if (a.id === selected.id) return -1;
                        if (b.id === selected.id) return 1;
                    }
                    return a.pricePerNight - b.pricePerNight;
                });

                return (
                    <div key={locality} style={{ marginBottom: 16 }}>
                        <h3 style={{
                            fontSize: 13, fontWeight: 600, color: '#a0a0cc',
                            marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>
                            📍 {locality}
                        </h3>

                        <div style={{
                            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
                        }}>
                            {sorted.slice(0, 6).map(hotel => {
                                const isSelected = selected?.id === hotel.id;
                                return (
                                    <div
                                        key={hotel.id}
                                        onClick={() => setSelectedHotel(locality, hotel)}
                                        className="glass-card"
                                        style={{
                                            minWidth: 200, maxWidth: 220, padding: 14, cursor: 'pointer',
                                            border: isSelected
                                                ? '1px solid rgba(99,102,241,0.5)'
                                                : '1px solid rgba(99,102,241,0.1)',
                                            background: isSelected
                                                ? 'rgba(99,102,241,0.08)'
                                                : 'rgba(26,26,62,0.7)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {isSelected && (
                                            <span className="badge badge-success" style={{ fontSize: 10, marginBottom: 8 }}>
                                                ✓ Selected
                                            </span>
                                        )}
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                                            {hotel.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 4 }}>
                                            {'⭐'.repeat(hotel.starRating)}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b6b99', marginBottom: 6 }}>
                                            {hotel.propertyType}
                                        </div>
                                        <div style={{
                                            fontWeight: 700, fontSize: 16,
                                            background: 'linear-gradient(135deg, #10b981, #34d399)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                        }}>
                                            ₹{hotel.pricePerNight.toLocaleString('en-IN')}
                                            <span style={{
                                                fontSize: 11, fontWeight: 400,
                                                WebkitTextFillColor: '#6b6b99',
                                            }}>/night</span>
                                        </div>

                                        {/* Amenity icons */}
                                        <div style={{
                                            display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8,
                                            fontSize: 11,
                                        }}>
                                            {hotel.amenities.wifi && <span title="WiFi">📶</span>}
                                            {hotel.amenities.swimmingPool && <span title="Pool">🏊</span>}
                                            {hotel.amenities.spa && <span title="Spa">💆</span>}
                                            {hotel.amenities.restaurant && <span title="Restaurant">🍽️</span>}
                                            {hotel.amenities.parking && <span title="Parking">🅿️</span>}
                                            {hotel.amenities.bar && <span title="Bar">🍸</span>}
                                        </div>

                                        {/* Booking link */}
                                        <a
                                            href={hotel.bookingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'block', marginTop: 8, fontSize: 12,
                                                color: '#818cf8', textDecoration: 'none',
                                            }}
                                        >
                                            Book now →
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
