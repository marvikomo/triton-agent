import { END, START, StateGraph } from "@langchain/langgraph";
import { SubAgentState } from "./state";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { createSubAgentTools } from "./tools";


async function processToolResults(aiMessage: AIMessage, subAgentTools: ReturnType<typeof createSubAgentTools>) {

    const toolCalls = aiMessage.tool_calls ?? [];
    const toolMessages: ToolMessage[] = [];

    const todos: typeof SubAgentState.State.todos = [];
    const findings: string[] = [];
    const notes: string[] = [];
    let result: string | undefined;


    for (const toolCall of toolCalls) {
        let toolResult = "";
        try {
            const matchedTool = subAgentTools.find(tool => tool.name === toolCall.name) as any;
            if (!matchedTool) throw new Error(`Unknown tool: ${toolCall.name}`);

            toolResult = await matchedTool.invoke(toolCall.args) as string
            const parsedResult = JSON.parse(toolResult);

            switch (toolCall.name) {
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
                        ...(parsedResult.result && { result: parsedResult.result })
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


        } catch (err: any) {
            toolResult = `Error executing tool ${toolCall.name}: ${err.message}`;
        }

        toolMessages.push(new ToolMessage({
            tool_call_id: toolCall.id!,
            content: toolResult
        }))
    }


    return { todos, findings, notes, result, toolMessages };


}


export function buildSubAgentGraph(model: any) {
    const subAgentTools = createSubAgentTools();
    const modelWithTools = model.bindTools(subAgentTools);

    return new StateGraph(SubAgentState)
        .addNode("agent", async (state) => {
            const response: AIMessage = await modelWithTools.invoke(state.messages);
            const { todos, findings, notes, result, toolMessages } = await processToolResults(response, subAgentTools);
            return {
                messages: [response, ...toolMessages],
                ...(todos.length > 0 && { todos }),
                ...(findings.length > 0 && { findings }),
                ...(notes.length > 0 && { notes }),
                ...(result !== undefined && { result }),
            };
        })
        .addConditionalEdges("agent", (state) => {
            const lastAI = [...state.messages]
                .reverse()
                .find(m => AIMessage.isInstance(m)) as AIMessage | undefined;

            const hasToolCalls = (lastAI?.tool_calls ?? []).length > 0;

            return hasToolCalls ? "agent" : "__end__";
        }, {
            agent: "agent",
            __end__: END,
        })
        .addEdge(START, "agent")
        .compile();
}