import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

const openai = new OpenAI(); // Relies on OPENAI_API_KEY in env

const MOCK_GOA_TRANSCRIPTS: Record<string, string> = {
    'L1': 'If you are tired of Baga and Calangute, you need to visit the secret beaches. Kakolem Beach, also known as Tiger Beach, is absolutely stunning and empty. Also, check out Butterfly Beach for gorgeous sunsets and dolphin sightings.',
    'L2': 'Today we are exploring Divar Island. It is like stepping back in time. You take a free ferry to get there. Rent a cycle and explore the old Portuguese houses and the beautiful Piedade village. Not a single tourist in sight!',
    'L3': 'South Goa is all about peace. For lowkey cafes, Eva Cafe is perfect for sunset, right on the cliff. Also, Blue Planet Cafe in Agonda offers amazing vegan food tucked away in the jungle.',
    'L4': 'Deep inside South Goa lies the Netravali Wildlife Sanctuary. The Savari waterfall here is a hidden gem. You have to trek a bit to reach it, but swimming in the natural pool is totally worth it.',
    'L5': 'For a truly quiet itinerary, head to Cola Beach. It has a beautiful sweet water lagoon right next to the ocean. Stay in the beach tents there. Then drive down to Cabo de Rama fort for an uncrowded cliffside view.',
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { videoId, destination, currentItinerary } = body;

        let transcriptText = '';

        // Mock for Goa
        if (destination.toLowerCase().includes('goa') && MOCK_GOA_TRANSCRIPTS[videoId]) {
            transcriptText = MOCK_GOA_TRANSCRIPTS[videoId];
        } else {
            // Real fetch for Sikkim or other destinations
            try {
                const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
                transcriptText = transcriptData.map(t => t.text).join(' ');
                
                // Limit to roughly first 3000 chars to save context window bandwidth
                if (transcriptText.length > 3000) {
                    transcriptText = transcriptText.substring(0, 3000);
                }
            } catch (err) {
                console.error('Failed to fetch real transcript:', err);
                return NextResponse.json({ success: false, error: 'Could not fetch YouTube subtitles for this video.' }, { status: 400 });
            }
        }

        // RAG Pipeline Prompt
        const systemPrompt = `You are a travel assistant agent. 
You are given a video transcript from a travel vlog about ${destination}.
You must extract 1 or 2 high-quality, actionable "hidden gem" spots, restaurants, or experiences mentioned in the transcript.
Then, write a single instructional command (as if spoken by the user) to modify their itinerary to include these spots.
Keep it extremely concise. 
Example outputs: 
"Add Ashwem Beach and remove Baga Beach"
"Add Ritz Classic for seafood in Panjim"
"Include an evening walk at Fontainhas"

Transcript excerpt:
"""
${transcriptText}
"""
`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: systemPrompt }],
            max_tokens: 50,
            temperature: 0.7,
        });

        const ragCommand = response.choices[0]?.message?.content?.trim() || 'Add a recommended spot from the video';

        return NextResponse.json({
            success: true,
            transcriptSummary: transcriptText.substring(0, 200) + '...',
            ragCommand,
        });

    } catch (error) {
        console.error('RAG Pipeline Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process RAG pipeline' }, { status: 500 });
    }
}
