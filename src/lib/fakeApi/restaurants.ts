// ============================================================
// Safar AI — Fake Restaurants API
// ============================================================
import { Restaurant, LatLng } from '../types';
import { v4 as uuidv4 } from 'uuid';

const RESTAURANTS_DATA: Record<string, Partial<Restaurant>[]> = {
    'Manali': [
        { name: 'Johnson\'s Cafe', cuisine: 'Continental', avgCostForTwo: 1200, rating: 4.5, location: { lat: 32.2445, lng: 77.1870 }, mealType: 'any' },
        { name: 'Drifters\' Inn & Cafe', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 4.3, location: { lat: 32.2560, lng: 77.1890 }, mealType: 'any' },
        { name: 'Lazy Dog Lounge', cuisine: 'Italian', avgCostForTwo: 1000, rating: 4.4, location: { lat: 32.2555, lng: 77.1895 }, mealType: 'lunch' },
        { name: 'Chopsticks Restaurant', cuisine: 'Chinese', avgCostForTwo: 700, rating: 4.1, location: { lat: 32.2410, lng: 77.1880 }, mealType: 'dinner' },
        { name: 'Renaissance', cuisine: 'Italian', avgCostForTwo: 900, rating: 4.2, location: { lat: 32.2400, lng: 77.1875 }, mealType: 'any' },
        { name: 'Il Forno', cuisine: 'Italian', avgCostForTwo: 1100, rating: 4.4, location: { lat: 32.2520, lng: 77.1860 }, mealType: 'dinner' },
    ],
    'Delhi': [
        { name: 'Karim\'s', cuisine: 'Mughlai', avgCostForTwo: 800, rating: 4.6, location: { lat: 28.6506, lng: 77.2335 }, mealType: 'any' },
        { name: 'Indian Accent', cuisine: 'Modern Indian', avgCostForTwo: 5000, rating: 4.8, location: { lat: 28.5930, lng: 77.1730 }, mealType: 'dinner' },
        { name: 'Bukhara', cuisine: 'North Indian', avgCostForTwo: 6000, rating: 4.7, location: { lat: 28.5970, lng: 77.1730 }, mealType: 'dinner' },
        { name: 'Paranthe Wali Gali', cuisine: 'Street Food', avgCostForTwo: 300, rating: 4.3, location: { lat: 28.6540, lng: 77.2290 }, mealType: 'breakfast' },
        { name: 'SodaBottleOpenerWala', cuisine: 'Parsi', avgCostForTwo: 1200, rating: 4.2, location: { lat: 28.5750, lng: 77.2070 }, mealType: 'lunch' },
        { name: 'Saravana Bhavan', cuisine: 'South Indian', avgCostForTwo: 500, rating: 4.3, location: { lat: 28.6310, lng: 77.2180 }, mealType: 'any' },
    ],
    'Jaipur': [
        { name: '1135 AD', cuisine: 'Rajasthani', avgCostForTwo: 3500, rating: 4.7, location: { lat: 26.9855, lng: 75.8513 }, mealType: 'dinner' },
        { name: 'Laxmi Mishthan Bhandar', cuisine: 'Rajasthani', avgCostForTwo: 400, rating: 4.5, location: { lat: 26.9200, lng: 75.8230 }, mealType: 'any' },
        { name: 'Tapri Central', cuisine: 'Cafe', avgCostForTwo: 600, rating: 4.3, location: { lat: 26.9100, lng: 75.7900 }, mealType: 'any' },
        { name: 'Suvarna Mahal', cuisine: 'Indian', avgCostForTwo: 4000, rating: 4.6, location: { lat: 26.8957, lng: 75.8056 }, mealType: 'dinner' },
        { name: 'Rawat Mishthan Bhandar', cuisine: 'Sweets', avgCostForTwo: 300, rating: 4.4, location: { lat: 26.9150, lng: 75.8150 }, mealType: 'breakfast' },
        { name: 'Handi Restaurant', cuisine: 'Mughlai', avgCostForTwo: 700, rating: 4.2, location: { lat: 26.9220, lng: 75.7980 }, mealType: 'any' },
    ],
    'Goa': [
        { name: 'Gunpowder', cuisine: 'South Indian', avgCostForTwo: 1200, rating: 4.5, location: { lat: 15.4970, lng: 73.9120 }, mealType: 'lunch' },
        { name: 'Fisherman\'s Wharf', cuisine: 'Goan', avgCostForTwo: 1500, rating: 4.3, location: { lat: 15.4560, lng: 73.8020 }, mealType: 'dinner' },
        { name: 'Britto\'s', cuisine: 'Goan', avgCostForTwo: 1000, rating: 4.1, location: { lat: 15.5550, lng: 73.7530 }, mealType: 'any' },
        { name: 'Thalassa', cuisine: 'Greek', avgCostForTwo: 2000, rating: 4.5, location: { lat: 15.6057, lng: 73.7328 }, mealType: 'dinner' },
        { name: 'Vinayak Family Restaurant', cuisine: 'Goan', avgCostForTwo: 500, rating: 4.4, location: { lat: 15.4010, lng: 73.8790 }, mealType: 'any' },
        { name: 'Curlies Beach Shack', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 4.0, location: { lat: 15.5730, lng: 73.7420 }, mealType: 'any' },
        { name: 'Artjuna Cafe', cuisine: 'Mediterranean', avgCostForTwo: 1000, rating: 4.5, location: { lat: 15.5800, lng: 73.7400 }, mealType: 'any' },
        { name: 'Baba Au Rhum', cuisine: 'French', avgCostForTwo: 1200, rating: 4.4, location: { lat: 15.5850, lng: 73.7500 }, mealType: 'any' },
    ],
    'Mumbai': [
        { name: 'Leopold Cafe', cuisine: 'Multi-Cuisine', avgCostForTwo: 1200, rating: 4.2, location: { lat: 18.9229, lng: 72.8315 }, mealType: 'any' },
        { name: 'Trishna', cuisine: 'Seafood', avgCostForTwo: 2500, rating: 4.6, location: { lat: 18.9330, lng: 72.8320 }, mealType: 'dinner' },
        { name: 'Bademiya', cuisine: 'Mughlai', avgCostForTwo: 500, rating: 4.3, location: { lat: 18.9240, lng: 72.8330 }, mealType: 'dinner' },
        { name: 'Cafe Madras', cuisine: 'South Indian', avgCostForTwo: 600, rating: 4.4, location: { lat: 18.9750, lng: 72.8420 }, mealType: 'breakfast' },
        { name: 'Britannia & Co', cuisine: 'Parsi', avgCostForTwo: 800, rating: 4.5, location: { lat: 18.9340, lng: 72.8350 }, mealType: 'lunch' },
        { name: 'The Table', cuisine: 'European', avgCostForTwo: 3000, rating: 4.5, location: { lat: 18.9220, lng: 72.8310 }, mealType: 'dinner' },
    ],
    'Kochi': [
        { name: 'Rice Boat', cuisine: 'Seafood', avgCostForTwo: 3000, rating: 4.7, location: { lat: 9.9658, lng: 76.2421 }, mealType: 'dinner' },
        { name: 'Kashi Art Cafe', cuisine: 'Cafe', avgCostForTwo: 700, rating: 4.2, location: { lat: 9.9680, lng: 76.2410 }, mealType: 'any' },
        { name: 'Loafers Corner Cafe', cuisine: 'Cafe', avgCostForTwo: 300, rating: 4.3, location: { lat: 9.9690, lng: 76.2420 }, mealType: 'any' },
    ],
    'Munnar': [
        { name: 'Saravana Bhavan Munnar', cuisine: 'South Indian', avgCostForTwo: 400, rating: 4.2, location: { lat: 10.0880, lng: 77.0590 }, mealType: 'any' },
        { name: 'Rapsy Restaurant', cuisine: 'Multi-Cuisine', avgCostForTwo: 600, rating: 4.3, location: { lat: 10.0895, lng: 77.0605 }, mealType: 'lunch' },
        { name: 'Tea Tales Cafe', cuisine: 'Cafe', avgCostForTwo: 300, rating: 4.3, location: { lat: 10.0890, lng: 77.0600 }, mealType: 'any' },
    ],
    'Thekkady': [
        { name: 'Our Place', cuisine: 'European', avgCostForTwo: 1200, rating: 4.6, location: { lat: 9.6080, lng: 77.1620 }, mealType: 'dinner' },
        { name: 'Spice Garden', cuisine: 'Local', avgCostForTwo: 600, rating: 4.1, location: { lat: 9.6040, lng: 77.1680 }, mealType: 'any' },
    ],
    'Alleppey': [
        { name: 'Thaff Delicacy', cuisine: 'Biryani/North Indian', avgCostForTwo: 700, rating: 4.1, location: { lat: 9.4930, lng: 76.3200 }, mealType: 'any' },
        { name: 'Halais Restaurant', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 4.0, location: { lat: 9.5000, lng: 76.3300 }, mealType: 'dinner' },
        { name: 'Cafe Cloud 9', cuisine: 'Restaurant', avgCostForTwo: 300, rating: 4.6, location: { lat: 9.6000, lng: 76.2900 }, mealType: 'any' },
    ],
    'Varkala': [
        { name: 'Darjeeling Cafe Varkala', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 3.6, location: { lat: 8.7390, lng: 76.7110 }, mealType: 'any' },
        { name: 'God\'s Own Country Kitchen', cuisine: 'Seafood', avgCostForTwo: 1000, rating: 3.9, location: { lat: 8.7380, lng: 76.7115 }, mealType: 'dinner' },
        { name: 'Abba Restaurant', cuisine: 'Multi-Cuisine', avgCostForTwo: 1200, rating: 4.2, location: { lat: 8.7370, lng: 76.7120 }, mealType: 'any' },
    ],
};

function generateRestaurant(locality: string, index: number, center: LatLng): Restaurant {
    const cuisines = ['North Indian', 'South Indian', 'Chinese', 'Continental', 'Italian', 'Street Food', 'Multi-Cuisine', 'Local'];
    const mealTypes: Restaurant['mealType'][] = ['breakfast', 'lunch', 'dinner', 'any'];

    return {
        id: uuidv4(),
        name: `${locality} Restaurant ${index + 1}`,
        address: `${locality} Food Street`,
        location: {
            lat: center.lat + (Math.random() - 0.5) * 0.05,
            lng: center.lng + (Math.random() - 0.5) * 0.05,
        },
        cuisine: cuisines[Math.floor(Math.random() * cuisines.length)],
        avgCostForTwo: 300 + Math.floor(Math.random() * 2000),
        rating: 3 + Math.random() * 2,
        openingTime: '08:00',
        closingTime: '23:00',
        mealType: mealTypes[Math.floor(Math.random() * mealTypes.length)],
    };
}

export function getRestaurants(locality: string): Restaurant[] {
    const normalizedLocality = Object.keys(RESTAURANTS_DATA).find(
        k => k.toLowerCase() === locality.toLowerCase()
    );

    if (normalizedLocality && RESTAURANTS_DATA[normalizedLocality]) {
        return RESTAURANTS_DATA[normalizedLocality].map(partial => ({
            id: uuidv4(),
            name: partial.name || `Restaurant in ${locality}`,
            address: `${locality} Area`,
            location: partial.location || { lat: 20.5937, lng: 78.9629 },
            cuisine: partial.cuisine || 'Multi-Cuisine',
            avgCostForTwo: partial.avgCostForTwo || 800,
            rating: partial.rating || 4.0,
            openingTime: '08:00',
            closingTime: '23:00',
            mealType: partial.mealType || 'any',
        })) as Restaurant[];
    }

    const center: LatLng = { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 };
    return Array.from({ length: 6 }, (_, i) => generateRestaurant(locality, i, center));
}
