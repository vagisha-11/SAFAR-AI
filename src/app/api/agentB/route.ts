// ============================================================
// Safar AI — Agent B: Itinerary Maker
// Core clustering + scheduling logic
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { Spot, Restaurant, DayPlan, ItineraryItem, LatLng, P2PTravel } from '@/lib/types';
import { getP2PCost, haversineDistance, getOlaRoute } from '@/lib/fakeApi';
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
    mustExclude?: string[];
    additionalNotes?: string;
    startDate: string;
    arrivalHour?: number;
    budget?: number;
    dietaryFilter?: 'veg' | 'jain'; // strict dietary requirement
    travelers: number;
}

const RELEVANCE_THRESHOLD = 15; // Lowered threshold: let more diverse spots qualify (popular ones score high regardless)

/**
 * Score a spot (Profit Pi) based on priority:
 * 1. Semantic User preference match (HEAVILY WEIGHTED)
 * 2. Popularity (tourist visits)
 * 3. Rating (recommendations)
 */
function scoreSpot(spot: Spot, preferences: string[], budget?: number, mustExclude: string[] = [], additionalNotes: string = ''): number {
    // Base profit: Rating and Popularity
    let profit = spot.popularity + spot.rating * 5;

    // === POPULARITY FLOOR: Iconic spots are ALWAYS surfaced regardless of preference ===
    // This ensures famous landmarks (Cellular Jail, Taj, etc.) are never filtered out.
    if (spot.popularity >= 8) {
        profit += 70; // Unconditional boost for must-visit landmarks
    }

    // Budget Sensitivity
    if (budget !== undefined) {
        if (budget < 20000 && spot.entryFee > 500) {
            profit -= 40; // Penalize expensive spots on tight budget
        } else if (budget > 60000 && spot.entryFee > 1000) {
            profit += 30; // Boost "Premium" experiences on high budget
        }
    }

    // Hard Penalty for Exclusions (user said "no temples" etc.)
    if (mustExclude && mustExclude.length > 0) {
        for (const ex of mustExclude) {
            const eText = ex.toLowerCase();
            if (spot.category.toLowerCase().includes(eText) || spot.name.toLowerCase().includes(eText) || spot.description.toLowerCase().includes(eText)) {
                profit -= 200; // massive penalty ensuring TOPTW drops it
            }
        }
    }

    // Boost for Unstructured Additional Notes
    if (additionalNotes) {
        const notes = additionalNotes.toLowerCase();
        if (notes.includes(spot.category.toLowerCase()) || notes.includes(spot.name.toLowerCase())) {
            profit += 80;
        }
    }

    if (preferences.length === 0) return profit;

    // Semantic Boost: User's stated interests get a strong priority boost
    let matched = false;
    for (const pref of preferences) {
        const p = pref.toLowerCase();
        if (spot.category.toLowerCase().includes(p) ||
            spot.name.toLowerCase().includes(p) ||
            spot.description.toLowerCase().includes(p)) {
            profit += 100; // Large profit boost for preference matches
            matched = true;
        }
    }

    // Soft Penalty for low-relevance categories when preferences are set.
    // Reduced from -60 to -25: allows these spots to fill itinerary slots naturally
    // when there aren't enough preference-matched spots for the day.
    if (!matched && (
        spot.category === 'Religious' ||
        spot.category === 'Temple' ||
        spot.category === 'Museum' ||
        spot.category === 'Heritage' ||
        spot.category === 'Cultural'
    )) {
        profit -= 25; // Soft penalty, not a hard exclusion
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
async function travelTimeMinutes(from: LatLng, to: LatLng): Promise<number> {
    const { duration } = await getOlaRoute(from, to);
    return duration;
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
 * Find optimal restaurant for a meal that minimizes the detour distance
 * detour = distance(prev, restaurant) + distance(restaurant, next)
 */
async function findOptimalRestaurant(
    prevLocation: LatLng,
    nextLocation: LatLng,
    restaurants: Restaurant[],
    mealType: 'lunch' | 'dinner',
    usedRestaurants: Set<string>,
    dietaryFilter?: 'veg' | 'jain'
): Promise<Restaurant | null> {
    const candidates = restaurants.filter(
        r => !usedRestaurants.has(r.id) && (r.mealType === mealType || r.mealType === 'any')
             && (!dietaryFilter || (dietaryFilter === 'veg' ? r.isPureVeg : r.hasJainFood))
    );

    if (candidates.length === 0) return null;

    const scored = await Promise.all(candidates.map(async (a) => {
        const detour1 = await getOlaRoute(prevLocation, a.location);
        const detour2 = await getOlaRoute(a.location, nextLocation);
        return { restaurant: a, detour: detour1.distance + detour2.distance };
    }));

    scored.sort((a, b) => a.detour - b.detour);

    return scored[0].restaurant;
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
async function buildDayPlans(input: AgentBInput): Promise<{ dayPlans: DayPlan[], unselectedSpots: Spot[] }> {
    const { spots, restaurants, daysInLocality, locality, cityCenter, hotelLocation, maxHoursPerDay, userPreferences = [], mustExclude = [], additionalNotes = '', startDate, arrivalHour, budget, dietaryFilter, travelers } = input;

    // Use HotelLocation as Depot. If missing, flexibly use the first spot's precision coordinates (LLM fallback). Finally, cityCenter.
    const depot = hotelLocation || (spots.length > 0 ? spots[0].location : cityCenter);

    // 1. Score and filter candidates
    const scored = spots.map(s => ({ spot: s, score: scoreSpot(s, userPreferences, budget, mustExclude, additionalNotes) }));
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
        } else if ((userPreferences.some(p => p.toLowerCase().includes('nightlife'))) || additionalNotes.toLowerCase().includes('late')) {
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
                const travelMin = await travelTimeMinutes(day.currentLocation, spot.location);
                const travelHours = travelMin / 60;
                const arrivalTime = day.currentTime + travelHours;

                // Constraints: Is it open? Does return trip fit in Tmax?
                if (!isSpotOpen(spot, arrivalTime)) continue;

                const stayTime = spot.timeToSpend;
                const returnTime = (await travelTimeMinutes(spot.location, depot)) / 60;
                const deltaTotal = travelHours + stayTime;

                if (day.totalHours + deltaTotal + returnTime > maxHoursPerDay) continue;

                const profit = scoreSpot(spot, userPreferences, budget, mustExclude, additionalNotes);
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

        const p2p = await getP2PCost(day.currentLocation, spot.location,
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
    const dayPlans = await Promise.all(days.map(async (day, idx) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + idx);
        
        let finalizedItems: ItineraryItem[] = [];
        let dayCost = 0;

        const timeToDec = (t: string) => {
            const [h, m] = (t || '00:00').split(':').map(Number);
            return h + m / 60;
        };

        let currentDecTime = day.items[0] ? timeToDec(day.items[0].startTime!) : (idx === 0 && arrivalHour ? arrivalHour + 1.5 : DEFAULT_START_HOUR);
        let currentLocation = depot;
        let currentName = 'Hotel';

        const spotsList = day.items.filter(i => i.type === 'spot').map(i => i.data as Spot);
        const lunchIdx = Math.max(0, Math.floor((spotsList.length - 1) / 2));
        const dinnerIdx = Math.max(0, spotsList.length - 1);

        // Rebuild sequentially
        for (let j = 0; j < spotsList.length; j++) {
            const spot = spotsList[j];
            
            // 1. P2P to spot
            const p2pToSpot = await getP2PCost(currentLocation, spot.location, currentName, spot.name, 'cab');
            finalizedItems.push({
                type: 'p2p',
                data: p2pToSpot,
                startTime: formatTime(currentDecTime),
                endTime: formatTime(currentDecTime + p2pToSpot.duration / 60)
            });
            dayCost += p2pToSpot.cost * Math.ceil(travelers / 4);
            currentDecTime += p2pToSpot.duration / 60;

            // 2. Spot
            finalizedItems.push({
                type: 'spot',
                data: spot,
                startTime: formatTime(currentDecTime),
                endTime: formatTime(currentDecTime + spot.timeToSpend)
            });
            dayCost += spot.entryFee * travelers;
            currentDecTime += spot.timeToSpend;
            currentLocation = spot.location;
            currentName = spot.name;

            // 3. Check for Lunch
            if (j === lunchIdx) {
                const nextLoc = j + 1 < spotsList.length ? spotsList[j+1].location : depot;
                const lunch = await findOptimalRestaurant(currentLocation, nextLoc, restaurants, 'lunch', usedRestaurants, dietaryFilter);
                if (lunch) {
                    usedRestaurants.add(lunch.id);
                    const p2pToLunch = await getP2PCost(currentLocation, lunch.location, currentName, lunch.name, 'cab');
                    finalizedItems.push({ type: 'p2p', data: p2pToLunch, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + p2pToLunch.duration / 60) });
                    dayCost += p2pToLunch.cost * Math.ceil(travelers / 4);
                    currentDecTime += p2pToLunch.duration / 60;

                    finalizedItems.push({ type: 'restaurant', data: lunch, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + 1.0), notes: '🍽️ Lunch' });
                    dayCost += (lunch.avgCostForTwo / 2) * travelers;
                    currentDecTime += 1.0;
                    currentLocation = lunch.location;
                    currentName = lunch.name;
                }
            }

            // 4. Check for Dinner
            if (j === dinnerIdx) {
                const nextLoc = depot; // Dinner is last
                const dinner = await findOptimalRestaurant(currentLocation, nextLoc, restaurants, 'dinner', usedRestaurants, dietaryFilter);
                if (dinner) {
                    usedRestaurants.add(dinner.id);
                    const p2pToDinner = await getP2PCost(currentLocation, dinner.location, currentName, dinner.name, 'cab');
                    finalizedItems.push({ type: 'p2p', data: p2pToDinner, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + p2pToDinner.duration / 60) });
                    dayCost += p2pToDinner.cost * Math.ceil(travelers / 4);
                    currentDecTime += p2pToDinner.duration / 60;

                    finalizedItems.push({ type: 'restaurant', data: dinner, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + 1.5), notes: '🍽️ Dinner' });
                    dayCost += (dinner.avgCostForTwo / 2) * travelers;
                    currentDecTime += 1.5;
                    currentLocation = dinner.location;
                    currentName = dinner.name;
                }
            }
        }

        // 5. Return to Depot
        if (currentName !== 'Hotel') {
            const returnP2P = await getP2PCost(currentLocation, depot, currentName, 'Hotel', 'cab');
            finalizedItems.push({
                type: 'p2p', data: returnP2P,
                startTime: formatTime(currentDecTime),
                endTime: formatTime(currentDecTime + returnP2P.duration / 60),
                notes: '🏨 Return to hotel',
            });
            dayCost += returnP2P.cost * Math.ceil(travelers / 4);
        }

        return {
            dayNumber: idx + 1,
            date: date.toISOString().split('T')[0],
            locality,
            isTransitDay: false,
            items: finalizedItems,
            totalCost: Math.round(dayCost),
        };
    }));

    const unselectedSpots = spots
        .filter(s => !assigned.has(s.id));

    return { dayPlans, unselectedSpots };
}

export async function executeAgentB(body: any) {
    const { localities, agentData, startDate, maxHoursPerDay = DEFAULT_MAX_HOURS, userPreferences = [], mustExclude = [], additionalNotes = '', hotelLocation, arrivalHour, budget, travelers = 1 } = body;

    // Derive dietary filter from user preferences/notes
    let dietaryFilter: 'veg' | 'jain' | undefined;
    const allText = [...userPreferences, additionalNotes].join(' ').toLowerCase();
    if (allText.includes('jain')) dietaryFilter = 'jain';
    else if (allText.includes('veg') && !allText.includes('non veg') && !allText.includes('non-veg')) dietaryFilter = 'veg';

    const allDayPlans: DayPlan[] = [];
    const allUnselectedSpots: Spot[] = [];
    const validLocalities: typeof localities = [];
    let dayOffset = 0;
    let plannedLocalitiesCount = 0;

    for (const loc of localities) {
        if (loc.isTransitDay) {
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
            validLocalities.push(loc);
            continue;
        }

        const spots = agentData.spots[loc.locality] || [];
        const restaurants = agentData.restaurants[loc.locality] || [];

        const { dayPlans, unselectedSpots } = await buildDayPlans({
            spots,
            restaurants,
            daysInLocality: loc.days,
            locality: loc.locality,
            cityCenter: loc.center,
            hotelLocation,
            maxHoursPerDay,
            userPreferences,
            mustExclude,
            additionalNotes,
            startDate: new Date(new Date(startDate).getTime() + dayOffset * 86400000).toISOString(),
            arrivalHour: plannedLocalitiesCount === 0 ? arrivalHour : undefined,
            budget,
            dietaryFilter,
            travelers,
        });

        // Ensure a locality is only created if at least one attraction is associated with it
        const hasSpots = dayPlans.some(dp => dp.items.some(i => i.type === 'spot'));
        if (!hasSpots && dayPlans.length > 0) {
            // Drop this locality entirely to save days/time
            continue;
        }

        // Re-number days
        for (const dp of dayPlans) {
            dp.dayNumber = dayOffset + dp.dayNumber;
        }

        allDayPlans.push(...dayPlans);
        allUnselectedSpots.push(...unselectedSpots);
        dayOffset += loc.days;
        plannedLocalitiesCount++;
        validLocalities.push(loc);
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

    return { dayPlans: allDayPlans, unselectedSpots: allUnselectedSpots, suggestions, validLocalities };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = await executeAgentB(body);

        return NextResponse.json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error('Agent B error:', error);
        return NextResponse.json({ success: false, error: 'Agent B failed' }, { status: 500 });
    }
}
