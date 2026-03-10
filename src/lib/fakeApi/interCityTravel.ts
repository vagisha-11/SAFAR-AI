// ============================================================
// Safar AI — Fake Inter-City Travel API
// ============================================================
import { v4 as uuidv4 } from 'uuid';

export interface InterCityOption {
    id: string;
    source: string;
    destination: string;
    type: 'bus' | 'shared_taxi' | 'cab';
    modeName: string; // e.g., "KSRTC Airavat", "Uber Intercity"
    price: number;
    duration: number; // minutes
    departureTimes: string[]; // HH:MM
}

const INTER_CITY_DATA: Record<string, Partial<InterCityOption>[]> = {
    'Kochi-Munnar': [
        { type: 'bus', modeName: 'KSRTC Super Deluxe', price: 250, duration: 240, departureTimes: ['06:00', '08:30', '14:00'] },
        { type: 'shared_taxi', modeName: 'Regional Shared Jeep', price: 600, duration: 210, departureTimes: ['07:00', '10:00'] },
        { type: 'cab', modeName: 'Uber Intercity / Private Cab', price: 3500, duration: 180, departureTimes: ['Anytime'] },
    ],
    'Munnar-Alleppey': [
        { type: 'bus', modeName: 'KSRTC Fast Passenger', price: 200, duration: 300, departureTimes: ['07:30', '11:00'] },
        { type: 'shared_taxi', modeName: 'Shared Traveller', price: 500, duration: 260, departureTimes: ['08:00', '12:00'] },
        { type: 'cab', modeName: 'Private Cab', price: 4000, duration: 240, departureTimes: ['Anytime'] },
    ],
    'Delhi-Agra': [
        { type: 'bus', modeName: 'UPSRTC Volvo AC', price: 800, duration: 210, departureTimes: ['06:00', '08:00', '17:00'] },
        { type: 'cab', modeName: 'Ola Intercity', price: 4500, duration: 180, departureTimes: ['Anytime'] },
    ],
    'Agra-Jaipur': [
        { type: 'bus', modeName: 'RSRTC Gold Line', price: 700, duration: 300, departureTimes: ['07:00', '15:00'] },
        { type: 'cab', modeName: 'Private Sedan', price: 5000, duration: 240, departureTimes: ['Anytime'] },
    ],
    'Jaipur-Udaipur': [
        { type: 'bus', modeName: 'RSRTC Sleeper AC', price: 1200, duration: 420, departureTimes: ['21:00', '22:30'] },
        { type: 'cab', modeName: 'Private Cab', price: 8000, duration: 360, departureTimes: ['Anytime'] },
    ],
};

export function getInterCityTravel(source: string, destination: string): InterCityOption[] {
    const key = `${source}-${destination}`;
    const options = INTER_CITY_DATA[key];

    if (!options) {
        // Generate fallback for any city pair
        return [
            {
                id: uuidv4(),
                source,
                destination,
                type: 'bus',
                modeName: 'Inter-City Bus Service',
                price: 500,
                duration: 300,
                departureTimes: ['08:00', '10:00', '16:00'],
            },
            {
                id: uuidv4(),
                source,
                destination,
                type: 'cab',
                modeName: 'Private Cab',
                price: 3000,
                duration: 240,
                departureTimes: ['Anytime'],
            }
        ] as InterCityOption[];
    }

    return options.map(opt => ({
        id: uuidv4(),
        source,
        destination,
        ...opt
    })) as InterCityOption[];
}
