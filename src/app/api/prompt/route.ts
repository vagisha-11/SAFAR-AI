// ============================================================
// Safar AI — Prompt API
// Natural language interface for itinerary updates
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

interface PromptRequest {
    prompt: string;
    currentItinerary: unknown;
}

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
});

export async function POST(request: NextRequest) {
    try {
        const body: PromptRequest = await request.json();
        const { prompt } = body;

const systemMessage = `
You are an AI assistant for a trip planning app.
Detect the user's intent from their prompt and output a JSON object with three keys:
- action: One of ['add_place', 'remove_place', 'change_budget', 'change_hours', 'category_swap', 'update_preferences', 'filter_restaurants', 'generic']
- params: An object containing relevant parameters based on the action. For instance:
    - add_place: { placeName: string, dayNumber?: string }
    - remove_place: { placeName: string }
    - change_budget: { amount: string }
    - change_hours: { hours: string }
    - category_swap: { removeCategory: string, addCategory: string }
    - update_preferences: { preference: string }
    - filter_restaurants: { dietaryFilter: 'veg' | 'jain' | 'clear' } // Action to filter dietary
- response: A friendly string response to show the user acknowledging their request.

Respond ONLY with valid JSON, nothing else.`;

        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content || '{}';
        const intent = JSON.parse(content);

        return NextResponse.json({
            success: true,
            intent,
        });
    } catch (error) {
        console.error('Prompt error:', error);
        return NextResponse.json({ success: false, error: 'Prompt processing failed' }, { status: 500 });
    }
}
