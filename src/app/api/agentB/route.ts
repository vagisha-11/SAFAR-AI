// ============================================================
// Safar AI — Agent B: Itinerary Maker
// Core clustering + scheduling logic
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { Spot, Restaurant, DayPlan, ItineraryItem, LatLng, P2PTravel } from '@/lib/types';
import { getP2PCost, haversineDistance } from '@/lib/fakeApi';
import { v4 as uuidv4 } from 'uuid';

const ROAD_SPEED_KMH = 25; // Average road speed in a city
const DEFAULT_START_HOUR = 8; // 2 hours past ~6 AM sunrise
const DEFAULT_MAX_HOURS = 14;

interface AgentBInput {
    spots: Spot[];
    restaurants: Restaurant[];
    daysInLocality: number;
    locality: string;
    cityCenter: LatLng;
    maxHoursPerDay: number;
    userPreferences?: string[];
    startDate: string;
}

/**
 * Score a spot based on priority:
 * 1. Popularity (tourist visits)
 * 2. Rating (recommendations)
 * 3. User preference match
 */
function scoreSpot(spot: Spot, preferences: string[]): number {
    let score = spot.popularity * 2 + spot.rating * 3;

    // Boost for user preferences
    for (const pref of preferences) {
        if (spot.category.toLowerCase().includes(pref.toLowerCase()) ||
            spot.name.toLowerCase().includes(pref.toLowerCase()) ||
            spot.description.toLowerCase().includes(pref.toLowerCase())) {
            score += 15;
        }
    }

    return score;
}

/**
 * Check if a spot is open at the given time
 */
function isSpotOpen(spot: Spot, timeHour: number): boolean {
    const open = parseInt(spot.openingTime.split(':')[0]);
    const close = parseInt(spot.closingTime.split(':')[0]);

    if (close < open) {
        // Overnight hours (e.g., 22:00 - 02:00)
        return timeHour >= open || timeHour < close;
    }
    return timeHour >= open && timeHour < close;
}

/**
 * Calculate travel time between two points in minutes
 */
function travelTimeMinutes(from: LatLng, to: LatLng): number {
    const dist = haversineDistance(from, to) * 1.3; // 30% road factor
    return (dist / ROAD_SPEED_KMH) * 60;
}

/**
 * Format hour number to "HH:MM" string
 */
function formatTime(hourDecimal: number): string {
    const hours = Math.floor(hourDecimal);
    const minutes = Math.round((hourDecimal - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Find nearest restaurant for a meal
 */
function findNearestRestaurant(
    location: LatLng,
    restaurants: Restaurant[],
    mealType: 'lunch' | 'dinner',
    usedRestaurants: Set<string>
): Restaurant | null {
    const candidates = restaurants.filter(
        r => !usedRestaurants.has(r.id) && (r.mealType === mealType || r.mealType === 'any')
    );

    if (candidates.length === 0) return null;

    candidates.sort(
        (a, b) => haversineDistance(location, a.location) - haversineDistance(location, b.location)
    );

    return candidates[0];
}

/**
 * Core clustering algorithm:
 * Greedy approach — iterate through scored & sorted spots,
 * assign to days based on spatial proximity and time constraints
 */
function buildDayPlans(input: AgentBInput): DayPlan[] {
    const { spots, restaurants, daysInLocality, locality, cityCenter, maxHoursPerDay, userPreferences = [], startDate } = input;

    // 1. Score and sort spots
    const scored = spots.map(s => ({ spot: s, score: scoreSpot(s, userPreferences) }));
    scored.sort((a, b) => b.score - a.score);

    // 2. Select top spots (up to ~6-8 per day target)
    const maxSpotsTotal = Math.min(scored.length, daysInLocality * 7);
    const selectedSpots = scored.slice(0, maxSpotsTotal).map(s => s.spot);

    // 3. Sort by closing time (visit spots with earlier closing times first)
    selectedSpots.sort((a, b) => {
        const closeA = parseInt(a.closingTime.split(':')[0]);
        const closeB = parseInt(b.closingTime.split(':')[0]);
        return closeA - closeB;
    });

    // 4. Greedy clustering into day plans
    const dayPlans: DayPlan[] = [];
    const assigned = new Set<string>();
    const usedRestaurants = new Set<string>();

    for (let day = 0; day < daysInLocality; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        const items: ItineraryItem[] = [];
        let currentTime = DEFAULT_START_HOUR; // Start at 8 AM
        let currentLocation = cityCenter;
        let totalHours = 0;
        let lunchDone = false;
        let dinnerDone = false;
        let dayCost = 0;

        // Get unassigned spots, prefer those close to current cluster
        const unassigned = selectedSpots.filter(s => !assigned.has(s.id));

        // Sort by distance from city center for first pass, then by proximity
        const daySpots = [...unassigned].sort((a, b) => {
            // Primary: closing time (visit early-closing spots first)
            const closeA = parseInt(a.closingTime.split(':')[0]);
            const closeB = parseInt(b.closingTime.split(':')[0]);
            if (closeA !== closeB) return closeA - closeB;
            // Secondary: distance from city center
            return haversineDistance(cityCenter, a.location) - haversineDistance(cityCenter, b.location);
        });

        for (const spot of daySpots) {
            if (totalHours >= maxHoursPerDay) break;

            // Calculate travel time to this spot
            const travelMin = travelTimeMinutes(currentLocation, spot.location);
            const travelHours = travelMin / 60;
            const arrivalTime = currentTime + travelHours;

            // Check if spot is open when we'd arrive
            if (!isSpotOpen(spot, arrivalTime)) continue;

            // Check if we can visit and return by max hours
            const totalTimeNeeded = travelHours + spot.timeToSpend;
            const returnTravel = travelTimeMinutes(spot.location, cityCenter) / 60;
            if (totalHours + totalTimeNeeded + returnTravel > maxHoursPerDay) continue;

            // Add P2P travel to spot
            const p2p = getP2PCost(currentLocation, spot.location,
                items.length === 0 ? 'Hotel' : (items[items.length - 1].data as Spot).name || 'Previous',
                spot.name, 'cab');

            items.push({
                type: 'p2p',
                data: p2p,
                startTime: formatTime(currentTime),
                endTime: formatTime(currentTime + travelHours),
            });
            dayCost += p2p.cost;
            currentTime += travelHours;

            // Add the spot
            items.push({
                type: 'spot',
                data: spot,
                startTime: formatTime(currentTime),
                endTime: formatTime(currentTime + spot.timeToSpend),
            });
            dayCost += spot.entryFee;
            currentTime += spot.timeToSpend;
            totalHours += totalTimeNeeded;
            currentLocation = spot.location;
            assigned.add(spot.id);

            // Lunch break around 12:30-14:00
            if (!lunchDone && currentTime >= 12.5 && currentTime <= 14) {
                const lunch = findNearestRestaurant(currentLocation, restaurants, 'lunch', usedRestaurants);
                if (lunch) {
                    const lunchTravel = travelTimeMinutes(currentLocation, lunch.location) / 60;
                    const lunchP2P = getP2PCost(currentLocation, lunch.location, spot.name, lunch.name, 'rickshaw');
                    items.push({
                        type: 'p2p', data: lunchP2P,
                        startTime: formatTime(currentTime), endTime: formatTime(currentTime + lunchTravel),
                    });
                    dayCost += lunchP2P.cost;
                    currentTime += lunchTravel;

                    items.push({
                        type: 'restaurant', data: lunch,
                        startTime: formatTime(currentTime), endTime: formatTime(currentTime + 1),
                        notes: '🍽️ Lunch',
                    });
                    dayCost += lunch.avgCostForTwo / 2;
                    currentTime += 1;
                    totalHours += lunchTravel + 1;
                    currentLocation = lunch.location;
                    usedRestaurants.add(lunch.id);
                    lunchDone = true;
                }
            }

            // Dinner around 19:30-21:00
            if (!dinnerDone && currentTime >= 19.5 && currentTime <= 21) {
                const dinner = findNearestRestaurant(currentLocation, restaurants, 'dinner', usedRestaurants);
                if (dinner) {
                    const dinnerTravel = travelTimeMinutes(currentLocation, dinner.location) / 60;
                    const dinnerP2P = getP2PCost(currentLocation, dinner.location, spot.name, dinner.name, 'rickshaw');
                    items.push({
                        type: 'p2p', data: dinnerP2P,
                        startTime: formatTime(currentTime), endTime: formatTime(currentTime + dinnerTravel),
                    });
                    dayCost += dinnerP2P.cost;
                    currentTime += dinnerTravel;

                    items.push({
                        type: 'restaurant', data: dinner,
                        startTime: formatTime(currentTime), endTime: formatTime(currentTime + 1),
                        notes: '🍽️ Dinner',
                    });
                    dayCost += dinner.avgCostForTwo / 2;
                    currentTime += 1;
                    totalHours += dinnerTravel + 1;
                    currentLocation = dinner.location;
                    usedRestaurants.add(dinner.id);
                    dinnerDone = true;
                }
            }
        }

        // Add return P2P to hotel/city center
        if (items.length > 0) {
            const returnP2P = getP2PCost(currentLocation, cityCenter, 'Last Stop', 'Hotel', 'cab');
            const returnHours = returnP2P.duration / 60;
            items.push({
                type: 'p2p', data: returnP2P,
                startTime: formatTime(currentTime), endTime: formatTime(currentTime + returnHours),
                notes: '🏨 Return to hotel',
            });
            dayCost += returnP2P.cost;
        }

        // If no lunch was added, add one in the middle
        if (!lunchDone && restaurants.length > 0) {
            const lunch = restaurants.find(r => !usedRestaurants.has(r.id) && (r.mealType === 'lunch' || r.mealType === 'any'));
            if (lunch) {
                const midIdx = Math.floor(items.length / 2);
                items.splice(midIdx, 0, {
                    type: 'restaurant', data: lunch,
                    startTime: '13:00', endTime: '14:00',
                    notes: '🍽️ Lunch',
                });
                dayCost += lunch.avgCostForTwo / 2;
                usedRestaurants.add(lunch.id);
            }
        }

        dayPlans.push({
            dayNumber: day + 1,
            date: dateStr,
            locality,
            isTransitDay: false,
            items,
            totalCost: Math.round(dayCost),
        });
    }

    return dayPlans;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { localities, agentData, startDate, maxHoursPerDay = DEFAULT_MAX_HOURS, userPreferences = [] } = body;

        const allDayPlans: DayPlan[] = [];
        let dayOffset = 0;

        for (const loc of localities) {
            if (loc.isTransitDay) {
                // Transit day — minimal plan
                const date = new Date(startDate);
                date.setDate(date.getDate() + dayOffset);
                allDayPlans.push({
                    dayNumber: dayOffset + 1,
                    date: date.toISOString().split('T')[0],
                    locality: loc.locality,
                    isTransitDay: true,
                    items: [],
                    totalCost: 0,
                });
                dayOffset += 1;
                continue;
            }

            const spots = agentData.spots[loc.locality] || [];
            const restaurants = agentData.restaurants[loc.locality] || [];

            const dayPlans = buildDayPlans({
                spots,
                restaurants,
                daysInLocality: loc.days,
                locality: loc.locality,
                cityCenter: loc.center,
                maxHoursPerDay,
                userPreferences,
                startDate: new Date(new Date(startDate).getTime() + dayOffset * 86400000).toISOString(),
            });

            // Re-number days
            for (const dp of dayPlans) {
                dp.dayNumber = dayOffset + dp.dayNumber;
            }

            allDayPlans.push(...dayPlans);
            dayOffset += loc.days;
        }

        return NextResponse.json({
            success: true,
            dayPlans: allDayPlans,
        });
    } catch (error) {
        console.error('Agent B error:', error);
        return NextResponse.json({ success: false, error: 'Agent B failed' }, { status: 500 });
    }
}
