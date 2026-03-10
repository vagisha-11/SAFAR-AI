// ============================================================
// Safar AI — Fake Trains API
// ============================================================
import { Train } from '../types';
import { v4 as uuidv4 } from 'uuid';

const TRAIN_NAMES = [
    'Rajdhani Express', 'Shatabdi Express', 'Duronto Express', 'Garib Rath',
    'Jan Shatabdi', 'Sampark Kranti', 'Humsafar Express', 'Tejas Express',
    'Vande Bharat Express', 'Superfast Express', 'Mail Express'
];

function generateTrainNo(): string {
    return String(Math.floor(Math.random() * 90000) + 10000);
}

export function getTrains(source: string, destination: string, date: string): Train[] {
    if (source.toLowerCase() === destination.toLowerCase()) return [];

    const numTrains = Math.floor(Math.random() * 4) + 2; // 2-5 trains
    const trains: Train[] = [];

    for (let i = 0; i < numTrains; i++) {
        const depHour = Math.floor(Math.random() * 24);
        const duration = 4 + Math.floor(Math.random() * 20); // 4-24 hours
        const trainName = TRAIN_NAMES[Math.floor(Math.random() * TRAIN_NAMES.length)];
        const basePrice = 400 + Math.floor(Math.random() * 3000); // ₹400-₹3400

        const depTime = new Date(`${date}T${String(depHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`);
        const arrTime = new Date(depTime.getTime() + duration * 60 * 60 * 1000);

        trains.push({
            id: uuidv4(),
            source,
            destination,
            trainNo: generateTrainNo(),
            trainName: `${source}-${destination} ${trainName}`,
            price: basePrice,
            departureTime: depTime.toISOString(),
            arrivalTime: arrTime.toISOString(),
            bookingLink: `https://www.irctc.co.in/`,
        });
    }

    return trains.sort((a, b) => a.price - b.price);
}
