// ============================================================
// Safar AI — Agent C: Budgeter
// Adjusts hotel and travel to fit budget
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import {
    DayPlan, Hotel, Flight, Train, AgentData, InterCityOption,
    FullItinerary, LocalitySplit, TripInput, BudgetAllocation, Spot, P2PTravel
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { haversineDistance, getP2PCost } from '@/lib/fakeApi';

const aiClient = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
});

interface AgentCInput {
    dayPlans: DayPlan[];
    unselectedSpots?: Spot[];
    agentData: AgentData;
    tripInput: TripInput;
    localities: LocalitySplit[];
}

/**
 * Select best hotel for a locality within budget
 */
function selectHotel(
    hotels: Hotel[],
    budgetPerNight: number,
    nights: number
): Hotel | null {
    if (!hotels || hotels.length === 0) return null;

    // Sort by distance from budget (closest first)
    const sorted = [...hotels].sort(
        (a, b) => Math.abs(a.pricePerNight - budgetPerNight) - Math.abs(b.pricePerNight - budgetPerNight)
    );

    // Prefer hotels AT or BELOW budget
    const withinBudget = sorted.filter(h => h.pricePerNight <= budgetPerNight);
    return withinBudget.length > 0 ? withinBudget[0] : sorted[0];
}

/**
 * Select optimal travel (flight/train) within budget
 */
function selectTravel(
    flights: Flight[],
    trains: Train[],
    travelBudget: number
): { type: 'flight' | 'train'; data: Flight | Train } | null {
    const allOptions: { type: 'flight' | 'train'; data: Flight | Train; price: number }[] = [
        ...flights.map(f => ({ type: 'flight' as const, data: f, price: f.price })),
        ...trains.map(t => ({ type: 'train' as const, data: t, price: t.price })),
    ];

    allOptions.sort((a, b) => a.price - b.price);

    // Pick the cheapest within budget
    const withinBudget = allOptions.filter(o => o.price <= travelBudget);
    if (withinBudget.length > 0) return { type: withinBudget[0].type, data: withinBudget[0].data };
    if (allOptions.length > 0) return { type: allOptions[0].type, data: allOptions[0].data };
    return null;
}

/**
 * Select inter-city travel (Bus/Taxi/Cab) within budget
 */
function selectInterCityTravel(
    options: InterCityOption[],
    transitBudget: number
): InterCityOption | null {
    if (!options || options.length === 0) return null;

    const sorted = [...options].sort((a, b) => a.price - b.price);
    const withinBudget = sorted.filter(o => o.price <= transitBudget);

    // Pick the highest quality option (last in sorted withinBudget) that fits budget
    return withinBudget.length > 0 ? withinBudget[withinBudget.length - 1] : sorted[0];
}

/**
 * Calculate budget allocation
 */
function allocateBudget(
    totalBudget: number,
    totalDays: number,
    localities: LocalitySplit[]
): BudgetAllocation {
    // Split: 35% hotel, 25% travel, 25% activities, 15% food
    const hotelBudget = totalBudget * 0.35;
    const travelBudget = totalBudget * 0.25;
    const activitiesBudget = totalBudget * 0.25;
    const foodBudget = totalBudget * 0.15;

    const nonTransitLocalities = localities.filter(l => !l.isTransitDay);
    const totalNonTransitDays = nonTransitLocalities.reduce((s, l) => s + l.days, 0);

    const localityAllocations = nonTransitLocalities.map(l => ({
        locality: l.locality,
        amount: Math.round((l.days / totalNonTransitDays) * (hotelBudget + activitiesBudget)),
    }));

    return {
        totalBudget,
        hotelBudget: Math.round(hotelBudget),
        travelBudget: Math.round(travelBudget),
        activitiesBudget: Math.round(activitiesBudget),
        foodBudget: Math.round(foodBudget),
        localityAllocations,
    };
}

/**
 * Helper to calculate duration in minutes between two ISO strings
 */
function calculateDurationMin(start: string, end: string): number {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.floor(diff / 60000));
}

export async function executeAgentC(body: AgentCInput) {
    const { dayPlans, unselectedSpots, agentData, tripInput, localities } = body;
    const travelers = tripInput.travelers || 1;
    const roomsNeeded = Math.ceil(travelers / 2);
    const cabsNeeded = Math.ceil(travelers / 4);

    const totalDays = dayPlans.length;
    const budget = allocateBudget(tripInput.budget, totalDays, localities);

    const activitiesCost = dayPlans.reduce((sum, d) => sum + d.totalCost, 0);
    const nonTransitLocalities = localities.filter(l => !l.isTransitDay);

    interface MCKPItem {
        classId: string;
        data: any;
        cost: number;
        utility: number;
        type: 'hotel' | 'flight' | 'train' | 'transit';
    }

    const mckpClasses: MCKPItem[][] = [];

    let promptContext = '';
    try {
        promptContext = fs.readFileSync(path.join(process.cwd(), 'prompt_context.txt'), 'utf-8');
    } catch {
        promptContext = 'No user conversational context available.';
    }

    // 1. Hotel Partitions
    for (const loc of nonTransitLocalities) {
        const hotels = (agentData.hotels[loc.locality] || []);
        const locSpots = agentData.spots[loc.locality] || [];

        const enhancedHotels = hotels.map(h => {
            let sumDistances = 0;
            if (h.location) {
                for (const spot of locSpots) {
                    sumDistances += haversineDistance(h.location, spot.location);
                }
            }
            const effectiveTravelOverhead = Math.round((sumDistances * 18) / (loc.days || 1));
            const adjustedPrice = h.pricePerNight + effectiveTravelOverhead;
            const deterministicUtility = h.starRating * 100 + (h.propertyType === 'Resort' ? 50 : 0);
            
            return { ...h, adjustedPrice, deterministicUtility };
        });

        let hotelScores: Record<string, number> = {};
        if (enhancedHotels.length > 0 && process.env.AZURE_OPENAI_ENDPOINT) {
            const llmPrompt = `You are an expert travel assistant.
The user's conversational context is:
${promptContext}
The user's total trip budget is: ${tripInput.budget} INR.

Below is a list of candidate hotels for the locality "${loc.locality}".
For each hotel, consider its name, star rating, amenities, and the 'adjustedPrice' (base price + effective travel overhead). 
Provide a suitability score from 1 to 100 for each hotel based on value, quality, and context.

Return ONLY a raw JSON object where keys are the hotel IDs and values are the numerical scores. 
DO NOT include markdown formatting or \`\`\`json.

Hotels:
${JSON.stringify(enhancedHotels.map(h => ({ id: h.id, name: h.name, starRating: h.starRating, propertyType: h.propertyType, amenities: h.amenities, adjustedPrice: h.adjustedPrice })), null, 2)}`;

            try {
                const response = await aiClient.chat.completions.create({
                    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
                    messages: [{ role: 'system', content: llmPrompt }],
                    temperature: 0.1,
                });
                
                let rawResult = response.choices[0]?.message?.content?.trim() || '{}';
                if (rawResult.startsWith('```json')) rawResult = rawResult.slice(7);
                if (rawResult.startsWith('```')) rawResult = rawResult.slice(3);
                if (rawResult.endsWith('```')) rawResult = rawResult.slice(0, -3);
                hotelScores = JSON.parse(rawResult.trim());
            } catch (err) {
                console.error("Hotel scoring LLM failed:", err);
            }
        }

        const options: MCKPItem[] = enhancedHotels.map(h => {
            const llmScore = hotelScores[h.id] || 50; 
            const deterministicNorm = Math.min(100, Math.max(0, (h.deterministicUtility / 550) * 100));
            const finalScore = (llmScore * 0.6) + (deterministicNorm * 0.4);
            const scaledUtility = Math.round(finalScore * 5.5);

            return {
                classId: `hotel_${loc.locality}`,
                data: h,
                cost: h.pricePerNight * loc.days * roomsNeeded,
                utility: scaledUtility,
                type: 'hotel',
            };
        });

        if (options.length === 0) {
            options.push({ classId: `hotel_${loc.locality}`, data: null, cost: 0, utility: 0, type: 'hotel' });
        }
        mckpClasses.push(options);
    }

    // 2. Outbound Travel Partitions
    const outboundOptions: MCKPItem[] = [
        ...agentData.flights
            .filter(f => f.source.toLowerCase() === tripInput.source.toLowerCase())
            .map(f => ({
                classId: 'outbound',
                data: f,
                cost: f.price * travelers,
                utility: (20 - (calculateDurationMin(f.departureTime, f.arrivalTime) / 60)) * 10,
                type: 'flight' as const,
            })),
        ...agentData.trains
            .filter(t => t.source.toLowerCase() === tripInput.source.toLowerCase())
            .map(t => ({
                classId: 'outbound',
                data: t,
                cost: t.price * travelers,
                utility: (40 - (calculateDurationMin(t.departureTime, t.arrivalTime) / 60)) * 5,
                type: 'train' as const,
            })),
    ];
    if (outboundOptions.length > 0) mckpClasses.push(outboundOptions);

    // 3. Return Travel Partitions
    const returnOptions: MCKPItem[] = [
        ...agentData.flights
            .filter(f => f.destination.toLowerCase() === tripInput.source.toLowerCase())
            .map(f => ({
                classId: 'return',
                data: f,
                cost: f.price * travelers,
                utility: (20 - (calculateDurationMin(f.departureTime, f.arrivalTime) / 60)) * 10,
                type: 'flight' as const,
            })),
        ...agentData.trains
            .filter(t => t.destination.toLowerCase() === tripInput.source.toLowerCase())
            .map(t => ({
                classId: 'return',
                data: t,
                cost: t.price * travelers,
                utility: (40 - (calculateDurationMin(t.departureTime, t.arrivalTime) / 60)) * 5,
                type: 'train' as const,
            })),
    ];
    if (returnOptions.length > 0) mckpClasses.push(returnOptions);

    // 4. Inter-City Transit Partitions
    const updatedDayPlans = [...dayPlans];
    const transitDayIndices = updatedDayPlans
        .map((dp, idx) => dp.isTransitDay ? idx : -1)
        .filter(idx => idx !== -1);

    transitDayIndices.forEach(idx => {
        const loc = localities[idx];
        const options = (agentData.interCityTravel[loc.locality] || []);
        const mckpOptions: MCKPItem[] = options.map(opt => ({
            classId: `transit_${idx}`,
            data: opt,
            cost: opt.type === 'cab' ? opt.price * cabsNeeded : opt.price * travelers,
            utility: opt.type === 'cab' ? 150 : (opt.type === 'shared_taxi' ? 80 : 30),
            type: 'transit' as const,
        }));
        if (mckpOptions.length > 0) mckpClasses.push(mckpOptions);
    });

    // 5. MCKP Solver (Greedy with Refinement)
    let currentSelection: MCKPItem[] = mckpClasses.map(cls =>
        [...cls].sort((a, b) => a.cost - b.cost)[0]
    );

    let totalVariableCost = currentSelection.reduce((s, i) => s + i.cost, 0);
    let surplus = tripInput.budget - activitiesCost - totalVariableCost;

    while (surplus > 0) {
        let bestUpgrade: { classIdx: number, newItem: MCKPItem, efficiency: number } | null = null;
        for (let i = 0; i < mckpClasses.length; i++) {
            const current = currentSelection[i];
            const alternatives = mckpClasses[i].filter(item => item.cost > current.cost);

            for (const alt of alternatives) {
                const costDiff = alt.cost - current.cost;
                if (costDiff <= surplus) {
                    const utilityGain = alt.utility - current.utility;
                    const efficiency = utilityGain / (costDiff || 1);

                    if (!bestUpgrade || efficiency > bestUpgrade.efficiency) {
                        bestUpgrade = { classIdx: i, newItem: alt, efficiency };
                    }
                }
            }
        }

        if (!bestUpgrade || bestUpgrade.efficiency <= 0) break;

        const costDiff = bestUpgrade.newItem.cost - currentSelection[bestUpgrade.classIdx].cost;
        currentSelection[bestUpgrade.classIdx] = bestUpgrade.newItem;
        surplus -= costDiff;
        totalVariableCost += costDiff;
    }

    // Survival Pruning
    let currentTotalCost = totalVariableCost + activitiesCost;
    if (currentTotalCost > tripInput.budget) {
        interface PrunableSpot {
            dayIdx: number; itemIdx: number; cost: number; utility: number;
        }

        const prunable: PrunableSpot[] = [];
        updatedDayPlans.forEach((day, dIdx) => {
            day.items.forEach((item, iIdx) => {
                if (item.type === 'spot') {
                    const s = item.data as Spot;
                    prunable.push({
                        dayIdx: dIdx, itemIdx: iIdx, cost: s.entryFee * travelers,
                        utility: s.popularity + s.rating * 5,
                    });
                }
            });
        });

        prunable.sort((a, b) => (a.utility / (a.cost || 1)) - (b.utility / (b.cost || 1)));

        for (const p of prunable) {
            if (currentTotalCost <= tripInput.budget) break;

            const day = updatedDayPlans[p.dayIdx];
            const item = day.items[p.itemIdx];
            if (!item || item.type !== 'spot') continue;

            currentTotalCost -= p.cost;
            day.totalCost -= p.cost;
            (day.items[p.itemIdx] as any)._toPrune = true;
        }

        updatedDayPlans.forEach(day => {
            day.items = day.items.filter(it => !(it as any)._toPrune);
        });
    }

    // Apply results
    const selectedHotels: Record<string, Hotel> = {};
    let outboundSelection: any = null;
    let returnSelection: any = null;

    currentSelection.forEach(item => {
        if (item.type === 'hotel') {
            const locName = item.classId.replace('hotel_', '');
            if (item.data) selectedHotels[locName] = item.data;
        } else if (item.classId === 'outbound') {
            outboundSelection = { type: item.type, data: item.data };
        } else if (item.classId === 'return') {
            returnSelection = { type: item.type, data: item.data };
        } else if (item.classId.startsWith('transit_')) {
            const idx = parseInt(item.classId.replace('transit_', ''));
            const option = item.data;
            updatedDayPlans[idx] = {
                ...updatedDayPlans[idx],
                items: [{
                    type: 'intercity', data: option, startTime: '09:00', endTime: '13:00',
                    notes: `🛑 Transit: ${option.modeName}`,
                }],
                totalCost: option.type === 'cab' ? option.price * cabsNeeded : option.price * travelers,
            };
        }
    });

    // 6. Fix 0km Depot P2P issue and inject Hotel-to-Hotel Transit
    const addMinutes = (timeStr: string, mins: number) => {
        if (!timeStr) return timeStr;
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return timeStr;
        const totalMins = Math.round(h * 60 + m + mins);
        const newH = Math.floor(totalMins / 60) % 24;
        const newM = totalMins % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    };

    // First fix the 0km P2P logic that links depot to Spot 1 or Spot N to depot using ACTUAL hotel locations
    for (const currDay of updatedDayPlans) {
        if (currDay.isTransitDay) continue;
        const realHotel = selectedHotels[currDay.locality];
        if (!realHotel || !realHotel.location) continue;

        // Find the first P2P which starts at "Hotel"
        const firstP2PIdx = currDay.items.findIndex(it => it.type === 'p2p' && (it.data as P2PTravel)?.fromName === 'Hotel');
        if (firstP2PIdx !== -1) {
            const oldP2P = currDay.items[firstP2PIdx].data as P2PTravel;
            // Provide actual hotel location as starting point and recalculate
            const newP2PData = await getP2PCost(realHotel.location, oldP2P.to, realHotel.name, oldP2P.toName, 'cab');
            
            // Adjust day cost block manually
            currDay.totalCost -= oldP2P.cost;
            currDay.totalCost += newP2PData.cost;
            
            currDay.items[firstP2PIdx].data = newP2PData;
        }

        // Find the last P2P which ends at "Hotel"
        // Iterate backwards
        for (let i = currDay.items.length - 1; i >= 0; i--) {
            const item = currDay.items[i];
            if (item.type === 'p2p' && (item.data as P2PTravel)?.toName === 'Hotel') {
                const oldP2P = item.data as P2PTravel;
                const newP2PData = await getP2PCost(oldP2P.from, realHotel.location, oldP2P.fromName, realHotel.name, 'cab');
                currDay.totalCost -= oldP2P.cost;
                currDay.totalCost += newP2PData.cost;
                item.data = newP2PData;
                break; // only do it for the final return trip
            }
        }
    }

    // Now insert hotel-to-hotel transit for consecutive separate localities
    for (let i = 1; i < updatedDayPlans.length; i++) {
        const prevDay = updatedDayPlans[i - 1];
        const currDay = updatedDayPlans[i];
        
        if (!prevDay.isTransitDay && !currDay.isTransitDay && prevDay.locality !== currDay.locality) {
            const hotelA = selectedHotels[prevDay.locality];
            const hotelB = selectedHotels[currDay.locality];
            
            if (hotelA && hotelB && hotelA.id !== hotelB.id && hotelA.location && hotelB.location) {
                // Generate genuine P2P option with correct numeric formatting, mode, and emojis
                const p2pData = await getP2PCost(hotelA.location, hotelB.location, hotelA.name, hotelB.name, 'cab');
                const finalP2PCost = p2pData.cost * cabsNeeded;
                
                const startTime = currDay.items[0]?.startTime || '09:00';
                const endTime = addMinutes(startTime, p2pData.duration);
                
                const p2pTransfer = {
                    type: 'p2p',
                    data: { ...p2pData, cost: finalP2PCost }, // Keep visual cost tied to total grouping cost
                    startTime,
                    endTime,
                    notes: `🏨 Transfer from ${hotelA.name} to ${hotelB.name}`
                };
                
                // Shift subsequent items using the exact duration from the new P2P
                currDay.items.forEach(item => {
                    if (item.startTime) item.startTime = addMinutes(item.startTime, p2pData.duration);
                    if (item.endTime) item.endTime = addMinutes(item.endTime, p2pData.duration);
                });
                
                currDay.items.unshift(p2pTransfer as any);
                currDay.totalCost += finalP2PCost;
            }
        }
    }

    if (outboundSelection && updatedDayPlans.length > 0) {
        const { type, data } = outboundSelection;
        const filteredItems = updatedDayPlans[0].items.filter(item => item.type !== 'flight' && item.type !== 'train');

        updatedDayPlans[0] = {
            ...updatedDayPlans[0],
            items: [{
                type, data,
                startTime: new Date(data.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                endTime: new Date(data.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                notes: `✈️ Outbound: ${data.source} → ${data.destination}`,
            }, ...filteredItems],
            totalCost: filteredItems.reduce((sum, it) => {
                if (it.type === 'spot') return sum + (it.data as any).entryFee * travelers;
                if (it.type === 'restaurant') return sum + ((it.data as any).avgCostForTwo / 2) * travelers;
                if (it.type === 'p2p') return sum + (it.data as any).cost; // Note: P2P inside items is already modified with travelers mult by AgentB
                return sum;
            }, 0) + data.price * travelers,
        };
    }

    if (returnSelection && updatedDayPlans.length > 0) {
        const { type, data } = returnSelection;
        const lastIdx = updatedDayPlans.length - 1;
        const filteredItems = updatedDayPlans[lastIdx].items.filter(item => item.type !== 'flight' && item.type !== 'train');

        updatedDayPlans[lastIdx] = {
            ...updatedDayPlans[lastIdx],
            items: [...filteredItems, {
                type, data,
                startTime: new Date(data.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                endTime: new Date(data.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                notes: `✈️ Return: ${data.source} → ${data.destination}`,
            }],
            totalCost: filteredItems.reduce((sum, it) => {
                if (it.type === 'spot') return sum + (it.data as any).entryFee * travelers;
                if (it.type === 'restaurant') return sum + ((it.data as any).avgCostForTwo / 2) * travelers;
                if (it.type === 'p2p') return sum + (it.data as any).cost;
                return sum;
            }, 0) + data.price * travelers,
        };
    }

    // Helper to call GPT to adjust meals/spots around flight times
    async function adjustMealsAndSpotsWithGPT(dayPlan: DayPlan, role: 'first_day' | 'last_day'): Promise<DayPlan> {
        if (!process.env.AZURE_OPENAI_ENDPOINT) return dayPlan;
        try {
            const prompt = `You are Safar AI's itinerary corrector. 
This is the ${role === 'first_day' ? 'First Day' : 'Final Day'} of the user's trip.
The current scheduled items for this day are provided below in JSON format.
There is a flight or train included in these items which dictates when the user arrives (if First Day) or departs (if Final Day).

YOUR TASKS:
1. Examine the flight/train arrival and departure times.
2. If this is the First Day: The user shouldn't do anything before they arrive + a 2 hour buffer for baggage/transit. 
   - Remove any spots or activities scheduled BEFORE they arrive and are ready.
   - For meals, if they arrive after 18:00 (6 PM), REMOVE Lunch. If they arrive earlier, keep Lunch or shift it to a late lunch. "check arrival after say 6pm for no lunch. skipping lunch should ONLY BE THE CASE IF THEY ARRIVE PRETTY LATE".
3. If this is the Final Day: The user shouldn't do anything within 3 hours BEFORE their departure time.
   - Remove any spots or meals scheduled too close to or after leaving for the airport/station.
   - For example, if departure is at 14:00, skip Dinner.
4. Shift the "startTime" and "endTime" of the surviving items so they flow chronologically after arrival (or before departure) without overlapping.

REPLY ONLY WITH THE RAW JSON ARRAY representing the updated "items" array. Match the exact object structure you receive.
Do not wrap it in \`\`\`json. Output nothing but the JSON array.

INPUT ITEMS:
${JSON.stringify(dayPlan.items, null, 2)}`;

            const response = await aiClient.chat.completions.create({
                model: process.env.AZURE_OPENAI_DEPLOYMENT!,
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.1,
            });

            const rawResult = response.choices[0]?.message?.content?.trim();
            if (rawResult) {
                let jsonString = rawResult;
                if (jsonString.startsWith('\`\`\`json')) jsonString = jsonString.slice(7);
                if (jsonString.startsWith('\`\`\`')) jsonString = jsonString.slice(3);
                if (jsonString.endsWith('\`\`\`')) jsonString = jsonString.slice(0, -3);
                
                const newItems = JSON.parse(jsonString.trim());
                if (Array.isArray(newItems)) {
                    let newCost = newItems.reduce((sum, item: any) => {
                        if (item.type === 'spot') return sum + (item.data?.entryFee || 0);
                        if (item.type === 'restaurant') return sum + ((item.data?.avgCostForTwo || 0) / 2);
                        if (item.type === 'p2p') return sum + (item.data?.cost || 0);
                        if (item.type === 'flight' || item.type === 'train') return sum + (item.data?.price || 0);
                        return sum;
                    }, 0);
                    return { ...dayPlan, items: newItems, totalCost: newCost };
                }
            }
        } catch (err) {
            console.error("GPT Adjustment failed for", role, ":", err);
        }
        return dayPlan;
    }

    // Agent C specifically invokes GPT to intelligently adapt day plans to exact transport constraints
    if (updatedDayPlans.length > 0 && outboundSelection) {
        updatedDayPlans[0] = await adjustMealsAndSpotsWithGPT(updatedDayPlans[0], 'first_day');
    }
    
    // Always adjust the last day if there is a departure, even for 1-day trips
    if (updatedDayPlans.length > 0 && returnSelection) {
        const lastIdx = updatedDayPlans.length - 1;
        updatedDayPlans[lastIdx] = await adjustMealsAndSpotsWithGPT(updatedDayPlans[lastIdx], 'last_day');
    }

    updatedDayPlans.forEach(dp => {
        dp.hotel = selectedHotels[dp.locality] || undefined;
    });

    const finalCost = updatedDayPlans.reduce((sum, d) => sum + d.totalCost, 0) +
        Object.entries(selectedHotels).reduce((sum, [locName, h]) => {
            const loc = nonTransitLocalities.find(l => l.locality === locName);
            return sum + (h.pricePerNight * (loc?.days || 0) * roomsNeeded);
        }, 0);

    return {
        id: uuidv4(),
        tripInput,
        localitySplit: localities,
        days: updatedDayPlans,
        totalCost: Math.round(finalCost),
        budgetRemaining: Math.round(tripInput.budget - finalCost),
        outboundTravel: outboundSelection,
        returnTravel: returnSelection,
        allFlights: agentData.flights,
        allTrains: agentData.trains,
        interCityOptions: agentData.interCityTravel,
        unselectedSpots: unselectedSpots,
    } as FullItinerary;
}

export async function POST(request: NextRequest) {
    try {
        const body: AgentCInput = await request.json();
        const itinerary = await executeAgentC(body);

        return NextResponse.json({ success: true, itinerary });
    } catch (error) {
        console.error('Agent C error:', error);
        return NextResponse.json({ success: false, error: 'Agent C failed' }, { status: 500 });
    }
}
