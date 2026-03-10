// ============================================================
// Safar AI — Zustand State Management Store
// ============================================================
import { create } from 'zustand';
import {
    TripInput, LocalitySplit, AgentData, FullItinerary,
    DayPlan, Hotel, Review, BudgetAllocation, TravelSelection,
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
    recalculateTotalCost: () => void;

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

    // Selections
    selectedHotels: Record<string, Hotel>; // locality -> hotel
    setSelectedHotel: (locality: string, hotel: Hotel) => void;
    setSelectedTravel: (type: 'outbound' | 'return', travel: TravelSelection) => void;
    setSelectedInterCitySegment: (locality: string, option: any) => void; // Using any for InterCityOption to avoid type issues if not exported correctly

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

export const useSafarStore = create<SafarState>((set, get) => ({
    ...initialState,

    setTripInput: (input) => set({ tripInput: input }),
    setLocalitySplit: (split) => set({ localitySplit: split }),
    setAgentData: (data) => set({ agentData: data }),

    setItinerary: (itinerary) => {
        // Synchronize selectedHotels with what was initially chosen by Agent C
        const initialHotels: Record<string, Hotel> = {};
        for (const day of itinerary.days) {
            if (day.hotel) initialHotels[day.locality] = day.hotel;
        }
        set({ itinerary, currentCost: itinerary.totalCost, selectedHotels: initialHotels });
    },

    updateDayPlan: (dayNumber, dayPlan) => {
        set((state) => {
            if (!state.itinerary) return {};
            const days = state.itinerary.days.map((d) =>
                d.dayNumber === dayNumber ? dayPlan : d
            );
            return { itinerary: { ...state.itinerary, days } };
        });
        get().recalculateTotalCost();
    },

    recalculateTotalCost: () => {
        const { itinerary, selectedHotels, localitySplit } = get();
        if (!itinerary) return;

        let total = 0;

        // 1. Sum cost of all activities in DayPlans
        for (const day of itinerary.days) {
            for (const item of day.items) {
                if (item.type === 'spot') total += (item.data as any).entryFee || 0;
                if (item.type === 'restaurant') total += ((item.data as any).avgCostForTwo / 2) || 0;
                if (item.type === 'p2p') total += (item.data as any).cost || 0;
                if (item.type === 'intercity') total += (item.data as any).price || 0;
            }
        }

        // 2. Add selected hotels cost
        for (const loc of localitySplit) {
            if (loc.isTransitDay) continue;
            const hotel = selectedHotels[loc.locality];
            if (hotel) {
                total += hotel.pricePerNight * loc.days;
            }
        }

        // 3. Add inter-city travel cost
        if (itinerary.outboundTravel) total += itinerary.outboundTravel.data.price || 0;
        if (itinerary.returnTravel) total += itinerary.returnTravel.data.price || 0;

        set({ currentCost: Math.round(total) });
    },

    setBudget: (budget) => set({ budget }),

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

    setSelectedHotel: (locality, hotel) => {
        set((state) => ({
            selectedHotels: { ...state.selectedHotels, [locality]: hotel },
        }));
        get().recalculateTotalCost();
    },

    setSelectedTravel: (type, travel) => {
        const { itinerary } = get();
        if (!itinerary) return;

        const nextItinerary = { ...itinerary };
        if (type === 'outbound') nextItinerary.outboundTravel = travel;
        else nextItinerary.returnTravel = travel;

        // Update the items in day plans to show the new selection
        const updatedDays = [...nextItinerary.days];
        const dayIdx = type === 'outbound' ? 0 : updatedDays.length - 1;

        if (dayIdx >= 0 && updatedDays[dayIdx]) {
            const day = updatedDays[dayIdx];
            // Remove existing travel of ALL types to replace with new selection
            const filteredItems = day.items.filter(item => item.type !== 'flight' && item.type !== 'train');

            const travelItem = {
                type: travel.type,
                data: travel.data,
                startTime: new Date(travel.data.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                endTime: new Date(travel.data.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                notes: `${type === 'outbound' ? '✈️ Outbound' : '✈️ Return'}: ${travel.data.source} → ${travel.data.destination}`,
            };

            updatedDays[dayIdx] = {
                ...day,
                items: type === 'outbound' ? [travelItem, ...filteredItems] : [...filteredItems, travelItem],
            };
        }

        set({ itinerary: { ...nextItinerary, days: updatedDays } });
        get().recalculateTotalCost();
    },

    setSelectedInterCitySegment: (locality, option) => {
        const { itinerary } = get();
        if (!itinerary) return;

        const nextItinerary = { ...itinerary };
        const updatedDays = [...nextItinerary.days];
        const dayIdx = updatedDays.findIndex(d => d.locality === locality && d.isTransitDay);

        if (dayIdx >= 0) {
            const day = updatedDays[dayIdx];
            const transitItem = {
                type: 'intercity' as const,
                data: option,
                startTime: option.departureTimes[0] === 'Anytime' ? '09:00' : option.departureTimes[0],
                endTime: '13:00',
                notes: `🕒 Mode: ${option.modeName} (${option.type.replace('_', ' ')})`,
            };
            updatedDays[dayIdx] = { ...day, items: [transitItem], totalCost: option.price };
        }

        set({ itinerary: { ...nextItinerary, days: updatedDays } });
        get().recalculateTotalCost();
    },

    reset: () => set(initialState),
}));
