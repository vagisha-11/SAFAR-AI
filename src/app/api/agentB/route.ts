// ============================================================
// Safar AI — Agent B: Itinerary Maker (GPT-Powered)
// Scheduling with Azure OpenAI + OLA Maps integration
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { Spot, Restaurant, DayPlan, ItineraryItem, LatLng, P2PTravel, LocalitySplit } from '@/lib/types';
import { getP2PCost, haversineDistance } from '@/lib/fakeApi';
import { v4 as uuidv4 } from 'uuid';
import { AzureOpenAI } from 'openai';

// ── Constants ──────────────────────────────────────────────
const ROAD_SPEED_KMH = 25;
const CAB_RATE_PER_KM = 15;     // ₹15/km
const DEFAULT_START_HOUR = 8;
const DEFAULT_MAX_HOURS = 14;
const LUNCH_HOUR = 13;          // 1 PM
const DINNER_HOUR = 20;         // 8 PM
const MEAL_DURATION = 1;        // 1 hour per meal
const MEAL_RESERVATION_HOURS = 2.5; // Hours reserved per day for meals + travel
const MEAL_BUDGET_FRACTION = 0.15;  // 15% of total trip budget allocated to food
const MEALS_PER_TRIP_ESTIMATE = 6;  // Estimated total meals over a typical trip
const RELEVANCE_THRESHOLD = 25;
const HOTEL_REST_SENTINEL = 999;    // Sentinel startHour: no activities this day

// ── Azure OpenAI Client ────────────────────────────────────
let _gptClient: AzureOpenAI | null = null;

function getGPTClient(): AzureOpenAI | null {
    if (_gptClient) return _gptClient;
    const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT } = process.env;
    if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY) {
        _gptClient = new AzureOpenAI({
            apiKey: AZURE_OPENAI_API_KEY,
            endpoint: AZURE_OPENAI_ENDPOINT,
            deployment: AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
            apiVersion: '2024-02-01',
        });
    }
    return _gptClient;
}

async function callGPT(prompt: string): Promise<string | null> {
    const client = getGPTClient();
    if (!client) return null;
    try {
        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 600,
            temperature: 0.3,
        });
        return response.choices[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.error('[AgentB] GPT call failed:', err);
        return null;
    }
}

// ── OLA Maps Direction API ────────────────────────────────
async function getOlaDirection(
    from: LatLng,
    to: LatLng,
): Promise<{ distanceKm: number; durationMin: number } | null> {
    const apiKey = process.env.OLA_MAPS_API_KEY;
    if (!apiKey) return null;
    try {
        const url = `https://api.olamaps.io/routing/v1/directions?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&api_key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json();
        const leg = data?.routes?.[0]?.legs?.[0];
        if (!leg) return null;
        return {
            distanceKm: leg.distance.value / 1000,  // metres → km
            durationMin: leg.duration.value / 60,   // seconds → minutes
        };
    } catch {
        return null;
    }
}

/**
 * Get P2P travel cost — tries OLA Maps first, falls back to Haversine.
 */
async function getP2PCostAsync(
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string,
): Promise<P2PTravel> {
    const ola = await getOlaDirection(from, to);
    if (ola) {
        return {
            id: uuidv4(),
            from, to, fromName, toName,
            mode: 'cab',
            distance: Math.round(ola.distanceKm * 10) / 10,
            duration: Math.round(ola.durationMin),
            cost: Math.round(ola.distanceKm * CAB_RATE_PER_KM),
        };
    }
    return getP2PCost(from, to, fromName, toName, 'cab');
}

// ── Input Interface ───────────────────────────────────────
interface AgentBInput {
    spots: Spot[];
    restaurants: Restaurant[];
    daysInLocality: number;
    locality: string;
    cityCenter: LatLng;
    hotelLocation?: LatLng;
    maxHoursPerDay: number;
    userPreferences?: string[];
    startDate: string;
    arrivalHour?: number;           // First day of the first locality
    lastDayDepartureHour?: number;  // Last day of the last locality
    budget?: number;
    isFirstLocality: boolean;
    isLastLocality: boolean;
}

// ── Spot Scoring ──────────────────────────────────────────
function scoreSpot(spot: Spot, preferences: string[], budget?: number): number {
    let profit = spot.popularity + spot.rating * 5;
    if (budget !== undefined) {
        if (budget < 20000 && spot.entryFee > 500) profit -= 50;
        else if (budget > 60000 && spot.entryFee > 1000) profit += 30;
    }
    if (preferences.length === 0) return profit;
    let matched = false;
    for (const pref of preferences) {
        const p = pref.toLowerCase();
        if (
            spot.category.toLowerCase().includes(p) ||
            spot.name.toLowerCase().includes(p) ||
            spot.description.toLowerCase().includes(p)
        ) {
            profit += 100;
            matched = true;
        }
    }
    if (!matched && ['Religious', 'Temple', 'Museum', 'Heritage', 'Cultural'].includes(spot.category)) {
        profit -= 60;
    }
    return profit;
}

// ── Time Helpers ──────────────────────────────────────────
function isSpotOpen(spot: Spot, timeHour: number): boolean {
    const open = parseInt(spot.openingTime.split(':')[0]);
    const close = parseInt(spot.closingTime.split(':')[0]);
    if (close < open) return timeHour >= open || timeHour < close; // overnight
    return timeHour >= open && timeHour < (close === 0 ? 24 : close);
}

function travelTimeMinutes(from: LatLng, to: LatLng): number {
    return (haversineDistance(from, to) * 1.3 / ROAD_SPEED_KMH) * 60;
}

function formatTime(hourDecimal: number): string {
    const norm = ((hourDecimal % 24) + 24) % 24;
    const hours = Math.floor(norm);
    const minutes = Math.min(Math.round((norm - hours) * 60), 59);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ── Meal Eligibility ──────────────────────────────────────
/**
 * Returns true if the given meal should be included for this day.
 *
 * Day-1 exceptions  (first day of first locality):
 *   • No lunch  if the traveller arrives at or after lunch time.
 *   • No dinner if the traveller arrives at or after dinner time.
 *
 * Last-day exceptions (last day of last locality):
 *   • No lunch  if departure is at or before lunch time.
 *   • No dinner if departure is at or before dinner time.
 */
function shouldHaveMeal(
    mealType: 'lunch' | 'dinner',
    isFirstDay: boolean,
    isLastDay: boolean,
    arrivalHour: number | undefined,
    lastDayDepartureHour: number | undefined,
): boolean {
    if (isFirstDay && arrivalHour !== undefined) {
        if (mealType === 'lunch'  && arrivalHour  >= LUNCH_HOUR)  return false;
        if (mealType === 'dinner' && arrivalHour  >= DINNER_HOUR) return false;
    }
    if (isLastDay && lastDayDepartureHour !== undefined) {
        if (mealType === 'lunch'  && lastDayDepartureHour <= LUNCH_HOUR)  return false;
        if (mealType === 'dinner' && lastDayDepartureHour <= DINNER_HOUR) return false;
    }
    return true;
}

// ── Restaurant Selection (haversine sum + GPT) ────────────
/**
 * Selects the best restaurant for a meal.
 * Candidates are scored by sum of haversine distance from prevLocation
 * (previous stop) to restaurant and from restaurant to nextLocation
 * (next stop). Top-3 are offered to GPT alongside ratings and prices
 * for a final recommendation.
 */
async function findBestRestaurant(
    prevLocation: LatLng,
    nextLocation: LatLng | null,
    restaurants: Restaurant[],
    mealType: 'lunch' | 'dinner',
    usedRestaurants: Set<string>,
    budget: number | undefined,
    locality: string,
): Promise<Restaurant | null> {
    const candidates = restaurants.filter(
        r => !usedRestaurants.has(r.id) && (r.mealType === mealType || r.mealType === 'any'),
    );
    if (candidates.length === 0) return null;

    // Score each candidate by total detour distance
    const scored = candidates.map(r => {
        const d1 = haversineDistance(prevLocation, r.location);
        const d2 = nextLocation ? haversineDistance(r.location, nextLocation) : 0;
        return { restaurant: r, distSum: d1 + d2 };
    });
    scored.sort((a, b) => a.distSum - b.distSum);

    const top = scored.slice(0, Math.min(3, scored.length));
    const mealBudgetPerPerson = budget ? Math.round(budget * MEAL_BUDGET_FRACTION / MEALS_PER_TRIP_ESTIMATE) : 500;

    const gptPrompt =
        `Choose the best ${mealType} restaurant in ${locality} for a traveller.\n` +
        `Candidates (ranked by proximity to route):\n` +
        top.map((c, i) =>
            `${i + 1}. ${c.restaurant.name} — Cuisine: ${c.restaurant.cuisine}, ` +
            `Rating: ${c.restaurant.rating}/5, Cost for two: ₹${c.restaurant.avgCostForTwo}, ` +
            `Total detour distance: ${c.distSum.toFixed(1)} km`,
        ).join('\n') +
        `\nMeal budget per person: ₹${mealBudgetPerPerson}\n` +
        `Respond with only the number 1, 2, or 3.`;

    const gptResp = await callGPT(gptPrompt);
    if (gptResp) {
        const m = gptResp.match(/[1-3]/);
        if (m) return top[Math.min(parseInt(m[0]) - 1, top.length - 1)].restaurant;
    }
    return top[0].restaurant; // fallback: closest
}

// ── Opening-Time Validation + GPT Fix ─────────────────────
/**
 * Validates that every spot in the ordered list can be visited when
 * planned. If any timing conflict is detected the full list is sent to
 * GPT which returns a corrected order.
 */
async function validateAndFixSpots(
    spots: Spot[],
    startHour: number,
    depot: LatLng,
    preferences: string[],
    locality: string,
): Promise<Spot[]> {
    if (spots.length === 0) return spots;

    let currentTime = startHour;
    let currentLoc = depot;
    const plan: { spot: Spot; plannedHour: number }[] = [];
    const violations: string[] = [];

    for (const spot of spots) {
        const arrival = currentTime + travelTimeMinutes(currentLoc, spot.location) / 60;
        plan.push({ spot, plannedHour: arrival });
        if (!isSpotOpen(spot, arrival)) {
            violations.push(
                `${spot.name} (open ${spot.openingTime}–${spot.closingTime}, planned at ${formatTime(arrival)})`,
            );
        }
        currentTime = arrival + spot.timeToSpend;
        currentLoc = spot.location;
    }

    if (violations.length === 0) return spots;

    const planDesc = plan
        .map(p =>
            `${p.spot.name} [opens ${p.spot.openingTime}, closes ${p.spot.closingTime}, ` +
            `${p.spot.timeToSpend}h visit] — planned arrival ${formatTime(p.plannedHour)}`,
        )
        .join('\n');

    const prompt =
        `I have a day plan in ${locality} with timing conflicts:\n${planDesc}\n\n` +
        `Timing issues: ${violations.join('; ')}\n` +
        `User interests: ${preferences.join(', ')}\n\n` +
        `Please provide a corrected visit order that avoids these conflicts. ` +
        `List just the spot names, one per line, in the recommended order:`;

    const resp = await callGPT(prompt);
    if (!resp) return spots;

    const lines = resp.split('\n').map(l => l.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
    const remaining = new Map(spots.map(s => [s.name.toLowerCase(), s]));
    const reordered: Spot[] = [];

    for (const line of lines) {
        const lc = line.toLowerCase();
        const match = [...remaining.entries()].find(([k]) => lc.includes(k) || k.includes(lc));
        if (match) { reordered.push(match[1]); remaining.delete(match[0]); }
    }
    remaining.forEach(s => reordered.push(s));
    return reordered;
}

// ── Day-1 GPT Decision ─────────────────────────────────────
/**
 * Asks GPT whether the traveller should step out on arrival day or rest.
 * Prompt: "I am visiting X, reaching at Y time, interests are [...].
 *          Should I step out or stay at the hotel?"
 */
async function shouldStepOutOnDay1(
    locality: string,
    arrivalHour: number,
    preferences: string[],
): Promise<boolean> {
    const arrivalStr = formatTime(arrivalHour);
    const prompt =
        `I am visiting ${locality}, and reaching at ${arrivalStr} local time. ` +
        `My interests are ${preferences.join(', ')}. ` +
        `Should I step out after reaching the place or should I stay at the hotel? ` +
        `Respond with exactly 'step_out' or 'stay_hotel'.`;
    const resp = await callGPT(prompt);
    if (!resp) return arrivalHour < 16; // fallback: step out if before 4 PM
    return resp.toLowerCase().includes('step_out');
}

// ── Regular Day Start Hour via GPT ────────────────────────
/**
 * Asks GPT for an optimal start time for a regular day given the
 * available spots (with their opening times) and the user's interests.
 */
async function getOptimalStartHour(
    locality: string,
    spots: Spot[],
    preferences: string[],
): Promise<number> {
    if (spots.length === 0) return DEFAULT_START_HOUR;
    const sampleSpots = spots.slice(0, 6).map(s => `${s.name} (opens ${s.openingTime})`).join(', ');
    const prompt =
        `I am planning a full day in ${locality}. ` +
        `Available spots include: ${sampleSpots}. ` +
        `My interests are: ${preferences.join(', ')}. ` +
        `What is the optimal time to start the day? ` +
        `Respond with just the start time in HH:MM format (e.g., 08:00).`;
    const resp = await callGPT(prompt);
    if (resp) {
        const m = resp.match(/(\d{1,2}):(\d{2})/);
        if (m) return Math.min(parseInt(m[1]) + parseInt(m[2]) / 60, 11); // cap at 11 AM
    }
    return DEFAULT_START_HOUR;
}

// ── Core Multi-Day Builder ────────────────────────────────
/**
 * TOPTW-inspired Simultaneous Multi-Day Solver.
 * Now GPT-driven for start times, validated opening hours,
 * and proper lunch + dinner injection with OLA Maps routing.
 */
async function buildDayPlans(input: AgentBInput): Promise<{ dayPlans: DayPlan[]; unselectedSpots: Spot[] }> {
    const {
        spots, restaurants, daysInLocality, locality, cityCenter, hotelLocation,
        maxHoursPerDay, userPreferences = [], startDate,
        arrivalHour, lastDayDepartureHour, budget,
        isFirstLocality, isLastLocality,
    } = input;

    const depot = hotelLocation || cityCenter;
    const effectiveMaxHours = maxHoursPerDay - MEAL_RESERVATION_HOURS;

    // ── 1. Score and filter candidate spots ───────────────
    const scored = spots.map(s => ({ spot: s, score: scoreSpot(s, userPreferences, budget) }));
    let qualified = [...scored].sort((a, b) => b.score - a.score);
    if (userPreferences.length > 0) {
        qualified = qualified.filter(s => s.score >= RELEVANCE_THRESHOLD);
        if (qualified.length === 0) qualified = [...scored].sort((a, b) => b.score - a.score).slice(0, 7);
    }
    const candidateSpots = qualified.slice(0, Math.min(qualified.length, daysInLocality * 5)).map(s => s.spot);

    // ── 2. Determine start hours per day (via GPT) ────────
    const dayStartHours: number[] = [];
    for (let i = 0; i < daysInLocality; i++) {
        const isFirstDay = isFirstLocality && i === 0;
        if (isFirstDay && arrivalHour !== undefined) {
            // 3 hours after arrival for check-in; GPT decides whether to step out at all
            const proposedStart = arrivalHour + 3.0;
            const stepOut = await shouldStepOutOnDay1(locality, arrivalHour, userPreferences);
            dayStartHours.push(stepOut ? Math.min(proposedStart, 21) : HOTEL_REST_SENTINEL);
        } else {
            const gptStart = await getOptimalStartHour(locality, candidateSpots, userPreferences);
            dayStartHours.push(gptStart);
        }
    }

    // ── 3. Greedy spot assignment (capacity with meal reserve) ──
    const days: {
        items: ItineraryItem[];
        currentTime: number;
        currentLocation: LatLng;
        totalHours: number;
    }[] = Array.from({ length: daysInLocality }, (_, i) => ({
        items: [],
        currentTime: dayStartHours[i] < 24 ? dayStartHours[i] : DEFAULT_START_HOUR,
        currentLocation: depot,
        totalHours: 0,
    }));

    const assigned = new Set<string>();

    while (assigned.size < candidateSpots.length) {
        let bestInsertion: { spot: Spot; dayIdx: number; costTime: number; efficiency: number } | null = null;

        for (const spot of candidateSpots) {
            if (assigned.has(spot.id)) continue;
            for (let d = 0; d < daysInLocality; d++) {
                if (dayStartHours[d] >= 24) continue; // hotel-rest day
                const day = days[d];
                const travelH = travelTimeMinutes(day.currentLocation, spot.location) / 60;
                const arrivalTime = day.currentTime + travelH;
                if (!isSpotOpen(spot, arrivalTime)) continue;
                const returnH = travelTimeMinutes(spot.location, depot) / 60;
                const delta = travelH + spot.timeToSpend;
                if (day.totalHours + delta + returnH > effectiveMaxHours) continue;
                const profit = scoreSpot(spot, userPreferences, budget);
                const efficiency = profit / (delta || 0.1);
                if (!bestInsertion || efficiency > bestInsertion.efficiency) {
                    bestInsertion = { spot, dayIdx: d, costTime: delta, efficiency };
                }
            }
        }

        if (!bestInsertion) break;

        const { spot, dayIdx, costTime } = bestInsertion;
        const day = days[dayIdx];
        // Store spot only; P2P is rebuilt during finalisation
        day.items.push({ type: 'spot', data: spot });
        day.currentTime += costTime;
        day.totalHours += costTime;
        day.currentLocation = spot.location;
        assigned.add(spot.id);
    }

    // ── 4. Finalise each day (rebuild route + inject meals) ──
    const usedRestaurants = new Set<string>();
    const dayPlans: DayPlan[] = [];

    for (let idx = 0; idx < daysInLocality; idx++) {
        const day = days[idx];
        const date = new Date(startDate);
        date.setDate(date.getDate() + idx);
        const isFirstDay = isFirstLocality && idx === 0;
        const isLastDay  = isLastLocality  && idx === daysInLocality - 1;
        const startHour  = dayStartHours[idx];

        // Hotel/rest day — no activities planned
        if (startHour >= 24) {
            dayPlans.push({
                dayNumber: idx + 1,
                date: date.toISOString().split('T')[0],
                locality,
                isTransitDay: false,
                items: [],
                totalCost: 0,
            });
            continue;
        }

        // Extract spots and validate opening hours (GPT fixes if needed)
        let orderedSpots = day.items.filter(i => i.type === 'spot').map(i => i.data as Spot);
        orderedSpots = await validateAndFixSpots(orderedSpots, startHour, depot, userPreferences, locality);

        // Rebuild full route including P2P travel for meals
        const finalItems: ItineraryItem[] = [];
        let currentLoc  = depot;
        let currentLocName = 'Hotel';
        let currentTime = startHour;
        let dayCost     = 0;
        let hadLunch    = false;
        let hadDinner   = false;

        for (let si = 0; si <= orderedSpots.length; si++) {
            const nextSpot = si < orderedSpots.length ? orderedSpots[si] : null;

            // ── Lunch insertion ──────────────────────────────
            if (
                !hadLunch &&
                shouldHaveMeal('lunch', isFirstDay, isLastDay, arrivalHour, lastDayDepartureHour) &&
                (currentTime >= LUNCH_HOUR - 0.5 || nextSpot === null)
            ) {
                const lunchR = await findBestRestaurant(
                    currentLoc, nextSpot?.location ?? null,
                    restaurants, 'lunch', usedRestaurants, budget, locality,
                );
                if (lunchR) {
                    const p2pToLunch = await getP2PCostAsync(currentLoc, lunchR.location, currentLocName, lunchR.name);
                    const lunchStart = Math.max(currentTime + p2pToLunch.duration / 60, LUNCH_HOUR);
                    if (lunchStart < DINNER_HOUR) {
                        finalItems.push({ type: 'p2p', data: p2pToLunch, startTime: formatTime(currentTime), endTime: formatTime(lunchStart) });
                        finalItems.push({ type: 'restaurant', data: lunchR, startTime: formatTime(lunchStart), endTime: formatTime(lunchStart + MEAL_DURATION), notes: '🍽️ Lunch' });
                        dayCost += lunchR.avgCostForTwo / 2 + p2pToLunch.cost;
                        currentTime    = lunchStart + MEAL_DURATION;
                        currentLoc     = lunchR.location;
                        currentLocName = lunchR.name;
                        usedRestaurants.add(lunchR.id);
                        hadLunch = true;
                    }
                }
            }

            // ── Dinner insertion (after last spot) ────────────
            if (nextSpot === null) {
                if (
                    !hadDinner &&
                    shouldHaveMeal('dinner', isFirstDay, isLastDay, arrivalHour, lastDayDepartureHour) &&
                    currentTime < DINNER_HOUR + 3
                ) {
                    const dinnerR = await findBestRestaurant(
                        currentLoc, null,
                        restaurants, 'dinner', usedRestaurants, budget, locality,
                    );
                    if (dinnerR) {
                        const p2pToDinner = await getP2PCostAsync(currentLoc, dinnerR.location, currentLocName, dinnerR.name);
                        const dinnerStart = Math.max(currentTime + p2pToDinner.duration / 60, DINNER_HOUR);
                        finalItems.push({ type: 'p2p', data: p2pToDinner, startTime: formatTime(currentTime), endTime: formatTime(dinnerStart) });
                        finalItems.push({ type: 'restaurant', data: dinnerR, startTime: formatTime(dinnerStart), endTime: formatTime(dinnerStart + MEAL_DURATION), notes: '🍽️ Dinner' });
                        dayCost += dinnerR.avgCostForTwo / 2 + p2pToDinner.cost;
                        currentTime    = dinnerStart + MEAL_DURATION;
                        currentLoc     = dinnerR.location;
                        currentLocName = dinnerR.name;
                        usedRestaurants.add(dinnerR.id);
                        hadDinner = true;
                    }
                }
                break; // end of spots loop
            }

            // ── Travel to and visit next spot ─────────────────
            const p2pToSpot = await getP2PCostAsync(currentLoc, nextSpot.location, currentLocName, nextSpot.name);
            const spotArrival = currentTime + p2pToSpot.duration / 60;
            finalItems.push({ type: 'p2p',  data: p2pToSpot, startTime: formatTime(currentTime),  endTime: formatTime(spotArrival) });
            finalItems.push({ type: 'spot', data: nextSpot,  startTime: formatTime(spotArrival),  endTime: formatTime(spotArrival + nextSpot.timeToSpend) });
            dayCost     += p2pToSpot.cost + nextSpot.entryFee;
            currentTime  = spotArrival + nextSpot.timeToSpend;
            currentLoc   = nextSpot.location;
            currentLocName = nextSpot.name;
        }

        // Return to hotel
        const returnP2P = await getP2PCostAsync(currentLoc, depot, currentLocName, 'Hotel');
        finalItems.push({ type: 'p2p', data: returnP2P, startTime: formatTime(currentTime), endTime: formatTime(currentTime + returnP2P.duration / 60), notes: '🏨 Return to hotel' });
        dayCost += returnP2P.cost;

        dayPlans.push({
            dayNumber: idx + 1,
            date: date.toISOString().split('T')[0],
            locality,
            isTransitDay: false,
            items: finalItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
            totalCost: Math.round(dayCost),
        });
    }

    return { dayPlans, unselectedSpots: spots.filter(s => !assigned.has(s.id)) };
}

// ── POST Handler ──────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            localities, agentData, startDate,
            maxHoursPerDay = DEFAULT_MAX_HOURS,
            userPreferences = [],
            hotelLocation,
            arrivalHour,
            lastDayDepartureHour,
            budget,
        } = body;

        const allDayPlans: DayPlan[] = [];
        const allUnselectedSpots: Spot[] = [];
        let dayOffset = 0;
        let plannedLocalitiesCount = 0;
        const nonTransitLocalities = localities.filter((l: LocalitySplit) => !l.isTransitDay);

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
                startDate: new Date(new Date(startDate).getTime() + dayOffset * 86400000).toISOString(),
                arrivalHour:          plannedLocalitiesCount === 0 ? arrivalHour : undefined,
                lastDayDepartureHour: plannedLocalitiesCount === nonTransitLocalities.length - 1 ? lastDayDepartureHour : undefined,
                budget,
                isFirstLocality: plannedLocalitiesCount === 0,
                isLastLocality:  plannedLocalitiesCount === nonTransitLocalities.length - 1,
            });

            for (const dp of dayPlans) dp.dayNumber = dayOffset + dp.dayNumber;
            allDayPlans.push(...dayPlans);
            allUnselectedSpots.push(...unselectedSpots);
            dayOffset += loc.days;
            plannedLocalitiesCount++;
        }

        // Resilience: Detect "Empty Day Syndrome"
        const suggestions: { type: 'shorten_trip'; message: string; recommendedDays: number }[] = [];
        const emptyDays = allDayPlans.filter(dp => !dp.isTransitDay && dp.items.filter(i => i.type === 'spot').length === 0);

        if (emptyDays.length > 0) {
            let lastActiveDay = 0;
            for (let i = allDayPlans.length - 1; i >= 0; i--) {
                if (allDayPlans[i].items.some(it => it.type === 'spot')) {
                    lastActiveDay = allDayPlans[i].dayNumber;
                    break;
                }
            }
            if (lastActiveDay < allDayPlans.length) {
                suggestions.push({
                    type: 'shorten_trip',
                    message: `It looks like we've covered the best of ${(localities as LocalitySplit[]).map(l => l.locality).join(', ')} in ${lastActiveDay} days. Would you like to shorten your trip to save costs?`,
                    recommendedDays: lastActiveDay,
                });
            }
        }

        return NextResponse.json({ success: true, dayPlans: allDayPlans, unselectedSpots: allUnselectedSpots, suggestions });
    } catch (error) {
        console.error('Agent B error:', error);
        return NextResponse.json({ success: false, error: 'Agent B failed' }, { status: 500 });
    }
}
