'use client';

import { useState } from 'react';
import { useSafarStore } from '@/lib/store';

export default function PromptBar() {
    const { itinerary, addPromptMessage, setItinerary } = useSafarStore();
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResponse, setLastResponse] = useState('');

    const handleSubmit = async () => {
        if (!prompt.trim() || !itinerary || isProcessing) return;

        const userPrompt = prompt.trim();
        setPrompt('');
        setIsProcessing(true);
        addPromptMessage('user', userPrompt);

        try {
            // Get intent from prompt API
            const promptRes = await fetch('/api/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userPrompt, currentItinerary: itinerary }),
            });
            const promptData = await promptRes.json();

            if (promptData.success) {
                setLastResponse(promptData.intent.response);
                addPromptMessage('assistant', promptData.intent.response);

                // Handle budget change
                if (promptData.intent.action === 'change_budget' && promptData.intent.params.amount) {
                    const res = await fetch('/api/deltaUpdate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'change_budget',
                            itinerary,
                            payload: { newBudget: parseInt(promptData.intent.params.amount) },
                        }),
                    });
                    const data = await res.json();
                    if (data.success) setItinerary(data.itinerary);
                }
            }
        } catch (err) {
            console.error('Prompt failed:', err);
            const errorMsg = 'Sorry, I couldn\'t process that. Please try again.';
            setLastResponse(errorMsg);
            addPromptMessage('assistant', errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{
            borderTop: '1px solid rgba(99,102,241,0.15)',
            padding: '12px 20px',
            background: 'rgba(10,10,26,0.95)',
        }}>
            {/* Last response */}
            {lastResponse && (
                <div style={{
                    padding: '8px 12px', marginBottom: 8, borderRadius: 8,
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.1)',
                    fontSize: 13, color: '#a0a0cc',
                    animation: 'fadeIn 0.3s ease-out',
                }}>
                    🤖 {lastResponse}
                </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    type="text"
                    className="input-field"
                    placeholder="Ask AI to modify your trip... (e.g., 'Add a beach visit on Day 2')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    style={{ flex: 1, padding: '12px 16px', fontSize: 14 }}
                    disabled={isProcessing}
                />
                <button
                    onClick={handleSubmit}
                    className="btn-primary"
                    disabled={!prompt.trim() || isProcessing}
                    style={{ padding: '12px 20px', fontSize: 14 }}
                >
                    {isProcessing ? (
                        <span style={{
                            width: 16, height: 16,
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                    ) : '✨'}
                </button>
            </div>

            {/* Quick actions */}
            <div style={{
                display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap',
            }}>
                {[
                    'Add more adventure spots',
                    'Reduce budget to ₹30,000',
                    'Skip expensive places',
                    'More food options',
                ].map(suggestion => (
                    <button
                        key={suggestion}
                        onClick={() => setPrompt(suggestion)}
                        style={{
                            padding: '4px 10px', borderRadius: 9999,
                            background: 'rgba(99,102,241,0.06)',
                            border: '1px solid rgba(99,102,241,0.1)',
                            color: '#6b6b99', fontSize: 11,
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: 'Inter, sans-serif',
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                            (e.target as HTMLElement).style.color = '#818cf8';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.1)';
                            (e.target as HTMLElement).style.color = '#6b6b99';
                        }}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}
