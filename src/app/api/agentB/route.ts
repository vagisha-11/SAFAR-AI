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

const RELEVANCE_THRESHOLD = 25; // Minimum score to be considered if preferences are set

/**
 * Score a spot based on priority:
 * 1. Popularity (tourist visits)
 * 2. Rating (recommendations)
 * 3. User preference match (HEAVILY WEIGHTED)
 */
function scoreSpot(spot: Spot, preferences: string[]): number {
    let score = spot.popularity + spot.rating * 2;

    if (preferences.length === 0) return score;

    // Heavy boost for user preferences
    let matched = false;
    for (const pref of preferences) {
        const p = pref.toLowerCase();
        if (spot.category.toLowerCase().includes(p) ||
            spot.name.toLowerCase().includes(p) ||
            spot.description.toLowerCase().includes(p)) {
            score += 50;
            matched = true;
        }
    }

    // Significant penalty for categorized spots that DON'T match ANY preference
    // This prevents churches appearing in a nightlife trip
    if (!matched && (
        spot.category === 'Religious' ||
        spot.category === 'Temple' ||
        spot.category === 'Museum' ||
        spot.category === 'Heritage'
    )) {
        score -= 40;
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
        // Overnight hours (e.g., 22:00 - 04:00)
        return timeHour >= open || timeHour < close;
    }
    return timeHour >= open && timeHour < (close === 0 ? 24 : close);
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
    const hourNormalized = hourDecimal % 24;
    const hours = Math.floor(hourNormalized);
    const minutes = Math.round((hourNormalized - hours) * 60);
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

    // 2. Filter by threshold if preferences exist
    let qualified = scored;
    if (userPreferences.length > 0) {
        qualified = scored.filter(s => s.score >= RELEVANCE_THRESHOLD);
        // Fallback: If no spots match threshold, take top 5 anyway
        if (qualified.length === 0) {
            qualified = scored.sort((a, b) => b.score - a.score).slice(0, 5);
        }
    }

    qualified.sort((a, b) => b.score - a.score);

    // 3. Select top spots (up to ~6 per day target for high relevance, less for filler)
    const targetSpotsPerDayLimit = userPreferences.length > 0 ? 5 : 7;
    const maxSpotsTotal = Math.min(qualified.length, daysInLocality * targetSpotsPerDayLimit);
    const selectedSpots = qualified.slice(0, maxSpotsTotal).map(s => s.spot);

    // Calculate Pacing: How many spots SHOULD ideally be in a day?
    const idealSpotsPerDay = Math.ceil(selectedSpots.length / daysInLocality);

    // 4. Sort by closing time (visit spots with earlier closing times first)
    // BUT prioritize high-score items
    selectedSpots.sort((a, b) => {
        const scoreA = scoreSpot(a, userPreferences);
        const scoreB = scoreSpot(b, userPreferences);
        if (Math.abs(scoreA - scoreB) > 20) return scoreB - scoreA;

        const closeA = parseInt(a.closingTime.split(':')[0]);
        const closeB = parseInt(b.closingTime.split(':')[0]);
        return (closeA === 0 ? 24 : closeA) - (closeB === 0 ? 24 : closeB);
    });

    // 5. Greedy clustering into day plans
    const dayPlans: DayPlan[] = [];
    const assigned = new Set<string>();
    const usedRestaurants = new Set<string>();

    for (let day = 0; day < daysInLocality; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        const items: ItineraryItem[] = [];
        let currentTime = DEFAULT_START_HOUR;

        // Late start if previous day had nightlife? (Simplified: if Nightlife interest, start later)
        if (userPreferences.some(p => p.toLowerCase().includes('nightlife'))) {
            currentTime = 11; // 11 AM start for nightlife lovers
        }

        let currentLocation = cityCenter;
        let totalHours = 0;
        let spotsInDay = 0;
        let lunchDone = false;
        let dinnerDone = false;
        let dayCost = 0;

        // Get unassigned spots
        const unassigned = selectedSpots.filter(s => !assigned.has(s.id));

        const daySpots = [...unassigned].sort((a, b) => {
            const scoreA = scoreSpot(a, userPreferences);
            const scoreB = scoreSpot(b, userPreferences);
            // If scores are very different, take the higher one
            if (Math.abs(scoreA - scoreB) > 30) return scoreB - scoreA;

            // Otherwise proximity
            return haversineDistance(currentLocation, a.location) - haversineDistance(currentLocation, b.location);
        });

        for (const spot of daySpots) {
            // Pacing Check: If we reached target, leave some for tomorrow
            // Unless we are on the very last day or if time limit is not at all reached
            if (spotsInDay >= idealSpotsPerDay && day < daysInLocality - 1) {
                // If we have plenty of hours left and unassigned spots are huge, allow one more
                if (totalHours < maxHoursPerDay * 0.4 && unassigned.length > (daysInLocality - day) * idealSpotsPerDay) {
                    // continue adding
                } else {
                    break;
                }
            }

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
            spotsInDay++;

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
