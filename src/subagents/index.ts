import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildSubAgentGraph } from "./graph"

export async function runSubAgent(
    model: any,
    systemPrompt: string,
    task: string,
    context?: string,
    maxIterations = 10
) {
    const graph = buildSubAgentGraph(model);

     const output: any = await graph.invoke(
        {
            messages: [
                new SystemMessage(systemPrompt),
                new HumanMessage(
                    `Task: ${task}${context ? `\n\nContext:\n${context}` : ""}`
                ),
            ],
        },
        { recursionLimit: maxIterations }
    );
    const lastMessage = output.messages.at(-1);
    return {
        result: output.result ?? (typeof lastMessage?.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content)),
        todos: output.todos,
        findings: output.findings,
        notes: output.notes,
    };
}