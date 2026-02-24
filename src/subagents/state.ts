import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Annotation } from "@langchain/langgraph";
import z, { boolean } from "zod";
import { createSubAgentTools } from "./tools";


export const SubAgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (current, next) => [...current, ...next],
        default: () => [],
    }),

    todos: Annotation<Array<{
        id: string;
        description?: string;
        status: "pending" | "in-progress" | "completed" | "blocked";
        priority?: string;
        result?: string;
        deleted?: boolean;
    }>>({
        reducer: (current, next) => {
            const map = new Map(current.map(t => [t.id, t]));
            for (const t of next) {
                if (t.deleted) {
                    map.delete(t.id);
                } else {
                    map.set(t.id, { ...map.get(t.id), ...t });
                }
            }
            return Array.from(map.values());
        },
        default: () => [],
    }),
    findings: Annotation<string[]>({
        reducer: (current, next) => [...current, ...next],
        default: () => []
    }),
    result: Annotation<string | undefined>,

})




