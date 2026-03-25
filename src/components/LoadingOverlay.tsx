// 'use client';

// import { useSafarStore } from '@/lib/store';

// export default function LoadingOverlay() {
//     const { loadingMessage } = useSafarStore();

//     return (
//         <div style={{
//             position: 'fixed',
//             inset: 0,
//             zIndex: 9999,
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center',
//             background: 'rgba(10, 10, 26, 0.9)',
//             backdropFilter: 'blur(10px)',
//         }}>
//             {/* Animated rings */}
//             <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 32 }}>
//                 <div style={{
//                     position: 'absolute', inset: 0,
//                     border: '3px solid transparent',
//                     borderTopColor: '#6366f1',
//                     borderRadius: '50%',
//                     animation: 'spin 0.8s linear infinite',
//                 }} />
//                 <div style={{
//                     position: 'absolute', inset: 8,
//                     border: '3px solid transparent',
//                     borderTopColor: '#f59e0b',
//                     borderRadius: '50%',
//                     animation: 'spin 1.2s linear infinite reverse',
//                 }} />
//                 <div style={{
//                     position: 'absolute', inset: 16,
//                     border: '3px solid transparent',
//                     borderTopColor: '#10b981',
//                     borderRadius: '50%',
//                     animation: 'spin 1.6s linear infinite',
//                 }} />
//                 {/* Center icon */}
//                 <div style={{
//                     position: 'absolute', inset: 24,
//                     display: 'flex', alignItems: 'center', justifyContent: 'center',
//                     fontSize: 20,
//                 }}>
//                     ✈️
//                 </div>
//             </div>

//             {/* Agent status messages */}
//             <h3 style={{
//                 fontFamily: 'Outfit, sans-serif',
//                 fontWeight: 600,
//                 fontSize: 20,
//                 color: '#f0f0ff',
//                 marginBottom: 8,
//             }}>
//                 Crafting Your Perfect Trip
//             </h3>
//             <p style={{
//                 color: '#a0a0cc',
//                 fontSize: 14,
//                 textAlign: 'center',
//                 maxWidth: 400,
//                 lineHeight: 1.5,
//             }}>
//                 {loadingMessage || 'Our AI agents are collaborating to build your itinerary...'}
//             </p>

//             {/* Progress dots */}
//             <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
//                 {['Agent A: Fetching Data', 'Agent B: Planning', 'Agent C: Budgeting'].map((label, i) => (
//                     <div key={label} style={{
//                         display: 'flex', alignItems: 'center', gap: 6,
//                         padding: '6px 14px',
//                         borderRadius: 9999,
//                         background: 'rgba(99, 102, 241, 0.1)',
//                         border: '1px solid rgba(99, 102, 241, 0.2)',
//                         fontSize: 12,
//                         color: '#818cf8',
//                         animation: `fadeIn 0.5s ease-out ${i * 0.3}s both`,
//                     }}>
//                         <span style={{
//                             width: 6, height: 6,
//                             borderRadius: '50%',
//                             background: ['#6366f1', '#f59e0b', '#10b981'][i],
//                             animation: 'pulse-glow 1.5s ease-in-out infinite',
//                             animationDelay: `${i * 0.5}s`,
//                         }} />
//                         {label}
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }
'use client';

import { useState, useEffect } from 'react';
import { useSafarStore } from '@/lib/store';

const LOADING_STAGES = [
    { text: "Analyzing your travel preferences...", duration: 2500 },
    { text: "Curating the best spots in town...", duration: 3500 },
    { text: "Crafting a personalized daily schedule...", duration: 4000 },
    { text: "Optimizing routes and securing the best hotels...", duration: 3500 },
    { text: "Crunching the numbers to fit your budget...", duration: 3000 }
];

export default function LoadingOverlay() {
    const { loadingMessage, loadingFunFacts, tripInput } = useSafarStore();
    const destination = tripInput?.destination || 'your destination';
    
    const [progress, setProgress] = useState(0);
    const [subtitleText, setSubtitleText] = useState(LOADING_STAGES[0].text);
    const [factIndex, setFactIndex] = useState(0);

    // Simulated Progress Bar — eases out so it naturally slows near the end
    useEffect(() => {
        const TOTAL_MS = 22000; // expected max wait (22s budget)
        const start = Date.now();

        // easeOutCubic: fast start, slows to ~88% by end
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const frame = () => {
            const elapsed = Date.now() - start;
            const t = Math.min(elapsed / TOTAL_MS, 1); // 0..1
            const eased = easeOutCubic(t);
            const pct = Math.min(eased * 90, 90); // cap at 90 so there's visible room when real data arrives
            setProgress(pct);
            if (t < 1) requestAnimationFrame(frame);
        };

        const raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    // Sequenced, realistic subtitles
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const runStages = async () => {
            for (let i = 0; i < LOADING_STAGES.length; i++) {
                if (!isMounted) break;
                setSubtitleText(LOADING_STAGES[i].text);
                await new Promise(r => {
                    timeoutId = setTimeout(r, LOADING_STAGES[i].duration);
                });
            }
            if (isMounted) {
                setSubtitleText("Adding final touches to your itinerary...");
            }
        };

        runStages();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    // Rotating Fun Facts
    useEffect(() => {
        if (!loadingFunFacts || loadingFunFacts.length === 0) return;
        const interval = setInterval(() => {
            setFactIndex(prev => (prev + 1) % loadingFunFacts.length);
        }, 8000); // Change fact every 8s

        return () => clearInterval(interval);
    }, [loadingFunFacts]);

    // Construct dynamic subtitles
    const currentSubtitle = loadingMessage.includes('Finalizing') || loadingMessage.includes('❌')
        ? loadingMessage 
        : subtitleText.replace('town', destination);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary, rgba(10, 10, 26, 0.95))',
            backdropFilter: 'blur(12px)',
        }}>
            <style>{`
                @keyframes pulse-icon {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; text-shadow: 0 0 20px rgba(99,102,241,0.8); }
                }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            
            {/* Center icon */}
            <div style={{
                fontSize: 48,
                marginBottom: 24,
                animation: 'pulse-icon 2s ease-in-out infinite'
            }}>
                ✈️
            </div>

            {/* Main Title */}
            <h2 style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                fontSize: 28,
                color: '#f1f5f9',
                marginBottom: 8,
                letterSpacing: '-0.5px'
            }}>
                Crafting Your Perfect Trip
            </h2>

            {/* Rotating Subtitle */}
            <div style={{ minHeight: '24px', marginBottom: 40 }}>
                <p key={currentSubtitle} style={{
                    color: '#94a3b8',
                    fontSize: 16,
                    fontFamily: 'Inter, sans-serif',
                    animation: 'fade-up 0.4s ease-out',
                    margin: 0,
                    textAlign: 'center'
                }}>
                    {currentSubtitle}
                </p>
            </div>

            {/* Progress Bar Container */}
            <div style={{
                width: '320px',
                height: '6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '99px',
                overflow: 'hidden',
                marginBottom: 48,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #d946ef)',
                    borderRadius: '99px',
                    transition: 'width 0.1s linear',
                    boxShadow: '0 0 10px rgba(99,102,241,0.5)'
                }} />
            </div>

            {/* Fun Facts Section */}
            {loadingFunFacts && loadingFunFacts.length > 0 && (
                <div style={{
                    maxWidth: 400,
                    width: '100%',
                    padding: '16px 24px',
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: '16px',
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <span style={{
                        display: 'block',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#818cf8',
                        fontWeight: 600,
                        marginBottom: 8
                    }}>
                        Did You Know?
                    </span>
                    <p key={factIndex} style={{
                        color: '#cbd5e1',
                        fontSize: 14,
                        lineHeight: 1.5,
                        fontFamily: 'Inter, sans-serif',
                        animation: 'fade-up 0.5s ease-out',
                        margin: 0
                    }}>
                        {loadingFunFacts[factIndex]}
                    </p>
                </div>
            )}
        </div>
    );
}
