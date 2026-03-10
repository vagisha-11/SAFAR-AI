// ============================================================
// Safar AI — Fake P2P Travel API
// ============================================================
import { P2PTravel, LatLng, P2PMode } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Cost per km in INR
const RATE_PER_KM: Record<P2PMode, number> = {
    cab: 15,
    rickshaw: 5,
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

/**
 * Get P2P travel details between two points
 */
export function getP2PCost(
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string,
    mode: P2PMode
): P2PTravel {
    const distance = haversineDistance(from, to);
    // Add 30% for road distance vs straight line
    const roadDistance = distance * 1.3;
    const duration = (roadDistance / SPEED[mode]) * 60; // in minutes
    const cost = Math.round(roadDistance * RATE_PER_KM[mode]);

    return {
        id: uuidv4(),
        from,
        to,
        fromName,
        toName,
        mode,
        distance: Math.round(roadDistance * 10) / 10,
        duration: Math.round(duration),
        cost,
    };
}

/**
 * Get all P2P travel options between two points
 */
export function getAllP2POptions(
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string
): P2PTravel[] {
    const modes: P2PMode[] = ['cab', 'rickshaw', 'walk'];
    return modes.map(mode => getP2PCost(from, to, fromName, toName, mode));
}
