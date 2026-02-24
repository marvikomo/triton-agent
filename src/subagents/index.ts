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





async function processToolResults(aiMessage: AIMessage, subAgentTools: ReturnType<typeof createSubAgentTools>) {

    const toolCalls = aiMessage.tool_calls ?? [];
    const toolMessages: ToolMessage[] = [];

    const todos: typeof SubAgentState.State.todos = [];
    const findings: string[] = [];
    const notes: string[] = [];
    let result: string | undefined;


    for(const toolCall of toolCalls) {
        let toolResult = "";
        try{
            const matchedTool = subAgentTools.find(tool => tool.name === toolCall.name) as any;
            if (!matchedTool) throw new Error(`Unknown tool: ${toolCall.name}`);

            toolResult = await matchedTool.invoke(toolCall.args) as string
            const parsedResult = JSON.parse(toolResult);

            switch(toolCall.name) {
                case "create_todo":
                    todos.push({
                        id: parsedResult.id,
                        description: parsedResult.description,
                        status: "pending",
                        priority: parsedResult.priority ?? "medium",
                    });
                    break;
                case "update_todo":
                    todos.push({
                        id: parsedResult.id,
                        status: parsedResult.status,
                        ...(parsedResult.result && {result: parsedResult.result} )
                    });
                    break;
                case "delete_todo":
                    todos.push({
                        id: parsedResult.id,
                        deleted: true,
                        status: "completed"
                    });
                    break;
                 case "add_finding":
                    findings.push(parsedResult.finding);
                    break;

                case "note":
                    notes.push(parsedResult.note);
                    break;

                case "done":
                    result = parsedResult.result;
                    break;
            }


        }catch(err: any) {
            toolResult = `Error executing tool ${toolCall.name}: ${err.message}`;
        }

        toolMessages.push(new ToolMessage({
            tool_call_id: toolCall.id!,
            content: toolResult
        }))
    }


    return { todos, findings, notes, result, toolMessages };
   

}