// ============================================================
// Safar AI — Agent B: Itinerary Maker (TPOS Genetic Algorithm)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { Spot, Restaurant, DayPlan, ItineraryItem, LatLng } from '@/lib/types';
import { getP2PCost } from '@/lib/fakeApi';
import { AzureOpenAI } from 'openai';

const aiClient = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
});

async function determineDayBounds(preferences: string[] = []): Promise<{ startHour: number, endHour: number }> {
    if (preferences.length === 0 || !process.env.AZURE_OPENAI_ENDPOINT) {
        return { startHour: 9, endHour: 16 };
    }
    const prompt = `Based on the user's travel preferences, decide the ideal sightseeing start hour (0-23) and end hour (0-23). 
E.g., nightclubs/party -> start 11, end 23. Sunrise early birds -> start 5, end 15. Default -> start 9, end 16.
Return ONLY raw JSON: {"startHour": number, "endHour": number}. No markdown.

Preferences: ${preferences.join(', ')}`;
    
    try {
        const response = await aiClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT!,
            messages: [{ role: 'system', content: prompt }],
            temperature: 0.1,
        });
        const raw = response.choices[0]?.message?.content?.trim() || '{}';
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleaned);
        return { 
            startHour: typeof result.startHour === 'number' ? result.startHour : 9, 
            endHour: typeof result.endHour === 'number' ? result.endHour : 16 
        };
    } catch {
        return { startHour: 9, endHour: 16 };
    }
}
const GA_POPULATION_SIZE = 50;
const GA_GENERATIONS = 50;
const MUTATION_RATE = 0.1;

// Haversine distance used for rapid fitness evaluation
function haversineDistance(loc1: LatLng, loc2: LatLng): number {
    const R = 6371; // km
    const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
    const dLon = (loc2.lng - loc1.lng) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(loc1.lat * (Math.PI / 180)) * Math.cos(loc2.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Convert "HH:MM" to decimal hours (e.g., "14:30" -> 14.5)
function timeToDec(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h + (m || 0) / 60;
}

// Convert decimal hours to "HH:MM"
function formatTime(decimal: number): string {
    const h = Math.floor(decimal) % 24;
    const m = Math.round((decimal - Math.floor(decimal)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------
// 1. TPOS CATEGORY-RELATIVE SCORING
// ---------------------------------------------------------
/**
 * Calculates SC(i, c) = (BaseScore_i / MaxBaseScore_c) * 100
 * BaseScore = Popularity + (Rating * 5)
 */
function calculateCategoryScores(spots: Spot[], preferences: string[], mustExclude: string[]): { [id: string]: number } {
    const catMax: { [cat: string]: number } = {};
    const baseScores: { [id: string]: number } = {};

    // First pass: find max score per category
    for (const spot of spots) {
        let base = spot.popularity + (spot.rating * 5);
        if (spot.popularity >= 8) base += 70; // Iconic guarantee

        // Exclusions (Hard penalty)
        let excluded = false;
        if (mustExclude && mustExclude.length > 0) {
            for (const ex of mustExclude) {
                const eText = ex.toLowerCase();
                const searchCorpus = (spot.category + " | " + spot.name + " | " + spot.description).toLowerCase();
                if (searchCorpus.includes(eText)) excluded = true;
                if ((eText.includes('religion') || eText.includes('religious') || eText.includes('spiritual')) &&
                   (searchCorpus.includes('temple') || searchCorpus.includes('mosque') || searchCorpus.includes('church') || searchCorpus.includes('shrine') || searchCorpus.includes('religious'))) {
                    excluded = true;
                }
            }
        }
        if (excluded) {
            base = -10000;
        }

        baseScores[spot.id] = base;
        const cat = spot.category;
        if (base > 0) {
            if (!catMax[cat] || base > catMax[cat]) catMax[cat] = base;
        }
    }

    const finalScores: { [id: string]: number } = {};
    for (const spot of spots) {
        if (baseScores[spot.id] < 0) {
            finalScores[spot.id] = -10000;
            continue;
        }

        const cat = spot.category;
        const maxScore = catMax[cat] || 1;
        let normalized = (baseScores[spot.id] / maxScore) * 100;

        // Semantic Boost (Matching user preferences)
        if (preferences && preferences.length > 0) {
            for (const pref of preferences) {
                const p = pref.toLowerCase();
                if (spot.category.toLowerCase().includes(p) ||
                    spot.description.toLowerCase().includes(p) ||
                    spot.name.toLowerCase().includes(p)) {
                    normalized += 150; // Heavy reward for explicit preference
                    break;
                }
            }
        }
        finalScores[spot.id] = normalized;
    }

    return finalScores;
}

// ---------------------------------------------------------
// 2. TPOS GENETIC ALGORITHM
// ---------------------------------------------------------

/**
 * Decodes a chromosome (array of Spots) into a valid daily schedule terminating at 16:00.
 */
function decodeChromosome(
    chromosome: Spot[], 
    depot: LatLng, 
    startHour: number, 
    scores: { [id: string]: number },
    targetEndHour: number
): { schedule: Spot[]; totalProfit: number; distancePenalty: number; waitPenalty: number; endHour: number, lastLoc: LatLng } {
    
    let currentHour = startHour;
    let currentLocation = depot;
    const schedule: Spot[] = [];
    
    let totalProfit = 0;
    let distancePenalty = 0;
    let waitPenalty = 0;

    for (const spot of chromosome) {
        const dist = haversineDistance(currentLocation, spot.location);
        const travelHours = dist / 25; // Assume 25 km/h urban speed
        let arrivalHour = currentHour + travelHours;

        const openHour = timeToDec(spot.openingTime);
        const closeHour = timeToDec(spot.closingTime);

        // Does this spot push us past the determined end hour?
        if (arrivalHour + spot.timeToSpend > targetEndHour) {
            break; // Stop decoding, day is full
        }

        // Wait Penalty
        if (arrivalHour < openHour) {
            waitPenalty += (openHour - arrivalHour) * 50; 
            arrivalHour = openHour;
        }

        // Close Penalty
        if (arrivalHour > closeHour || arrivalHour + spot.timeToSpend > closeHour) {
            continue; // Skip silently to see if the next spot fits
        }

        // Valid fit
        schedule.push(spot);
        totalProfit += scores[spot.id];
        distancePenalty += dist * 5; // Distance penalty weight

        currentHour = arrivalHour + spot.timeToSpend;
        currentLocation = spot.location;
    }

    return { schedule, totalProfit, distancePenalty, waitPenalty, endHour: currentHour, lastLoc: currentLocation };
}

function evaluateFitness(
    chromosome: Spot[], 
    depot: LatLng, 
    startHour: number, 
    scores: { [id: string]: number },
    targetEndHour: number
): number {
    const { totalProfit, distancePenalty, waitPenalty, lastLoc } = decodeChromosome(chromosome, depot, startHour, scores, targetEndHour);
    const returnDist = haversineDistance(lastLoc, depot);
    const returnPenalty = returnDist * 5;
    
    // TPOS Fitness Formula: F(ch) = Profit - Penalties
    return totalProfit - distancePenalty - waitPenalty - returnPenalty;
}

function initializePopulation(spots: Spot[], size: number): Spot[][] {
    const pop: Spot[][] = [];
    for (let i = 0; i < size; i++) {
        const shuffled = [...spots].sort(() => Math.random() - 0.5);
        pop.push(shuffled);
    }
    return pop;
}

function tournamentSelection(population: Spot[][], fitnesses: number[], k = 3): Spot[] {
    let bestIdx = Math.floor(Math.random() * population.length);
    for (let i = 1; i < k; i++) {
        const idx = Math.floor(Math.random() * population.length);
        if (fitnesses[idx] > fitnesses[bestIdx]) {
            bestIdx = idx;
        }
    }
    return population[bestIdx];
}

// Order Crossover (OX1)
function crossover(parent1: Spot[], parent2: Spot[]): Spot[] {
    const size = parent1.length;
    let start = Math.floor(Math.random() * size);
    let end = Math.floor(Math.random() * size);
    if (start > end) [start, end] = [end, start];

    const child = new Array(size).fill(null);
    for (let i = start; i <= end; i++) {
        child[i] = parent1[i];
    }

    let p2Idx = 0;
    for (let i = 0; i < size; i++) {
        if (child[i] === null) {
            while (child.some(s => s && s.id === parent2[p2Idx].id)) {
                p2Idx++;
            }
            child[i] = parent2[p2Idx];
        }
    }
    return child;
}

// Swap Mutation
function mutate(chromosome: Spot[]): Spot[] {
    if (Math.random() > MUTATION_RATE) return chromosome;
    const size = chromosome.length;
    if (size < 2) return chromosome;
    const idx1 = Math.floor(Math.random() * size);
    const idx2 = Math.floor(Math.random() * size);
    
    const mutant = [...chromosome];
    const temp = mutant[idx1];
    mutant[idx1] = mutant[idx2];
    mutant[idx2] = temp;
    return mutant;
}

/**
 * Runs the Genetic Algorithm for a SINGLE Day.
 */
function runSequentialDailyGA(
    availableSpots: Spot[], 
    depot: LatLng, 
    startHour: number, 
    scores: { [id: string]: number },
    targetEndHour: number
): { bestSchedule: Spot[], endHour: number, lastLoc: LatLng } {
    
    if (availableSpots.length === 0) return { bestSchedule: [], endHour: startHour, lastLoc: depot };

    let population = initializePopulation(availableSpots, GA_POPULATION_SIZE);
    let globalBestChrom: Spot[] = population[0];
    let globalBestFitness = -Infinity;

    for (let gen = 0; gen < GA_GENERATIONS; gen++) {
        const fitnesses = population.map(ch => evaluateFitness(ch, depot, startHour, scores, targetEndHour));
        
        for (let i = 0; i < population.length; i++) {
            if (fitnesses[i] > globalBestFitness) {
                globalBestFitness = fitnesses[i];
                globalBestChrom = population[i];
            }
        }

        const nextPop: Spot[][] = [];
        // Elitism: carry over best
        nextPop.push(globalBestChrom);

        while (nextPop.length < GA_POPULATION_SIZE) {
            const p1 = tournamentSelection(population, fitnesses);
            const p2 = tournamentSelection(population, fitnesses);
            let child = crossover(p1, p2);
            child = mutate(child);
            nextPop.push(child);
        }
        population = nextPop;
    }

    const { schedule, endHour, lastLoc } = decodeChromosome(globalBestChrom, depot, startHour, scores, targetEndHour);
    return { bestSchedule: schedule, endHour, lastLoc };
}

// ---------------------------------------------------------
// 3. LOGISTICAL INTELLIGENCE (Trim-and-Insert)
// ---------------------------------------------------------
async function optimalRestaurantInsert(
    locA: LatLng, 
    locB: LatLng, 
    mealType: 'lunch' | 'dinner', 
    restaurants: Restaurant[], 
    usedRestaurants: Set<string>
): Promise<{ rest: Restaurant, p2p1: typeof p2pFallback, p2p2: typeof p2pFallback } | null> {
    
    const candidates = restaurants.filter(
        r => !usedRestaurants.has(r.id) && (r.mealType === mealType || r.mealType === 'any')
    );
    if (candidates.length === 0) return null;

    let bestRest: Restaurant | null = null;
    let minDetour = Infinity;
    
    for (const r of candidates) {
        const detour = haversineDistance(locA, r.location) + haversineDistance(r.location, locB);
        if (detour < minDetour) {
            minDetour = detour;
            bestRest = r;
        }
    }

    if (!bestRest) return null;
    
    // Calculate P2P costs for the winner
    const p2p1 = await getP2PCost(locA, bestRest.location, 'Location A', bestRest.name, 'cab');
    const p2p2 = await getP2PCost(bestRest.location, locB, bestRest.name, 'Location B', 'cab');

    return { rest: bestRest, p2p1, p2p2 };
}

const p2pFallback = { mode: 'cab', distance: 0, duration: 15, cost: 150 };

// ---------------------------------------------------------
// ENTRY POINT EXECUTOR
// ---------------------------------------------------------
export async function executeAgentB(body: any) {
    const { localities, agentData, startDate, userPreferences = [], mustExclude = [], hotelLocation, arrivalHour } = body;

    const { startHour: dynamicStartHour, endHour: dynamicEndHour } = await determineDayBounds(userPreferences);

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

        // 1. Calculate Category-Relative Scores
        const scores = calculateCategoryScores(spots, userPreferences, mustExclude);
        
        // Hard drop severely penalized exclusions
        let availableSpots = spots.filter(s => scores[s.id] > -5000);
        
        // Trim fat: take top N globally to keep GA search space efficient while maintaining categories
        availableSpots.sort((a, b) => scores[b.id] - scores[a.id]);

        const depot = hotelLocation || (spots.length > 0 ? spots[0].location : loc.center);
        const usedRestaurants = new Set<string>();

        // Sequential Daily Optimization
        for (let d = 0; d < loc.days; d++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + dayOffset + d);

            const startHour = (plannedLocalitiesCount === 0 && d === 0 && arrivalHour !== undefined && arrivalHour > dynamicStartHour) 
                ? arrivalHour + 1.5 
                : dynamicStartHour;

            // Run GA
            const { bestSchedule } = runSequentialDailyGA(availableSpots, depot, startHour, scores, dynamicEndHour);

            // Update globally available pool (TPOS Logic)
            const scheduledIds = new Set(bestSchedule.map(s => s.id));
            availableSpots = availableSpots.filter(s => !scheduledIds.has(s.id));

            // TRIM-AND-INSERT RESTAURANTS
            let finalizedItems: ItineraryItem[] = [];
            let currentDecTime = startHour;
            let currentLocation = depot;
            let currentName = 'Hotel';
            let dayCost = 0;

            const lunchIdx = Math.max(0, Math.floor((bestSchedule.length - 1) / 2));
            const dinnerIdx = bestSchedule.length - 1; // End of the day

            for (let j = 0; j < bestSchedule.length; j++) {
                const spot = bestSchedule[j];

                // P2P to spot
                const p2pToSpot = await getP2PCost(currentLocation, spot.location, currentName, spot.name, 'cab');
                finalizedItems.push({
                    type: 'p2p', data: p2pToSpot,
                    startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + p2pToSpot.duration / 60)
                });
                dayCost += p2pToSpot.cost;
                currentDecTime += p2pToSpot.duration / 60;

                // Spot
                finalizedItems.push({
                    type: 'spot', data: spot,
                    startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + spot.timeToSpend)
                });
                dayCost += spot.entryFee;
                currentDecTime += spot.timeToSpend;
                currentLocation = spot.location;
                currentName = spot.name;

                // Insert Lunch
                if (j === lunchIdx) {
                    const nextLoc = j + 1 < bestSchedule.length ? bestSchedule[j+1].location : depot;
                    const lunchRes = await optimalRestaurantInsert(currentLocation, nextLoc, 'lunch', restaurants, usedRestaurants);
                    if (lunchRes) {
                        usedRestaurants.add(lunchRes.rest.id);
                        finalizedItems.push({ type: 'p2p', data: lunchRes.p2p1, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + lunchRes.p2p1.duration / 60) });
                        currentDecTime += lunchRes.p2p1.duration / 60;
                        dayCost += lunchRes.p2p1.cost;

                        finalizedItems.push({ type: 'restaurant', data: lunchRes.rest, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + 1.0), notes: '🍽️ Local Cuisine Lunch' });
                        currentDecTime += 1.0;
                        dayCost += lunchRes.rest.avgCostForTwo / 2;
                        
                        currentLocation = lunchRes.rest.location;
                        currentName = lunchRes.rest.name;
                    }
                }

                // Insert Dinner
                if (j === dinnerIdx) {
                    const dinnerRes = await optimalRestaurantInsert(currentLocation, depot, 'dinner', restaurants, usedRestaurants);
                    if (dinnerRes) {
                        usedRestaurants.add(dinnerRes.rest.id);
                        finalizedItems.push({ type: 'p2p', data: dinnerRes.p2p1, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + dinnerRes.p2p1.duration / 60) });
                        currentDecTime += dinnerRes.p2p1.duration / 60;
                        dayCost += dinnerRes.p2p1.cost;

                        finalizedItems.push({ type: 'restaurant', data: dinnerRes.rest, startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + 1.5), notes: '🍽️ Relaxing Dinner' });
                        currentDecTime += 1.5;
                        dayCost += dinnerRes.rest.avgCostForTwo / 2;
                        
                        currentLocation = dinnerRes.rest.location;
                        currentName = dinnerRes.rest.name;
                    }
                }
            }

            // Return to Hotel
            if (currentName !== 'Hotel') {
                const returnP2P = await getP2PCost(currentLocation, depot, currentName, 'Hotel', 'cab');
                finalizedItems.push({
                    type: 'p2p', data: returnP2P,
                    startTime: formatTime(currentDecTime), endTime: formatTime(currentDecTime + returnP2P.duration / 60),
                    notes: '🏨 Return to hotel'
                });
                dayCost += returnP2P.cost;
            }

            allDayPlans.push({
                dayNumber: dayOffset + d + 1,
                date: date.toISOString().split('T')[0],
                locality: loc.locality,
                isTransitDay: false,
                items: finalizedItems,
                totalCost: Math.round(dayCost),
            });
        }

        allUnselectedSpots.push(...availableSpots);
        dayOffset += loc.days;
        plannedLocalitiesCount++;
        validLocalities.push(loc);
    }

    return { dayPlans: allDayPlans, unselectedSpots: allUnselectedSpots, suggestions: [], validLocalities };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = await executeAgentB(body);
        return NextResponse.json({ success: true, ...data });
    } catch (error) {
        console.error('Agent B error:', error);
        return NextResponse.json({ success: false, error: 'Agent B failed' }, { status: 500 });
    }
}
