'use client';

import { useState, useEffect } from 'react';
import { useSafarStore } from '@/lib/store';

interface Video {
    videoId: string;
    title: string;
    url: string;
    thumbnail: string;
    channel: string;
}

export default function VideoInsights() {
    const { tripInput, itinerary, setItinerary, addPromptMessage } = useSafarStore();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [ragStatus, setRagStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!tripInput?.destination) return;

        const fetchVideos = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/youtube?destination=${encodeURIComponent(tripInput.destination)}`);
                const data = await res.json();
                if (data.success) {
                    setVideos(data.videos || []);
                }
            } catch (err) {
                console.error('Failed to fetch videos:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [tripInput?.destination]);

    const handlePlayVideo = (videoId: string) => {
        setSelectedVideoId(videoId);
    };

    const handleRagOptimize = async (videoId: string) => {
        if (!itinerary || !tripInput) return;
        setRagStatus(videoId);

        try {
            // 1. Send videoId to RAG Endpoint
            const ragRes = await fetch('/api/rag/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId,
                    destination: tripInput.destination,
                    currentItinerary: itinerary
                })
            });
            const ragData = await ragRes.json();

            if (!ragData.success || !ragData.ragCommand) {
                throw new Error(ragData.error || 'Failed to extract actionable intent from video.');
            }

            const extractedPrompt = ragData.ragCommand;
            
            // Log to prompt UI
            addPromptMessage('user', `[Video Transcript RAG] Extracting advice from vlog...`);
            addPromptMessage('assistant', `🧠 Extracted command: "${extractedPrompt}"`);

            // 2. Call existing Prompt API to detect intent
            const promptRes = await fetch('/api/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: extractedPrompt, currentItinerary: itinerary }),
            });
            const promptData = await promptRes.json();

            if (promptData.success && promptData.intent.action !== 'generic') {
                // 3. Complete Action via deltaUpdate
                const updateRes = await fetch('/api/deltaUpdate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: promptData.intent.action,
                        itinerary,
                        payload: {
                            ...promptData.intent.params,
                            newBudget: promptData.intent.action === 'change_budget' ? parseInt(promptData.intent.params.amount) : undefined
                        },
                    }),
                });
                const updateData = await updateRes.json();
                if (updateData.success && updateData.itinerary) {
                    setItinerary(updateData.itinerary);
                    addPromptMessage('assistant', `✅ Success! The itinerary has been updated with recommendations from the video.`);
                }
            }

        } catch (error) {
            console.error('RAG optimize failed:', error);
            addPromptMessage('assistant', `❌ Something went wrong while extracting video insights.`);
        } finally {
            setRagStatus(null);
        }
    };

    if (loading) {
        return (
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ color: '#a0a0cc', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="animate-pulse">📺 Fetching Vlogger Insights for {tripInput?.destination}...</span>
                </div>
            </div>
        );
    }

    if (videos.length === 0) return null;

    return (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ 
                fontFamily: 'Outfit, sans-serif', 
                fontSize: 16, 
                fontWeight: 600, 
                color: '#f0f0ff', 
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <span style={{ fontSize: 20 }}>📺</span> Vlogger Insights
                <span className="badge badge-success" style={{ marginLeft: 'auto' }}>YouTube + RAG</span>
            </h3>

            <div style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 16, 
                paddingBottom: 8,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(99,102,241,0.3) transparent'
            }}>
                {videos.map(video => (
                    <div key={video.videoId} style={{ 
                        flex: '0 0 240px', 
                        background: 'rgba(10,10,26,0.6)', 
                        borderRadius: 12, 
                        overflow: 'hidden',
                        border: '1px solid rgba(99,102,241,0.1)'
                    }}>
                        <div style={{ position: 'relative' }}>
                            <img 
                                src={video.thumbnail} 
                                alt={video.title} 
                                style={{ width: '100%', height: 135, objectFit: 'cover' }} 
                            />
                            <button 
                                onClick={() => handlePlayVideo(video.videoId)}
                                style={{
                                    position: 'absolute', inset: 0, 
                                    background: 'rgba(0,0,0,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                            >
                                <div style={{ 
                                    width: 40, height: 40, background: '#ef4444', 
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: 18, paddingLeft: 4
                                }}>▶</div>
                            </button>
                        </div>
                        <div style={{ padding: 12 }}>
                            <div style={{ 
                                fontSize: 13, fontWeight: 600, color: '#f0f0ff',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                marginBottom: 4, lineHeight: 1.4
                            }}>
                                {video.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#a0a0cc', marginBottom: 12 }}>
                                {video.channel}
                            </div>
                            
                            <button 
                                onClick={() => handleRagOptimize(video.videoId)}
                                disabled={ragStatus === video.videoId}
                                className="btn-secondary"
                                style={{ 
                                    width: '100%', fontSize: 12, padding: '8px', 
                                    display: 'flex', justifyContent: 'center', gap: 6,
                                    background: ragStatus === video.videoId ? 'rgba(99,102,241,0.2)' : undefined
                                }}
                            >
                                {ragStatus === video.videoId ? (
                                    <>
                                        <span style={{
                                            width: 12, height: 12,
                                            border: '2px solid rgba(129,140,248,0.3)',
                                            borderTopColor: '#818cf8',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            animation: 'spin 0.8s linear infinite',
                                        }} /> Extracting...
                                    </>
                                ) : (
                                    <>🧠 RAG Optimize</>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Video Player Modal */}
            {selectedVideoId && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24, paddingBottom: 60 // Leave room for PromptBar if visible
                }} onClick={() => setSelectedVideoId(null)}>
                    <div style={{
                        background: '#0a0a1a', borderRadius: 16, padding: '16px',
                        width: '100%', maxWidth: 853, // 16:9 ratio
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(99,102,241,0.2)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                            <div style={{ color: '#f0f0ff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#ef4444' }}>▶</span> YouTube Player
                            </div>
                            <button 
                                onClick={() => setSelectedVideoId(null)}
                                style={{ background: 'transparent', border: 'none', color: '#a0a0cc', fontSize: 24, cursor: 'pointer' }}
                            >×</button>
                        </div>
                        <div style={{ position: 'relative', paddingTop: '56.25%', background: 'black', borderRadius: 8, overflow: 'hidden' }}>
                            <iframe 
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`} 
                                title="YouTube video player" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
