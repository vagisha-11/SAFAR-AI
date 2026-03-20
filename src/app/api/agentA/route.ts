// ============================================================
// Safar AI — Agent A: Data Fetcher
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getHotels, getFlights, getTrains, getSpots, getRestaurants, getInterCityTravel } from '@/lib/fakeApi';
import { LocalitySplit, AgentData } from '@/lib/types';

export async function executeAgentA(params: {
    localities: LocalitySplit[];
    source: string;
    destination: string;
    departureDate: string;
    returnDate: string;
}): Promise<AgentData> {
    const { localities, source, destination, departureDate, returnDate } = params;

    const agentData: AgentData = {
        hotels: {},
        flights: [],
        trains: [],
        interCityTravel: {},
        spots: {},
        restaurants: {},
    };

    // Fetch data for each locality
    for (const loc of localities) {
        if (loc.isTransitDay) continue;

        const localityName = loc.locality;
        agentData.hotels[localityName] = getHotels(localityName);
        agentData.spots[localityName] = getSpots(localityName);
        agentData.restaurants[localityName] = getRestaurants(localityName);
    }

    // Fetch flights and trains from source to first locality
    const firstLocality = localities.find(l => !l.isTransitDay)?.locality || destination;
    agentData.flights = getFlights(source, firstLocality, departureDate);
    agentData.trains = getTrains(source, firstLocality, departureDate);

    // Fetch return flights and trains
    const lastLocality = [...localities].reverse().find(l => !l.isTransitDay)?.locality || destination;
    if (lastLocality !== firstLocality) {
        agentData.flights = [
            ...agentData.flights,
            ...getFlights(lastLocality, source, returnDate),
        ];
        agentData.trains = [
            ...agentData.trains,
            ...getTrains(lastLocality, source, returnDate),
        ];
    } else {
        agentData.flights = [
            ...agentData.flights,
            ...getFlights(firstLocality, source, returnDate),
        ];
        agentData.trains = [
            ...agentData.trains,
            ...getTrains(firstLocality, source, returnDate),
        ];
    }

    // Fetch inter-locality transit
    for (let i = 0; i < localities.length - 1; i++) {
        if (localities[i].isTransitDay) {
            const parts = localities[i].locality.split(' to ');
            if (parts.length === 2) {
                const sourceCity = parts[0];
                const destCity = parts[1];
                const transitFlights = getFlights(sourceCity, destCity, departureDate);
                const transitTrains = getTrains(sourceCity, destCity, departureDate);
                agentData.flights = [...agentData.flights, ...transitFlights];
                agentData.trains = [...agentData.trains, ...transitTrains];

                // Specific inter-city travel options (Bus, Shared Taxi, Cab)
                agentData.interCityTravel[localities[i].locality] = getInterCityTravel(sourceCity, destCity);
            }
        }
    }

    return agentData;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const agentData = await executeAgentA(body);

        return NextResponse.json({
            success: true,
            data: agentData,
        });
    } catch (error) {
        console.error('Agent A error:', error);
        return NextResponse.json({ success: false, error: 'Agent A failed' }, { status: 500 });
    }
}
