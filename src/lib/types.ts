// ============================================================
// Safar AI — Core Type Definitions
// ============================================================

// ---------- HOTEL ----------
export interface Hotel {
  id: string;
  name: string;
  address: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  pricePerNight: number; // INR
  propertyType:
  | 'Hotel'
  | 'Apartment'
  | 'Villa'
  | 'Resort'
  | 'Homestay'
  | 'Cottage'
  | 'Hostel'
  | 'Camp'
  | 'Houseboat';
  location: LatLng;
  amenities: HotelAmenities;
  bookingLink: string;
  imageUrl?: string;
}

export interface HotelAmenities {
  wifi: boolean;
  spa: boolean;
  swimmingPool: boolean;
  balcony: boolean;
  elevator: boolean;
  caretaker: boolean;
  restaurant: boolean;
  kitchenAvailability: boolean;
  bar: boolean;
  barbeque: boolean;
  cafe: boolean;
  parking: boolean;
  bonfire: boolean;
  roomService: boolean;
  alcoholAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  unmarriedCouplesAllowed: boolean;
}

// ---------- FLIGHT ----------
export interface Flight {
  id: string;
  source: string;
  destination: string;
  flightNo: string;
  airline: string;
  price: number; // INR
  departureTime: string; // ISO datetime
  arrivalTime: string; // ISO datetime
  bookingLink: string;
}

// ---------- TRAIN ----------
export interface Train {
  id: string;
  source: string;
  destination: string;
  trainNo: string; // 5-digit
  trainName: string;
  price: number; // INR
  departureTime: string; // ISO datetime
  arrivalTime: string; // ISO datetime
  bookingLink: string;
}

// ---------- SPOT/ATTRACTION ----------
export interface Spot {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  timeToSpend: number; // hours
  openingTime: string; // "HH:MM"
  closingTime: string; // "HH:MM"
  entryFee: number; // INR
  category: string;
  description: string;
  rating: number; // 1-5
  popularity: number; // 1-10
}

// ---------- RESTAURANT ----------
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  cuisine: string;
  avgCostForTwo: number; // INR
  rating: number;
  openingTime: string;
  closingTime: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'any';
}

// ---------- P2P TRAVEL ----------
export type P2PMode = 'cab' | 'rickshaw' | 'walk';

export interface P2PTravel {
  id: string;
  from: LatLng;
  to: LatLng;
  fromName: string;
  toName: string;
  mode: P2PMode;
  distance: number; // km
  duration: number; // minutes
  cost: number; // INR
}

// ---------- INTER-CITY TRAVEL ----------
export interface InterCityOption {
  id: string;
  source: string;
  destination: string;
  type: 'bus' | 'shared_taxi' | 'cab';
  modeName: string;
  price: number;
  duration: number; // minutes
  departureTimes: string[];
}

// ---------- ITINERARY ----------
export type ItineraryItemType = 'hotel' | 'flight' | 'train' | 'spot' | 'p2p' | 'restaurant' | 'intercity';

export interface ItineraryItem {
  type: ItineraryItemType;
  data: Hotel | Flight | Train | Spot | P2PTravel | Restaurant | InterCityOption;
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  notes?: string;
}

export interface DayPlan {
  dayNumber: number;
  date: string; // ISO date
  locality: string;
  isTransitDay: boolean;
  items: ItineraryItem[];
  totalCost: number;
  hotel?: Hotel;
}

export interface TravelSelection {
  type: 'flight' | 'train';
  data: Flight | Train;
}

export interface FullItinerary {
  id: string;
  tripInput: TripInput;
  localitySplit: LocalitySplit[];
  days: DayPlan[];
  totalCost: number;
  budgetRemaining: number;
  outboundTravel?: TravelSelection;
  returnTravel?: TravelSelection;
  allFlights: Flight[];
  allTrains: Train[];
  interCityOptions?: Record<string, InterCityOption[]>; // keyed by Transit Locality
  selectedInterCitySegments?: Record<string, InterCityOption>; // keyed by Transit Locality
  unselectedSpots?: Spot[];
}

// ---------- TRIP INPUT ----------
export interface TripInput {
  destination: string;
  source: string;
  departureDate: string; // ISO date
  returnDate: string; // ISO date
  budget: number; // INR
  preferences: string[];
  maxHoursPerDay: number;
  isDateFlexible: boolean;
  minDays?: number;
  maxDays?: number;
  mustExclude?: string[];
  additionalNotes?: string;
}

// ---------- LOCALITY SPLIT ----------
export interface LocalitySplit {
  locality: string;
  days: number;
  isTransitDay: boolean;
  center: LatLng;
}

// ---------- BUDGET ----------
export interface BudgetAllocation {
  totalBudget: number;
  hotelBudget: number;
  travelBudget: number;
  activitiesBudget: number;
  foodBudget: number;
  localityAllocations: { locality: string; amount: number }[];
}

// ---------- COMMON ----------
export interface LatLng {
  lat: number;
  lng: number;
}

// ---------- AGENT DATA ----------
export interface AgentData {
  hotels: Record<string, Hotel[]>; // keyed by locality
  flights: Flight[];
  trains: Train[];
  interCityTravel: Record<string, InterCityOption[]>; // keyed by "Source-Destination"
  spots: Record<string, Spot[]>; // keyed by locality
  restaurants: Record<string, Restaurant[]>; // keyed by locality
}

// ---------- REVIEW/FEEDBACK ----------
export interface Review {
  id: string;
  spotId: string;
  userId: string;
  rating: number;
  comment: string;
  timestamp: string;
}
