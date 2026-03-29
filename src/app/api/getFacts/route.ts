import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
});

const SYSTEM_PROMPT = `You are a travel historian and expert. 
Your task is to provide 5 incredibly interesting, surprising, and visually evocative "Fun Facts" about a specific travel destination.
Each fact should be concise (1-2 sentences max) and suitable for a loading screen.
Focus on unique history, quirky modern facts, or breathtaking geographical features.
Return the facts as a JSON array of strings.

Example Output:
[
  "Fact 1...",
  "Fact 2...",
  "Fact 3...",
  "Fact 4...",
  "Fact 5..."
]`;

export async function POST(request: NextRequest) {
    try {
        const { destination } = await request.json();

        if (!destination) {
            return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
        }

        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT!,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Generate 5 fun facts about ${destination}.` },
            ],
            temperature: 0.8,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content returned from LLM');
        }

        // The LLM returns a JSON object, we expect an array inside it or just an array
        const parsed = JSON.parse(content);
        const facts = Array.isArray(parsed) ? parsed : (parsed.facts || Object.values(parsed)[0]);

        if (!Array.isArray(facts)) {
            throw new Error('LLM did not return an array of facts');
        }

        return NextResponse.json({ facts: facts.slice(0, 5) });

    } catch (error) {
        console.error('GetFacts API error:', error);
        return NextResponse.json({ error: 'Failed to fetch fun facts' }, { status: 500 });
    }
}
