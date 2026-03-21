// ============================================================
// Safar AI — Fake P2P Travel API
// ============================================================
import { P2PTravel, LatLng, P2PMode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Cost per km in INR (realistic Indian market rates)
const RATE_PER_KM: Record<P2PMode, number> = {
    cab: 18,       // ~Ola/Uber pricing
    rickshaw: 10,  // ~Auto-rickshaw rate
    walk: 0,
};

// Minimum base fare to prevent absurdly cheap short trips
const BASE_FARE: Record<P2PMode, number> = {
    cab: 100,    // Minimum cab fare (₹100)
    rickshaw: 30, // Minimum auto fare (₹30)
    walk: 0,
};

// Speed in km/h
const SPEED: Record<P2PMode, number> = {
    cab: 30,
    rickshaw: 20,
    walk: 5,
};

/**
 * Calculate distance between two lat/lng points using Haversine formula
 */
export function haversineDistance(from: LatLng, to: LatLng): number {
    const R = 6371; // Earth radius in km
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const CACHE_FILE = path.join(process.cwd(), 'ola-cache.json');
let routeCache: Record<string, { distance: number, duration: number }> = {};

try {
    if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf-8');
        routeCache = JSON.parse(data);
    }
} catch (e) {
    console.warn('Could not read ola-cache.json', e);
}

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(routeCache, null, 2));
    } catch (e) {
        console.warn('Could not write ola-cache.json', e);
    }
}

export async function getOlaRoute(from: LatLng, to: LatLng): Promise<{distance: number, duration: number}> {
    const fromStr = `${from.lat.toFixed(5)},${from.lng.toFixed(5)}`;
    const toStr = `${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
    const cacheKey = `${fromStr}_${toStr}`;

    if (routeCache[cacheKey]) {
        return routeCache[cacheKey];
    }

    const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';
    if (!apiKey) {
        const dist = haversineDistance(from, to) * 1.3;
        return { distance: dist, duration: (dist / 30) * 60 };
    }

    try {
        const url = `https://api.olamaps.io/routing/v1/directions/basic?origin=${fromStr}&destination=${toStr}&api_key=${apiKey}`;
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        
        const route = data?.routes?.[0];
        if (route && route.legs && route.legs.length > 0) {
            let distanceInKm = 0;
            let durationInMins = 0;
            if (data.routes[0].distance !== undefined) {
                distanceInKm = data.routes[0].distance / 1000;
                durationInMins = data.routes[0].duration / 60;
            } else if (route.legs[0].distance !== undefined) {
                 distanceInKm = route.legs[0].distance / 1000;
                 durationInMins = route.legs[0].duration / 60;
            } else {
                throw new Error("Could not parse distance/duration");
            }
            
            const result = { distance: distanceInKm, duration: durationInMins };
            routeCache[cacheKey] = result;
            saveCache();
            return result;
        }
    } catch (e) {
        console.warn('Ola maps API failed, falling back to haversine', e);
    }
    
    const dist = haversineDistance(from, to) * 1.3;
    const dur = (dist / 30) * 60;
    return { distance: dist, duration: dur };
}

/**
 * Get P2P travel details between two points
 */
export async function getP2PCost(
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string,
    mode: P2PMode
): Promise<P2PTravel> {
    const { distance, duration } = await getOlaRoute(from, to);
    
    let finalDuration = duration;
    // Real Ola Maps direction duration is typically for driving (cab). Apply heuristics for other modes:
    if (mode === 'walk') {
        finalDuration = (distance / SPEED['walk']) * 60;
    } else if (mode === 'rickshaw') {
        finalDuration = (distance / SPEED['rickshaw']) * 60;
    }

    // Apply base fare + per-km rate using the actual road distance from Ola Maps
    const cost = Math.max(BASE_FARE[mode], Math.round(distance * RATE_PER_KM[mode]));

    return {
        id: uuidv4(),
        from,
        to,
        fromName,
        toName,
        mode,
        distance: Math.round(distance * 10) / 10,
        duration: Math.round(finalDuration),
        cost,
    };
}

/**
 * Get all P2P travel options between two points
 */
export async function getAllP2POptions(
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string
): Promise<P2PTravel[]> {
    const modes: P2PMode[] = ['cab', 'rickshaw', 'walk'];
    const results = await Promise.all(modes.map(mode => getP2PCost(from, to, fromName, toName, mode)));
    return results;
}
