import { NextRequest, NextResponse } from 'next/server';
import { getTrains, getInterCityTravel } from '@/lib/fakeApi';
import { LocalitySplit, AgentData } from '@/lib/types';
import { fetchOrGenerateSpots, fetchOrGenerateRestaurants } from '@/lib/dataEngine';
import { generateHeuristicFlights, generateHeuristicHotels } from '@/lib/pricingHeuristics';

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

    // Fetch data for each locality dynamically
    for (const loc of localities) {
        if (loc.isTransitDay) continue;

        const localityName = loc.locality;
        agentData.hotels[localityName] = generateHeuristicHotels(localityName);
        
        // This invokes the LLM if the database doesn't natively have the Locality 
        agentData.spots[localityName] = await fetchOrGenerateSpots(localityName);
        
        // Generate authentic restaurants uniquely sourced from the LLM cache
        agentData.restaurants[localityName] = await fetchOrGenerateRestaurants(localityName);
    }

    // Generate algorithmically sound flights from source to first locality
    const firstLocality = localities.find(l => !l.isTransitDay)?.locality || destination;
    agentData.flights = generateHeuristicFlights(source, firstLocality, departureDate);
    agentData.trains = getTrains(source, firstLocality, departureDate);

    // Fetch return flights and trains
    const lastLocality = [...localities].reverse().find(l => !l.isTransitDay)?.locality || destination;
    if (lastLocality !== firstLocality) {
        agentData.flights = [
            ...agentData.flights,
            ...generateHeuristicFlights(lastLocality, source, returnDate),
        ];
        agentData.trains = [
            ...agentData.trains,
            ...getTrains(lastLocality, source, returnDate),
        ];
    } else {
        agentData.flights = [
            ...agentData.flights,
            ...generateHeuristicFlights(firstLocality, source, returnDate),
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
                const transitFlights = generateHeuristicFlights(sourceCity, destCity, departureDate);
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
