# Safar AI: Current Architecture & Logic Report

## Technologies
- **Frontend Core**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Custom CSS (Glassmorphism, Dark Mode aesthetics)
- **Map Visualizations**: Leaflet, React-Leaflet, CartoDB Dark Tiles
- **State Management**: Zustand
- **Architecture**: 3-Agent collaborative system executed via Next.js serverless API routes (`/api/agentA`, `agentB`, `agentC`)

## Core Strategies & Heuristics

### Agent B (Itinerary Maker): Multi-Day Temporal & Spatial Optimization
- **TOPTW Framework**: Implements a Team Orienteering Problem with Time Windows (TOPTW) heuristic solver, maximizing aggregate user interest (Profit `Pi`) across all days simultaneously instead of day-by-day sequential chaining.
- **Profit Scoring Mechanism**: Spots are scored based on semantic user preference match (heavy weight: +100 points), overarching popularity, explicit rating, and a budget sensitivity factor.
- **Dynamic Category Penalties**: Replaces rigid static penalties. Static categories (e.g., "Religious", "Museum") are only penalized (-60 points) if they fail to align with the user's semantic preferences, allowing for high-value serendipitous discoveries.
- **Geometric Anchoring ("Last-100m" Logic)**: Uses the user's actual `hotelLocation` as the routing Depot to calculate Haversine travel times, rather than generic city centers.
- **Greedy Efficiency Insertion**: Unassigned candidates are inserted into the itinerary at the temporal position maximizing "efficiency" (Profit divided by time cost, including transit and stay time). 
- **Empty Day Detection**: Contains a resilience check that detects if trailing days are empty and suggests shortening the trip, avoiding "Greedy Dumping".

### Agent C (Budgeter): Global Financial Optimization
- **MCKP Allocation (Multiple-Choice Knapsack Problem)**: Treats the trip budget globally. Travel options (hotels, outbound/return flights, inter-city transits) are divided into classes. The solver iteratively selects exactly one item per class to maximize global utility without exceeding the budget constraint.
- **Marginal Utility Upgrades**: Evaluates budget surplus to intelligently step-upgrade components based on the highest utility-to-cost-difference ratio (efficiency).
- **Survival Pruning**: Includes an emergency pruning heuristic. If base travel constraints exceed the budget, it recursively removes spots possessing the lowest utility-to-cost ratio until the itinerary becomes financially viable.
- **Categorical Proportional Distribution**: Allocates the base budget systematically: 35% Hotel, 25% Travel, 25% Activities, 15% Food.

## Why It Is Optimized & Superior to General Options
- **Simultaneous Multi-Day Balancing**: Standard planners often fill the first day with popular spots, leaving latter days void. Safar AI’s TOPTW insertion evaluates all days concurrently, naturally distributing the high-value load and preventing traveler burnout across the itinerary.
- **Global Financial Utility over Locality Greed**: Rather than simply picking the highest-rated hotel in a vacuum, the MCKP budgeter determines if an extra ₹5000 is better spent upgrading an inter-city cab or the hotel stay, maximizing the traveler's overall experience value.
- **Realistic Spatial-Temporal Bounds**: Integrating real `hotelLocation` depots over broad city centers allows the itinerary to accurately account for commute times, eliminating logically unfeasible route generations.
- **Semantic Flexibility**: Replacing static whitelist/blacklist filters with semantic scoring ensures that user intent dynamically shapes the trip, seamlessly merging contrasting preferences (e.g. suggesting an archaeologically rich temple to an adventure seeker if the layout permits a hike).
