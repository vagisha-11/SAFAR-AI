import { NextRequest, NextResponse } from 'next/server';
import { getTrains, getInterCityTravel } from '@/lib/fakeApi';
import { LocalitySplit, AgentData, LatLng } from '@/lib/types';
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

    const olaApiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';

    // Helper to geocode a single place
    const geocodeLocation = async (name: string, locality: string, fallback: LatLng): Promise<LatLng> => {
        if (!olaApiKey) return fallback;
        try {
            const query = encodeURIComponent(`${name}, ${locality}`);
            const url = `https://api.olamaps.io/places/v1/geocode?address=${query}&api_key=${olaApiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.geocodingResults && data.geocodingResults.length > 0) {
                const loc = data.geocodingResults[0].geometry.location;
                return { lat: loc.lat, lng: loc.lng };
            }
        } catch (err) {
            console.error(`Geocoding failed for ${name}:`, err);
        }
        return fallback;
    };

    // Helper to geocode an array of places concurrently
    const geocodeItems = async <T extends { name: string; location: LatLng }>(items: T[], locality: string): Promise<T[]> => {
        return Promise.all(items.map(async (item) => {
            const newLoc = await geocodeLocation(item.name, locality, item.location);
            return { ...item, location: newLoc };
        }));
    };

    // Fetch and geocode data for each locality dynamically
    for (const loc of localities) {
        if (loc.isTransitDay) continue;

        const localityName = loc.locality;
        
        // Generate content via Heuristic/LLM engines
        const rawHotels = generateHeuristicHotels(localityName);
        const rawSpots = await fetchOrGenerateSpots(localityName, loc.days);
        const rawRestaurants = await fetchOrGenerateRestaurants(localityName);

        // Refine coordinates using Ola Maps
        agentData.hotels[localityName] = await geocodeItems(rawHotels, localityName);
        agentData.spots[localityName] = await geocodeItems(rawSpots, localityName);
        agentData.restaurants[localityName] = await geocodeItems(rawRestaurants, localityName);
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
