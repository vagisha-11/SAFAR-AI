// ============================================================
// Safar AI — Agent C: Budgeter
// Adjusts hotel and travel to fit budget
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
    DayPlan, Hotel, Flight, Train, AgentData, InterCityOption,
    FullItinerary, LocalitySplit, TripInput, BudgetAllocation,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface AgentCInput {
    dayPlans: DayPlan[];
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

export async function POST(request: NextRequest) {
    try {
        const body: AgentCInput = await request.json();
        const { dayPlans, agentData, tripInput, localities } = body;

        const totalDays = dayPlans.length;
        const budget = allocateBudget(tripInput.budget, totalDays, localities);

        // Calculate current activities + P2P cost
        const activitiesCost = dayPlans.reduce((sum, d) => sum + d.totalCost, 0);
        const remainingBudget = tripInput.budget - activitiesCost;

        // Select hotels for each locality
        const selectedHotels: Record<string, Hotel> = {};
        const nonTransitLocalities = localities.filter(l => !l.isTransitDay);

        let totalHotelCost = 0;
        for (const loc of nonTransitLocalities) {
            const hotels = agentData.hotels[loc.locality] || [];
            const budgetPerNight = budget.hotelBudget / totalDays;
            const hotel = selectHotel(hotels, budgetPerNight, loc.days);
            if (hotel) {
                selectedHotels[loc.locality] = hotel;
                totalHotelCost += hotel.pricePerNight * loc.days;
            }
        }

        // Select travel
        const travelBudgetRemaining = Math.max(0, remainingBudget - totalHotelCost);
        const outboundTravel = selectTravel(
            agentData.flights.filter(f => f.source.toLowerCase() === tripInput.source.toLowerCase()),
            agentData.trains.filter(t => t.source.toLowerCase() === tripInput.source.toLowerCase()),
            travelBudgetRemaining / 2
        );
        const returnTravel = selectTravel(
            agentData.flights.filter(f => f.destination.toLowerCase() === tripInput.source.toLowerCase()),
            agentData.trains.filter(t => t.destination.toLowerCase() === tripInput.source.toLowerCase()),
            travelBudgetRemaining / 2
        );

        let travelCost = 0;
        if (outboundTravel) travelCost += (outboundTravel.data as Flight).price || 0;
        if (returnTravel) travelCost += (returnTravel.data as Flight).price || 0;

        // Assign hotels and transit travel to day plans
        const updatedDayPlans = dayPlans.map(dp => {
            const hotel = selectedHotels[dp.locality];

            if (dp.isTransitDay) {
                // Select inter-city transit for this transit day
                const options = agentData.interCityTravel[dp.locality] || [];
                const transitBudget = budget.travelBudget / localities.filter(l => l.isTransitDay).length;
                const selectedTransit = selectInterCityTravel(options, transitBudget);

                if (selectedTransit) {
                    const transitItem = {
                        type: 'intercity' as const,
                        data: selectedTransit,
                        startTime: selectedTransit.departureTimes[0] === 'Anytime' ? '09:00' : selectedTransit.departureTimes[0],
                        endTime: '13:00', // Simplified duration for now
                        notes: `🕒 Mode: ${selectedTransit.modeName} (${selectedTransit.type.replace('_', ' ')})`,
                    };
                    return {
                        ...dp,
                        items: [transitItem],
                        totalCost: selectedTransit.price,
                        hotel: hotel || undefined
                    };
                }
            }

            return { ...dp, hotel: hotel || undefined };
        });

        // If over budget, try cheaper hotels (Normal defensive logic)
        let totalCost = activitiesCost + totalHotelCost + travelCost;
        if (totalCost > tripInput.budget) {
            for (const loc of nonTransitLocalities) {
                const hotels = (agentData.hotels[loc.locality] || []).sort(
                    (a, b) => a.pricePerNight - b.pricePerNight
                );
                if (hotels.length > 0) {
                    const cheapest = hotels[0];
                    const oldCost = selectedHotels[loc.locality]?.pricePerNight || 0;
                    const savings = (oldCost - cheapest.pricePerNight) * loc.days;
                    if (savings > 0) {
                        selectedHotels[loc.locality] = cheapest;
                        totalHotelCost -= savings;
                        totalCost -= savings;
                    }
                }
                if (totalCost <= tripInput.budget) break;
            }
        } else if (totalCost < tripInput.budget * 0.95) {
            // Balanced Upsell Pass: Invest surplus into better Transit OR Hotels based on Value
            let surplus = tripInput.budget - totalCost;

            const transitDayIndices = updatedDayPlans
                .map((dp, idx) => dp.isTransitDay ? idx : -1)
                .filter(idx => idx !== -1);

            const selectedInterCity: Record<number, InterCityOption> = {};
            transitDayIndices.forEach(idx => {
                const item = updatedDayPlans[idx].items.find(i => i.type === 'intercity');
                if (item) selectedInterCity[idx] = item.data as InterCityOption;
            });

            interface UpgradeOption {
                type: 'hotel' | 'transit';
                locality?: string;
                dayIndex?: number;
                currentPrice: number;
                targetPrice: number;
                targetData: any;
                valueScore: number;
            }

            const getOptions = (): UpgradeOption[] => {
                const options: UpgradeOption[] = [];
                for (const loc of nonTransitLocalities) {
                    const current = selectedHotels[loc.locality];
                    if (!current) continue;
                    const hotels = (agentData.hotels[loc.locality] || [])
                        .filter(h => h.pricePerNight > current.pricePerNight)
                        .sort((a, b) => a.pricePerNight - b.pricePerNight);
                    for (const h of hotels) {
                        const costDiff = (h.pricePerNight - current.pricePerNight) * loc.days;
                        if (costDiff <= surplus && costDiff > 0) {
                            options.push({
                                type: 'hotel', locality: loc.locality,
                                currentPrice: current.pricePerNight * loc.days,
                                targetPrice: h.pricePerNight * loc.days,
                                targetData: h,
                                valueScore: (h.starRating - current.starRating) * 1000 / costDiff
                            });
                        }
                    }
                }
                transitDayIndices.forEach(idx => {
                    const current = selectedInterCity[idx];
                    if (!current) return;
                    const alternatives = (agentData.interCityTravel[updatedDayPlans[idx].locality] || [])
                        .filter(opt => opt.price > current.price)
                        .sort((a, b) => a.price - b.price);
                    for (const alt of alternatives) {
                        const costDiff = alt.price - current.price;
                        if (costDiff <= surplus && costDiff > 0) {
                            const qIdx = (m: string) => m === 'cab' ? 10 : (m === 'shared_taxi' ? 7 : 4);
                            options.push({
                                type: 'transit', dayIndex: idx,
                                currentPrice: current.price, targetPrice: alt.price,
                                targetData: alt,
                                valueScore: (qIdx(alt.type) - qIdx(current.type)) * 500 / costDiff
                            });
                        }
                    }
                });
                return options.sort((a, b) => b.valueScore - a.valueScore);
            };

            let iterations = 0;
            while (surplus > 1000 && iterations < 15) {
                const options = getOptions();
                if (options.length === 0) break;
                const best = options[0];
                if (best.valueScore < 0.0001) break;
                const costDiff = best.targetPrice - best.currentPrice;
                if (best.type === 'hotel' && best.locality) {
                    selectedHotels[best.locality] = best.targetData;
                    totalHotelCost += costDiff;
                } else if (best.type === 'transit' && best.dayIndex !== undefined) {
                    selectedInterCity[best.dayIndex] = best.targetData;
                    const item = updatedDayPlans[best.dayIndex].items.find(i => i.type === 'intercity');
                    if (item) {
                        item.data = best.targetData;
                        updatedDayPlans[best.dayIndex].totalCost = best.targetData.price;
                    }
                }
                totalCost += costDiff;
                surplus -= costDiff;
                iterations++;
            }
        }

        // Inject outbound travel into Day 1 items
        if (outboundTravel && updatedDayPlans.length > 0) {
            const travelItem = {
                type: outboundTravel.type as 'flight' | 'train',
                data: outboundTravel.data,
                startTime: new Date(outboundTravel.data.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                endTime: new Date(outboundTravel.data.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                notes: `✈️ Outbound: ${outboundTravel.data.source} → ${outboundTravel.data.destination}`,
            };
            updatedDayPlans[0] = {
                ...updatedDayPlans[0],
                items: [travelItem, ...updatedDayPlans[0].items],
                totalCost: updatedDayPlans[0].totalCost + outboundTravel.data.price,
            };
        }

        // Inject return travel into last day items
        if (returnTravel && updatedDayPlans.length > 0) {
            const lastIdx = updatedDayPlans.length - 1;
            const travelItem = {
                type: returnTravel.type as 'flight' | 'train',
                data: returnTravel.data,
                startTime: new Date(returnTravel.data.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                endTime: new Date(returnTravel.data.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                notes: `✈️ Return: ${returnTravel.data.source} → ${returnTravel.data.destination}`,
            };
            updatedDayPlans[lastIdx] = {
                ...updatedDayPlans[lastIdx],
                items: [...updatedDayPlans[lastIdx].items, travelItem],
                totalCost: updatedDayPlans[lastIdx].totalCost + returnTravel.data.price,
            };
        }

        // Sync upgraded hotels back to day plans
        updatedDayPlans.forEach(dp => {
            dp.hotel = selectedHotels[dp.locality] || undefined;
        });

        // Recalculate total cost
        totalCost = updatedDayPlans.reduce((sum, d) => sum + d.totalCost, 0) + totalHotelCost;

        const itinerary: FullItinerary = {
            id: uuidv4(),
            tripInput,
            localitySplit: localities,
            days: updatedDayPlans,
            totalCost: Math.round(totalCost),
            budgetRemaining: Math.round(tripInput.budget - totalCost),
            outboundTravel: outboundTravel ? { type: outboundTravel.type, data: outboundTravel.data } : undefined,
            returnTravel: returnTravel ? { type: returnTravel.type, data: returnTravel.data } : undefined,
            allFlights: agentData.flights,
            allTrains: agentData.trains,
            interCityOptions: agentData.interCityTravel,
        };

        return NextResponse.json({
            success: true,
            itinerary,
            budgetAllocation: budget,
            selectedHotels,
            outboundTravel,
            returnTravel,
        });
    } catch (error) {
        console.error('Agent C error:', error);
        return NextResponse.json({ success: false, error: 'Agent C failed' }, { status: 500 });
    }
}
