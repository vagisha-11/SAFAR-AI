// ============================================================
// Safar AI — Fake Flights API
// ============================================================
import { Flight } from '../types';
import { v4 as uuidv4 } from 'uuid';

const AIRLINES = ['IndiGo', 'Air India', 'SpiceJet', 'Vistara', 'Go First', 'AirAsia India', 'Akasa Air'];

const ROUTES: Record<string, { lat: number; lng: number }> = {
    'Delhi': { lat: 28.5562, lng: 77.1000 },
    'Mumbai': { lat: 19.0896, lng: 72.8656 },
    'Bangalore': { lat: 13.1986, lng: 77.7066 },
    'Chennai': { lat: 12.9941, lng: 80.1709 },
    'Kolkata': { lat: 22.6520, lng: 88.4463 },
    'Hyderabad': { lat: 17.2403, lng: 78.4294 },
    'Goa': { lat: 15.3809, lng: 73.8314 },
    'Jaipur': { lat: 26.8242, lng: 75.8122 },
    'Lucknow': { lat: 26.7606, lng: 80.8893 },
    'Varanasi': { lat: 25.4520, lng: 82.8593 },
    'Cochin': { lat: 10.1520, lng: 76.4019 },
    'Udaipur': { lat: 24.6170, lng: 73.7960 },
    'Shimla': { lat: 31.0810, lng: 77.0690 },
    'Srinagar': { lat: 33.9871, lng: 74.7742 },
    'Leh': { lat: 34.1358, lng: 77.5771 },
    'Amritsar': { lat: 31.7097, lng: 74.7974 },
    'Ahmedabad': { lat: 23.0772, lng: 72.6347 },
    'Pune': { lat: 18.5822, lng: 73.9197 },
};

function generateFlightNo(): string {
    const prefix = ['6E', 'AI', 'SG', 'UK', 'G8', 'I5', 'QP'];
    return `${prefix[Math.floor(Math.random() * prefix.length)]} ${Math.floor(Math.random() * 9000) + 1000}`;
}

export function getFlights(source: string, destination: string, date: string): Flight[] {
    const srcNorm = Object.keys(ROUTES).find(k => k.toLowerCase() === source.toLowerCase());
    const dstNorm = Object.keys(ROUTES).find(k => k.toLowerCase() === destination.toLowerCase());

    if (!srcNorm || !dstNorm || srcNorm === dstNorm) return [];

    const numFlights = Math.floor(Math.random() * 4) + 3; // 3-6 flights
    const flights: Flight[] = [];

    for (let i = 0; i < numFlights; i++) {
        const depHour = Math.floor(Math.random() * 18) + 5; // 5 AM to 11 PM
        const duration = 1 + Math.floor(Math.random() * 3); // 1-3 hours
        const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
        const basePrice = 2500 + Math.floor(Math.random() * 8000);

        const depTime = new Date(`${date}T${String(depHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`);
        const arrTime = new Date(depTime.getTime() + duration * 60 * 60 * 1000);

        flights.push({
            id: uuidv4(),
            source: srcNorm,
            destination: dstNorm,
            flightNo: generateFlightNo(),
            airline,
            price: basePrice,
            departureTime: depTime.toISOString(),
            arrivalTime: arrTime.toISOString(),
            bookingLink: `https://www.makemytrip.com/flights/${srcNorm.toLowerCase()}-${dstNorm.toLowerCase()}`,
        });
    }

    return flights.sort((a, b) => a.price - b.price);
}
