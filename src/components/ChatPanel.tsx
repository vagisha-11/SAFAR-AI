'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSafarStore } from '@/lib/store';
import { TripInput } from '@/lib/types';

type Message = {
    id: string;
    role: 'assistant' | 'user';
    text: string;
    isStreaming?: boolean;
};

function extractTripReady(text: string): { tripData: any; cleanText: string } | null {
    const startTag = '[TRIP_READY]';
    const endTag = '[/TRIP_READY]';
    const start = text.indexOf(startTag);
    const end = text.indexOf(endTag);
    if (start === -1 || end === -1) return null;
    const jsonStr = text.slice(start + startTag.length, end).trim();
    const cleanText = text.slice(0, start).trim();
    try {
        return { tripData: JSON.parse(jsonStr), cleanText };
    } catch {
        return null;
    }
}

// Helper to parse markdown-like bold (**) and render it vibrantly, even during active typing
function renderFormattedText(text: string) {
    if (!text) return null;
    // Split on **...** but intentionally catch unclosed ** strings so they highlight while streaming
    const parts = text.split(/(\*\*[^\*]+(?:\*\*|$))/g);
    return parts.map((part, i) => {
        if (part.startsWith('**')) {
            const inner = part.endsWith('**') ? part.slice(2, -2) : part.slice(2);
            return (
                <span key={i} style={{ 
                    color: '#38bdf8', // Vibrant sky blue
                    fontWeight: 600,
                    textShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
                }}>
                    {inner}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

// Gives a rolling, smooth typewriter display output for text chunks
function RollingText({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
    const isNewStream = useRef(isStreaming);
    
    // If it was NEVER streaming since mount, display fully immediately
    const [displayed, setDisplayed] = useState(!isNewStream.current ? text : '');
    const textRef = useRef(text);
    const displayedRef = useRef(!isNewStream.current ? text : '');

    // Keep the target text updated
    useEffect(() => {
        textRef.current = text;
        if (!isNewStream.current) {
            setDisplayed(text);
            displayedRef.current = text;
        }
    }, [text]);

    // Handle the typewriter rollout
    useEffect(() => {
        if (!isNewStream.current) return;

        let timeoutId: NodeJS.Timeout;
        const tick = () => {
            const currentLen = displayedRef.current.length;
            const targetLen = textRef.current.length;

            if (currentLen < targetLen) {
                // Slower and smoother typewriter effect
                const step = Math.max(1, Math.min(3, Math.floor((targetLen - currentLen) / 8)));
                const nextText = textRef.current.slice(0, currentLen + step);
                setDisplayed(nextText);
                displayedRef.current = nextText;
                timeoutId = setTimeout(tick, 20); // ~50 chars/sec when caught up
            } else {
                // We are fully caught up to the fetched text
                if (!isStreaming) return; // The API is done sending text, we can stop the loop
                // API is still sending text, just waiting for the next chunk
                timeoutId = setTimeout(tick, 30);
            }
        };

        timeoutId = setTimeout(tick, 20);
        return () => clearTimeout(timeoutId);
    }, [isStreaming]); // Depend on isStreaming so we run to completion when it ends

    return (
        <div style={{ display: 'inline' }}>
            {renderFormattedText(displayed) || ' '}
            {/* Show the typing cursor block if still processing API blocks or if we haven't typed everything out yet */}
            {(isStreaming || displayed.length < text.length) && <span style={{ opacity: 0.6 }}>▌</span>}
        </div>
    );
}

interface ChatProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    onTripReady: (tripData: any) => void;
    isCollapsed?: boolean;
    fontSize?: number;  // 13 for sidebar, 16 for landing page
}

export function ChatPanel({ messages, setMessages, onTripReady, isCollapsed, fontSize = 13 }: ChatProps) {
    const [inputValue, setInputValue] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasGreeted = useRef(false);

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    useEffect(() => {
        scrollToBottom(!isBotTyping);
    }, [messages, isBotTyping, scrollToBottom]);

    const sendToLLM = useCallback(async (history: { role: string; content: string }[]) => {
        setIsBotTyping(true);
        const botMsgId = Date.now().toString() + '_bot';
        setMessages(prev => [...prev, { id: botMsgId, role: 'assistant', text: '', isStreaming: true }]);

        let fullText = '';
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            });
            if (!res.ok || !res.body) throw new Error('Stream failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
                const tripReadyIdx = fullText.indexOf('[TRIP_READY]');
                const visibleText = tripReadyIdx !== -1 ? fullText.slice(0, tripReadyIdx).trim() : fullText;
                setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: visibleText } : m));
                scrollToBottom(false);
            }

            const parsed = extractTripReady(fullText);
            setMessages(prev => prev.map(m =>
                m.id === botMsgId
                    ? { ...m, text: parsed ? parsed.cleanText : fullText, isStreaming: false }
                    : m
            ));

            if (parsed) {
                // Give the user ~4 seconds to comfortably read the final wrap-up message 
                // and watch the "Handing over to agents..." animation before transitioning away
                setIsReady(true);
                setTimeout(() => onTripReady(parsed.tripData), 4500);
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => prev.map(m =>
                m.id === botMsgId ? { ...m, text: "Sorry, I hit a snag. Could you try again?", isStreaming: false } : m
            ));
        } finally {
            setIsBotTyping(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [onTripReady, setMessages]);

    useEffect(() => {
        if (hasGreeted.current || messages.length > 0) return;
        hasGreeted.current = true;
        // Provide a neutral, immediate greeting directly rather than calling the LLM
        setMessages([{
            id: 'welcome_msg',
            role: 'assistant',
            text: 'Hey there! Where are you thinking of heading? Or do you have a vibe in mind, like beaches, mountains, or maybe something cultural?',
            isStreaming: false
        }]);
    }, [setMessages, messages.length]);

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text || isBotTyping || isReady) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputValue('');
        const history = updatedMessages
            .filter(m => !m.isStreaming)
            .map(m => ({ role: m.role, content: m.text }));
        await sendToLLM(history);
    };

    if (isCollapsed) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '20px 16px',
                display: 'flex', flexDirection: 'column', gap: '16px',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent'
            }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-end', gap: '8px',
                        animation: 'msgIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards'
                    }}>
                        {msg.role === 'assistant' && (
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11,
                            }}>✈</div>
                        )}
                        <div style={
                            msg.role === 'user' ? {
                                maxWidth: '80%', padding: fontSize >= 16 ? '14px 20px' : '10px 14px',
                                borderRadius: '16px 16px 4px 16px',
                                background: 'linear-gradient(135deg, #5b5ef4, #4338ca)',
                                color: '#fff', fontSize, lineHeight: '1.6',
                                fontFamily: 'Inter, sans-serif', whiteSpace: 'pre-wrap',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.1)',
                            } : {
                                maxWidth: '80%', padding: fontSize >= 16 ? '14px 20px' : '10px 14px',
                                borderRadius: '16px 16px 16px 4px',
                                background: 'rgba(22, 22, 38, 0.85)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                color: '#e2e8f0', fontSize, lineHeight: '1.6',
                                backdropFilter: 'blur(12px)', whiteSpace: 'pre-wrap',
                                fontFamily: 'Inter, sans-serif',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }
                        }>
                            {msg.role === 'assistant' ? (
                                <RollingText text={msg.text} isStreaming={msg.isStreaming} />
                            ) : (
                                msg.text || ' '
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing dots */}
                {isBotTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                        }}>✈</div>
                        <div style={{
                            padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                            background: 'rgba(22, 22, 38, 0.85)', border: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                            {[0, 0.2, 0.4].map((delay, i) => (
                                <span key={i} style={{
                                    display: 'inline-block', width: 5, height: 5,
                                    borderRadius: '50%', background: '#818cf8',
                                    animation: `blink 1.4s ${delay}s infinite ease-in-out both`
                                }}></span>
                            ))}
                        </div>
                    </div>
                )}

                {isReady && (
                    <div style={{ textAlign: 'center', padding: '8px' }}>
                        <span style={{
                            fontSize: 12, color: '#818cf8',
                            background: 'rgba(99,102,241,0.1)', padding: '6px 14px',
                            borderRadius: 99, border: '1px solid rgba(99,102,241,0.2)',
                        }}>✨ Handing over to agents...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input - only when chat not done */}
            {!isReady && (
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(10,10,20,0.4)',
                }}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={isBotTyping ? 'Thinking...' : 'Message Safar AI...'}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isBotTyping}
                            autoFocus
                            style={{
                                flex: 1, background: 'rgba(15,15,28,0.7)', backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                                padding: fontSize >= 16 ? '14px 18px' : '10px 14px',
                                fontSize: fontSize >= 16 ? 15 : 13,
                                color: '#f1f5f9',
                                outline: 'none', fontFamily: 'Inter, sans-serif',
                                transition: 'border 0.2s',
                            }}
                        />
                        <button type="submit"
                            disabled={!inputValue.trim() || isBotTyping}
                            style={{
                                width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #6366f1, #d946ef)',
                                border: 'none', cursor: 'pointer', opacity: (!inputValue.trim() || isBotTyping) ? 0.4 : 1,
                                transition: 'all 0.2s',
                            }}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
