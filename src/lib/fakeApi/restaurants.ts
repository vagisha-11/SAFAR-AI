// ============================================================
// Safar AI — Fake Restaurants API
// ============================================================
import { Restaurant, LatLng } from '../types';
import { v4 as uuidv4 } from 'uuid';

const RESTAURANTS_DATA: Record<string, Partial<Restaurant>[]> = {
    'Manali': [
        { name: 'Johnson\'s Cafe', cuisine: 'Continental', avgCostForTwo: 1200, rating: 4.5, location: { lat: 32.2445, lng: 77.1870 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Drifters\' Inn & Cafe', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 4.3, location: { lat: 32.2560, lng: 77.1890 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Lazy Dog Lounge', cuisine: 'Italian', avgCostForTwo: 1000, rating: 4.4, location: { lat: 32.2555, lng: 77.1895 }, mealType: 'lunch', isPureVeg: false, hasJainFood: false },
        { name: 'Chopsticks Restaurant', cuisine: 'Chinese', avgCostForTwo: 700, rating: 4.1, location: { lat: 32.2410, lng: 77.1880 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Renaissance', cuisine: 'Italian', avgCostForTwo: 900, rating: 4.2, location: { lat: 32.2400, lng: 77.1875 }, mealType: 'any', isPureVeg: true, hasJainFood: true },
        { name: 'Il Forno', cuisine: 'Italian', avgCostForTwo: 1100, rating: 4.4, location: { lat: 32.2520, lng: 77.1860 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
    ],
    'Delhi': [
        { name: 'Karim\'s', cuisine: 'Mughlai', avgCostForTwo: 800, rating: 4.6, location: { lat: 28.6506, lng: 77.2335 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Indian Accent', cuisine: 'Modern Indian', avgCostForTwo: 5000, rating: 4.8, location: { lat: 28.5930, lng: 77.1730 }, mealType: 'dinner', isPureVeg: false, hasJainFood: true },
        { name: 'Bukhara', cuisine: 'North Indian', avgCostForTwo: 6000, rating: 4.7, location: { lat: 28.5970, lng: 77.1730 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Paranthe Wali Gali', cuisine: 'Street Food', avgCostForTwo: 300, rating: 4.3, location: { lat: 28.6540, lng: 77.2290 }, mealType: 'breakfast', isPureVeg: true, hasJainFood: false },
        { name: 'SodaBottleOpenerWala', cuisine: 'Parsi', avgCostForTwo: 1200, rating: 4.2, location: { lat: 28.5750, lng: 77.2070 }, mealType: 'lunch', isPureVeg: false, hasJainFood: false },
        { name: 'Saravana Bhavan', cuisine: 'South Indian', avgCostForTwo: 500, rating: 4.3, location: { lat: 28.6310, lng: 77.2180 }, mealType: 'any', isPureVeg: true, hasJainFood: true },
    ],
    'Jaipur': [
        { name: '1135 AD', cuisine: 'Rajasthani', avgCostForTwo: 3500, rating: 4.7, location: { lat: 26.9855, lng: 75.8513 }, mealType: 'dinner', isPureVeg: false, hasJainFood: true },
        { name: 'Laxmi Mishthan Bhandar', cuisine: 'Rajasthani', avgCostForTwo: 400, rating: 4.5, location: { lat: 26.9200, lng: 75.8230 }, mealType: 'any', isPureVeg: true, hasJainFood: true },
        { name: 'Tapri Central', cuisine: 'Cafe', avgCostForTwo: 600, rating: 4.3, location: { lat: 26.9100, lng: 75.7900 }, mealType: 'any', isPureVeg: true, hasJainFood: true },
        { name: 'Suvarna Mahal', cuisine: 'Indian', avgCostForTwo: 4000, rating: 4.6, location: { lat: 26.8957, lng: 75.8056 }, mealType: 'dinner', isPureVeg: false, hasJainFood: true },
        { name: 'Rawat Mishthan Bhandar', cuisine: 'Sweets', avgCostForTwo: 300, rating: 4.4, location: { lat: 26.9150, lng: 75.8150 }, mealType: 'breakfast', isPureVeg: true, hasJainFood: false },
        { name: 'Handi Restaurant', cuisine: 'Mughlai', avgCostForTwo: 700, rating: 4.2, location: { lat: 26.9220, lng: 75.7980 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
    ],
    'Goa': [
        { name: 'Gunpowder', cuisine: 'South Indian', avgCostForTwo: 1200, rating: 4.5, location: { lat: 15.4970, lng: 73.9120 }, mealType: 'lunch', isPureVeg: false, hasJainFood: true },
        { name: 'Fisherman\'s Wharf', cuisine: 'Goan', avgCostForTwo: 1500, rating: 4.3, location: { lat: 15.4560, lng: 73.8020 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Britto\'s', cuisine: 'Goan', avgCostForTwo: 1000, rating: 4.1, location: { lat: 15.5550, lng: 73.7530 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Thalassa', cuisine: 'Greek', avgCostForTwo: 2000, rating: 4.5, location: { lat: 15.6057, lng: 73.7328 }, mealType: 'dinner', isPureVeg: false, hasJainFood: true },
        { name: 'Vinayak Family Restaurant', cuisine: 'Goan', avgCostForTwo: 500, rating: 4.4, location: { lat: 15.4010, lng: 73.8790 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Curlies Beach Shack', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 4.0, location: { lat: 15.5730, lng: 73.7420 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Artjuna Cafe', cuisine: 'Mediterranean', avgCostForTwo: 1000, rating: 4.5, location: { lat: 15.5800, lng: 73.7400 }, mealType: 'any', isPureVeg: false, hasJainFood: true },
        { name: 'Baba Au Rhum', cuisine: 'French', avgCostForTwo: 1200, rating: 4.4, location: { lat: 15.5850, lng: 73.7500 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
    ],
    'Mumbai': [
        { name: 'Leopold Cafe', cuisine: 'Multi-Cuisine', avgCostForTwo: 1200, rating: 4.2, location: { lat: 18.9229, lng: 72.8315 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Trishna', cuisine: 'Seafood', avgCostForTwo: 2500, rating: 4.6, location: { lat: 18.9330, lng: 72.8320 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Bademiya', cuisine: 'Mughlai', avgCostForTwo: 500, rating: 4.3, location: { lat: 18.9240, lng: 72.8330 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Cafe Madras', cuisine: 'South Indian', avgCostForTwo: 600, rating: 4.4, location: { lat: 18.9750, lng: 72.8420 }, mealType: 'breakfast', isPureVeg: true, hasJainFood: true },
        { name: 'Britannia & Co', cuisine: 'Parsi', avgCostForTwo: 800, rating: 4.5, location: { lat: 18.9340, lng: 72.8350 }, mealType: 'lunch', isPureVeg: false, hasJainFood: false },
        { name: 'The Table', cuisine: 'European', avgCostForTwo: 3000, rating: 4.5, location: { lat: 18.9220, lng: 72.8310 }, mealType: 'dinner', isPureVeg: false, hasJainFood: true },
    ],
    'Kochi': [
        { name: 'Rice Boat', cuisine: 'Seafood', avgCostForTwo: 3000, rating: 4.7, location: { lat: 9.9658, lng: 76.2421 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Kashi Art Cafe', cuisine: 'Cafe', avgCostForTwo: 700, rating: 4.2, location: { lat: 9.9680, lng: 76.2410 }, mealType: 'any', isPureVeg: false, hasJainFood: true },
        { name: 'Loafers Corner Cafe', cuisine: 'Cafe', avgCostForTwo: 300, rating: 4.3, location: { lat: 9.9690, lng: 76.2420 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
    ],
    'Munnar': [
        { name: 'Saravana Bhavan Munnar', cuisine: 'South Indian', avgCostForTwo: 400, rating: 4.2, location: { lat: 10.0880, lng: 77.0590 }, mealType: 'any', isPureVeg: true, hasJainFood: true },
        { name: 'Rapsy Restaurant', cuisine: 'Multi-Cuisine', avgCostForTwo: 600, rating: 4.3, location: { lat: 10.0895, lng: 77.0605 }, mealType: 'lunch', isPureVeg: false, hasJainFood: false },
        { name: 'Tea Tales Cafe', cuisine: 'Cafe', avgCostForTwo: 300, rating: 4.3, location: { lat: 10.0890, lng: 77.0600 }, mealType: 'any', isPureVeg: false, hasJainFood: true },
    ],
    'Thekkady': [
        { name: 'Our Place', cuisine: 'European', avgCostForTwo: 1200, rating: 4.6, location: { lat: 9.6080, lng: 77.1620 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Spice Garden', cuisine: 'Local', avgCostForTwo: 600, rating: 4.1, location: { lat: 9.6040, lng: 77.1680 }, mealType: 'any', isPureVeg: false, hasJainFood: true },
    ],
    'Alleppey': [
        { name: 'Thaff Delicacy', cuisine: 'Biryani/North Indian', avgCostForTwo: 700, rating: 4.1, location: { lat: 9.4930, lng: 76.3200 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
        { name: 'Halais Restaurant', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 4.0, location: { lat: 9.5000, lng: 76.3300 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Cafe Cloud 9', cuisine: 'Restaurant', avgCostForTwo: 300, rating: 4.6, location: { lat: 9.6000, lng: 76.2900 }, mealType: 'any', isPureVeg: false, hasJainFood: true },
    ],
    'Varkala': [
        { name: 'Darjeeling Cafe Varkala', cuisine: 'Multi-Cuisine', avgCostForTwo: 800, rating: 3.6, location: { lat: 8.7390, lng: 76.7110 }, mealType: 'any', isPureVeg: false, hasJainFood: true },
        { name: 'God\'s Own Country Kitchen', cuisine: 'Seafood', avgCostForTwo: 1000, rating: 3.9, location: { lat: 8.7380, lng: 76.7115 }, mealType: 'dinner', isPureVeg: false, hasJainFood: false },
        { name: 'Abba Restaurant', cuisine: 'Multi-Cuisine', avgCostForTwo: 1200, rating: 4.2, location: { lat: 8.7370, lng: 76.7120 }, mealType: 'any', isPureVeg: false, hasJainFood: false },
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
        isPureVeg: false,
        hasJainFood: false,
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
            isPureVeg: partial.isPureVeg ?? false,
            hasJainFood: partial.hasJainFood ?? false,
        })) as Restaurant[];
    }

    const center: LatLng = { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 };
    return Array.from({ length: 6 }, (_, i) => generateRestaurant(locality, i, center));
}
