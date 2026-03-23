import { NextRequest, NextResponse } from 'next/server';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';

// Import our decoupled pure mathematical algorithms
import { executeLocalitySplitter } from '../localitySplitter/route';
import { executeAgentA } from '../agentA/route';
import { executeAgentB } from '../agentB/route';
import { executeAgentC } from '../agentC/route';

// Define the absolute State object that LangGraph will flow between nodes
const AgentStateAnnotation = Annotation.Root({
    tripInput: Annotation<any>({ reducer: (x, y) => y ?? x }),
    localities: Annotation<any[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
    agentData: Annotation<any>({ reducer: (x, y) => y ?? x }),
    dayPlans: Annotation<any[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
    unselectedSpots: Annotation<any[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
    suggestions: Annotation<any[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
    finalItinerary: Annotation<any>({ reducer: (x, y) => y ?? x }),
    budgetWarning: Annotation<string | null>({ reducer: (x, y) => y ?? x, default: () => null }),
    error: Annotation<string>({ reducer: (x, y) => y ?? x }),
});

// 1. Initialize the StateGraph
const graph = new StateGraph(AgentStateAnnotation);

// 2. Add LangGraph Nodes (Wrapping our Agents)
graph.addNode("LocalitySplitter", async (state) => {
    try {
        const data = await executeLocalitySplitter(state.tripInput);
        return { localities: data.split, budgetWarning: data.budgetWarning ?? null };
    } catch(e: any) { 
        return { error: `LocalitySplitter failed: ${e.message}` }; 
    }
});

graph.addNode("AgentA", async (state) => {
    const data = await executeAgentA({
        localities: state.localities,
        source: state.tripInput.source,
        destination: state.tripInput.destination,
        departureDate: state.tripInput.departureDate,
        returnDate: state.tripInput.returnDate
    });
    return { agentData: data };
});

graph.addNode("AgentB", async (state) => {
    const data = await executeAgentB({
        localities: state.localities,
        agentData: state.agentData,
        startDate: state.tripInput.departureDate,
        maxHoursPerDay: 10,
        userPreferences: state.tripInput.preferences,
        budget: state.tripInput.budget,
        mustExclude: state.tripInput.mustExclude,
        additionalNotes: state.tripInput.additionalNotes,
    });
    return { dayPlans: data.dayPlans, unselectedSpots: data.unselectedSpots, suggestions: data.suggestions };
});

graph.addNode("AgentC", async (state) => {
    const data = await executeAgentC({
        dayPlans: state.dayPlans,
        unselectedSpots: state.unselectedSpots,
        agentData: state.agentData,
        tripInput: state.tripInput,
        localities: state.localities
    });
    return { finalItinerary: data };
});

// 3. Define the DAG (Directed Acyclic Graph) Edges Sequence
// @ts-ignore
graph.addEdge(START, "LocalitySplitter");
// @ts-ignore
graph.addEdge("LocalitySplitter", "AgentA");
// @ts-ignore
graph.addEdge("AgentA", "AgentB");
// @ts-ignore
graph.addEdge("AgentB", "AgentC");
// @ts-ignore
graph.addEdge("AgentC", END);

// Compile the resilient LangGraph workflow
const workflow = graph.compile();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Feed the initial prompt to the LangGraph
        const initialState = {
            tripInput: body,
            localities: [],
            agentData: null,
            dayPlans: [],
            unselectedSpots: [],
            suggestions: [],
            finalItinerary: null,
        };

        // Execute cyclical/linear graph thread natively on server
        const result = await workflow.invoke(initialState);
        
        if (result.error) throw new Error(result.error);
        
        // Return exactly what the old Frontend was expecting
        return NextResponse.json({
            success: true,
            itinerary: result.finalItinerary,
            localities: result.localities,
            agentData: result.agentData,
            suggestions: result.suggestions,
            budgetWarning: result.budgetWarning ?? null,
        });
    } catch(error) {
        console.error('LangGraph Orchestrator error:', error);
        return NextResponse.json({ success: false, error: 'Orchestrator failed' }, { status: 500 });
    }
}
