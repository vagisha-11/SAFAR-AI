// ============================================================
// Safar AI — Delta Update API
// Handles incremental changes to the itinerary
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { Spot, DayPlan, FullItinerary, ItineraryItem } from '@/lib/types';
import { getP2PCost, haversineDistance } from '@/lib/fakeApi';
import { v4 as uuidv4 } from 'uuid';

type DeltaAction = 'add_place' | 'remove_place' | 'change_budget' | 'recompute' | 'category_swap';

interface DeltaRequest {
    action: DeltaAction;
    itinerary: FullItinerary;
    payload: {
        spot?: Spot;
        dayNumber?: number;
        newBudget?: number;
        spotId?: string;
    };
}

function formatTime(hourDecimal: number): string {
    const h = hourDecimal % 24;
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Parse "HH:MM" to a decimal hour (e.g. "14:30" → 14.5) */
function parseTimeToHour(timeStr: string): number {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '8', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h + m / 60;
}

function addPlaceToDay(dayPlan: DayPlan, spot: Spot, depot: { lat: number; lng: number } | null): DayPlan {
    const items = [...dayPlan.items];

    // Separate the "Return to Hotel" P2P from the rest (it's always last)
    const returnIdx = items.findIndex(i => i.type === 'p2p' && i.notes?.includes('Return'));
    const returnItem = returnIdx >= 0 ? items[returnIdx] : null;
    // Work only with the items before the return trip
    const workItems = returnIdx >= 0 ? items.slice(0, returnIdx) : items;

    // Find all spot items to determine chronological positions to test insertion
    // Strategy: find the slot between consecutive spot items that MINIMIZES additional total travel
    // If no spots exist yet, just insert at beginning
    const spotItems = workItems.filter(i => i.type === 'spot');

    let bestInsertAfterIdx = workItems.length; // default: append at end of work items
    let bestExtraCost = Infinity;

    if (spotItems.length === 0) {
        // No spots yet — insert as the first item
        bestInsertAfterIdx = 0;
        bestExtraCost = 0;
    } else {
        // Evaluate inserting after each existing spot item
        // Extra cost = dist(prev → new) + dist(new → next) - dist(prev → next)
        for (let i = 0; i <= spotItems.length; i++) {
            const prevLoc = i === 0
                ? (depot || spot.location)
                : (spotItems[i - 1].data as Spot).location;
            const nextLoc = i === spotItems.length
                ? (depot || spot.location)
                : (spotItems[i].data as Spot).location;

            const dPrevNew = haversineDistance(prevLoc, spot.location);
            const dNewNext = haversineDistance(spot.location, nextLoc);
            const dPrevNext = haversineDistance(prevLoc, nextLoc);
            const extraDist = dPrevNew + dNewNext - dPrevNext;

            if (extraDist < bestExtraCost) {
                bestExtraCost = extraDist;
                // Find where this spot slot is in the full workItems array
                if (i === 0) {
                    bestInsertAfterIdx = 0;
                } else {
                    const targetSpot = spotItems[i - 1];
                    const absIdx = workItems.findIndex(it => it === targetSpot);
                    bestInsertAfterIdx = absIdx + 1; // insert right after this spot
                }
            }
        }
    }

    // Determine the previous location and time at the insertion point
    let prevEndTime = parseTimeToHour('08:00');
    let prevLocation = depot || spot.location;

    if (bestInsertAfterIdx > 0 && workItems[bestInsertAfterIdx - 1]) {
        const prev = workItems[bestInsertAfterIdx - 1];
        if (prev.endTime) prevEndTime = parseTimeToHour(prev.endTime);
        if (prev.type === 'spot') prevLocation = (prev.data as Spot).location;
    }

    // Build the new P2P + Spot items
    const p2p = getP2PCost(prevLocation, spot.location, 'Previous Stop', spot.name, 'cab');
    const travelHours = p2p.duration / 60;
    const arrivalTime = prevEndTime + travelHours;
    const departTime = arrivalTime + spot.timeToSpend;

    const newP2P: any = {
        type: 'p2p',
        data: p2p,
        startTime: formatTime(prevEndTime),
        endTime: formatTime(arrivalTime),
    };

    const newSpot: any = {
        type: 'spot',
        data: spot,
        startTime: formatTime(arrivalTime),
        endTime: formatTime(departTime),
    };

    // Insert into workItems at the best position
    workItems.splice(bestInsertAfterIdx, 0, newP2P, newSpot);

    // Reconstruct with "Return to Hotel" at the very end
    const finalItems = returnItem ? [...workItems, returnItem] : workItems;

    // Recalculate cost
    const newCost = dayPlan.totalCost + p2p.cost + spot.entryFee;

    return { ...dayPlan, items: finalItems, totalCost: Math.round(newCost) };
}


function removePlaceFromDay(dayPlan: DayPlan, spotId: string): DayPlan {
    const items: ItineraryItem[] = [];
    let removedCost = 0;

    for (let i = 0; i < dayPlan.items.length; i++) {
        const item = dayPlan.items[i];
        if (item.type === 'spot' && (item.data as Spot).id === spotId) {
            removedCost += (item.data as Spot).entryFee;
            // Also remove the preceding P2P if it exists
            if (items.length > 0 && items[items.length - 1].type === 'p2p') {
                const removedP2P = items.pop()!;
                removedCost += (removedP2P.data as { cost: number }).cost;
            }
            continue;
        }
        items.push(item);
    }

    return {
        ...dayPlan,
        items,
        totalCost: Math.round(dayPlan.totalCost - removedCost),
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: DeltaRequest = await request.json();
        const { action, itinerary, payload } = body;

        let updatedItinerary = { ...itinerary };

        switch (action) {
            case 'add_place': {
                if (!payload.spot) break;
                const targetDay = payload.dayNumber || 1;
                const dayIdx = updatedItinerary.days.findIndex(d => d.dayNumber === targetDay);
                if (dayIdx >= 0) {
                    updatedItinerary.days = [...updatedItinerary.days];
                    updatedItinerary.days[dayIdx] = addPlaceToDay(updatedItinerary.days[dayIdx], payload.spot, null);
                }
                break;
            }

            case 'remove_place': {
                if (!payload.spotId) break;
                updatedItinerary.days = updatedItinerary.days.map(day => {
                    const hasSpot = day.items.some(
                        item => item.type === 'spot' && (item.data as Spot).id === payload.spotId
                    );
                    if (hasSpot) return removePlaceFromDay(day, payload.spotId!);
                    return day;
                });
                break;
            }

            case 'change_budget': {
                if (payload.newBudget) {
                    updatedItinerary.tripInput = {
                        ...updatedItinerary.tripInput,
                        budget: payload.newBudget,
                    };
                }
                break;
            }

            case 'category_swap': {
                const { removeCategory, addCategory } = (payload as any);
                if (!removeCategory || !addCategory) break;

                const rCat = removeCategory.toLowerCase().trim();
                const aCat = addCategory.toLowerCase().trim();

                const getSearchTerms = (cat: string) => {
                    if (cat.includes('club')) return ['nightlife', 'club', 'bar', 'pub'];
                    if (cat.includes('religious') || cat.includes('church') || cat.includes('temple')) return ['religious', 'temple', 'church', 'cathedral'];
                    if (cat.includes('nature') || cat.includes('scenic')) return ['nature', 'beach', 'park', 'waterfall', 'lake'];
                    return [cat];
                };

                const rTerms = getSearchTerms(rCat);
                const aTerms = getSearchTerms(aCat);

                // 1. Identify localities affected by removals
                const affectedLocalities = new Set<string>();

                updatedItinerary.days = updatedItinerary.days.map(day => {
                    let newDay = { ...day };
                    const spotsToRemove = day.items
                        .filter(it => it.type === 'spot' && (
                            rTerms.some(t => (it.data as Spot).category.toLowerCase().includes(t)) ||
                            rTerms.some(t => (it.data as Spot).name.toLowerCase().includes(t))
                        ))
                        .map(it => (it.data as Spot).id);

                    if (spotsToRemove.length > 0) {
                        affectedLocalities.add(day.locality);
                        for (const id of spotsToRemove) {
                            newDay = removePlaceFromDay(newDay, id);
                        }
                    }
                    return newDay;
                });

                // 2. Add candidates to affected localities
                if (affectedLocalities.size > 0 && updatedItinerary.unselectedSpots) {
                    const pool = [...updatedItinerary.unselectedSpots];

                    updatedItinerary.days = updatedItinerary.days.map(day => {
                        if (!affectedLocalities.has(day.locality) || day.isTransitDay) return day;

                        // Find candidate for this locality
                        const candidateIdx = pool.findIndex(s =>
                            s.address.includes(day.locality) && (
                                aTerms.some(t => s.category.toLowerCase().includes(t)) ||
                                aTerms.some(t => s.name.toLowerCase().includes(t))
                            )
                        );

                        if (candidateIdx >= 0) {
                            const candidate = pool.splice(candidateIdx, 1)[0];
                            return addPlaceToDay(day, candidate, null);
                        }
                        return day;
                    });

                    updatedItinerary.unselectedSpots = pool;
                }
                break;
            }
        }

        // Recalculate totals including hotel costs
        const hotelCost = updatedItinerary.localitySplit.reduce((sum, loc) => {
            if (loc.isTransitDay) return sum;
            const day = updatedItinerary.days.find(d => d.locality === loc.locality && d.hotel);
            if (day && day.hotel) {
                return sum + (day.hotel.pricePerNight * loc.days);
            }
            return sum;
        }, 0);

        updatedItinerary.totalCost = Math.round(
            updatedItinerary.days.reduce((sum, d) => sum + d.totalCost, 0) + hotelCost
        );

        updatedItinerary.budgetRemaining =
            updatedItinerary.tripInput.budget - updatedItinerary.totalCost;

        return NextResponse.json({
            success: true,
            itinerary: updatedItinerary,
        });
    } catch (error) {
        console.error('Delta update error:', error);
        return NextResponse.json({ success: false, error: 'Delta update failed' }, { status: 500 });
    }
}
