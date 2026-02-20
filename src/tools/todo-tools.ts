import { tool } from "@langchain/core/tools"
import { z } from "zod"

export const createTodoTool = tool(
    async ({ description, priority, dependencies, assignedTo }) => {
        const id = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        return JSON.stringify({ id, description, priority, dependencies, assignedTo });
    },
    {
        name: "create_todo",
        description: "Create a new todo item. Use this to break down work into tracked steps.",
        schema: z.object({
            description: z.string().describe("What needs to be done"),
            priority: z.enum(["low", "medium", "high", "critical"]).optional(),
            dependencies: z.array(z.string()).optional().describe("IDs of todos that must complete first"),
            assignedTo: z.enum(["main", "sub-agent"]).optional(),
        }),
    }
);


export const updateTodoTool = tool(
    async ({ id, status, result }) => {
        return JSON.stringify({ id, status, result });
    },
    {
        name: "update_todo",
        description: "Update the status of an existing todo. Use this to mark progress.",
        schema: z.object({
            id: z.string().describe("The todo ID to update"),
            status: z.enum(["pending", "in-progress", "completed", "blocked"]),
            result: z.string().optional().describe("Summary of what was done"),
        }),
    }
);


export const addObservationTool = tool(
    async ({ observation }) => {
        return JSON.stringify({ observation, timestamp: new Date().toISOString() });
    },
    {
        name: "add_observation",
        description: "Record an insight, warning, or finding during the design process.",
        schema: z.object({
            observation: z.string().describe("The observation to record"),
        }),
    }
);

export const recordDecisionTool = tool(
    async ({ decision, reasoning }) => {
        return JSON.stringify({ decision, reasoning, timestamp: new Date().toISOString() });
    },
    {
        name: "record_decision",
        description: "Document an architectural decision and why it was made.",
        schema: z.object({
            decision: z.string().describe("The decision made"),
            reasoning: z.string().describe("Why this decision was made"),
        }),
    }
);


export const todoTools = [
    createTodoTool,
    updateTodoTool,
    addObservationTool,
    recordDecisionTool,
];

