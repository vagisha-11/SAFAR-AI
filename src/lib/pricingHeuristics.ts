import { Flight, Hotel } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Common City Coordinates for Haversine Distance heuristic mocking.
 * If a city isn't found, defaults to center of India.
 */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'goa': { lat: 15.2993, lng: 74.1240 },
    'kochi': { lat: 9.9312, lng: 76.2673 },
    'kerala': { lat: 10.8505, lng: 76.2711 },
    'sikkim': { lat: 27.5330, lng: 88.5122 },
    'gangtok': { lat: 27.3389, lng: 88.6065 },
    'manali': { lat: 32.2396, lng: 77.1887 },
    'shimla': { lat: 31.1048, lng: 77.1734 },
    'agra': { lat: 27.1767, lng: 78.0081 },
    'varanasi': { lat: 25.3176, lng: 82.9739 },
    'udaipur': { lat: 24.5854, lng: 73.7125 },
    'amritsar': { lat: 31.6340, lng: 74.8723 },
    'chandigarh': { lat: 30.7333, lng: 76.7794 },
    'guwahati': { lat: 26.1445, lng: 91.7362 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
};

function getCoords(city: string) {
    const key = city.toLowerCase().trim();
    // Default to a central India coordinate if totally unknown (Nagpurish)
    return CITY_COORDS[key] || { lat: 21.1458, lng: 79.0882 };
}

// Earth's radius in kilometers
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

/**
 * Generates highly realistic algorithmic flights using geographic distancing.
 */
export function generateHeuristicFlights(source: string, destination: string, dateStr: string): Flight[] {
    const c1 = getCoords(source);
    const c2 = getCoords(destination);
    
    // Fallback multiplier for the hackathon
    const distanceKm = calculateHaversineDistance(c1.lat, c1.lng, c2.lat, c2.lng);
    
    // Base fare + Rs 4 per km (very close to real Indian low-cost carrier pricing)
    const basePrice = Math.floor(2500 + (distanceKm * 4));
    
    // Flight duration (Assume 600km/h average jet speed + 45 min takeoff/landing buffer)
    const flightDurationMins = Math.floor((distanceKm / 600) * 60) + 45;
    
    const airlines = [
        { name: "IndiGo", code: "6E", markup: 1.0, quality: 3.5 },
        { name: "Air India", code: "AI", markup: 1.2, quality: 4.0 },
        { name: "Vistara", code: "UK", markup: 1.4, quality: 4.5 },
        { name: "Akasa Air", code: "QP", markup: 0.9, quality: 3.8 }
    ];

    const flights: Flight[] = [];
    
    // Create 3 reasonable departures (Morning, Afternoon, Evening) for variance
    const startOffsets = [8, 14, 20]; // Hours
    
    airlines.forEach((airline, idx) => {
        // Pick a semi-random but stable set of 2 flights per airline
        for (let i = 0; i < 2; i++) {
            const timeOffset = startOffsets[(idx + i) % startOffsets.length];
            const departureTime = new Date(`${dateStr}T${String(timeOffset + i).padStart(2, '0')}:00:00+05:30`);
            const arrivalTime = new Date(departureTime.getTime() + flightDurationMins * 60000);
            
            // Add slight variance to pricing (-10% to +10%) based on index to look human
            const priceVariance = basePrice * (1 + ((idx * 0.05) - 0.1));
            
            flights.push({
                id: uuidv4(),
                source,
                destination,
                departureTime: departureTime.toISOString(),
                arrivalTime: arrivalTime.toISOString(),
                airline: airline.name,
                flightNo: `${airline.code}-${100 + (idx * i * 42) % 900}`,
                price: Math.floor(priceVariance * airline.markup),
                bookingLink: `https://mock-booking.com/flight/${uuidv4().substring(0,8)}`
            });
        }
    });

    return flights;
}

function mockAmenities(tier: 'budget' | 'luxury'): any {
    return {
        wifi: true,
        spa: tier === 'luxury',
        swimmingPool: tier === 'luxury',
        balcony: true,
        elevator: true,
        caretaker: true,
        restaurant: tier === 'luxury',
        kitchenAvailability: false,
        bar: tier === 'luxury',
        barbeque: false,
        cafe: true,
        parking: true,
        bonfire: false,
        roomService: true,
        alcoholAllowed: true,
        petsAllowed: false,
        smokingAllowed: false,
        unmarriedCouplesAllowed: true
    };
}

/**
 * Generates highly realistic hotel options for a locality, completely scaling with budget intent.
 */
export function generateHeuristicHotels(locality: string): Hotel[] {
    const locCenter = getCoords(locality);
    
    // Helper to jitter location slightly
    const getJitteredLocation = () => ({
        lat: locCenter.lat + (Math.random() - 0.5) * 0.05,
        lng: locCenter.lng + (Math.random() - 0.5) * 0.05
    });

    // Generate tier-distributed hotels seamlessly
    return [
        {
            id: uuidv4(),
            name: `Backpacker's Hostel ${locality}`,
            address: `Central Backpacker District, ${locality}`,
            location: getJitteredLocation(),
            starRating: 2,
            pricePerNight: Math.floor(800 + Math.random() * 400),
            propertyType: 'Hostel',
            amenities: mockAmenities('budget'),
            bookingLink: `https://mock-booking.com/hotel/${uuidv4().substring(0,8)}`
        },
        {
            id: uuidv4(),
            name: `Oyo Rooms ${locality} Central`,
            address: `Downtown Station Road, ${locality}`,
            location: getJitteredLocation(),
            starRating: 3,
            pricePerNight: Math.floor(1500 + Math.random() * 500),
            propertyType: 'Hotel',
            amenities: mockAmenities('budget'),
            bookingLink: `https://mock-booking.com/hotel/${uuidv4().substring(0,8)}`
        },
        {
            id: uuidv4(),
            name: `Hotel ${locality} Heritage`,
            address: `Old City Heritage Zone, ${locality}`,
            location: getJitteredLocation(),
            starRating: 4,
            pricePerNight: Math.floor(4000 + Math.random() * 1500),
            propertyType: 'Hotel',
            amenities: mockAmenities('budget'),
            bookingLink: `https://mock-booking.com/hotel/${uuidv4().substring(0,8)}`
        },
        {
            id: uuidv4(),
            name: `The ${locality} Retreat`,
            address: `Scenic Views Hilltop, ${locality}`,
            location: getJitteredLocation(),
            starRating: 4,
            pricePerNight: Math.floor(6500 + Math.random() * 2000),
            propertyType: 'Resort',
            amenities: mockAmenities('luxury'),
            bookingLink: `https://mock-booking.com/hotel/${uuidv4().substring(0,8)}`
        },
        {
            id: uuidv4(),
            name: `Taj Palace ${locality}`,
            address: `Luxury Avenue, ${locality}`,
            location: getJitteredLocation(),
            starRating: 5,
            pricePerNight: Math.floor(15000 + Math.random() * 5000),
            propertyType: 'Hotel',
            amenities: mockAmenities('luxury'),
            bookingLink: `https://mock-booking.com/hotel/${uuidv4().substring(0,8)}`
        },
        {
            id: uuidv4(),
            name: `${locality} Royal Resort & Spa`,
            address: `Exclusive Private Estate, ${locality}`,
            location: getJitteredLocation(),
            starRating: 5,
            pricePerNight: Math.floor(22000 + Math.random() * 8000),
            propertyType: 'Resort',
            amenities: mockAmenities('luxury'),
            bookingLink: `https://mock-booking.com/hotel/${uuidv4().substring(0,8)}`
        }
    ];
}
