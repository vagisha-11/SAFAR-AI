// ============================================================
// Safar AI — Prompt API
// Natural language interface for itinerary updates
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

interface PromptRequest {
    prompt: string;
    currentItinerary: unknown;
}

/**
 * Simple intent detection from user prompt (MVP — no LLM needed)
 */
function detectIntent(prompt: string): {
    action: string;
    params: Record<string, string>;
    response: string;
} {
    const lower = prompt.toLowerCase();

    // Add a place
    if (lower.includes('add') || lower.includes('include') || lower.includes('visit')) {
        const placeMatch = prompt.match(/(?:add|include|visit)\s+(.+?)(?:\s+(?:on|to|in)\s+day\s+(\d+))?$/i);
        return {
            action: 'add_place',
            params: {
                placeName: placeMatch?.[1] || '',
                dayNumber: placeMatch?.[2] || '1',
            },
            response: `I'll try to add "${placeMatch?.[1] || 'that place'}" to your itinerary. The map and schedule have been updated!`,
        };
    }

    // Remove a place
    if (lower.includes('remove') || lower.includes('skip') || lower.includes('delete')) {
        const placeMatch = prompt.match(/(?:remove|skip|delete)\s+(.+?)$/i);
        return {
            action: 'remove_place',
            params: { placeName: placeMatch?.[1] || '' },
            response: `Done! I've removed "${placeMatch?.[1] || 'that place'}" from your itinerary and recalculated the schedule.`,
        };
    }

    // Budget change
    if (lower.includes('budget') || lower.includes('spend') || lower.includes('cost')) {
        const amountMatch = prompt.match(/(\d[\d,]*)/);
        return {
            action: 'change_budget',
            params: { amount: amountMatch?.[1]?.replace(/,/g, '') || '0' },
            response: `Budget updated! I'm recalculating your trip to fit within ₹${amountMatch?.[1] || '0'}.`,
        };
    }

    // More time / less time
    if (lower.includes('more time') || lower.includes('less time') || lower.includes('hours')) {
        const hoursMatch = prompt.match(/(\d+)\s*hours/i);
        return {
            action: 'change_hours',
            params: { hours: hoursMatch?.[1] || '14' },
            response: `Updated! Your daily exploration limit is now ${hoursMatch?.[1] || '14'} hours.`,
        };
    }

    // Category Swap (e.g., "remove clubs and add religious places")
    if ((lower.includes('remove') || lower.includes('skip') || lower.includes('delete')) &&
        (lower.includes('add') || lower.includes('include') || lower.includes('more'))) {
        const removeMatch = prompt.match(/(?:remove|skip|delete)\s+(.+?)(?:\s+and|\s*,|$)/i);
        const addMatch = prompt.match(/(?:add|include|more)\s+(.+?)(?:\s+and|\s*,|$)/i);

        if (removeMatch && addMatch) {
            return {
                action: 'category_swap',
                params: {
                    removeCategory: removeMatch[1].trim(),
                    addCategory: addMatch[1].trim()
                },
                response: `Understood! I'll remove items related to "${removeMatch[1]}" and refocus your itinerary on "${addMatch[1]}".`,
            };
        }
    }

    // General preference
    if (lower.includes('prefer') || lower.includes('like') || lower.includes('interest')) {
        return {
            action: 'update_preferences',
            params: { preference: prompt },
            response: `Got it! I'll prioritize places matching your interests in the itinerary.`,
        };
    }

    return {
        action: 'generic',
        params: {},
        response: `I understand you'd like to adjust the trip. I've noted your feedback: "${prompt}". The itinerary has been refreshed to accommodate your request.`,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: PromptRequest = await request.json();
        const { prompt } = body;

        const intent = detectIntent(prompt);

        return NextResponse.json({
            success: true,
            intent,
        });
    } catch (error) {
        console.error('Prompt error:', error);
        return NextResponse.json({ success: false, error: 'Prompt processing failed' }, { status: 500 });
    }
}
