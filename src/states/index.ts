import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
    userInput: Annotation<string>,
    mode: Annotation<"fresh" | "iterate">,
    blueprintSpec: Annotation<object>,
    diagram: Annotation<object>,
    scratchpad: Annotation<{
        todos: Array <{
            id: string;
            description: string;
            status: 'pending' | 'in-progress' | 'completed' | 'blocked';
            priority: string;
            dependencies?: string[]; //IDs of todoes that must complete first
            assignedTo?: 'main' | string; // 'main' or sub-agent ID
            result?: any;
        }>;
        currentFocus: string //current todo ID
        observations: string[]; //Agent's notes
        decisions: Array<{
            decision: string;
            reasoning: string;
            timestamp: Date;
        }>
    }>,
    messages: Annotation<BaseMessage[]>({
        reducer: (current, next) => [...current, ...next],
        default: () => [],
    }),
    subAgentResults: Annotation<Record<string, any>>,
    assumptions: Annotation<string[]>,
    adr: Annotation<object>,
    warnings: Annotation<string[]>,
    validationErrors: Annotation<string[]>,
    retryCount: Annotation<number>,
    sessionHistory: Annotation<object[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
})