'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer, MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSafarStore } from '@/lib/store';
import { Spot, Restaurant, LatLng, RouteInfo } from '@/lib/types';
import { decodePolyline } from '@/lib/decodePolyline';

// Custom marker icons
const SpotIcon = () => (
    <div style={{width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer'}}>
        <span style={{transform: 'rotate(45deg)', fontSize: 11, color: 'white'}}>📍</span>
    </div>
);

const RestaurantIcon = () => (
    <div style={{width: 24, height: 24, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontSize: 12, cursor: 'pointer'}}>🍽️</div>
);

const HotelIcon = () => (
    <div style={{width: 26, height: 26, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontSize: 12, cursor: 'pointer'}}>🏨</div>
);

const OLA_MAPS_STYLES = {
    '2d-light': { name: '2D Light', url: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json', pitch: 0 },
    '3d-dark': { name: '3D Dark', url: 'https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json', pitch: 60 },
    'satellite': { name: 'Satellite', url: 'https://api.olamaps.io/tiles/vector/v1/styles/default-satellite-standard/style.json', pitch: 0 }
};

export default function MapView() {
    const { itinerary, selectedDay, selectedHotels, selectedPlaceId, setSelectedPlaceId, setDayRoutes, setPhotoViewerPlace } = useSafarStore();
    const mapRef = useRef<MapRef>(null);
    const [mapStyleKey, setMapStyleKey] = useState<keyof typeof OLA_MAPS_STYLES>('2d-light');
    const [popupInfo, setPopupInfo] = useState<{ id: string, type: 'spot' | 'restaurant' | 'hotel', data: any, dayNum?: number } | null>(null);
    const [contextMenuPopup, setContextMenuPopup] = useState<{lat: number, lng: number, placeName: string, address: string} | null>(null);
    // Real road route features fetched from Ola Directions API (fallback: empty = use straight-line)
    const [actualRouteFeatures, setActualRouteFeatures] = useState<any[]>([]);

    // Transform request to append Ola Maps API key
    const transformRequest = (url: string) => {
        const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';
        if (url.includes('api.olamaps.io')) {
            const urlObj = new URL(url);
            urlObj.searchParams.set('api_key', apiKey);
            return { url: urlObj.toString() };
        }
        return { url };
    };

    // Data parsing
    const { spots, restaurants, routeFeatures, allPoints, hotelMarkers } = useMemo(() => {
        if (!itinerary) return { spots: [], restaurants: [], routeFeatures: [], allPoints: [], hotelMarkers: [] };

        const daysToShow = selectedDay
            ? itinerary.days.filter(d => d.dayNumber === selectedDay)
            : itinerary.days;

        const spots: { spot: Spot; dayNum: number }[] = [];
        const restaurants: { restaurant: Restaurant; dayNum: number }[] = [];
        const routeFeatures: any[] = [];
        const allPoints: LatLng[] = [];
        const hotelMarkers: { hotel: { name: string; location: LatLng }; locality: string }[] = [];

        const dayColors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

        for (const day of daysToShow) {
            const routePoints: [number, number][] = [];
            let hotelPoint: [number, number] | null = null;
            const color = dayColors[(day.dayNumber - 1) % dayColors.length];

            if (day.hotel) {
                hotelMarkers.push({ hotel: day.hotel, locality: day.locality });
                const pt: [number, number] = [day.hotel.location.lng, day.hotel.location.lat];
                routePoints.push(pt); // Maplibre uses [lng, lat]
                hotelPoint = pt;
                allPoints.push({ lat: day.hotel.location.lat, lng: day.hotel.location.lng });
            } else if (selectedHotels[day.locality]) {
                const h = selectedHotels[day.locality];
                hotelMarkers.push({ hotel: h, locality: day.locality });
                const pt: [number, number] = [h.location.lng, h.location.lat];
                routePoints.push(pt);
                hotelPoint = pt;
                allPoints.push({ lat: h.location.lat, lng: h.location.lng });
            }

            for (const item of day.items) {
                if (item.type === 'spot') {
                    const spot = item.data as Spot;
                    spots.push({ spot, dayNum: day.dayNumber });
                    routePoints.push([spot.location.lng, spot.location.lat]);
                    allPoints.push(spot.location);
                } else if (item.type === 'restaurant') {
                    const rest = item.data as Restaurant;
                    restaurants.push({ restaurant: rest, dayNum: day.dayNumber });
                    routePoints.push([rest.location.lng, rest.location.lat]);
                    allPoints.push(rest.location);
                }
            }

            if (hotelPoint && routePoints.length > 1) {
                routePoints.push(hotelPoint);
            }

            if (routePoints.length > 1) {
                routeFeatures.push({
                    type: 'Feature',
                    properties: { color, dayNum: day.dayNumber },
                    geometry: { type: 'LineString', coordinates: routePoints }
                });
            }
        }

        return { spots, restaurants, routeFeatures, allPoints, hotelMarkers };
    }, [itinerary, selectedDay, selectedHotels]);

    // Fetch real road routes from Ola Directions Basic API whenever waypoints change
    useEffect(() => {
        if (!itinerary) {
            setActualRouteFeatures([]);
            setDayRoutes([]);
            return;
        }

        const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';
        const dayColors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

        const daysToProcess = selectedDay
            ? itinerary.days.filter(d => d.dayNumber === selectedDay)
            : itinerary.days;

        const fetchRoutesForDay = async () => {
            const newFeatures: any[] = [];
            const newRouteInfos: RouteInfo[] = [];

            await Promise.all(daysToProcess.map(async (day) => {
                // Build ordered waypoints: hotel → spots/restaurants → hotel
                const orderedPoints: { lat: number; lng: number }[] = [];

                // Start with hotel
                const hotel = day.hotel || selectedHotels[day.locality];
                if (hotel) orderedPoints.push(hotel.location);

                // Add spots/restaurants in schedule order
                for (const item of day.items) {
                    if (item.type === 'spot') orderedPoints.push((item.data as Spot).location);
                    else if (item.type === 'restaurant') orderedPoints.push((item.data as Restaurant).location);
                }

                // Close loop back to hotel
                if (hotel && orderedPoints.length > 1) orderedPoints.push(hotel.location);

                if (orderedPoints.length < 2) return;

                const origin = `${orderedPoints[0].lat},${orderedPoints[0].lng}`;
                const destination = `${orderedPoints[orderedPoints.length - 1].lat},${orderedPoints[orderedPoints.length - 1].lng}`;
                const middlePoints = orderedPoints.slice(1, -1);
                const waypointsParam = middlePoints.length > 0
                    ? `&waypoints=${middlePoints.map(p => `${p.lat},${p.lng}`).join('|')}`
                    : '';

                const url = `https://api.olamaps.io/routing/v1/directions/basic?origin=${origin}&destination=${destination}${waypointsParam}&api_key=${apiKey}`;

                try {
                    const res = await fetch(url, { method: 'POST' });
                    const data = await res.json();

                    const route = data?.routes?.[0];
                    if (!route) return;

                    // Decode the polyline to get real road coordinates
                    const encoded = route.overview_polyline;
                    const coordinates = encoded ? decodePolyline(encoded) : null;

                    // Sum all leg durations for total ETA
                    const etaSeconds: number = (route.legs || []).reduce(
                        (acc: number, leg: any) => acc + (leg?.duration?.value || 0),
                        0
                    );

                    if (coordinates && coordinates.length > 1) {
                        const color = dayColors[(day.dayNumber - 1) % dayColors.length];
                        newFeatures.push({
                            type: 'Feature',
                            properties: { color, dayNum: day.dayNumber },
                            geometry: { type: 'LineString', coordinates },
                        });
                        newRouteInfos.push({
                            dayNumber: day.dayNumber,
                            encodedPolyline: encoded,
                            etaSeconds,
                            coordinates,
                        });
                    }
                } catch (err) {
                    console.warn(`Directions API failed for day ${day.dayNumber}, using straight-line fallback.`, err);
                }
            }));

            // Only override the straight-line routes if we got at least one real route
            if (newFeatures.length > 0) setActualRouteFeatures(newFeatures);
            else setActualRouteFeatures([]);  // will fall back to straight-line routeFeatures
            if (newRouteInfos.length > 0) setDayRoutes(newRouteInfos);
        };

        fetchRoutesForDay();
    // Rebuild routes when itinerary days, selected day, or hotel selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itinerary, selectedDay, selectedHotels]);
    // Programmatically open popup when selectedPlaceId changes
    useEffect(() => {
        if (selectedPlaceId) {
            const spotMatch = spots.find(s => s.spot.id === selectedPlaceId);
            if (spotMatch) {
                setPopupInfo({ id: spotMatch.spot.id, type: 'spot', data: spotMatch.spot, dayNum: spotMatch.dayNum });
                mapRef.current?.flyTo({ center: [spotMatch.spot.location.lng, spotMatch.spot.location.lat], zoom: 14 });
                return;
            }
            const restMatch = restaurants.find(r => r.restaurant.id === selectedPlaceId);
            if (restMatch) {
                setPopupInfo({ id: restMatch.restaurant.id, type: 'restaurant', data: restMatch.restaurant, dayNum: restMatch.dayNum });
                mapRef.current?.flyTo({ center: [restMatch.restaurant.location.lng, restMatch.restaurant.location.lat], zoom: 14 });
            }
        }
    }, [selectedPlaceId, spots, restaurants]);

    // Fit bounds on init/change
    useEffect(() => {
        if (allPoints.length > 0 && mapRef.current) {
            // Maplibre uses [lng, lat] for bounds
            const lngs = allPoints.map(p => p.lng);
            const lats = allPoints.map(p => p.lat);
            const bounds: [number, number, number, number] = [
                Math.min(...lngs),
                Math.min(...lats),
                Math.max(...lngs),
                Math.max(...lats)
            ];
            mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000, maxZoom: 15 });
        }
    }, [allPoints]);

    const defaultCenter = allPoints.length > 0
        ? { longitude: allPoints[0].lng, latitude: allPoints[0].lat, zoom: 12 }
        : { longitude: 78.9629, latitude: 20.5937, zoom: 4 };

    // Handlers
    const removeSpot = async (spotId: string) => {
        if (!itinerary) return;
        setPopupInfo(null);
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

    const handleMapClick = (e: any) => {
        setPopupInfo(null);
        setContextMenuPopup(null);
        setSelectedPlaceId(null);
    };

    const handleMapRightClick = async (e: any) => {
        e.originalEvent.preventDefault();
        try {
            // Prevent adding a spot when clicking a marker
            if (e.originalEvent.target.closest('.maplibregl-marker') || e.originalEvent.target.closest('.maplibregl-popup')) {
                return;
            }

            const lng = e.lngLat.lng;
            const lat = e.lngLat.lat;

            // Reverse Geocoding with Ola Maps
            let placeName = `Custom place at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            let address = placeName;
            
            try {
                const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';
                const res = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${apiKey}`);
                const data = await res.json();
                if (data && data.results && data.results.length > 0) {
                    placeName = data.results[0].formatted_address.split(',')[0] || placeName;
                    address = data.results[0].formatted_address || address;
                }
            } catch (err) {
                console.error("Reverse geocoding failed:", err);
            }

            setContextMenuPopup({ lat, lng, placeName, address });
        } catch (err) {
            console.error('Failed to handle right click:', err);
        }
    };

    const confirmAddContextPlace = async () => {
        if (!contextMenuPopup || !itinerary) return;
        
        const { lat, lng, placeName, address } = contextMenuPopup;
        const name = window.prompt(`Location found: ${placeName}\nEnter a name for this place:`, placeName);
        if (!name) return; // User cancelled

        const newSpot: Spot = {
            id: `custom-${Date.now()}`,
            name,
            address,
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

        setContextMenuPopup(null);

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
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Map
                ref={mapRef}
                initialViewState={{...defaultCenter, pitch: OLA_MAPS_STYLES[mapStyleKey].pitch}}
                mapStyle={OLA_MAPS_STYLES[mapStyleKey].url}
                transformRequest={transformRequest}
                onContextMenu={handleMapRightClick}
                onClick={handleMapClick}
                onError={(e) => {
                    // Silence specific style-layer mismatch errors to prevent global error overlay
                    if (e.error?.message?.includes('3d_model') || e.error?.message?.includes('vector-tile')) return;
                    console.error('MapLibre error:', e.error);
                }}
                style={{ width: '100%', height: '100%' }}
                interactiveLayerIds={[]}
            >
                {/* Context Menu Popup */}
                {contextMenuPopup && (
                    <Popup
                        longitude={contextMenuPopup.lng}
                        latitude={contextMenuPopup.lat}
                        anchor="bottom"
                        onClose={() => setContextMenuPopup(null)}
                        closeButton={true}
                        closeOnClick={false}
                    >
                        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200, padding: 8 }}>
                            <strong style={{ fontSize: 13, display: 'block', marginBottom: 6, color: '#111827' }}>{contextMenuPopup.placeName}</strong>
                            <p style={{ fontSize: 11, color: '#666', margin: '0 0 10px 0' }}>{contextMenuPopup.address}</p>
                            <button
                                onClick={confirmAddContextPlace}
                                style={{
                                    padding: '6px 12px', borderRadius: 6, background: '#10b981', 
                                    color: 'white', border: 'none', fontSize: 12, cursor: 'pointer',
                                    width: '100%', fontWeight: 600
                                }}
                            >
                                + Add to Itinerary
                            </button>
                        </div>
                    </Popup>
                )}
                {/* Routes — use real road paths from Directions API, fall back to straight-line */}
                {(actualRouteFeatures.length > 0 ? actualRouteFeatures : routeFeatures).map((feature, i) => (
                    <Source key={`route-source-${i}`} id={`route-source-${i}`} type="geojson" data={feature}>
                        <Layer
                            id={`route-layer-${i}`}
                            type="line"
                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            paint={{
                                'line-color': feature.properties.color,
                                'line-width': actualRouteFeatures.length > 0 ? 4 : 5,
                                'line-opacity': 0.85,
                                ...( actualRouteFeatures.length === 0 ? { 'line-dasharray': [1, 2] } : {} ),
                            }}
                        />
                    </Source>
                ))}

                {/* Hotel markers */}
                {hotelMarkers.map((h, i) => (
                    <Marker 
                        key={`hotel-${i}`} 
                        longitude={h.hotel.location.lng} 
                        latitude={h.hotel.location.lat} 
                        anchor="bottom"
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setPopupInfo({ id: `hotel-${i}`, type: 'hotel', data: h });
                        }}
                    >
                        <HotelIcon />
                    </Marker>
                ))}

                {/* Spot markers */}
                {spots.map(({ spot, dayNum }, idx) => (
                    <Marker
                        key={`${spot.id}-${dayNum}-${idx}`}
                        longitude={spot.location.lng} 
                        latitude={spot.location.lat}
                        anchor="bottom"
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setPopupInfo({ id: spot.id, type: 'spot', data: spot, dayNum });
                            setSelectedPlaceId(spot.id);
                        }}
                    >
                        <SpotIcon />
                    </Marker>
                ))}

                {/* Restaurant markers */}
                {restaurants.map(({ restaurant, dayNum }, idx) => (
                    <Marker
                        key={`${restaurant.id}-${dayNum}-${idx}`}
                        longitude={restaurant.location.lng} 
                        latitude={restaurant.location.lat}
                        anchor="bottom"
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setPopupInfo({ id: restaurant.id, type: 'restaurant', data: restaurant, dayNum });
                            setSelectedPlaceId(restaurant.id);
                        }}
                    >
                        <RestaurantIcon />
                    </Marker>
                ))}

                {/* Popups */}
                {popupInfo && popupInfo.type === 'spot' && (
                    <Popup
                        longitude={popupInfo.data.location.lng}
                        latitude={popupInfo.data.location.lat}
                        anchor="top"
                        onClose={() => setPopupInfo(null)}
                        closeButton={true}
                        closeOnClick={false}
                    >
                        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200, padding: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <strong style={{ fontSize: 14, color: '#111827' }}>{popupInfo.data.name}</strong>
                                <span style={{ background: '#6366f1', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>Day {popupInfo.dayNum}</span>
                            </div>
                            <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{popupInfo.data.description}</p>
                            <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8, marginBottom: 6 }}>
                                <span>⏰ {popupInfo.data.openingTime}-{popupInfo.data.closingTime}</span>
                                <span>⏱️ {popupInfo.data.timeToSpend}h</span>
                                {popupInfo.data.entryFee > 0 && <span>₹{popupInfo.data.entryFee}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 11, color: '#f59e0b' }}>{'⭐'.repeat(Math.round(popupInfo.data.rating))}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 11, color: '#f59e0b' }}>{'⭐'.repeat(Math.round(popupInfo.data.rating))}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                <button
                                    onClick={() => setPhotoViewerPlace(popupInfo.data.name)}
                                    style={{ flex: 1, padding: '4px 12px', borderRadius: 4, background: '#4f46e5', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer' }}
                                    title="Street View"
                                >
                                    📷
                                </button>
                                <button
                                    onClick={() => removeSpot(popupInfo.data.id)}
                                    style={{ flex: 3, padding: '4px 12px', borderRadius: 4, background: '#ef4444', color: 'white', border: 'none', fontSize: 11, cursor: 'pointer' }}
                                >
                                    ✕ Remove
                                </button>
                            </div>
                        </div>
                    </Popup>
                )}

                {popupInfo && popupInfo.type === 'restaurant' && (
                    <Popup
                        longitude={popupInfo.data.location.lng}
                        latitude={popupInfo.data.location.lat}
                        anchor="top"
                        onClose={() => setPopupInfo(null)}
                        closeButton={true}
                    >
                        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160, padding: 8 }}>
                            <strong style={{ fontSize: 14, color: '#065f46' }}>🍽️ {popupInfo.data.name}</strong>
                            <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{popupInfo.data.cuisine}</p>
                            <p style={{ fontSize: 11, color: '#888' }}>
                                Avg ₹{popupInfo.data.avgCostForTwo} for two · Day {popupInfo.dayNum}
                            </p>
                        </div>
                    </Popup>
                )}

                {popupInfo && popupInfo.type === 'hotel' && (
                    <Popup
                        longitude={popupInfo.data.hotel.location.lng}
                        latitude={popupInfo.data.hotel.location.lat}
                        anchor="top"
                        onClose={() => setPopupInfo(null)}
                        closeButton={true}
                    >
                        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160, padding: 8 }}>
                            <strong style={{ color: '#92400e', fontSize: 14 }}>🏨 {popupInfo.data.hotel.name}</strong>
                            <p style={{ fontSize: 12, margin: '4px 0', color: '#666' }}>{popupInfo.data.locality}</p>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Map Style Manager Toggle */}
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 10,
                display: 'flex', gap: 6, background: 'rgba(10,10,26,0.85)', padding: 6, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)'
            }}>
                {(Object.keys(OLA_MAPS_STYLES) as Array<keyof typeof OLA_MAPS_STYLES>).map((key) => (
                    <button
                        key={key}
                        onClick={() => {
                            setMapStyleKey(key);
                            mapRef.current?.setPitch(OLA_MAPS_STYLES[key].pitch);
                        }}
                        style={{
                            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: mapStyleKey === key ? '#6366f1' : 'transparent',
                            color: mapStyleKey === key ? '#fff' : '#a0a0cc',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {OLA_MAPS_STYLES[key].name}
                    </button>
                ))}
            </div>

            {/* Horizontal Spot Carousel (Scrollbar on the map) */}
            {selectedDay && (spots.length > 0 || restaurants.length > 0) && (
                <div style={{
                    position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
                    width: '90%', zIndex: 10,
                    display: 'flex', gap: 12, overflowX: 'auto', padding: '12px 0',
                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.5) transparent',
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
                position: 'absolute', bottom: 20, left: 20, zIndex: 10,
                padding: '12px 16px', display: 'flex', gap: 16, fontSize: 12, pointerEvents: 'none'
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
