import { tool } from "@langchain/core/tools";
import z from "zod";

export function createSubAgentTools() {
    const createTodoTool = tool(
        async ({ description, priority }) => {
            const id = `sub-todo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            return JSON.stringify({ id, description, priority, status: "pending" });
        },
        {
            name: "create_todo",
            description: "Create a todo item to track a sub-task within this agent's work.",
            schema: z.object({
                description: z.string().describe("What needs to be done"),
                priority: z.enum(["low", "medium", "high", "critical"]).optional(),
            }),
        }
    );


    const updateTodoTool = tool(
        async ({ id, status, result }) => {
            return JSON.stringify({ id, status, result });
        },
        {
            name: "update_todo",
            description: "Update the status of one of this agent's todos.",
            schema: z.object({
                id: z.string().describe("The todo ID to update"),
                status: z.enum(["pending", "in-progress", "completed", "blocked"]),
                result: z.string().optional().describe("Summary of what was done"),
            }),
        }
    );

    const deleteTodoTool = tool(
        async ({ id, reason }) => {
            return JSON.stringify({ id, deleted: true, reason });
        },
        {
            name: "delete_todo",
            description: "Delete a todo that is no longer needed.",
            schema: z.object({
                id: z.string().describe("The todo ID to delete"),
                reason: z.string().optional(),
            }),
        }
    );

    const addFindingTool = tool(
        async ({ finding }) => {
            return JSON.stringify({ finding });
        },
        {
            name: "add_finding",
            description: "Record a key output section or finding that will be included in the final result.",
            schema: z.object({
                finding: z.string(),
            }),
        }
    );

    const noteTool = tool(
        async ({ note }) => {
            return JSON.stringify({ note });
        },
        {
            name: "note",
            description: "Record a working thought or intermediate step.",
            schema: z.object({
                note: z.string(),
            }),
        }
    );

    const doneTool = tool(
        async ({ result }) => {
            return JSON.stringify({ result });
        },
        {
            name: "done",
            description: "Submit the final completed result. Call this only when all todos are done.",
            schema: z.object({
                result: z.string().describe("The complete final output"),
            }),
        }
    );

    return [createTodoTool, updateTodoTool, deleteTodoTool, addFindingTool, noteTool, doneTool];

}
