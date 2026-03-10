'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSafarStore } from '@/lib/store';
import { Spot, P2PTravel, Restaurant, LatLng } from '@/lib/types';

// Custom marker icons
const spotIcon = new L.DivIcon({
    html: '<div style="width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);font-size:11px;color:white">📍</span></div>',
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
});

const restaurantIcon = new L.DivIcon({
    html: '<div style="width:24px;height:24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">🍽️</div>',
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
});

const hotelIcon = new L.DivIcon({
    html: '<div style="width:26px;height:26px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px">🏨</div>',
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
});

// Auto-fit bounds component
function FitBounds({ points }: { points: LatLng[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
        }
    }, [points, map]);
    return null;
}

// Click-to-add handler
function MapClickHandler() {
    const { itinerary, selectedDay } = useSafarStore();

    useMapEvents({
        click: async (e) => {
            const { lat, lng } = e.latlng;
            // For now, show a simple prompt to add a place
            const name = window.prompt(
                `Add a place at (${lat.toFixed(4)}, ${lng.toFixed(4)})?\nEnter a name for this place:`
            );
            if (!name) return;

            const newSpot: Spot = {
                id: `custom-${Date.now()}`,
                name,
                address: `Custom place at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                location: { lat, lng },
                timeToSpend: 1,
                openingTime: '00:00',
                closingTime: '23:59',
                entryFee: 0,
                category: 'Custom',
                description: `User-added place: ${name}`,
                rating: 4.0,
                popularity: 5,
            };

            try {
                const res = await fetch('/api/deltaUpdate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'add_place',
                        itinerary,
                        payload: { spot: newSpot, dayNumber: selectedDay || 1 },
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    useSafarStore.getState().setItinerary(data.itinerary);
                }
            } catch (err) {
                console.error('Failed to add place:', err);
            }
        },
    });

    return null;
}

export default function MapView() {
    const { itinerary, selectedDay, selectedHotels, selectedPlaceId, setSelectedPlaceId } = useSafarStore();
    const markerRefs = useRef<Record<string, L.Marker>>({});

    // Collect all points to display
    const { spots, restaurants, routes, allPoints, hotelMarkers } = useMemo(() => {
        // ... (Memo logic keeps same)
        if (!itinerary) return { spots: [], restaurants: [], routes: [], allPoints: [], hotelMarkers: [] };

        const daysToShow = selectedDay
            ? itinerary.days.filter(d => d.dayNumber === selectedDay)
            : itinerary.days;

        const spots: { spot: Spot; dayNum: number }[] = [];
        const restaurants: { restaurant: Restaurant; dayNum: number }[] = [];
        const routes: { points: [number, number][]; dayNum: number; color: string }[] = [];
        const allPoints: LatLng[] = [];
        const hotelMarkers: { hotel: { name: string; location: LatLng }; locality: string }[] = [];

        const dayColors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

        for (const day of daysToShow) {
            const routePoints: [number, number][] = [];
            const color = dayColors[(day.dayNumber - 1) % dayColors.length];

            // Add hotel marker
            if (day.hotel) {
                hotelMarkers.push({ hotel: day.hotel, locality: day.locality });
                routePoints.push([day.hotel.location.lat, day.hotel.location.lng]);
                allPoints.push(day.hotel.location);
            } else if (selectedHotels[day.locality]) {
                const h = selectedHotels[day.locality];
                hotelMarkers.push({ hotel: h, locality: day.locality });
                routePoints.push([h.location.lat, h.location.lng]);
                allPoints.push(h.location);
            }

            for (const item of day.items) {
                if (item.type === 'spot') {
                    const spot = item.data as Spot;
                    spots.push({ spot, dayNum: day.dayNumber });
                    routePoints.push([spot.location.lat, spot.location.lng]);
                    allPoints.push(spot.location);
                } else if (item.type === 'restaurant') {
                    const rest = item.data as Restaurant;
                    restaurants.push({ restaurant: rest, dayNum: day.dayNumber });
                    routePoints.push([rest.location.lat, rest.location.lng]);
                    allPoints.push(rest.location);
                }
            }

            if (routePoints.length > 1) {
                routes.push({ points: routePoints, dayNum: day.dayNumber, color });
            }
        }

        return { spots, restaurants, routes, allPoints, hotelMarkers };
    }, [itinerary, selectedDay, selectedHotels]);

    // Programmatically open popup when selectedPlaceId changes
    useEffect(() => {
        if (selectedPlaceId && markerRefs.current[selectedPlaceId]) {
            markerRefs.current[selectedPlaceId].openPopup();
        }
    }, [selectedPlaceId]);

    // Default center (India)
    const defaultCenter: [number, number] = allPoints.length > 0
        ? [allPoints[0].lat, allPoints[0].lng]
        : [20.5937, 78.9629];

    const removeSpot = async (spotId: string) => {
        // ... (Keep removeSpot logic same)
        if (!itinerary) return;
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
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds points={allPoints} />
                <MapClickHandler />

                {/* Route polylines */}
                {routes.map((route, i) => (
                    <Polyline
                        key={`route-${i}`}
                        positions={route.points}
                        pathOptions={{
                            color: '#1e3a8a', // Bold Dark Blue
                            weight: 5,       // Bolder
                            opacity: 0.8,
                            dashArray: '5, 15', // More visible dots
                            lineCap: 'round'
                        }}
                    />
                ))}

                {/* Hotel markers */}
                {hotelMarkers.map((h, i) => (
                    <Marker key={`hotel-${i}`} position={[h.hotel.location.lat, h.hotel.location.lng]} icon={hotelIcon}>
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
                                <strong style={{ color: '#f59e0b' }}>🏨 {h.hotel.name}</strong>
                                <p style={{ fontSize: 12, margin: '4px 0', color: '#666' }}>{h.locality}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Spot markers */}
                {spots.map(({ spot, dayNum }) => (
                    <Marker
                        key={spot.id}
                        position={[spot.location.lat, spot.location.lng]}
                        icon={spotIcon}
                        ref={(ref) => { if (ref) markerRefs.current[spot.id] = ref; }}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <strong style={{ fontSize: 14 }}>{spot.name}</strong>
                                    <span style={{
                                        background: '#6366f1', color: 'white', fontSize: 10,
                                        padding: '2px 6px', borderRadius: 4,
                                    }}>Day {dayNum}</span>
                                </div>
                                <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{spot.description}</p>
                                <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8, marginBottom: 6 }}>
                                    <span>⏰ {spot.openingTime}-{spot.closingTime}</span>
                                    <span>⏱️ {spot.timeToSpend}h</span>
                                    {spot.entryFee > 0 && <span>₹{spot.entryFee}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ fontSize: 11, color: '#f59e0b' }}>{'⭐'.repeat(Math.round(spot.rating))}</span>
                                </div>
                                <button
                                    onClick={() => removeSpot(spot.id)}
                                    style={{
                                        marginTop: 8, padding: '4px 12px', borderRadius: 4,
                                        background: '#ef4444', color: 'white', border: 'none',
                                        fontSize: 11, cursor: 'pointer', width: '100%',
                                    }}
                                >
                                    ✕ Remove from itinerary
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Restaurant markers */}
                {restaurants.map(({ restaurant, dayNum }) => (
                    <Marker
                        key={restaurant.id}
                        position={[restaurant.location.lat, restaurant.location.lng]}
                        icon={restaurantIcon}
                        ref={(ref) => { if (ref) markerRefs.current[restaurant.id] = ref; }}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
                                <strong style={{ fontSize: 14, color: '#10b981' }}>🍽️ {restaurant.name}</strong>
                                <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{restaurant.cuisine}</p>
                                <p style={{ fontSize: 11, color: '#888' }}>
                                    Avg ₹{restaurant.avgCostForTwo} for two · Day {dayNum}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Horizontal Spot Carousel (Scrollbar on the map) */}
            {selectedDay && (spots.length > 0 || restaurants.length > 0) && (
                <div style={{
                    position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
                    width: '90%', zIndex: 1000,
                    display: 'flex', gap: 12, overflowX: 'auto', padding: '12px 0',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(99,102,241,0.5) transparent',
                }}>
                    {[...spots, ...restaurants.map(r => ({ spot: r.restaurant as any, dayNum: r.dayNum, type: 'food' }))].map((item, idx) => {
                        const isSpot = 'spot' in item;
                        const data = isSpot ? item.spot : (item as any).spot;
                        const isSelected = selectedPlaceId === data.id;

                        return (
                            <div
                                key={`${data.id}-${idx}`}
                                className="glass"
                                onClick={() => {
                                    setSelectedPlaceId(data.id);
                                    const marker = markerRefs.current[data.id];
                                    if (marker) marker.openPopup();
                                }}
                                style={{
                                    minWidth: 200, padding: '10px 14px', borderRadius: 12,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                    background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(10,10,26,0.8)',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>{isSpot ? '📍' : '🍽️'}</span>
                                    <strong style={{ fontSize: 13, color: '#f0f0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {data.name}
                                    </strong>
                                </div>
                                <div style={{ fontSize: 11, color: '#a0a0cc' }}>
                                    {isSpot ? data.category : (data as any).cuisine}
                                </div>
                                <div style={{ fontSize: 10, color: '#6b6b99', marginTop: 4 }}>
                                    {isSelected ? '🎯 Selected' : 'Click to view'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Map Legend */}
            <div className="glass" style={{
                position: 'absolute', bottom: 20, left: 20, zIndex: 1000,
                padding: '12px 16px', display: 'flex', gap: 16, fontSize: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                    <span style={{ color: '#a0a0cc' }}>Attractions</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ color: '#a0a0cc' }}>Restaurants</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ color: '#a0a0cc' }}>Hotels</span>
                </div>
                <div style={{ color: '#6b6b99' }}>Click map to add a place</div>
            </div>
        </div>
    );
}
