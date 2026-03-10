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
    hotelLocation?: LatLng; // The "Depot" for TOPTW
    maxHoursPerDay: number;
    userPreferences?: string[];
    startDate: string;
    arrivalHour?: number;
    budget?: number;
}

const RELEVANCE_THRESHOLD = 25; // Minimum score to be considered if preferences are set

/**
 * Score a spot (Profit Pi) based on priority:
 * 1. Semantic User preference match (HEAVILY WEIGHTED)
 * 2. Popularity (tourist visits)
 * 3. Rating (recommendations)
 */
function scoreSpot(spot: Spot, preferences: string[], budget?: number): number {
    // Base profit: Rating and Popularity
    let profit = spot.popularity + spot.rating * 5;

    // Budget Sensitivity
    if (budget !== undefined) {
        if (budget < 20000 && spot.entryFee > 500) {
            profit -= 50; // Penalize expensive spots on low budget
        } else if (budget > 60000 && spot.entryFee > 1000) {
            profit += 30; // Boost "Premium" experiences on high budget
        }
    }

    if (preferences.length === 0) return profit;

    // Semantic Boost
    let matched = false;
    for (const pref of preferences) {
        const p = pref.toLowerCase();
        if (spot.category.toLowerCase().includes(p) ||
            spot.name.toLowerCase().includes(p) ||
            spot.description.toLowerCase().includes(p)) {
            profit += 100; // Large profit boost for matches
            matched = true;
        }
    }

    // Dynamic Category Penalty (Instead of static -40)
    // If it's a "Static" category and NO preference matches it, penalize
    if (!matched && (
        spot.category === 'Religious' ||
        spot.category === 'Temple' ||
        spot.category === 'Museum' ||
        spot.category === 'Heritage' ||
        spot.category === 'Cultural'
    )) {
        profit -= 60;
    }

    return profit;
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
/**
 * TOPTW-inspired Simultaneous Multi-Day Solver
 * Maximizes aggregate Profit (User Interest) across all days M.
 */
function buildDayPlans(input: AgentBInput): { dayPlans: DayPlan[], unselectedSpots: Spot[] } {
    const { spots, restaurants, daysInLocality, locality, cityCenter, hotelLocation, maxHoursPerDay, userPreferences = [], startDate, arrivalHour, budget } = input;

    // Use HotelLocation as Depot if available, otherwise CityCenter
    const depot = hotelLocation || cityCenter;

    // 1. Score and filter candidates
    const scored = spots.map(s => ({ spot: s, score: scoreSpot(s, userPreferences, budget) }));
    let qualified = scored.sort((a, b) => b.score - a.score);

    if (userPreferences.length > 0) {
        qualified = qualified.filter(s => s.score >= RELEVANCE_THRESHOLD);
        if (qualified.length === 0) {
            qualified = scored.sort((a, b) => b.score - a.score).slice(0, 7);
        }
    }

    // Target a healthy density: ~4-5 high quality spots per day
    const targetSelection = Math.min(qualified.length, daysInLocality * 5);
    const candidateSpots = qualified.slice(0, targetSelection).map(s => s.spot);

    // 2. Initialize Day Structures
    const days: { items: ItineraryItem[], currentTime: number, currentLocation: LatLng, totalHours: number, spotsCount: number }[] = [];
    for (let i = 0; i < daysInLocality; i++) {
        let startHour = DEFAULT_START_HOUR;

        // For the first day of the ENTIRE itinerary (if this is the first locality or only locality)
        // we respect the arrival hour if provided
        if (i === 0 && arrivalHour !== undefined) {
            startHour = arrivalHour + 1.5; // 1.5 hour buffer for airport/station exit + travel to hotel + check-in
        } else if (userPreferences.some(p => p.toLowerCase().includes('nightlife'))) {
            startHour = 11;
        }

        days.push({
            items: [],
            currentTime: startHour,
            currentLocation: depot,
            totalHours: 0,
            spotsCount: 0
        });
    }

    const assigned = new Set<string>();
    const usedRestaurants = new Set<string>();

    /**
     * Greedy Insertion logic for TOPTW:
     * We look at all unassigned candidates and find the BEST day/position to insert.
     */
    while (assigned.size < candidateSpots.length) {
        let bestInsertion: { spot: Spot, dayIdx: number, costTime: number, efficiency: number } | null = null;

        for (const spot of candidateSpots) {
            if (assigned.has(spot.id)) continue;

            for (let d = 0; d < daysInLocality; d++) {
                const day = days[d];

                // Calculate incremental travel time from LAST location
                const travelMin = travelTimeMinutes(day.currentLocation, spot.location);
                const travelHours = travelMin / 60;
                const arrivalTime = day.currentTime + travelHours;

                // Constraints: Is it open? Does return trip fit in Tmax?
                if (!isSpotOpen(spot, arrivalTime)) continue;

                const stayTime = spot.timeToSpend;
                const returnTime = travelTimeMinutes(spot.location, depot) / 60;
                const deltaTotal = travelHours + stayTime;

                if (day.totalHours + deltaTotal + returnTime > maxHoursPerDay) continue;

                const profit = scoreSpot(spot, userPreferences, budget);
                const efficiency = profit / (deltaTotal || 0.1);

                if (!bestInsertion || efficiency > bestInsertion.efficiency) {
                    bestInsertion = { spot, dayIdx: d, costTime: deltaTotal, efficiency };
                }
            }
        }

        if (!bestInsertion) break; // No more feasible insertions

        // Apply Best Insertion
        const { spot, dayIdx, costTime } = bestInsertion;
        const day = days[dayIdx];

        const p2p = getP2PCost(day.currentLocation, spot.location,
            day.items.length === 0 ? 'Hotel' : (day.items[day.items.length - 1].data as Spot).name,
            spot.name, 'cab');

        day.items.push({
            type: 'p2p',
            data: p2p,
            startTime: formatTime(day.currentTime),
            endTime: formatTime(day.currentTime + (costTime - spot.timeToSpend)),
        });

        day.items.push({
            type: 'spot',
            data: spot,
            startTime: formatTime(day.currentTime + (costTime - spot.timeToSpend)),
            endTime: formatTime(day.currentTime + costTime),
        });

        day.currentTime += costTime;
        day.totalHours += costTime;
        day.currentLocation = spot.location;
        day.spotsCount++;
        assigned.add(spot.id);
    }

    // 3. Finalize Days (Return to Hotel, Food injection)
    const dayPlans = days.map((day, idx) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + idx);
        let dayCost = day.items.reduce((sum, item) => {
            if (item.type === 'p2p') return sum + (item.data as any).cost;
            if (item.type === 'spot') return sum + (item.data as any).entryFee;
            return sum;
        }, 0);

        // Add Return to Depot
        if (day.items.length > 0) {
            const returnP2P = getP2PCost(day.currentLocation, depot, 'Final Stop', 'Hotel', 'cab');
            day.items.push({
                type: 'p2p', data: returnP2P,
                startTime: formatTime(day.currentTime),
                endTime: formatTime(day.currentTime + returnP2P.duration / 60),
                notes: '🏨 Return to hotel',
            });
            dayCost += returnP2P.cost;
        }

        // Inject Lunch/Dinner (Greedy)
        const finalizedItems: ItineraryItem[] = [...day.items];

        // Find best spots for food
        const dayMainSpots = day.items.filter(i => i.type === 'spot').map(i => i.data as Spot);
        if (dayMainSpots.length > 0) {
            // Lunch
            const midSpot = dayMainSpots[Math.floor(dayMainSpots.length / 2)];
            const lunch = findNearestRestaurant(midSpot.location, restaurants, 'lunch', usedRestaurants);
            if (lunch) {
                finalizedItems.push({
                    type: 'restaurant', data: lunch, startTime: '13:00', endTime: '14:00', notes: '🍽️ Mid-day Meal'
                });
                dayCost += lunch.avgCostForTwo / 2;
                usedRestaurants.add(lunch.id);
            }
        }

        return {
            dayNumber: idx + 1,
            date: date.toISOString().split('T')[0],
            locality,
            isTransitDay: false,
            items: finalizedItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
            totalCost: Math.round(dayCost),
        };
    });

    const unselectedSpots = spots
        .filter(s => !assigned.has(s.id));

    return { dayPlans, unselectedSpots };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { localities, agentData, startDate, maxHoursPerDay = DEFAULT_MAX_HOURS, userPreferences = [], hotelLocation, arrivalHour, budget } = body;

        const allDayPlans: DayPlan[] = [];
        const allUnselectedSpots: Spot[] = [];
        let dayOffset = 0;
        let plannedLocalitiesCount = 0;

        for (const loc of localities) {
            if (loc.isTransitDay) {
                // ... same as before
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

            const { dayPlans, unselectedSpots } = buildDayPlans({
                spots,
                restaurants,
                daysInLocality: loc.days,
                locality: loc.locality,
                cityCenter: loc.center,
                hotelLocation,
                maxHoursPerDay,
                userPreferences,
                startDate: new Date(new Date(startDate).getTime() + dayOffset * 86400000).toISOString(),
                arrivalHour: plannedLocalitiesCount === 0 ? arrivalHour : undefined,
                budget,
            });

            // Re-number days
            for (const dp of dayPlans) {
                dp.dayNumber = dayOffset + dp.dayNumber;
            }

            allDayPlans.push(...dayPlans);
            allUnselectedSpots.push(...unselectedSpots);
            dayOffset += loc.days;
            plannedLocalitiesCount++;
        }

        // Resilience: Detect "Empty Day Syndrome"
        const emptyDays = allDayPlans.filter(dp => !dp.isTransitDay && dp.items.filter(i => i.type === 'spot').length === 0);
        const suggestions: { type: 'shorten_trip'; message: string; recommendedDays: number }[] = [];

        if (emptyDays.length > 0) {
            // Find the last day that has actually has spots
            let lastActiveDay = 0;
            for (let i = allDayPlans.length - 1; i >= 0; i--) {
                const hasSpots = allDayPlans[i].items.some(it => it.type === 'spot');
                if (hasSpots) {
                    lastActiveDay = allDayPlans[i].dayNumber;
                    break;
                }
            }

            if (lastActiveDay < allDayPlans.length) {
                suggestions.push({
                    type: 'shorten_trip',
                    message: `It looks like we've covered the best of ${localities.map((l: any) => l.locality).join(', ')} in ${lastActiveDay} days. Would you like to shorten your trip to save costs?`,
                    recommendedDays: lastActiveDay
                });
            }
        }

        return NextResponse.json({
            success: true,
            dayPlans: allDayPlans,
            unselectedSpots: allUnselectedSpots,
            suggestions
        });
    } catch (error) {
        console.error('Agent B error:', error);
        return NextResponse.json({ success: false, error: 'Agent B failed' }, { status: 500 });
    }
}
