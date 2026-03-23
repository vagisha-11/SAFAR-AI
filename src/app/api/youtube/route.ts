import { NextRequest, NextResponse } from 'next/server';
import ytSearch from 'yt-search';

// Dummy Goa Data
const MOCK_GOA_VIDEOS = [
    {
        videoId: 'L1',
        title: 'Goa Hidden Gems | Secret Beaches You Must Visit',
        url: 'https://youtube.com/watch?v=L1',
        thumbnail: 'https://img.youtube.com/vi/W5pB8u-P-zY/hqdefault.jpg',
        channel: 'Wanderlust Explorer',
    },
    {
        videoId: 'L2',
        title: 'Exploring Divar Island | The Unseen Side of Goa',
        url: 'https://youtube.com/watch?v=L2',
        thumbnail: 'https://img.youtube.com/vi/aL3Y12-P-A8/maxresdefault.jpg',
        channel: 'Travel Vlog India',
    },
    {
        videoId: 'L3',
        title: 'Top 5 Lowkey Cafes in South Goa - Peaceful Escapes',
        url: 'https://youtube.com/watch?v=L3',
        thumbnail: 'https://img.youtube.com/vi/Z9T3_bQ-P-k/mqdefault.jpg',
        channel: 'Nomadic Beats',
    },
    {
        videoId: 'L4',
        title: 'Netravali Waterfalls & Wildlife Sanctuary Tour',
        url: 'https://youtube.com/watch?v=L4',
        thumbnail: 'https://img.youtube.com/vi/Qk9b4o-P-jY/hqdefault.jpg',
        channel: 'Nature Trails',
    },
    {
        videoId: 'L5',
        title: 'Quiet South Goa Itinerary | Agonda & Cola Beach',
        url: 'https://youtube.com/watch?v=L5',
        thumbnail: 'https://img.youtube.com/vi/V8n21x-P-bM/hqdefault.jpg',
        channel: 'The Travel Compass',
    }
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const destination = searchParams.get('destination');

        if (!destination) {
            return NextResponse.json({ success: false, error: 'Destination is required' }, { status: 400 });
        }

        // 1) Mock flow for Goa
        if (destination.toLowerCase().includes('goa')) {
            return NextResponse.json({
                success: true,
                videos: MOCK_GOA_VIDEOS,
                source: 'mock'
            });
        }

        // 2) Real flow for other destinations (e.g., Sikkim)
        const query = `top things to do in ${destination} travel vlog`;
        const searchResult = await ytSearch(query);

        // Map and extract top 5 videos
        const videos = searchResult.videos.slice(0, 5).map(v => ({
            videoId: v.videoId,
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnail,
            channel: v.author.name,
        }));

        return NextResponse.json({
            success: true,
            videos,
            source: 'yt-search'
        });

    } catch (error) {
        console.error('YouTube API Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch videos' }, { status: 500 });
    }
}
