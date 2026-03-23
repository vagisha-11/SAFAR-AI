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
    const [interimText, setInterimText] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasGreeted = useRef(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialize SpeechRecognition on mount
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true; // Keeps listening until manually toggled off
            recognition.interimResults = true; // Stream results live as user speaks
            recognition.lang = 'en-IN'; // Indian English optimization

            recognition.onresult = (event: any) => {
                let finalAddition = '';
                let interimAddition = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalAddition += event.results[i][0].transcript;
                    } else {
                        interimAddition += event.results[i][0].transcript;
                    }
                }

                if (finalAddition) {
                    setInputValue(prev => (prev + ' ' + finalAddition).trim());
                }
                setInterimText(interimAddition);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
                setInterimText('');
            };

            recognition.onend = () => {
                setIsListening(false);
                setInterimText('');
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice recognition is not supported in your browser. Please try Chrome or Safari.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Already started", e);
            }
        }
    };

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    useEffect(() => {
        scrollToBottom(!isBotTyping);
    }, [messages, isBotTyping, scrollToBottom]);    const sendToLLM = useCallback(async (history: { role: string; content: string }[]) => {
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

    const SUGGESTIONS = [
        { label: "Goa Getaway", detail: "plan a 5 day getaway to goa", text: "Plan a 5 day getaway to Goa" },
        { label: "Jaipur Budget", detail: "plan a budget trip under 20k", text: "Plan a budget trip to Jaipur under 20k" },
        { label: "Manali Trek", detail: "plan a group trekking expidition to Manali", text: "Plan a group trekking expedition to Manali" }
    ];

    useEffect(() => {
        if (hasGreeted.current || messages.length > 0) return;
        hasGreeted.current = true;
        
        // Initial silent greeting for state tracking, but UI will show the Hero version
        setMessages([{
            id: 'welcome_msg',
            role: 'assistant',
            text: "Hi! I am Safar, how may I help you?",
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes slideInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '20px 16px',
                display: 'flex', flexDirection: 'column', gap: '16px',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent'
            }}>
                {/* Hero Greeting (Only shown before conversation starts) */}
                {messages.length <= 1 && !inputValue && (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', animation: 'fadeIn 0.8s ease-out', textAlign: 'center'
                    }}>
                        <div style={{
                            position: 'absolute', top: -140, right: 30,
                            width: 200, height: 200,
                            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))',
                            animation: 'float 4s ease-in-out infinite',
                            zIndex: 100, pointerEvents: 'none'
                        }}>
                             <img src="/safar-mascot.png" 
                                  alt="Safar Bot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <h2 style={{
                            fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 700,
                            color: '#1e293b', marginBottom: 8
                        }}>Hi I am</h2>
                        <h1 style={{
                            fontFamily: 'Outfit, sans-serif', fontSize: 64, fontWeight: 900,
                            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            marginBottom: 40, lineHeight: 1
                        }}>Safar</h1>

                        {/* Floating Suggestions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', alignItems: 'center' }}>
                            {SUGGESTIONS.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInputValue(s.text); inputRef.current?.focus(); }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        border: 'none', borderRadius: '16px', padding: '12px 20px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                        cursor: 'pointer', maxWidth: 320, width: 'fit-content',
                                        animation: `slideInUp 0.5s ${i * 0.1}s both`,
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                                    <div style={{ color: '#1e293b', fontSize: 14 }}>{s.detail}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actual Chat History (shorter padding if hero is shown) */}
                {(messages.length > 1 || !!inputValue) && messages.map((msg) => (
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
                    padding: '24px 20px',
                    background: 'transparent',
                    maxWidth: 600, width: '100%', margin: '0 auto'
                }}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        style={{
                            display: 'flex', gap: '8px', alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '24px', padding: '6px 6px 6px 16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)',
                            border: '1px solid rgba(255,255,255,0.8)',
                            position: 'relative',
                            backdropFilter: 'blur(20px)'
                        }}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={isBotTyping ? 'Thinking...' : 'Where do you want to go?'}
                            value={inputValue + (interimText ? ' ' + interimText : '')}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                setInterimText(''); // Override dictation if user types manually
                            }}
                            disabled={isBotTyping}
                            autoFocus
                            style={{
                                flex: 1, background: 'transparent',
                                border: 'none',
                                padding: '12px 0',
                                fontSize: 16,
                                color: '#1e293b',
                                outline: 'none', fontFamily: 'Inter, sans-serif',
                            }}
                        />

                        {/* Sparkle Icon Decorator */}
                        <div style={{
                            color: '#6366f1', display: 'flex', alignItems: 'center', paddingRight: 8,
                            opacity: 0.8
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L14.5 9L22 11.5L14.5 14L12 21L9.5 14L2 11.5L9.5 9L12 2Z" />
                            </svg>
                        </div>

                        <button type="button"
                            onClick={toggleListening}
                            disabled={isBotTyping}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                border: 'none',
                                cursor: 'pointer', opacity: isBotTyping ? 0.4 : 1,
                                transition: 'all 0.2s',
                                color: isListening ? '#f87171' : '#64748b'
                            }}
                            title="Dictate with Voice">
                            {isListening ? (
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2h2v2a5 5 0 0 0 10 0v-2h2Z" />
                                    <path d="M11 20v2h2v-2h-2Z" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                </svg>
                            )}
                        </button>
                        <button type="submit"
                            disabled={!inputValue.trim() || isBotTyping}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                border: 'none', cursor: 'pointer', opacity: (!inputValue.trim() || isBotTyping) ? 0.4 : 1,
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                            }}>
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
