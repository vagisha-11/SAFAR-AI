// ============================================================
// Safar AI — Locality Splitter API (Primitive Fetcher via LLM)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

// City centers for known localities
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
    'Delhi': { lat: 28.6139, lng: 77.2090 },
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Jaipur': { lat: 26.9124, lng: 75.7873 },
    'Goa': { lat: 15.4909, lng: 73.8278 },
    'Manali': { lat: 32.2396, lng: 77.1887 },
    'Shimla': { lat: 31.1048, lng: 77.1734 },
    'Udaipur': { lat: 24.5854, lng: 73.7125 },
    'Varanasi': { lat: 25.3176, lng: 83.0100 },
    'Kerala': { lat: 9.9312, lng: 76.2673 },
    'Agra': { lat: 27.1767, lng: 78.0081 },
    'Bangalore': { lat: 12.9716, lng: 77.5946 },
    'Chennai': { lat: 13.0827, lng: 80.2707 },
    'Kolkata': { lat: 22.5726, lng: 88.3639 },
    'Hyderabad': { lat: 17.3850, lng: 78.4867 },
    'Amritsar': { lat: 31.6340, lng: 74.8723 },
    'Rishikesh': { lat: 30.0869, lng: 78.2676 },
    'Darjeeling': { lat: 27.0360, lng: 88.2627 },
    'Leh': { lat: 34.1526, lng: 77.5771 },
    'Srinagar': { lat: 34.0837, lng: 74.7973 },
    'Jodhpur': { lat: 26.2389, lng: 73.0243 },
    'Mysore': { lat: 12.2958, lng: 76.6394 },
    'Ooty': { lat: 11.4102, lng: 76.6950 },
    'Munnar': { lat: 10.0889, lng: 77.0595 },
    'Pondicherry': { lat: 11.9416, lng: 79.8083 },
    'Pushkar': { lat: 26.4899, lng: 74.5542 },
    'Jaisalmer': { lat: 26.9157, lng: 70.9083 },
};

// Mock LLM response for locality splitting
function mockLocalitySplit(destination: string, totalDays: number): { locality: string; days: number; isTransitDay: boolean; center: { lat: number; lng: number } }[] {
    const dest = destination.toLowerCase();

    // Default: some well-known multi-city trips
    const KNOWN_TRIPS: Record<string, { locality: string; days: number; isTransitDay: boolean }[]> = {
        'rajasthan': [
            { locality: 'Jaipur', days: 2, isTransitDay: false },
            { locality: 'Jaipur to Udaipur', days: 1, isTransitDay: true },
            { locality: 'Udaipur', days: 2, isTransitDay: false },
            { locality: 'Udaipur to Jodhpur', days: 1, isTransitDay: true },
            { locality: 'Jodhpur', days: 1, isTransitDay: false },
        ],
        'himachal': [
            { locality: 'Shimla', days: 2, isTransitDay: false },
            { locality: 'Shimla to Manali', days: 1, isTransitDay: true },
            { locality: 'Manali', days: 3, isTransitDay: false },
        ],
        'golden triangle': [
            { locality: 'Delhi', days: 2, isTransitDay: false },
            { locality: 'Delhi to Agra', days: 1, isTransitDay: true },
            { locality: 'Agra', days: 1, isTransitDay: false },
            { locality: 'Agra to Jaipur', days: 1, isTransitDay: true },
            { locality: 'Jaipur', days: 2, isTransitDay: false },
        ],
        'kerala': [
            { locality: 'Kerala', days: Math.min(totalDays, 5), isTransitDay: false },
        ],
    };

    // Check known trips
    for (const [key, split] of Object.entries(KNOWN_TRIPS)) {
        if (dest.includes(key)) {
            return split.map(s => ({
                ...s,
                center: CITY_CENTERS[s.locality.split(' to ')[0]] || CITY_CENTERS[s.locality] || { lat: 20.5937, lng: 78.9629 },
            }));
        }
    }

    // Single destination
    const centerKey = Object.keys(CITY_CENTERS).find(k => dest.includes(k.toLowerCase()));
    const center = centerKey ? CITY_CENTERS[centerKey] : { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 };
    const localityName = centerKey || destination;

    return [{ locality: localityName, days: totalDays, isTransitDay: false, center }];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { destination, source, departureDate, returnDate } = body;

        const dep = new Date(departureDate);
        const ret = new Date(returnDate);
        const totalDays = Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));

        // Use mock for MVP (replace with Azure OpenAI call later)
        const split = mockLocalitySplit(destination, totalDays);

        // Adjust days to fit total
        let assignedDays = split.reduce((sum, s) => sum + s.days, 0);
        if (assignedDays > totalDays) {
            // Trim proportionally
            const ratio = totalDays / assignedDays;
            split.forEach(s => { s.days = Math.max(1, Math.round(s.days * ratio)); });
        } else if (assignedDays < totalDays) {
            // Add remaining days to the longest stay
            const nonTransit = split.filter(s => !s.isTransitDay);
            if (nonTransit.length > 0) {
                nonTransit[0].days += totalDays - assignedDays;
            }
        }

        return NextResponse.json({
            success: true,
            totalDays,
            source,
            destination,
            split,
        });
    } catch (error) {
        console.error('Locality splitter error:', error);
        return NextResponse.json({ success: false, error: 'Failed to split localities' }, { status: 500 });
    }
}
