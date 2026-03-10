'use client';

import { useSafarStore } from '@/lib/store';
import { useState } from 'react';

export default function BudgetPanel() {
    const { itinerary, tripInput, budget, currentCost, setIsLoading, setLoadingMessage, setItinerary, setActiveStep } = useSafarStore();
    const [newBudget, setNewBudget] = useState('');

    if (!itinerary || !tripInput) return null;

    const budgetUsedPercent = Math.min(100, (currentCost / tripInput.budget) * 100);
    const isOverBudget = currentCost > tripInput.budget;

    // Calculate category costs
    const spotsCost = itinerary.days.reduce((sum, d) =>
        sum + d.items.filter(i => i.type === 'spot').reduce((s, i) => s + ((i.data as { entryFee?: number }).entryFee || 0), 0), 0
    );
    let interCityTravelCost = 0;
    if (itinerary.outboundTravel) interCityTravelCost += itinerary.outboundTravel.data.price;
    if (itinerary.returnTravel) interCityTravelCost += itinerary.returnTravel.data.price;

    const localTravelCost = itinerary.days.reduce((sum, d) =>
        sum + d.items.filter(i => i.type === 'p2p').reduce((s, i) => s + ((i.data as { cost?: number }).cost || 0), 0), 0
    );
    const totalTravelCost = localTravelCost + interCityTravelCost;

    const foodCost = itinerary.days.reduce((sum, d) =>
        sum + d.items.filter(i => i.type === 'restaurant').reduce((s, i) => s + (((i.data as { avgCostForTwo?: number }).avgCostForTwo || 0) / 2), 0), 0
    );
    const hotelCost = currentCost - spotsCost - totalTravelCost - foodCost;

    const categories = [
        { label: 'Accommodation', amount: Math.max(0, hotelCost), color: '#f59e0b', icon: '🏨' },
        { label: 'Travel', amount: totalTravelCost, color: '#6366f1', icon: '🚕' },
        { label: 'Activities', amount: spotsCost, color: '#10b981', icon: '🎯' },
        { label: 'Food', amount: foodCost, color: '#ec4899', icon: '🍽️' },
    ];

    const handleRecompute = async () => {
        if (!itinerary) return;
        setIsLoading(true);
        setLoadingMessage('💰 Recomputing budget allocation...');
        try {
            const updatedBudget = newBudget ? parseInt(newBudget) : tripInput.budget;
            const res = await fetch('/api/agentC', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayPlans: itinerary.days,
                    agentData: useSafarStore.getState().agentData,
                    tripInput: { ...tripInput, budget: updatedBudget },
                    localities: itinerary.localitySplit,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setItinerary(data.itinerary);
            }
        } catch (err) {
            console.error('Recompute failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700,
                color: '#f0f0ff', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                💰 Budget
                {isOverBudget && <span className="badge badge-danger" style={{ fontSize: 10 }}>Over Budget!</span>}
            </h2>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6,
                }}>
                    <span style={{ color: '#a0a0cc' }}>
                        ₹{currentCost.toLocaleString('en-IN')} of ₹{tripInput.budget.toLocaleString('en-IN')}
                    </span>
                    <span style={{ color: isOverBudget ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        {budgetUsedPercent.toFixed(0)}%
                    </span>
                </div>
                <div style={{
                    height: 6, borderRadius: 3,
                    background: 'rgba(99,102,241,0.1)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${Math.min(100, budgetUsedPercent)}%`,
                        background: isOverBudget
                            ? 'linear-gradient(90deg, #ef4444, #f97316)'
                            : 'linear-gradient(90deg, #10b981, #34d399)',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
            </div>

            {/* Category breakdown */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
            }}>
                {categories.map(cat => (
                    <div key={cat.label} style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(26,26,62,0.5)',
                        border: '1px solid rgba(99,102,241,0.08)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{cat.icon}</span>
                            <span style={{ fontSize: 11, color: '#6b6b99' }}>{cat.label}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: cat.color }}>
                            ₹{Math.round(cat.amount).toLocaleString('en-IN')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Remaining */}
            <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: isOverBudget
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(16,185,129,0.08)',
                border: `1px solid ${isOverBudget ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`,
                textAlign: 'center', marginBottom: 16,
            }}>
                <div style={{ fontSize: 11, color: '#6b6b99', marginBottom: 4 }}>
                    {isOverBudget ? 'Over Budget By' : 'Remaining Budget'}
                </div>
                <div style={{
                    fontWeight: 700, fontSize: 22,
                    color: isOverBudget ? '#ef4444' : '#10b981',
                }}>
                    ₹{Math.abs(tripInput.budget - currentCost).toLocaleString('en-IN')}
                </div>
            </div>

            {/* Recompute section */}
            <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.1)',
            }}>
                <label style={{
                    fontSize: 11, color: '#a0a0cc', display: 'block', marginBottom: 6,
                    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600,
                }}>
                    Adjust Budget (INR)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        type="number"
                        className="input-field"
                        placeholder={String(tripInput.budget)}
                        value={newBudget}
                        onChange={(e) => setNewBudget(e.target.value)}
                        style={{ flex: 1, padding: '10px 12px', fontSize: 14 }}
                    />
                    <button
                        onClick={handleRecompute}
                        className="btn-primary"
                        style={{ padding: '10px 18px', fontSize: 13, whiteSpace: 'nowrap' }}
                    >
                        🔄 Recompute
                    </button>
                </div>
            </div>
        </div>
    );
}
