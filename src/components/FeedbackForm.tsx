'use client';

import { useState } from 'react';
import { useSafarStore } from '@/lib/store';
import { Review } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface FeedbackFormProps {
    spotId: string;
    onClose: () => void;
}

export default function FeedbackForm({ spotId, onClose }: FeedbackFormProps) {
    const { addReview } = useSafarStore();
    const [rating, setRating] = useState(4);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        if (!comment.trim()) return;

        const review: Review = {
            id: uuidv4(),
            spotId,
            userId: 'user-1', // MVP: single user
            rating,
            comment: comment.trim(),
            timestamp: new Date().toISOString(),
        };

        addReview(review);
        setSubmitted(true);
        setTimeout(onClose, 1500);
    };

    if (submitted) {
        return (
            <div style={{
                marginTop: 8, padding: '12px 14px', borderRadius: 8,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
                textAlign: 'center', fontSize: 13, color: '#10b981',
                animation: 'fadeIn 0.3s ease-out',
            }}>
                ✅ Thanks for your feedback!
            </div>
        );
    }

    return (
        <div style={{
            marginTop: 8, padding: '12px 14px', borderRadius: 8,
            background: 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.1)',
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#a0a0cc' }}>Your Rating</span>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: '#6b6b99',
                    cursor: 'pointer', fontSize: 14,
                }}>✕</button>
            </div>

            {/* Star rating */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        onClick={() => setRating(star)}
                        style={{
                            background: 'none', border: 'none', fontSize: 20,
                            cursor: 'pointer', opacity: star <= rating ? 1 : 0.3,
                            transition: 'all 0.2s',
                        }}
                    >
                        ⭐
                    </button>
                ))}
            </div>

            {/* Comment */}
            <textarea
                className="input-field"
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                style={{ resize: 'none', fontSize: 13, marginBottom: 8 }}
            />

            <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={!comment.trim()}
                style={{ width: '100%', padding: '8px 16px', fontSize: 13, justifyContent: 'center' }}
            >
                Submit Feedback
            </button>
        </div>
    );
}
