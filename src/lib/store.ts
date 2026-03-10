// ============================================================
// Safar AI — Zustand State Management Store
// ============================================================
import { create } from 'zustand';
import {
    TripInput, LocalitySplit, AgentData, FullItinerary,
    DayPlan, Hotel, Review, BudgetAllocation,
} from './types';

// ---------- STATE INTERFACE ----------
interface SafarState {
    // Trip Input
    tripInput: TripInput | null;
    setTripInput: (input: TripInput) => void;

    // Locality Split
    localitySplit: LocalitySplit[];
    setLocalitySplit: (split: LocalitySplit[]) => void;

    // Agent Data
    agentData: AgentData | null;
    setAgentData: (data: AgentData) => void;

    // Itinerary
    itinerary: FullItinerary | null;
    setItinerary: (itinerary: FullItinerary) => void;
    updateDayPlan: (dayNumber: number, dayPlan: DayPlan) => void;

    // Budget
    budget: BudgetAllocation | null;
    setBudget: (budget: BudgetAllocation) => void;
    currentCost: number;
    setCurrentCost: (cost: number) => void;

    // UI State
    selectedDay: number | null; // null = entire trip
    setSelectedDay: (day: number | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    loadingMessage: string;
    setLoadingMessage: (msg: string) => void;
    activeStep: 'input' | 'planning' | 'results';
    setActiveStep: (step: 'input' | 'planning' | 'results') => void;

    // Prompt
    promptHistory: { role: 'user' | 'assistant'; content: string }[];
    addPromptMessage: (role: 'user' | 'assistant', content: string) => void;

    // Reviews
    reviews: Review[];
    addReview: (review: Review) => void;

    // Selected hotel per locality
    selectedHotels: Record<string, Hotel>;
    setSelectedHotel: (locality: string, hotel: Hotel) => void;

    // Reset
    reset: () => void;
}

const initialState = {
    tripInput: null,
    localitySplit: [],
    agentData: null,
    itinerary: null,
    budget: null,
    currentCost: 0,
    selectedDay: null,
    isLoading: false,
    loadingMessage: '',
    activeStep: 'input' as const,
    promptHistory: [],
    reviews: [],
    selectedHotels: {},
};

export const useSafarStore = create<SafarState>((set) => ({
    ...initialState,

    setTripInput: (input) => set({ tripInput: input }),
    setLocalitySplit: (split) => set({ localitySplit: split }),
    setAgentData: (data) => set({ agentData: data }),
    setItinerary: (itinerary) =>
        set({ itinerary, currentCost: itinerary.totalCost }),
    updateDayPlan: (dayNumber, dayPlan) =>
        set((state) => {
            if (!state.itinerary) return {};
            const days = state.itinerary.days.map((d) =>
                d.dayNumber === dayNumber ? dayPlan : d
            );
            const totalCost = days.reduce((sum, d) => sum + d.totalCost, 0);
            return {
                itinerary: { ...state.itinerary, days, totalCost },
                currentCost: totalCost,
            };
        }),
    setBudget: (budget) => set({ budget }),
    setCurrentCost: (cost) => set({ currentCost: cost }),
    setSelectedDay: (day) => set({ selectedDay: day }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setLoadingMessage: (msg) => set({ loadingMessage: msg }),
    setActiveStep: (step) => set({ activeStep: step }),
    addPromptMessage: (role, content) =>
        set((state) => ({
            promptHistory: [...state.promptHistory, { role, content }],
        })),
    addReview: (review) =>
        set((state) => ({ reviews: [...state.reviews, review] })),
    setSelectedHotel: (locality, hotel) =>
        set((state) => ({
            selectedHotels: { ...state.selectedHotels, [locality]: hotel },
        })),
    reset: () => set(initialState),
}));
