import fs from 'fs/promises';
import path from 'path';
import { Spot, Restaurant } from './types';
import { AzureOpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
});

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'destinations');

export async function fetchOrGenerateSpots(locality: string): Promise<Spot[]> {
    const safeName = locality.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const filePath = path.join(DATA_DIR, `${safeName}.json`);

    try {
        // 1. Try Cache
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as Spot[];
    } catch (e) {
        // 2. Fallback: LLM Generation
        // This stops the algorithm from failing on unknown locations and makes the DB self-building!
        console.log(`[DataEngine] Cache miss for ${locality}. Invoking LLM to generate 20 highly accurate spots...`);
        
        const systemPrompt = `You are an expert Indian travel database builder.
Your job is to return a raw JSON array of exactly 20 highly accurate, famous, or unique tourist spots, activities, or restaurants in the locality: "${locality}".
Include a healthy mix of Nature, Heritage, Temple/Religious, Adventure, Cultural, Shopping, and Nightlife/Entertainment.

RULES:
- Respond ONLY with raw valid JSON. No markdown ticks, no \`\`\`json. Just the array.
- Each object in the array MUST strictly follow this exact schema:
{
  "name": "Exact name of the place",
  "location": { "lat": <accurate float latitude>, "lng": <accurate float longitude> },
  "timeToSpend": <float hours between 0.5 and 5>,
  "openingTime": "<HH:MM>",
  "closingTime": "<HH:MM>",
  "entryFee": <integer in INR, 0 if free>,
  "category": "<one of: Nature, Heritage, Temple, Beach, Adventure, Shopping, Cultural, Museum, Religious, Experience, Entertainment, Landmark, Nightlife>",
  "description": "<one sentence vivid description>",
  "rating": <float between 3.5 and 5.0>,
  "popularity": <integer between 5 and 10>
}`;

        try {
            // Ensure the directory exists
            await fs.mkdir(DATA_DIR, { recursive: true });

            const response = await client.chat.completions.create({
                model: process.env.AZURE_OPENAI_DEPLOYMENT!,
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.2, // Low temp for data accuracy
                max_tokens: 3500,
            });

            let rawJson = response.choices[0]?.message?.content || '[]';
            // Strip any accidental markdown formatting if the model disobeys
            rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsedSpots: Partial<Spot>[] = JSON.parse(rawJson);
            
            // Add UUIDs
            const mappedSpots: Spot[] = parsedSpots.map((s, i) => ({
                id: uuidv4(),
                name: s.name || `${locality} Spot ${i}`,
                address: s.address || `${locality}`,
                location: s.location || { lat: 20.0, lng: 78.0 },
                timeToSpend: s.timeToSpend || 2,
                openingTime: s.openingTime || '09:00',
                closingTime: s.closingTime || '18:00',
                entryFee: s.entryFee || 0,
                category: s.category || 'Cultural',
                description: s.description || 'A beautiful attraction.',
                rating: s.rating || 4.2,
                popularity: s.popularity || 7,
            }));

            // Save to local cache asynchronously so we don't block
            fs.writeFile(filePath, JSON.stringify(mappedSpots, null, 2)).catch(err => console.error("Cache write failed", err));

            return mappedSpots;

        } catch (llmError) {
            console.error(`[DataEngine] Failed to generate spots for ${locality}:`, llmError);
            // Absolute emergency fallback (the old hardcoded fallback logic) to prevent UI crash
            return createGenericSpots(locality);
        }
    }
}

function createGenericSpots(locality: string): Spot[] {
    const center = { lat: 20.5937, lng: 78.9629 };
    const CATEGORY_LIST = ['Nature', 'Heritage', 'Temple', 'Beach', 'Adventure'];
    return Array.from({ length: 10 }, (_, i) => {
        const category = CATEGORY_LIST[Math.floor(Math.random() * CATEGORY_LIST.length)];
        return {
            id: uuidv4(),
            name: `${locality} ${category} ${i + 1}`,
            address: `${locality}`,
            location: {
                lat: center.lat + (Math.random() - 0.5) * 0.1,
                lng: center.lng + (Math.random() - 0.5) * 0.1,
            },
            timeToSpend: 2,
            openingTime: '09:00',
            closingTime: '18:00',
            entryFee: 0,
            category,
            description: `Fallback attraction in ${locality}.`,
            rating: 3.5,
            popularity: 5,
        };
    });
}

export async function fetchOrGenerateRestaurants(locality: string): Promise<Restaurant[]> {
    const safeName = locality.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const filePath = path.join(DATA_DIR, `${safeName}_restaurants.json`);

    try {
        // 1. Try Cache
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as Restaurant[];
    } catch (e) {
        // 2. Fallback: LLM Generation
        console.log(`[DataEngine] Cache miss for Restaurants in ${locality}. Invoking LLM...`);
        
        const systemPrompt = `You are an expert Indian food/travel database builder.
Your job is to return a raw JSON array of exactly 10 highly authentic, popular, or highly-rated restaurants and cafes in the locality: "${locality}".
Include a mix of fine dining, local authentic cuisine, structural cafes, and street food hubs.

RULES:
- Respond ONLY with raw valid JSON. No markdown ticks, no \`\`\`json. Just the array.
- Each object in the array MUST strictly follow this exact schema:
{
  "name": "Exact name of the restaurant",
  "location": { "lat": <accurate float latitude>, "lng": <accurate float longitude> },
  "cuisine": "<e.g., North Indian, Seafood, Continental, Local Authentic>",
  "avgCostForTwo": <integer in INR>,
  "rating": <float between 3.5 and 5.0>,
  "openingTime": "<HH:MM>",
  "closingTime": "<HH:MM>",
  "mealType": "<one of: lunch, dinner, breakfast, any>"
}`;

        try {
            await fs.mkdir(DATA_DIR, { recursive: true });

            const response = await client.chat.completions.create({
                model: process.env.AZURE_OPENAI_DEPLOYMENT!,
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.2, // Low temp for data accuracy
                max_tokens: 2500,
            });

            let rawJson = response.choices[0]?.message?.content || '[]';
            rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsedRestaurants: Partial<Restaurant>[] = JSON.parse(rawJson);
            
            const mappedRestaurants: Restaurant[] = parsedRestaurants.map((r, i) => ({
                id: uuidv4(),
                name: r.name || `${locality} Restaurant ${i}`,
                address: r.address || `${locality}`,
                location: r.location || { lat: 20.0, lng: 78.0 },
                cuisine: r.cuisine || 'Multi-cuisine',
                avgCostForTwo: r.avgCostForTwo || 800,
                rating: r.rating || 4.2,
                openingTime: r.openingTime || '11:00',
                closingTime: r.closingTime || '23:00',
                mealType: r.mealType || 'any'
            }));

            // Save to local cache asynchronously so we don't block
            fs.writeFile(filePath, JSON.stringify(mappedRestaurants, null, 2)).catch(err => console.error("Cache write failed", err));

            return mappedRestaurants;

        } catch (llmError) {
            console.error(`[DataEngine] Failed to generate restaurants for ${locality}:`, llmError);
            return createGenericRestaurants(locality);
        }
    }
}

function createGenericRestaurants(locality: string): Restaurant[] {
    const center = { lat: 20.5937, lng: 78.9629 };
    return Array.from({ length: 5 }, (_, i) => {
        return {
            id: uuidv4(),
            name: `${locality} Cafe ${i + 1}`,
            address: `${locality}`,
            location: {
                lat: center.lat + (Math.random() - 0.5) * 0.1,
                lng: center.lng + (Math.random() - 0.5) * 0.1,
            },
            cuisine: 'Local',
            avgCostForTwo: 500,
            rating: 3.8,
            openingTime: '10:00',
            closingTime: '22:00',
            mealType: 'any',
        };
    });
}
