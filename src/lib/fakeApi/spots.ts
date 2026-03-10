// ============================================================
// Safar AI — Fake Spots/Attractions API
// ============================================================
import { Spot, LatLng } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SPOTS_DATA: Record<string, Partial<Spot>[]> = {
    'Manali': [
        { name: 'Museum of Himachal Culture', location: { lat: 32.2415, lng: 77.1865 }, timeToSpend: 1, openingTime: '10:00', closingTime: '17:00', entryFee: 50, category: 'Museum', rating: 3.9, popularity: 5, description: 'Museum showcasing the rich cultural heritage of Himachal Pradesh.' },
        { name: 'Beas River Rafting', location: { lat: 32.2350, lng: 77.1830 }, timeToSpend: 2, openingTime: '09:00', closingTime: '16:00', entryFee: 1000, category: 'Adventure', rating: 4.6, popularity: 8, description: 'Thrilling white water rafting on the Beas River with Grade II-III rapids.' },
        { name: 'Tibetan Monastery', location: { lat: 32.2425, lng: 77.1905 }, timeToSpend: 0.5, openingTime: '06:00', closingTime: '18:00', entryFee: 0, category: 'Religious', rating: 4.1, popularity: 6, description: 'Peaceful Buddhist monastery with beautiful architecture and prayer wheels.' },
        { name: 'Jana Waterfall', location: { lat: 32.2300, lng: 77.1600 }, timeToSpend: 1.5, openingTime: '08:00', closingTime: '17:00', entryFee: 0, category: 'Nature', rating: 4.3, popularity: 7, description: 'Pristine waterfall nestled in a lush green valley near Naggar.' },
        { name: 'Naggar Castle', location: { lat: 32.1391, lng: 77.1618 }, timeToSpend: 1.5, openingTime: '08:00', closingTime: '18:00', entryFee: 15, category: 'Heritage', rating: 4.4, popularity: 7, description: 'Medieval stone and wood castle with panoramic views of the Kullu Valley.' },
        { name: 'Manali Sanctuary', location: { lat: 32.2580, lng: 77.1700 }, timeToSpend: 2, openingTime: '10:00', closingTime: '17:30', entryFee: 50, category: 'Nature', rating: 4.2, popularity: 6, description: 'Wildlife sanctuary home to diverse Himalayan flora and fauna.' },
    ],
    'Delhi': [
        { name: 'Red Fort', location: { lat: 28.6562, lng: 77.2410 }, timeToSpend: 2, openingTime: '09:30', closingTime: '16:30', entryFee: 35, category: 'Heritage', rating: 4.5, popularity: 10, description: 'Iconic 17th-century Mughal fort and UNESCO World Heritage Site.' },
        { name: 'Qutub Minar', location: { lat: 28.5245, lng: 77.1855 }, timeToSpend: 1.5, openingTime: '07:00', closingTime: '17:00', entryFee: 35, category: 'Heritage', rating: 4.6, popularity: 9, description: '73-meter tall minaret, the tallest brick minaret in the world.' },
        { name: 'India Gate', location: { lat: 28.6129, lng: 77.2295 }, timeToSpend: 1, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Monument', rating: 4.4, popularity: 10, description: 'War memorial arch inspired by Arc de Triomphe, beautifully lit at night.' },
        { name: 'Humayun\'s Tomb', location: { lat: 28.5933, lng: 77.2507 }, timeToSpend: 1.5, openingTime: '06:00', closingTime: '18:00', entryFee: 35, category: 'Heritage', rating: 4.7, popularity: 9, description: 'Mughal architecture masterpiece, precursor to the Taj Mahal.' },
        { name: 'Lotus Temple', location: { lat: 28.5535, lng: 77.2588 }, timeToSpend: 1, openingTime: '09:00', closingTime: '17:30', entryFee: 0, category: 'Temple', rating: 4.5, popularity: 9, description: 'Stunning lotus-shaped Bahá\'í House of Worship open to all faiths.' },
        { name: 'Akshardham Temple', location: { lat: 28.6127, lng: 77.2773 }, timeToSpend: 3, openingTime: '09:30', closingTime: '18:30', entryFee: 0, category: 'Temple', rating: 4.8, popularity: 10, description: 'Magnificent Hindu temple with boat ride, exhibitions, and musical fountain.' },
        { name: 'Chandni Chowk', location: { lat: 28.6506, lng: 77.2301 }, timeToSpend: 2, openingTime: '09:30', closingTime: '20:00', entryFee: 0, category: 'Shopping', rating: 4.3, popularity: 9, description: 'One of the oldest and busiest markets in Old Delhi, famous for street food.' },
        { name: 'Jama Masjid', location: { lat: 28.6507, lng: 77.2334 }, timeToSpend: 1, openingTime: '07:00', closingTime: '12:00', entryFee: 0, category: 'Religious', rating: 4.4, popularity: 8, description: 'One of the largest mosques in India, built by Shah Jahan in 1656.' },
        { name: 'National Museum', location: { lat: 28.6117, lng: 77.2196 }, timeToSpend: 2, openingTime: '10:00', closingTime: '17:00', entryFee: 20, category: 'Museum', rating: 4.2, popularity: 7, description: 'India\'s largest museum with artifacts spanning 5,000 years of history.' },
        { name: 'Lodhi Garden', location: { lat: 28.5931, lng: 77.2198 }, timeToSpend: 1.5, openingTime: '06:00', closingTime: '20:00', entryFee: 0, category: 'Nature', rating: 4.5, popularity: 8, description: 'Beautiful 90-acre park with 15th-century tombs and lush gardens.' },
        { name: 'Connaught Place', location: { lat: 28.6315, lng: 77.2167 }, timeToSpend: 2, openingTime: '10:00', closingTime: '22:00', entryFee: 0, category: 'Shopping', rating: 4.2, popularity: 8, description: 'Iconic colonial-era circular marketplace with shops, restaurants, and offices.' },
        { name: 'Hauz Khas Village', location: { lat: 28.5494, lng: 77.2001 }, timeToSpend: 1.5, openingTime: '10:00', closingTime: '22:00', entryFee: 0, category: 'Cultural', rating: 4.3, popularity: 7, description: 'Trendy urban village with art galleries, boutiques, and nightlife.' },
        { name: 'Purana Qila', location: { lat: 28.6094, lng: 77.2436 }, timeToSpend: 1.5, openingTime: '07:00', closingTime: '17:00', entryFee: 25, category: 'Heritage', rating: 4.3, popularity: 7, description: 'Ancient citadel on the banks of the Yamuna with light and sound show.' },
        { name: 'Gurudwara Bangla Sahib', location: { lat: 28.6264, lng: 77.2090 }, timeToSpend: 1, openingTime: '04:00', closingTime: '21:00', entryFee: 0, category: 'Religious', rating: 4.7, popularity: 8, description: 'One of the most prominent Sikh gurdwaras with a serene sacred pool.' },
        { name: 'Dilli Haat', location: { lat: 28.5732, lng: 77.2072 }, timeToSpend: 1.5, openingTime: '10:30', closingTime: '22:00', entryFee: 30, category: 'Shopping', rating: 4.1, popularity: 7, description: 'Open-air bazaar and food plaza showcasing cultures from all Indian states.' },
    ],
    'Jaipur': [
        { name: 'Amber Fort', location: { lat: 26.9855, lng: 75.8513 }, timeToSpend: 2.5, openingTime: '08:00', closingTime: '17:30', entryFee: 100, category: 'Heritage', rating: 4.8, popularity: 10, description: 'Majestic hilltop fort with artistic Hindu elements and stunning mirror palace.' },
        { name: 'Hawa Mahal', location: { lat: 26.9239, lng: 75.8267 }, timeToSpend: 1, openingTime: '09:00', closingTime: '17:00', entryFee: 50, category: 'Heritage', rating: 4.6, popularity: 10, description: 'Iconic \"Palace of Winds\" with 953 windows, masterpiece of pink sandstone.' },
        { name: 'City Palace', location: { lat: 26.9258, lng: 75.8237 }, timeToSpend: 2, openingTime: '09:30', closingTime: '17:00', entryFee: 200, category: 'Heritage', rating: 4.7, popularity: 9, description: 'Royal residence with exquisite courtyard gardens and palatial architecture.' },
        { name: 'Jantar Mantar', location: { lat: 26.9248, lng: 75.8245 }, timeToSpend: 1, openingTime: '09:00', closingTime: '16:30', entryFee: 50, category: 'Heritage', rating: 4.4, popularity: 8, description: 'UNESCO site with the world\'s largest stone sundial and astronomical instruments.' },
        { name: 'Nahargarh Fort', location: { lat: 26.9377, lng: 75.8154 }, timeToSpend: 2, openingTime: '10:00', closingTime: '17:30', entryFee: 50, category: 'Heritage', rating: 4.5, popularity: 8, description: 'Hilltop fort offering panoramic views of Jaipur city, especially at sunset.' },
        { name: 'Jal Mahal', location: { lat: 26.9534, lng: 75.8464 }, timeToSpend: 0.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Heritage', rating: 4.3, popularity: 8, description: 'Beautiful palace in the middle of Man Sagar Lake, stunning photo opportunity.' },
        { name: 'Albert Hall Museum', location: { lat: 26.9118, lng: 75.8193 }, timeToSpend: 1.5, openingTime: '09:00', closingTime: '17:00', entryFee: 40, category: 'Museum', rating: 4.2, popularity: 7, description: 'Oldest museum in Rajasthan with a rich collection of artifacts.' },
        { name: 'Birla Mandir', location: { lat: 26.8920, lng: 75.8128 }, timeToSpend: 1, openingTime: '06:00', closingTime: '12:00', entryFee: 0, category: 'Temple', rating: 4.4, popularity: 7, description: 'White marble temple dedicated to Lord Vishnu and Goddess Lakshmi.' },
        { name: 'Jaigarh Fort', location: { lat: 26.9864, lng: 75.8437 }, timeToSpend: 1.5, openingTime: '09:00', closingTime: '16:30', entryFee: 35, category: 'Heritage', rating: 4.4, popularity: 7, description: 'Fort housing Jaivana, the world\'s largest cannon on wheels.' },
        { name: 'Bapu Bazaar', location: { lat: 26.9160, lng: 75.8230 }, timeToSpend: 1.5, openingTime: '10:00', closingTime: '21:00', entryFee: 0, category: 'Shopping', rating: 4.0, popularity: 7, description: 'Vibrant market famous for textiles, mojris (shoes), and Rajasthani handicrafts.' },
        { name: 'Elefantastic', location: { lat: 26.9900, lng: 75.8550 }, timeToSpend: 2, openingTime: '09:00', closingTime: '17:00', entryFee: 1500, category: 'Experience', rating: 4.6, popularity: 8, description: 'Ethical elephant sanctuary for interaction and learning about elephant care.' },
        { name: 'Chokhi Dhani', location: { lat: 26.7750, lng: 75.8200 }, timeToSpend: 3, openingTime: '17:00', closingTime: '23:00', entryFee: 800, category: 'Cultural', rating: 4.5, popularity: 8, description: 'Ethnic village resort showcasing Rajasthani culture, food, and entertainment.' },
    ],
    'Goa': [
        { name: 'Baga Beach', location: { lat: 15.5553, lng: 73.7530 }, timeToSpend: 3, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.4, popularity: 10, description: 'Popular beach known for water sports, nightlife, and vibrant shacks.' },
        { name: 'Palolem Beach', location: { lat: 15.0100, lng: 74.0230 }, timeToSpend: 3, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.6, popularity: 9, description: 'Crescent-shaped bay in South Goa, famous for its "Silent Discos" and calm waters.' },
        { name: 'Cola Beach', location: { lat: 15.0500, lng: 73.9800 }, timeToSpend: 2, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.5, popularity: 7, description: 'Hidden gem with a freshwater lagoon directly on the Arabian Sea.' },
        { name: 'Scuba Diving at Grande Island', location: { lat: 15.3500, lng: 73.7667 }, timeToSpend: 5, openingTime: '08:00', closingTime: '15:00', entryFee: 3500, category: 'Adventure', rating: 4.7, popularity: 9, description: 'Breathtaking underwater exploration with vibrant coral reefs and marine life.' },
        { name: 'Tito\'s Lane', location: { lat: 15.5560, lng: 73.7540 }, timeToSpend: 4, openingTime: '18:00', closingTime: '04:00', entryFee: 2000, category: 'Nightlife', rating: 4.5, popularity: 10, description: 'The heart of Goa\'s nightlife with famous clubs like Tito\'s and Mambo\'s.' },
        { name: 'Sinq Night Club', location: { lat: 15.5100, lng: 73.7700 }, timeToSpend: 4, openingTime: '21:00', closingTime: '04:00', entryFee: 2500, category: 'Nightlife', rating: 4.5, popularity: 8, description: 'Upscale, contemporary nightclub with a poolside lounge and cabanas.' },
        { name: 'Club Cubana', location: { lat: 15.5780, lng: 73.7630 }, timeToSpend: 4, openingTime: '21:30', closingTime: '04:00', entryFee: 2500, category: 'Nightlife', rating: 4.6, popularity: 9, description: 'The "Club in the Sky" with a poolside bar and stunning views of Arpora.' },
        { name: 'Parasailing at Calangute', location: { lat: 15.5430, lng: 73.7550 }, timeToSpend: 1, openingTime: '09:00', closingTime: '17:00', entryFee: 1200, category: 'Adventure', rating: 4.8, popularity: 9, description: 'Soar above the Arabian Sea for a thrilling bird\'s eye view of the coastline.' },
        { name: 'Thalassa Beach Club', location: { lat: 15.5990, lng: 73.7380 }, timeToSpend: 3, openingTime: '12:00', closingTime: '01:00', entryFee: 0, category: 'Nightlife', rating: 4.7, popularity: 9, description: 'Greek-themed open-air restaurant and club with iconic sunset views.' },
        { name: 'Curlies Beach Shack', location: { lat: 15.5730, lng: 73.7410 }, timeToSpend: 3, openingTime: '08:30', closingTime: '03:00', entryFee: 0, category: 'Nightlife', rating: 4.3, popularity: 10, description: 'Legendary Anjuna beach shack famous for its trance parties and sunset vibes.' },
        { name: 'Basilica of Bom Jesus', location: { lat: 15.5006, lng: 73.9116 }, timeToSpend: 1, openingTime: '09:00', closingTime: '18:30', entryFee: 0, category: 'Religious', rating: 4.6, popularity: 9, description: 'UNESCO site housing the remains of St. Francis Xavier.' },
        { name: 'Our Lady of the Immaculate Conception Church', location: { lat: 15.4988, lng: 73.8439 }, timeToSpend: 1, openingTime: '09:00', closingTime: '19:00', entryFee: 0, category: 'Religious', rating: 4.7, popularity: 8, description: 'Iconic whitewashed structure in Panaji with a grand zig-zag staircase.' },
        { name: 'Jumpin Heights Goa', location: { lat: 15.5500, lng: 73.9500 }, timeToSpend: 2, openingTime: '09:00', closingTime: '17:00', entryFee: 4500, category: 'Adventure', rating: 4.8, popularity: 8, description: 'Premier bungee jumping site over Mayem Lake, certified professionals.' },
        { name: 'Adventure Breaks', location: { lat: 15.5000, lng: 73.8500 }, timeToSpend: 4, openingTime: '08:00', closingTime: '18:00', entryFee: 2000, category: 'Adventure', rating: 4.6, popularity: 7, description: 'Guided canyoning, trekking, and ocean kayaking in the Western Ghats.' },
        { name: 'Dudhsagar Jungle Trek', location: { lat: 15.3144, lng: 74.3142 }, timeToSpend: 6, openingTime: '07:00', closingTime: '16:00', entryFee: 600, category: 'Adventure', rating: 4.8, popularity: 8, description: 'Adventurous trek through Bhagwan Mahavir Sanctuary to the milky falls.' },
        { name: 'Casino Pride', location: { lat: 15.4980, lng: 73.8260 }, timeToSpend: 4, openingTime: '00:00', closingTime: '23:59', entryFee: 2000, category: 'Nightlife', rating: 4.4, popularity: 8, description: 'Vibrant floating casino on the Mandovi River with endless gaming options.' },
    ],
    'Mumbai': [
        { name: 'Gateway of India', location: { lat: 18.9220, lng: 72.8347 }, timeToSpend: 1, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Monument', rating: 4.5, popularity: 10, description: 'Iconic arch monument overlooking the Arabian Sea, built in 1924.' },
        { name: 'Marine Drive', location: { lat: 18.9432, lng: 72.8235 }, timeToSpend: 1.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Promenade', rating: 4.6, popularity: 10, description: 'The \"Queen\'s Necklace\" — 3.6 km promenade along the Arabian Sea.' },
        { name: 'Elephanta Caves', location: { lat: 18.9633, lng: 72.9315 }, timeToSpend: 3, openingTime: '09:30', closingTime: '17:00', entryFee: 40, category: 'Heritage', rating: 4.5, popularity: 9, description: 'UNESCO World Heritage cave temples with impressive rock-cut sculptures.' },
        { name: 'Chhatrapati Shivaji Terminus', location: { lat: 18.9398, lng: 72.8355 }, timeToSpend: 0.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Heritage', rating: 4.5, popularity: 9, description: 'Stunning Victorian Gothic railway station and UNESCO World Heritage Site.' },
        { name: 'Colaba Causeway', location: { lat: 18.9177, lng: 72.8316 }, timeToSpend: 2, openingTime: '10:00', closingTime: '22:00', entryFee: 0, category: 'Shopping', rating: 4.2, popularity: 8, description: 'Famous shopping street with antiques, fashion, and street food.' },
        { name: 'Siddhivinayak Temple', location: { lat: 19.0170, lng: 72.8303 }, timeToSpend: 1, openingTime: '05:30', closingTime: '21:30', entryFee: 0, category: 'Temple', rating: 4.6, popularity: 9, description: 'One of Mumbai\'s most visited Hindu temples dedicated to Lord Ganesha.' },
        { name: 'Juhu Beach', location: { lat: 19.0988, lng: 72.8267 }, timeToSpend: 1.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.0, popularity: 8, description: 'Popular beach famous for street food, sunset views, and celebrity sightings.' },
        { name: 'Haji Ali Dargah', location: { lat: 18.9827, lng: 72.8089 }, timeToSpend: 1, openingTime: '05:30', closingTime: '22:00', entryFee: 0, category: 'Religious', rating: 4.5, popularity: 8, description: 'Iconic mosque and tomb on an islet connected by a causeway to the shore.' },
        { name: 'Sanjay Gandhi National Park', location: { lat: 19.2147, lng: 72.9106 }, timeToSpend: 3, openingTime: '07:30', closingTime: '18:00', entryFee: 53, category: 'Nature', rating: 4.4, popularity: 7, description: 'Vast urban national park with Kanheri Caves and diverse wildlife.' },
        { name: 'Bandra-Worli Sea Link', location: { lat: 19.0340, lng: 72.8160 }, timeToSpend: 0.5, openingTime: '00:00', closingTime: '23:59', entryFee: 75, category: 'Landmark', rating: 4.3, popularity: 8, description: 'Stunning cable-stayed bridge, an engineering marvel and iconic landmark.' },
    ],
    'Kochi': [
        { name: 'Fort Kochi Beach', location: { lat: 9.9680, lng: 76.2410 }, timeToSpend: 1, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.4, popularity: 9, description: 'Charming beach with Chinese fishing nets and colonial-era architecture.' },
        { name: 'Mattancherry Palace (Dutch Palace)', location: { lat: 9.9575, lng: 76.2588 }, timeToSpend: 1.5, openingTime: '09:45', closingTime: '16:45', entryFee: 5, category: 'Museum', rating: 4.5, popularity: 8, description: 'Palace featuring murals depicting Hindu temple art and portraits of Kochi Rajas.' },
        { name: 'Jewish Synagogue', location: { lat: 9.9575, lng: 76.2595 }, timeToSpend: 0.5, openingTime: '10:00', closingTime: '17:00', entryFee: 5, category: 'Religious', rating: 4.3, popularity: 8, description: 'Oldest active synagogue in the Commonwealth, known for hand-painted floor tiles.' },
        { name: 'St. Francis Church', location: { lat: 9.9658, lng: 76.2418 }, timeToSpend: 0.5, openingTime: '07:00', closingTime: '18:30', entryFee: 0, category: 'Religious', rating: 4.4, popularity: 7, description: 'Oldest European church in India, where Vasco da Gama was originally buried.' },
        { name: 'Chinese Fishing Nets', location: { lat: 9.9694, lng: 76.2422 }, timeToSpend: 0.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Landmark', rating: 4.6, popularity: 10, description: 'Iconic cantilevered fishing nets, best viewed at sunset.' },
        { name: 'Maritime Museum', location: { lat: 9.9592, lng: 76.2435 }, timeToSpend: 1, openingTime: '09:30', closingTime: '17:30', entryFee: 40, category: 'Museum', rating: 4.2, popularity: 6, description: 'Museum tracing the history of Indian Navy and maritime heritage.' },
        { name: 'Hill Palace Museum', location: { lat: 9.9515, lng: 76.3508 }, timeToSpend: 2, openingTime: '09:00', closingTime: '17:00', entryFee: 30, category: 'Museum', rating: 4.5, popularity: 7, description: 'Largest archaeological museum in Kerala, formerly the residence of Kochi Rajas.' },
    ],
    'Munnar': [
        { name: 'Eravikulam National Park', location: { lat: 10.1500, lng: 77.0500 }, timeToSpend: 3, openingTime: '07:30', closingTime: '16:00', entryFee: 125, category: 'Nature', rating: 4.7, popularity: 10, description: 'Home to the endangered Nilgiri Tahr and stunning Neelakurinji blooms.' },
        { name: 'Tea Museum', location: { lat: 10.0900, lng: 77.0580 }, timeToSpend: 1.5, openingTime: '09:00', closingTime: '18:00', entryFee: 75, category: 'Museum', rating: 4.4, popularity: 9, description: 'World\'s first tea museum showcasing the evolution of Munnar\'s tea plantations.' },
        { name: 'Mattupetty Dam', location: { lat: 10.1060, lng: 77.1230 }, timeToSpend: 1, openingTime: '09:00', closingTime: '17:00', entryFee: 10, category: 'Nature', rating: 4.3, popularity: 8, description: 'Fascinating storage masonry dam with boating facilities and scenic views.' },
        { name: 'Top Station', location: { lat: 10.1235, lng: 77.2450 }, timeToSpend: 1.5, openingTime: '06:00', closingTime: '18:00', entryFee: 0, category: 'Nature', rating: 4.8, popularity: 9, description: 'Highest point in Munnar, offering panoramic views and breathtaking sunrises.' },
        { name: 'Anamudi Peak', location: { lat: 10.1685, lng: 77.0635 }, timeToSpend: 2, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Adventure', rating: 4.6, popularity: 8, description: 'Highest peak in South India, popular for trekking and biodiversity.' },
        { name: 'Echo Point', location: { lat: 10.1210, lng: 77.1650 }, timeToSpend: 0.5, openingTime: '06:00', closingTime: '18:00', entryFee: 0, category: 'Nature', rating: 4.2, popularity: 8, description: 'Scenic spot known for its natural echo phenomenon and mist-covered hills.' },
    ],
    'Alleppey': [
        { name: 'Alappuzha Backwaters', location: { lat: 9.4981, lng: 76.3388 }, timeToSpend: 4, openingTime: '00:00', closingTime: '23:59', entryFee: 2000, category: 'Nature', rating: 4.9, popularity: 10, description: 'Serene network of canals and lagoons, best experienced on a houseboat.' },
        { name: 'Alappuzha Beach', location: { lat: 9.4920, lng: 76.3180 }, timeToSpend: 1.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.4, popularity: 9, description: 'Historic beach with a 150-year-old pier and beautiful sunset views.' },
        { name: 'Ambalappuzha Sri Krishna Temple', location: { lat: 9.3800, lng: 76.3600 }, timeToSpend: 1, openingTime: '03:00', closingTime: '20:00', entryFee: 0, category: 'Religious', rating: 4.7, popularity: 8, description: 'Ancient Hindu temple famous for its delicious Palpayasam (sweet pudding).' },
        { name: 'Krishnapuram Palace', location: { lat: 9.1760, lng: 76.5050 }, timeToSpend: 1.5, openingTime: '09:00', closingTime: '16:30', entryFee: 10, category: 'Museum', rating: 4.3, popularity: 7, description: '18th-century palace featuring Kerala style architecture and huge mural paintings.' },
        { name: 'Marari Beach', location: { lat: 9.6000, lng: 76.2900 }, timeToSpend: 3, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Beach', rating: 4.8, popularity: 8, description: 'Quiet and pristine beach near Alleppey, perfect for relaxation.' },
        { name: 'Pathiramanal Island', location: { lat: 9.6150, lng: 76.3850 }, timeToSpend: 1, openingTime: '06:00', closingTime: '18:00', entryFee: 0, category: 'Nature', rating: 4.5, popularity: 7, description: 'Small island in Vembanad Lake, home to many rare migratory birds.' },
    ],
    'Thekkady': [
        { name: 'Periyar Boat Safari', location: { lat: 9.6000, lng: 77.1700 }, timeToSpend: 2, openingTime: '07:00', closingTime: '16:00', entryFee: 500, category: 'Nature', rating: 4.6, popularity: 9, description: 'Boat ride on Lake Periyar where you can often spot wild elephants and sambar deer.' },
        { name: 'Spice Plantation Tour', location: { lat: 9.6100, lng: 77.1600 }, timeToSpend: 1.5, openingTime: '09:00', closingTime: '17:00', entryFee: 200, category: 'Experience', rating: 4.5, popularity: 8, description: 'Learn about the cultivation of cardamom, pepper, and cinnamon.' },
        { name: 'Periyar National Park Jungle Scout', location: { lat: 9.6050, lng: 77.1650 }, timeToSpend: 3, openingTime: '19:00', closingTime: '22:00', entryFee: 1200, category: 'Adventure', rating: 4.4, popularity: 7, description: 'Guided night trekking through the jungle to spot nocturnal wildlife.' },
    ],
    'Varkala': [
        { name: 'Varkala Cliff', location: { lat: 8.7400, lng: 76.7100 }, timeToSpend: 2, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Nature', rating: 4.7, popularity: 10, description: 'Dramatic red cliffs overlooking the Arabian Sea, perfect for sunsets and cafes.' },
        { name: 'Janardhana Swami Temple', location: { lat: 8.7300, lng: 76.7100 }, timeToSpend: 1, openingTime: '04:00', closingTime: '18:00', entryFee: 0, category: 'Religious', rating: 4.5, popularity: 8, description: 'Ancient 2000-year-old temple dedicated to Lord Vishnu, overlooking the sea.' },
        { name: 'Kappil Beach & Backwaters', location: { lat: 8.7800, lng: 76.6600 }, timeToSpend: 1.5, openingTime: '00:00', closingTime: '23:59', entryFee: 0, category: 'Nature', rating: 4.6, popularity: 7, description: 'Scenic confluence of the sea, river, and backwaters with a beautiful road bridge.' },
    ],
};

const CATEGORY_LIST = ['Nature', 'Heritage', 'Temple', 'Beach', 'Adventure', 'Shopping', 'Cultural', 'Museum', 'Religious', 'Experience', 'Entertainment', 'Landmark'];

function generateSpot(locality: string, index: number, center: { lat: number; lng: number }): Spot {
    const category = CATEGORY_LIST[Math.floor(Math.random() * CATEGORY_LIST.length)];
    const hour = Math.floor(Math.random() * 4) + 6; // 6-9 AM opening
    const closeHour = Math.floor(Math.random() * 5) + 16; // 4-8 PM closing
    return {
        id: uuidv4(),
        name: `${locality} ${category} Spot ${index + 1}`,
        address: `${locality} Area ${index + 1}`,
        location: {
            lat: center.lat + (Math.random() - 0.5) * 0.08,
            lng: center.lng + (Math.random() - 0.5) * 0.08,
        },
        timeToSpend: 0.5 + Math.floor(Math.random() * 5) * 0.5, // 0.5 to 3 hours
        openingTime: `${String(hour).padStart(2, '0')}:00`,
        closingTime: `${String(closeHour).padStart(2, '0')}:00`,
        entryFee: Math.floor(Math.random() * 500),
        category,
        description: `A popular ${category.toLowerCase()} attraction in ${locality}.`,
        rating: 3 + Math.random() * 2,
        popularity: Math.floor(Math.random() * 5) + 5,
    };
}

export function getSpots(locality: string, _userInterests?: string[]): Spot[] {
    const normalizedLocality = Object.keys(SPOTS_DATA).find(
        k => k.toLowerCase() === locality.toLowerCase()
    );

    if (normalizedLocality && SPOTS_DATA[normalizedLocality]) {
        return SPOTS_DATA[normalizedLocality].map(partial => ({
            id: uuidv4(),
            name: partial.name || `Spot in ${locality}`,
            address: partial.address || `${locality} Area`,
            location: partial.location || { lat: 20.5937, lng: 78.9629 },
            timeToSpend: partial.timeToSpend || 1,
            openingTime: partial.openingTime || '09:00',
            closingTime: partial.closingTime || '18:00',
            entryFee: partial.entryFee || 0,
            category: partial.category || 'General',
            description: partial.description || `An attraction in ${locality}`,
            rating: partial.rating || 4.0,
            popularity: partial.popularity || 5,
        })) as Spot[];
    }

    // Generate random spots for unknown localities
    const center = { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 };
    return Array.from({ length: 15 }, (_, i) => generateSpot(locality, i, center));
}
