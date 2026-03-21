// ============================================================
// Safar AI — Locality Splitter API (Primitive Fetcher via LLM)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
});

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
    'Kochi': { lat: 9.9312, lng: 76.2673 },
    'Alleppey': { lat: 9.4981, lng: 76.3388 },
};

// Fallback mechanism in case the Hackathon demo API key rate limits on stage
function fallbackLocalitySplit(destination: string, totalDays: number): { locality: string; days: number; isTransitDay: boolean; center: { lat: number; lng: number } }[] {
    const dest = destination.toLowerCase();
    const centerKey = Object.keys(CITY_CENTERS).find(k => dest.includes(k.toLowerCase()));
    const center = centerKey ? CITY_CENTERS[centerKey] : { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 };
    return [{ locality: centerKey || destination, days: totalDays, isTransitDay: false, center }];
}

async function askLLMForLocalitySplit(destination: string, totalDays: number) {
    const systemPrompt = `You are a strict data-routing AI for Safar AI, an Indian travel planner.
The user wants to travel to: "${destination}" for ${totalDays} days.
Your job is to partition these ${totalDays} days across logical cities or hubs.

If the destination is a broad state/region (e.g., "Sikkim", "Rajasthan"), break it down into the best 2-3 standard tourist cities for that region and assign days to each.
If the destination is a single city (e.g., "Goa"), exactly return that one city with all ${totalDays} days.

OUTPUT FORMAT REQUIREMENTS:
You must output a raw JSON array of objects, and absolutely nothing else. Do not use markdown blocks (\`\`\`json).
Each object must have exactly these keys:
{
  "locality": "City Name (e.g. 'Gangtok' or 'Jaipur')",
  "days": <integer>,
  "isTransitDay": false,
  "idealDays": <integer, how many days someone SHOULD ideally spend in this city>,
  "center": { "lat": <accurate float latitude>, "lng": <accurate float longitude> }
}

RULES:
- The sum of "days" across all objects must exactly equal ${totalDays}.
- Prioritize realistic Indian cities.`;

    try {
        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT!,
            messages: [{ role: 'system', content: systemPrompt }],
            temperature: 0.1, // Keep it deterministic
            max_tokens: 400,
        });

        const content = response.choices[0]?.message?.content?.trim() || "[]";
        const cleanJson = content.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("LLM did not return a valid array");

        return parsed.map((s: any) => ({
            ...s,
            isTransitDay: s.isTransitDay || false,
            // Attach coordinates if we know them, otherwise rely on the LLM's accurate generation
            center: CITY_CENTERS[s.locality] || s.center || { lat: 20.5937 + (Math.random() - 0.5) * 10, lng: 78.9629 + (Math.random() - 0.5) * 10 },
        }));
    } catch (e) {
        console.error("Locality Splitter LLM failed! Using safe fallback.", e);
        return fallbackLocalitySplit(destination, totalDays);
    }
}

export async function executeLocalitySplitter(body: any) {
    const { destination, source, departureDate, returnDate, isDateFlexible, minDays, maxDays, budget } = body;

    const dep = new Date(departureDate);
    const ret = new Date(returnDate);
    let totalDays = Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));

    // For flexible dates, use ideal day recommendation from LLM — but NEVER cap based on budget.
    // Budget constraints are handled downstream by Agent C's allocation algorithms.
    if (isDateFlexible) {
        // Get the first split to read idealDays from LLM
        const prelimSplit = await askLLMForLocalitySplit(destination, totalDays);
        const recommendedDays = (prelimSplit[0] as any).idealDays || 5;
        totalDays = Math.min(maxDays || 14, Math.max(minDays || 2, recommendedDays));
    }

    // Live LLM Call to dynamically route regions into precise cities
    let split = await askLLMForLocalitySplit(destination, totalDays);

    // Adjust days to fit total mathematically (defensive logic against math-hallucination from LLM)
    let assignedDays = split.reduce((sum: number, s: any) => sum + s.days, 0);
    if (assignedDays > totalDays) {
        const ratio = totalDays / assignedDays;
        split.forEach((s: any) => { s.days = Math.max(1, Math.round(s.days * ratio)); });
    } else if (assignedDays < totalDays) {
        const nonTransit = split.filter((s: any) => !s.isTransitDay);
        if (nonTransit.length > 0) {
            nonTransit[0].days += totalDays - assignedDays;
        } else if (split.length > 0) {
            split[0].days += totalDays - assignedDays;
        }
    }

    // Transparent budget advisory (non-blocking) — sent to frontend for optional display
    const estimatedCostPerDay = 4500; // Conservative estimate for decent travel
    const budgetWarning = budget && (budget / totalDays) < estimatedCostPerDay
        ? `Your budget of ₹${budget.toLocaleString('en-IN')} for ${totalDays} days works out to ~₹${Math.floor(budget / totalDays).toLocaleString('en-IN')}/day. We'll design the best backpacker-friendly itinerary within this budget!`
        : null;

    return { totalDays, source, destination, split, budgetWarning };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = await executeLocalitySplitter(body);

        return NextResponse.json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error('Locality splitter error:', error);
        return NextResponse.json({ success: false, error: 'Failed to split localities' }, { status: 500 });
    }
}
