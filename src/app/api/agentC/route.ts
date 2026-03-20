// ============================================================
// Safar AI — Agent C: Budgeter
// Adjusts hotel and travel to fit budget
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
    DayPlan, Hotel, Flight, Train, AgentData, InterCityOption,
    FullItinerary, LocalitySplit, TripInput, BudgetAllocation, Spot,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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

    // 1. Hotel Partitions
    for (const loc of nonTransitLocalities) {
        const hotels = (agentData.hotels[loc.locality] || []);
        const options: MCKPItem[] = hotels.map(h => ({
            classId: `hotel_${loc.locality}`,
            data: h,
            cost: h.pricePerNight * loc.days,
            utility: h.starRating * 100 + (h.propertyType === 'Resort' ? 50 : 0),
            type: 'hotel',
        }));
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
                cost: f.price,
                utility: (20 - (calculateDurationMin(f.departureTime, f.arrivalTime) / 60)) * 10,
                type: 'flight' as const,
            })),
        ...agentData.trains
            .filter(t => t.source.toLowerCase() === tripInput.source.toLowerCase())
            .map(t => ({
                classId: 'outbound',
                data: t,
                cost: t.price,
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
                cost: f.price,
                utility: (20 - (calculateDurationMin(f.departureTime, f.arrivalTime) / 60)) * 10,
                type: 'flight' as const,
            })),
        ...agentData.trains
            .filter(t => t.destination.toLowerCase() === tripInput.source.toLowerCase())
            .map(t => ({
                classId: 'return',
                data: t,
                cost: t.price,
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
            cost: opt.price,
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
                        dayIdx: dIdx, itemIdx: iIdx, cost: s.entryFee,
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
                totalCost: option.price,
            };
        }
    });

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
                if (it.type === 'spot') return sum + (it.data as any).entryFee;
                if (it.type === 'restaurant') return sum + (it.data as any).avgCostForTwo / 2;
                if (it.type === 'p2p') return sum + (it.data as any).cost;
                return sum;
            }, 0) + data.price,
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
                if (it.type === 'spot') return sum + (it.data as any).entryFee;
                if (it.type === 'restaurant') return sum + (it.data as any).avgCostForTwo / 2;
                if (it.type === 'p2p') return sum + (it.data as any).cost;
                return sum;
            }, 0) + data.price,
        };
    }

    updatedDayPlans.forEach(dp => {
        dp.hotel = selectedHotels[dp.locality] || undefined;
    });

    const finalCost = updatedDayPlans.reduce((sum, d) => sum + d.totalCost, 0) +
        Object.entries(selectedHotels).reduce((sum, [locName, h]) => {
            const loc = nonTransitLocalities.find(l => l.locality === locName);
            return sum + (h.pricePerNight * (loc?.days || 0));
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
