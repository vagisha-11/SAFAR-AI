// // ============================================================
// // Safar AI — Zustand State Management Store
// // ============================================================
// import { create } from 'zustand';
// import {
//     TripInput, LocalitySplit, AgentData, FullItinerary,
//     DayPlan, Hotel, Review, BudgetAllocation, TravelSelection, RouteInfo,
// } from './types';

// // ---------- STATE INTERFACE ----------
// interface SafarState {
//     // Trip Input
//     tripInput: TripInput | null;
//     setTripInput: (input: TripInput) => void;

//     // Locality Split
//     localitySplit: LocalitySplit[];
//     setLocalitySplit: (split: LocalitySplit[]) => void;

//     // Agent Data
//     agentData: AgentData | null;
//     setAgentData: (data: AgentData) => void;

//     // Itinerary
//     itinerary: FullItinerary | null;
//     setItinerary: (itinerary: FullItinerary) => void;
//     updateDayPlan: (dayNumber: number, dayPlan: DayPlan) => void;
//     addSpotToDay: (dayNumber: number, spot: any) => void;
//     removeSpotFromDay: (dayNumber: number, spotId: string) => void;

//     // Budget
//     budget: BudgetAllocation | null;
//     setBudget: (budget: BudgetAllocation) => void;
//     currentCost: number;
//     recalculateTotalCost: () => void;

//     // UI State
//     selectedDay: number | null; // null = entire trip
//     setSelectedDay: (day: number | null) => void;
//     isLoading: boolean;
//     setIsLoading: (loading: boolean) => void;
//     loadingMessage: string;
//     setLoadingMessage: (msg: string) => void;
//     activeStep: 'input' | 'planning' | 'results';
//     setActiveStep: (step: 'input' | 'planning' | 'results') => void;

//     // Prompt
//     promptHistory: { role: 'user' | 'assistant'; content: string }[];
//     addPromptMessage: (role: 'user' | 'assistant', content: string) => void;

//     // Reviews
//     reviews: Review[];
//     addReview: (review: Review) => void;

//     // Selections
//     selectedHotels: Record<string, Hotel>; // locality -> hotel
//     setSelectedHotel: (locality: string, hotel: Hotel) => void;
//     setSelectedTravel: (type: 'outbound' | 'return', travel: TravelSelection) => void;
//     setSelectedInterCitySegment: (locality: string, option: any) => void;
//     selectedPlaceId: string | null;
//     setSelectedPlaceId: (id: string | null) => void;

//     // Suggestions
//     suggestions: { type: string; message: string; data: any }[];
//     setSuggestions: (suggestions: any[]) => void;
//     applySuggestion: (suggestion: any) => void;

//     // Day Routes (from Ola Directions API — for Agent B ETA data)
//     dayRoutes: RouteInfo[];
//     setDayRoutes: (routes: RouteInfo[]) => void;

//     // Reset
//     reset: () => void;
// }

// const initialState = {
//     tripInput: null,
//     localitySplit: [],
//     agentData: null,
//     itinerary: null,
//     budget: null,
//     currentCost: 0,
//     selectedDay: null,
//     isLoading: false,
//     loadingMessage: '',
//     activeStep: 'input' as const,
//     promptHistory: [],
//     reviews: [],
//     selectedHotels: {},
//     suggestions: [],
//     selectedPlaceId: null,
//     dayRoutes: [],
// };

// export const useSafarStore = create<SafarState>((set, get) => ({
//     ...initialState,

//     setTripInput: (input) => set({ tripInput: input }),
//     setLocalitySplit: (split) => set({ localitySplit: split }),
//     setAgentData: (data) => set({ agentData: data }),

//     setItinerary: (itinerary) => {
//         // Synchronize selectedHotels with what was initially chosen by Agent C
//         const initialHotels: Record<string, Hotel> = {};
//         for (const day of itinerary.days) {
//             if (day.hotel) initialHotels[day.locality] = day.hotel;
//         }
//         set({
//             itinerary,
//             tripInput: itinerary.tripInput, // Sync trip input (budget, etc.)
//             currentCost: itinerary.totalCost,
//             selectedHotels: initialHotels
//         });
//         get().recalculateTotalCost();
//     },

//     updateDayPlan: (dayNumber, dayPlan) => {
//         set((state) => {
//             if (!state.itinerary) return {};
//             const days = state.itinerary.days.map((d) =>
//                 d.dayNumber === dayNumber ? dayPlan : d
//             );
//             return { itinerary: { ...state.itinerary, days } };
//         });
//         get().recalculateTotalCost();
//     },

//     recalculateTotalCost: () => {
//         const { itinerary, selectedHotels, localitySplit } = get();
//         if (!itinerary) return;

//         let total = 0;

//         // 1. Sum cost of all activities in DayPlans
//         for (const day of itinerary.days) {
//             for (const item of day.items) {
//                 if (item.type === 'spot') total += (item.data as any).entryFee || 0;
//                 if (item.type === 'restaurant') total += ((item.data as any).avgCostForTwo / 2) || 0;
//                 if (item.type === 'p2p') total += (item.data as any).cost || 0;
//                 if (item.type === 'intercity') total += (item.data as any).price || 0;
//             }
//         }

//         // 2. Add selected hotels cost
//         for (const loc of localitySplit) {
//             if (loc.isTransitDay) continue;
//             const hotel = selectedHotels[loc.locality];
//             if (hotel) {
//                 total += hotel.pricePerNight * loc.days;
//             }
//         }

//         // 3. Add inter-city travel cost
//         if (itinerary.outboundTravel) total += itinerary.outboundTravel.data.price || 0;
//         if (itinerary.returnTravel) total += itinerary.returnTravel.data.price || 0;

//         set({ currentCost: Math.round(total) });
//     },

//     setBudget: (budget) => set({ budget }),

//     setSelectedDay: (day) => set({ selectedDay: day }),
//     setIsLoading: (loading) => set({ isLoading: loading }),
//     setLoadingMessage: (msg) => set({ loadingMessage: msg }),
//     setActiveStep: (step) => set({ activeStep: step }),
//     addPromptMessage: (role, content) =>
//         set((state) => ({
//             promptHistory: [...state.promptHistory, { role, content }],
//         })),
//     addReview: (review) =>
//         set((state) => ({ reviews: [...state.reviews, review] })),

//     setSelectedHotel: (locality, hotel) => {
//         set((state) => ({
//             selectedHotels: { ...state.selectedHotels, [locality]: hotel },
//         }));
//         get().recalculateTotalCost();
//     },

//     setSelectedTravel: (type, travel) => {
//         const { itinerary } = get();
//         if (!itinerary) return;

//         const nextItinerary = { ...itinerary };
//         if (type === 'outbound') nextItinerary.outboundTravel = travel;
//         else nextItinerary.returnTravel = travel;

//         // Update the items in day plans to show the new selection
//         const updatedDays = [...nextItinerary.days];
//         const dayIdx = type === 'outbound' ? 0 : updatedDays.length - 1;

//         if (dayIdx >= 0 && updatedDays[dayIdx]) {
//             const day = updatedDays[dayIdx];
//             // Remove existing travel of ALL types to replace with new selection
//             const filteredItems = day.items.filter(item => item.type !== 'flight' && item.type !== 'train');

//             const travelItem = {
//                 type: travel.type,
//                 data: travel.data,
//                 startTime: new Date(travel.data.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
//                 endTime: new Date(travel.data.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
//                 notes: `${type === 'outbound' ? '✈️ Outbound' : '✈️ Return'}: ${travel.data.source} → ${travel.data.destination}`,
//             };

//             const nextItems = type === 'outbound'
//                 ? [travelItem, ...filteredItems]
//                 : [...filteredItems, travelItem];

//             updatedDays[dayIdx] = {
//                 ...day,
//                 items: nextItems,
//             };
//         }

//         set({ itinerary: { ...nextItinerary, days: updatedDays } });
//         get().recalculateTotalCost();
//     },

//     setSelectedInterCitySegment: (locality, option) => {
//         const { itinerary } = get();
//         if (!itinerary) return;

//         const nextItinerary = { ...itinerary };
//         const updatedDays = [...nextItinerary.days];
//         const dayIdx = updatedDays.findIndex(d => d.locality === locality && d.isTransitDay);

//         if (dayIdx >= 0) {
//             const day = updatedDays[dayIdx];
//             const transitItem = {
//                 type: 'intercity' as const,
//                 data: option,
//                 startTime: option.departureTimes[0] === 'Anytime' ? '09:00' : option.departureTimes[0],
//                 endTime: '13:00',
//                 notes: `🕒 Mode: ${option.modeName} (${option.type.replace('_', ' ')})`,
//             };
//             updatedDays[dayIdx] = { ...day, items: [transitItem], totalCost: option.price };
//         }

//         set({ itinerary: { ...nextItinerary, days: updatedDays } });
//         get().recalculateTotalCost();
//     },

//     setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),

//     setDayRoutes: (routes) => set({ dayRoutes: routes }),

//     addSpotToDay: (dayNumber, spot) => {
//         const { itinerary } = get();
//         if (!itinerary) return;

//         const nextItinerary = { ...itinerary };
//         const updatedDays = [...nextItinerary.days];
//         const dayIdx = updatedDays.findIndex(d => d.dayNumber === dayNumber);

//         if (dayIdx >= 0) {
//             const day = updatedDays[dayIdx];
//             const lastActiveItem = [...day.items].reverse().find(i => i.type === 'spot' || i.type === 'restaurant');
//             let startTime = '16:00';
//             if (lastActiveItem && lastActiveItem.endTime) {
//                 startTime = lastActiveItem.endTime;
//             }

//             const [h, m] = startTime.split(':').map(Number);
//             const endHour = Math.min(23, h + (spot.timeToSpend || 1));
//             const endTime = `${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

//             const newItem = {
//                 type: 'spot' as const,
//                 data: spot,
//                 startTime,
//                 endTime,
//                 notes: '✨ Manually added'
//             };

//             updatedDays[dayIdx] = {
//                 ...day,
//                 items: [...day.items, newItem].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
//             };

//             const nextUnselected = (itinerary.unselectedSpots || []).filter(s => (s as any).id !== spot.id);
//             set({ itinerary: { ...nextItinerary, days: updatedDays, unselectedSpots: nextUnselected } });
//             get().recalculateTotalCost();
//         }
//     },

//     removeSpotFromDay: (dayNumber, spotId) => {
//         const { itinerary } = get();
//         if (!itinerary) return;

//         const nextItinerary = { ...itinerary };
//         const updatedDays = [...nextItinerary.days];
//         const dayIdx = updatedDays.findIndex(d => d.dayNumber === dayNumber);

//         if (dayIdx >= 0) {
//             const day = updatedDays[dayIdx];
//             const spotItem = day.items.find(i => i.type === 'spot' && (i.data as any).id === spotId);
//             const removedSpot = spotItem?.data;
//             const nextItems = day.items.filter(i => !(i.type === 'spot' && (i.data as any).id === spotId));

//             updatedDays[dayIdx] = { ...day, items: nextItems };

//             const nextUnselected = [...(itinerary.unselectedSpots || [])];
//             if (removedSpot) nextUnselected.push(removedSpot as any);

//             set({ itinerary: { ...nextItinerary, days: updatedDays, unselectedSpots: nextUnselected } });
//             get().recalculateTotalCost();
//         }
//     },

//     setSuggestions: (suggestions) => set({ suggestions }),

//     applySuggestion: (suggestion) => {
//         if (suggestion.type === 'shorten_trip') {
//             const { tripInput } = get();
//             if (!tripInput) return;

//             // Calculate new return date
//             const start = new Date(tripInput.departureDate);
//             const newReturnDate = new Date(start.getTime() + (suggestion.recommendedDays - 1) * 86400000);

//             const nextTripInput = {
//                 ...tripInput,
//                 returnDate: newReturnDate.toISOString().split('T')[0],
//             };

//             set({
//                 tripInput: nextTripInput,
//                 activeStep: 'planning', // Go back to planning to trigger re-run
//                 itinerary: null, // Clear old itinerary
//                 suggestions: [] // Clear suggestions
//             });
//         }
//     },

//     reset: () => set(initialState),
// }));
// ============================================================
// Safar AI — Zustand State Management Store
// ============================================================
import { create } from 'zustand';
import {
    TripInput, LocalitySplit, AgentData, FullItinerary,
    DayPlan, Hotel, Review, BudgetAllocation, TravelSelection, RouteInfo, LatLng
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
    addSpotToDay: (dayNumber: number, spot: any) => void;
    removeSpotFromDay: (dayNumber: number, spotId: string) => void;

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
    loadingFunFacts: string[];
    setLoadingFunFacts: (facts: string[]) => void;

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
    setSelectedInterCitySegment: (locality: string, option: any) => void;
    selectedPlaceId: string | null;
    setSelectedPlaceId: (id: string | null) => void;

    // Wikimedia Photo Viewer
    photoViewerPlace: string | null;
    setPhotoViewerPlace: (place: string | null) => void;

    // Suggestions
    suggestions: { type: string; message: string; data: any }[];
    setSuggestions: (suggestions: any[]) => void;
    applySuggestion: (suggestion: any) => void;

    // Day Routes (from Ola Directions API — for Agent B ETA data)
    dayRoutes: RouteInfo[];
    setDayRoutes: (routes: RouteInfo[]) => void;

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
    loadingFunFacts: [],
    activeStep: 'input' as const,
    promptHistory: [],
    reviews: [],
    selectedHotels: {},
    suggestions: [],
    selectedPlaceId: null,
    dayRoutes: [],
    photoViewerPlace: null,
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
        set({
            itinerary,
            tripInput: itinerary.tripInput, // Sync trip input (budget, etc.)
            currentCost: itinerary.totalCost,
            selectedHotels: initialHotels
        });
        get().recalculateTotalCost();
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
    setLoadingFunFacts: (facts) => set({ loadingFunFacts: facts }),
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

            const nextItems = type === 'outbound'
                ? [travelItem, ...filteredItems]
                : [...filteredItems, travelItem];

            updatedDays[dayIdx] = {
                ...day,
                items: nextItems,
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

    setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),

    setPhotoViewerPlace: (place) => set({ photoViewerPlace: place }),

    setDayRoutes: (routes) => set({ dayRoutes: routes }),

    addSpotToDay: async (dayNumber, spot) => {
        const { itinerary } = get();
        if (!itinerary) return;

        try {
            const res = await fetch('/api/deltaUpdate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_place',
                    itinerary,
                    payload: { spot, dayNumber }
                })
            });
            const data = await res.json();

            if (data.arbitrationRequired) {
                const conflictName = data.conflictingSpot?.name || 'a downstream spot';
                const message = `Adding '${spot.name}' will mathematically push your schedule back and cause you to miss '${conflictName}' before it closes.\n\nDo you want to drop '${conflictName}' and add '${spot.name}' instead?`;
                
                if (window.confirm(message)) {
                    // Trigger Swap Place
                    const swapRes = await fetch('/api/deltaUpdate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'swap_place',
                            itinerary,
                            payload: { spot, dayNumber, spotId: data.conflictingSpot.id }
                        })
                    });
                    const swapData = await swapRes.json();
                    if (swapData.success) {
                        get().setItinerary(swapData.itinerary);
                    } else {
                        alert(swapData.error || 'Failed to swap places.');
                    }
                }
            } else if (data.success) {
                // Success geometric insertion
                get().setItinerary(data.itinerary);

                // Assuming unselected spots were managed somehow, let's manually clean it up here
                const nextUnselected = (itinerary.unselectedSpots || []).filter(s => (s as any).id !== spot.id);
                set(state => ({
                    itinerary: { ...state.itinerary!, unselectedSpots: nextUnselected }
                }));
            }
        } catch (err) {
            console.error('Failed to add spot via DeltaUpdate:', err);
        }
    },

    removeSpotFromDay: (dayNumber, spotId) => {
        const { itinerary } = get();
        if (!itinerary) return;

        const nextItinerary = { ...itinerary };
        const updatedDays = [...nextItinerary.days];
        const dayIdx = updatedDays.findIndex(d => d.dayNumber === dayNumber);

        if (dayIdx >= 0) {
            const day = updatedDays[dayIdx];
            const spotItem = day.items.find(i => i.type === 'spot' && (i.data as any).id === spotId);
            const removedSpot = spotItem?.data;
            const nextItems = day.items.filter(i => !(i.type === 'spot' && (i.data as any).id === spotId));

            updatedDays[dayIdx] = { ...day, items: nextItems };

            const nextUnselected = [...(itinerary.unselectedSpots || [])];
            if (removedSpot) nextUnselected.push(removedSpot as any);

            set({ itinerary: { ...nextItinerary, days: updatedDays, unselectedSpots: nextUnselected } });
            get().recalculateTotalCost();
        }
    },

    setSuggestions: (suggestions) => set({ suggestions }),

    applySuggestion: (suggestion) => {
        if (suggestion.type === 'shorten_trip') {
            const { tripInput } = get();
            if (!tripInput) return;

            // Calculate new return date
            const start = new Date(tripInput.departureDate);
            const newReturnDate = new Date(start.getTime() + (suggestion.recommendedDays - 1) * 86400000);

            const nextTripInput = {
                ...tripInput,
                returnDate: newReturnDate.toISOString().split('T')[0],
            };

            set({
                tripInput: nextTripInput,
                activeStep: 'planning', // Go back to planning to trigger re-run
                itinerary: null, // Clear old itinerary
                suggestions: [] // Clear suggestions
            });
        }
    },

    reset: () => set(initialState),
}));
