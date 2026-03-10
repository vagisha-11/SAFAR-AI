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
    const hours = Math.floor(hourDecimal);
    const minutes = Math.round((hourDecimal - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function addPlaceToDay(dayPlan: DayPlan, spot: Spot): DayPlan {
    const items = [...dayPlan.items];

    // Find insertion point (before last P2P return trip)
    let insertIdx = items.length;
    if (items.length > 0 && items[items.length - 1].notes?.includes('Return')) {
        insertIdx = items.length - 1;
    }

    // Determine current position
    let lastLocation = spot.location; // fallback
    if (insertIdx > 0) {
        const prevItem = items[insertIdx - 1];
        if (prevItem.type === 'spot') {
            lastLocation = (prevItem.data as Spot).location;
        }
    }

    // Add P2P travel to new spot
    const p2p = getP2PCost(lastLocation, spot.location, 'Previous', spot.name, 'cab');
    const lastEndTime = insertIdx > 0 && items[insertIdx - 1].endTime
        ? parseFloat(items[insertIdx - 1].endTime!.replace(':', '.'))
        : 8;

    const travelHours = p2p.duration / 60;
    const arrivalTime = lastEndTime + travelHours;

    items.splice(insertIdx, 0, {
        type: 'p2p',
        data: p2p,
        startTime: formatTime(lastEndTime),
        endTime: formatTime(arrivalTime),
    });

    items.splice(insertIdx + 1, 0, {
        type: 'spot',
        data: spot,
        startTime: formatTime(arrivalTime),
        endTime: formatTime(arrivalTime + spot.timeToSpend),
    });

    const newCost = dayPlan.totalCost + p2p.cost + spot.entryFee;

    return { ...dayPlan, items, totalCost: Math.round(newCost) };
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
                    updatedItinerary.days[dayIdx] = addPlaceToDay(updatedItinerary.days[dayIdx], payload.spot);
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
                            return addPlaceToDay(day, candidate);
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
