// ============================================================
// Safar AI — Fake Hotel API
// ============================================================
import { Hotel, HotelAmenities, LatLng } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Pre-stored hotel data for major Indian localities
const HOTEL_DATA: Record<string, Partial<Hotel>[]> = {
    'Manali': [
        { name: 'The Himalayan Resort & Spa', starRating: 5, pricePerNight: 8500, propertyType: 'Resort', location: { lat: 32.2432, lng: 77.1892 } },
        { name: 'Snow Valley Resorts', starRating: 4, pricePerNight: 5500, propertyType: 'Resort', location: { lat: 32.2396, lng: 77.1886 } },
        { name: 'Hotel Mountain Trail', starRating: 3, pricePerNight: 2800, propertyType: 'Hotel', location: { lat: 32.2500, lng: 77.1776 } },
        { name: 'Manali Heights Cottage', starRating: 3, pricePerNight: 3200, propertyType: 'Cottage', location: { lat: 32.2550, lng: 77.1800 } },
        { name: 'The Orchard Homestay', starRating: 3, pricePerNight: 1800, propertyType: 'Homestay', location: { lat: 32.2480, lng: 77.1750 } },
        { name: 'Backpackers Hostel Manali', starRating: 2, pricePerNight: 800, propertyType: 'Hostel', location: { lat: 32.2420, lng: 77.1900 } },
        { name: 'Pine Forest Camp', starRating: 3, pricePerNight: 2200, propertyType: 'Camp', location: { lat: 32.2600, lng: 77.1850 } },
        { name: 'The Johnson Lodge & Spa', starRating: 4, pricePerNight: 6200, propertyType: 'Hotel', location: { lat: 32.2445, lng: 77.1870 } },
    ],
    'Delhi': [
        { name: 'The Imperial New Delhi', starRating: 5, pricePerNight: 18000, propertyType: 'Hotel', location: { lat: 28.6265, lng: 77.2186 } },
        { name: 'The Leela Palace', starRating: 5, pricePerNight: 22000, propertyType: 'Hotel', location: { lat: 28.5580, lng: 77.1890 } },
        { name: 'ITC Maurya', starRating: 5, pricePerNight: 15000, propertyType: 'Hotel', location: { lat: 28.5970, lng: 77.1730 } },
        { name: 'Hotel Palace Heights', starRating: 3, pricePerNight: 4500, propertyType: 'Hotel', location: { lat: 28.6320, lng: 77.2200 } },
        { name: 'Zostel Delhi', starRating: 2, pricePerNight: 700, propertyType: 'Hostel', location: { lat: 28.6440, lng: 77.2160 } },
        { name: 'The Oberoi', starRating: 5, pricePerNight: 20000, propertyType: 'Hotel', location: { lat: 28.5900, lng: 77.2300 } },
        { name: 'Bloomrooms @ Link Road', starRating: 3, pricePerNight: 3200, propertyType: 'Hotel', location: { lat: 28.6350, lng: 77.2150 } },
        { name: 'Haveli Dharampura', starRating: 4, pricePerNight: 7500, propertyType: 'Hotel', location: { lat: 28.6560, lng: 77.2300 } },
    ],
    'Jaipur': [
        { name: 'Rambagh Palace', starRating: 5, pricePerNight: 30000, propertyType: 'Hotel', location: { lat: 26.8957, lng: 75.8056 } },
        { name: 'Jai Mahal Palace', starRating: 5, pricePerNight: 12000, propertyType: 'Hotel', location: { lat: 26.9120, lng: 75.8020 } },
        { name: 'Samode Haveli', starRating: 4, pricePerNight: 8500, propertyType: 'Hotel', location: { lat: 26.9340, lng: 75.8120 } },
        { name: 'Hotel Pearl Palace', starRating: 3, pricePerNight: 2500, propertyType: 'Hotel', location: { lat: 26.9050, lng: 75.7940 } },
        { name: 'Zostel Jaipur', starRating: 2, pricePerNight: 600, propertyType: 'Hostel', location: { lat: 26.9200, lng: 75.7870 } },
        { name: 'The Raj Palace', starRating: 5, pricePerNight: 25000, propertyType: 'Hotel', location: { lat: 26.9180, lng: 75.8100 } },
        { name: 'Alsisar Haveli', starRating: 4, pricePerNight: 5500, propertyType: 'Hotel', location: { lat: 26.9276, lng: 75.8065 } },
        { name: 'Moustache Hostel Jaipur', starRating: 2, pricePerNight: 500, propertyType: 'Hostel', location: { lat: 26.9230, lng: 75.7950 } },
    ],
    'Goa': [
        { name: 'Taj Exotica Resort & Spa', starRating: 5, pricePerNight: 16000, propertyType: 'Resort', location: { lat: 15.3710, lng: 73.9420 } },
        { name: 'W Goa', starRating: 5, pricePerNight: 20000, propertyType: 'Resort', location: { lat: 15.4020, lng: 73.9450 } },
        { name: 'The Postcard Hotel', starRating: 4, pricePerNight: 9000, propertyType: 'Hotel', location: { lat: 15.5000, lng: 73.7760 } },
        { name: 'Palolem Beach Resort', starRating: 3, pricePerNight: 3500, propertyType: 'Resort', location: { lat: 15.0100, lng: 74.0230 } },
        { name: 'Backpacker Panda Goa', starRating: 2, pricePerNight: 500, propertyType: 'Hostel', location: { lat: 15.4970, lng: 73.7800 } },
        { name: 'Cabo Serai', starRating: 4, pricePerNight: 12000, propertyType: 'Villa', location: { lat: 15.0050, lng: 74.0200 } },
        { name: 'Mandrem Beach House', starRating: 3, pricePerNight: 4500, propertyType: 'Apartment', location: { lat: 15.6660, lng: 73.7100 } },
        { name: 'Wildflower Villas', starRating: 4, pricePerNight: 7500, propertyType: 'Villa', location: { lat: 15.4500, lng: 73.7600 } },
    ],
    'Mumbai': [
        { name: 'Taj Mahal Palace', starRating: 5, pricePerNight: 25000, propertyType: 'Hotel', location: { lat: 18.9217, lng: 72.8332 } },
        { name: 'The Oberoi Mumbai', starRating: 5, pricePerNight: 18000, propertyType: 'Hotel', location: { lat: 18.9280, lng: 72.8200 } },
        { name: 'Trident Nariman Point', starRating: 5, pricePerNight: 14000, propertyType: 'Hotel', location: { lat: 18.9250, lng: 72.8230 } },
        { name: 'Hotel Kemps Corner', starRating: 3, pricePerNight: 4000, propertyType: 'Hotel', location: { lat: 18.9600, lng: 72.8100 } },
        { name: 'Zostel Mumbai', starRating: 2, pricePerNight: 800, propertyType: 'Hostel', location: { lat: 19.0760, lng: 72.8777 } },
        { name: 'ITC Maratha', starRating: 5, pricePerNight: 12000, propertyType: 'Hotel', location: { lat: 19.0970, lng: 72.8740 } },
        { name: 'Abode Bombay', starRating: 3, pricePerNight: 5500, propertyType: 'Hotel', location: { lat: 18.9300, lng: 72.8350 } },
        { name: 'Sea Green Hotel', starRating: 3, pricePerNight: 3800, propertyType: 'Hotel', location: { lat: 18.9350, lng: 72.8250 } },
    ],
    'Udaipur': [
        { name: 'Taj Lake Palace', starRating: 5, pricePerNight: 40000, propertyType: 'Hotel', location: { lat: 24.5730, lng: 73.6780 } },
        { name: 'The Oberoi Udaivilas', starRating: 5, pricePerNight: 35000, propertyType: 'Resort', location: { lat: 24.5700, lng: 73.6850 } },
        { name: 'Fateh Prakash Palace', starRating: 4, pricePerNight: 8000, propertyType: 'Hotel', location: { lat: 24.5800, lng: 73.6800 } },
        { name: 'Hotel Lakend', starRating: 3, pricePerNight: 3500, propertyType: 'Hotel', location: { lat: 24.5750, lng: 73.6750 } },
        { name: 'Zostel Udaipur', starRating: 2, pricePerNight: 600, propertyType: 'Hostel', location: { lat: 24.5830, lng: 73.6820 } },
        { name: 'Amet Haveli', starRating: 4, pricePerNight: 6500, propertyType: 'Hotel', location: { lat: 24.5770, lng: 73.6790 } },
    ],
    'Shimla': [
        { name: 'Wildflower Hall', starRating: 5, pricePerNight: 18000, propertyType: 'Resort', location: { lat: 31.1048, lng: 77.1734 } },
        { name: 'The Oberoi Cecil', starRating: 5, pricePerNight: 14000, propertyType: 'Hotel', location: { lat: 31.1050, lng: 77.1700 } },
        { name: 'Hotel Combermere', starRating: 3, pricePerNight: 3500, propertyType: 'Hotel', location: { lat: 31.1040, lng: 77.1720 } },
        { name: 'The Woodville Palace', starRating: 4, pricePerNight: 5500, propertyType: 'Hotel', location: { lat: 31.1060, lng: 77.1680 } },
        { name: 'Zostel Shimla', starRating: 2, pricePerNight: 700, propertyType: 'Hostel', location: { lat: 31.1055, lng: 77.1740 } },
        { name: 'Spring Valley Resort', starRating: 3, pricePerNight: 2800, propertyType: 'Resort', location: { lat: 31.1100, lng: 77.1650 } },
    ],
    'Varanasi': [
        { name: 'Taj Nadesar Palace', starRating: 5, pricePerNight: 20000, propertyType: 'Hotel', location: { lat: 25.3176, lng: 83.0100 } },
        { name: 'BrijRama Palace', starRating: 5, pricePerNight: 15000, propertyType: 'Hotel', location: { lat: 25.3000, lng: 83.0120 } },
        { name: 'Hotel Surya', starRating: 3, pricePerNight: 3000, propertyType: 'Hotel', location: { lat: 25.3100, lng: 83.0050 } },
        { name: 'Zostel Varanasi', starRating: 2, pricePerNight: 500, propertyType: 'Hostel', location: { lat: 25.3050, lng: 83.0080 } },
        { name: 'Palace on Ganges', starRating: 4, pricePerNight: 6500, propertyType: 'Hotel', location: { lat: 25.3020, lng: 83.0130 } },
        { name: 'Ganges View Hotel', starRating: 3, pricePerNight: 2200, propertyType: 'Hotel', location: { lat: 25.3010, lng: 83.0100 } },
    ],
    'Kerala': [
        { name: 'Kumarakom Lake Resort', starRating: 5, pricePerNight: 18000, propertyType: 'Resort', location: { lat: 9.5950, lng: 76.4310 } },
        { name: 'Coconut Lagoon', starRating: 4, pricePerNight: 10000, propertyType: 'Resort', location: { lat: 9.5800, lng: 76.4200 } },
        { name: 'Marari Beach Resort', starRating: 4, pricePerNight: 8000, propertyType: 'Resort', location: { lat: 9.6000, lng: 76.3000 } },
        { name: 'Greenix Village', starRating: 3, pricePerNight: 3500, propertyType: 'Homestay', location: { lat: 9.9400, lng: 76.2600 } },
        { name: 'Alleppey Houseboat Deluxe', starRating: 4, pricePerNight: 7000, propertyType: 'Houseboat', location: { lat: 9.4900, lng: 76.3400 } },
        { name: 'Spice Village Thekkady', starRating: 4, pricePerNight: 9000, propertyType: 'Resort', location: { lat: 9.6050, lng: 77.1640 } },
        { name: 'Zostel Alleppey', starRating: 2, pricePerNight: 600, propertyType: 'Hostel', location: { lat: 9.4950, lng: 76.3380 } },
    ],
};

function randomAmenities(): HotelAmenities {
    return {
        wifi: Math.random() > 0.1,
        spa: Math.random() > 0.6,
        swimmingPool: Math.random() > 0.5,
        balcony: Math.random() > 0.3,
        elevator: Math.random() > 0.4,
        caretaker: Math.random() > 0.5,
        restaurant: Math.random() > 0.3,
        kitchenAvailability: Math.random() > 0.6,
        bar: Math.random() > 0.5,
        barbeque: Math.random() > 0.7,
        cafe: Math.random() > 0.4,
        parking: Math.random() > 0.3,
        bonfire: Math.random() > 0.7,
        roomService: Math.random() > 0.3,
        alcoholAllowed: Math.random() > 0.4,
        petsAllowed: Math.random() > 0.6,
        smokingAllowed: Math.random() > 0.5,
        unmarriedCouplesAllowed: Math.random() > 0.3,
    };
}

function generateRandomHotel(locality: string, center: LatLng): Hotel {
    const propertyTypes: Hotel['propertyType'][] = [
        'Hotel', 'Apartment', 'Villa', 'Resort', 'Homestay', 'Cottage', 'Hostel', 'Camp',
    ];
    const star = (Math.floor(Math.random() * 5) + 1) as Hotel['starRating'];
    const basePrices: Record<number, number> = { 1: 500, 2: 1000, 3: 3000, 4: 6000, 5: 12000 };
    const price = basePrices[star] + Math.floor(Math.random() * basePrices[star]);

    return {
        id: uuidv4(),
        name: `${locality} ${propertyTypes[Math.floor(Math.random() * propertyTypes.length)]} ${Math.floor(Math.random() * 100)}`,
        address: `${Math.floor(Math.random() * 200) + 1}, Main Road, ${locality}`,
        starRating: star,
        pricePerNight: price,
        propertyType: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
        location: {
            lat: center.lat + (Math.random() - 0.5) * 0.05,
            lng: center.lng + (Math.random() - 0.5) * 0.05,
        },
        amenities: randomAmenities(),
        bookingLink: `https://www.makemytrip.com/hotels/${locality.toLowerCase()}`,
    };
}

export function getHotels(locality: string): Hotel[] {
    const normalizedLocality = Object.keys(HOTEL_DATA).find(
        k => k.toLowerCase() === locality.toLowerCase()
    );

    if (normalizedLocality && HOTEL_DATA[normalizedLocality]) {
        return HOTEL_DATA[normalizedLocality].map(partial => ({
            id: uuidv4(),
            name: partial.name || `Hotel in ${locality}`,
            address: `${locality} Main Road`,
            starRating: partial.starRating || 3,
            pricePerNight: partial.pricePerNight || 3000,
            propertyType: partial.propertyType || 'Hotel',
            location: partial.location || { lat: 20.5937, lng: 78.9629 },
            amenities: randomAmenities(),
            bookingLink: `https://www.makemytrip.com/hotels/${locality.toLowerCase()}`,
        })) as Hotel[];
    }

    // Generate random hotels for unknown localities
    const center: LatLng = { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 };
    return Array.from({ length: 8 }, () => generateRandomHotel(locality, center));
}
