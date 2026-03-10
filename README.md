# 🧳 Safar AI — AI-Powered Trip Planner

> **Microsoft AI Unlocked Hackathon** — An intelligent trip planner powered by 3 collaborative AI agents, built with Next.js, Azure OpenAI, and Leaflet Maps.

![Safar AI](https://img.shields.io/badge/Safar_AI-Trip_Planner-6366f1?style=for-the-badge&logo=airplane&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

---

## ✨ Features

### 🤖 3 AI Agent Collaboration
- **Agent A (Data Fetcher)** — Fetches hotels, flights, trains, spots, and restaurants for all localities
- **Agent B (Itinerary Maker)** — Builds day-by-day itineraries with spatial clustering, time-window validation, and restaurant halts
- **Agent C (Budgeter)** — Optimizes hotel & travel selections to fit within budget constraints

### 🗺️ Map-Based UX
- Interactive dark-themed Leaflet map with custom markers
- Color-coded daily route polylines
- Click anywhere on the map to add a place to your itinerary
- Click existing markers to remove places
- Day-by-day filtering with "Entire Trip" default view

### 📋 Smart Itinerary
- Day-by-day expandable timeline with spots, restaurants, and travel
- Flight & train cards with airline, route, times, price, and booking links
- Opening/closing time validation for all attractions
- Automatic lunch & dinner halt insertion

### 💰 Budget Intelligence
- Real-time cost tracking (always visible)
- Category breakdown: Accommodation, Travel, Activities, Food
- Budget progress bar with over-budget warnings
- One-click "Recompute" to re-fit everything into budget

### ✈️ Travel Options
- Browse all available flights and trains grouped by route
- Price-sorted options with booking links (MakeMyTrip, IRCTC)
- Selected travel highlighted with badges

### 🏨 Hotel Selection
- Hotels sorted by budget compatibility per locality
- Star ratings, amenity icons, property types
- Click to select/switch hotels with instant cost recalculation
- Booking links included

### 💬 Natural Language Prompt
- Chat-style input bar for trip modifications
- Quick action suggestions ("Add more adventure spots", "Reduce budget")
- Intent detection for add/remove places, budget changes, preferences

### ⭐ Feedback & Reviews
- Per-place star rating and text review system
- Reviews stored for future recommendation engine

---

## 🏗️ Architecture

```
User Input → Locality Splitter (LLM) → Agent A (Fetch Data)
                                           ↓
                                      Agent B (Build Itinerary)
                                           ↓
                                      Agent C (Optimize Budget)
                                           ↓
                                   Results + Map + Prompt Bar
                                           ↓
                               Delta Updates (Add/Remove/Budget)
```

### Data Encoding
- **Hotels**: Name, Address, Star Rating, Price/Night, Property Type, Location, 18 Amenity Booleans
- **Flights**: Source, Destination, Flight No, Airline, Price, Departure/Arrival Times
- **Trains**: Source, Destination, Train No (5-digit), Train Name, Price, Times
- **Spots**: Name, Address, Location, Time to Spend, Opening/Closing Hours, Entry Fee, Category, Rating, Popularity
- **P2P Travel**: Cab (₹15/km), Rickshaw (₹5/km), Walk (free) with Haversine distance

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/vagisha-11/safar-ai.git
cd safar-ai

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables (Optional)

For Azure OpenAI integration (currently using mock responses):

```env
AZURE_OPENAI_ENDPOINT=your-endpoint
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── agentA/        # Data Fetcher Agent
│   │   ├── agentB/        # Itinerary Maker Agent
│   │   ├── agentC/        # Budgeter Agent
│   │   ├── deltaUpdate/   # Incremental update handler
│   │   ├── localitySplitter/ # Trip locality splitting
│   │   └── prompt/        # NL prompt handler
│   ├── globals.css        # Design system
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── BudgetPanel.tsx    # Budget display & controls
│   ├── FeedbackForm.tsx   # Place review form
│   ├── HotelList.tsx      # Hotel cards per locality
│   ├── ItineraryPanel.tsx # Day-by-day timeline
│   ├── LandingPage.tsx    # Hero input form
│   ├── LoadingOverlay.tsx # Agent loading animation
│   ├── MapView.tsx        # Leaflet map component
│   ├── PromptBar.tsx      # Natural language input
│   ├── TravelOptions.tsx  # Flight/train browser
│   └── TripDashboard.tsx  # Main results layout
└── lib/
    ├── fakeApi/           # Mock data generators
    │   ├── hotels.ts
    │   ├── flights.ts
    │   ├── trains.ts
    │   ├── spots.ts
    │   ├── restaurants.ts
    │   └── p2pTravel.ts
    ├── store.ts           # Zustand state management
    └── types.ts           # TypeScript interfaces
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Custom CSS (Glassmorphism, Dark Mode) |
| Maps | Leaflet + React-Leaflet + CartoDB Dark Tiles |
| State | Zustand |
| AI Agents | Azure OpenAI GPT-4o (mock for MVP) |
| APIs | Next.js API Routes (serverless) |

---

## 🎯 Hackathon Specifications Covered

- [x] Map-Based UX with route display and day dropdown
- [x] Click-to-add and click-to-remove places on map
- [x] Locality splitter for multi-city trips
- [x] Agent A: Data fetcher with fake APIs
- [x] Agent B: Itinerary maker with spatial/temporal clustering
- [x] Agent C: Budgeter with hotel/travel optimization
- [x] Delta updates for incremental changes
- [x] Flight/Train booking links
- [x] Hotel selection with amenity display
- [x] Budget filters with recompute
- [x] Natural language prompt interface
- [x] Real-time cost display
- [x] User feedback/reviews system
- [x] Text itinerary with clickable days synced to map

---

## 📄 License

Built for **Microsoft AI Unlocked Hackathon 2026** by Team Safar AI.
