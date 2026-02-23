import { AIMessage, HumanMessage, isAIMessage, ToolMessage } from "@langchain/core/messages";
import { AgentState } from "../states";
import { todoTools } from "../tools/todo-tools";
import { Command } from "@langchain/langgraph";


export class OrchestrationNode {

    private model: any;
    private modelWithTools: any;

    constructor(model: any) {
        this.model = model;
        this.modelWithTools = model.bindTools(todoTools)
    }

    async execute(state: typeof AgentState.State) {

        const scratchpad = state.scratchpad ?? {
            todos: [],
            currentFocus: '',
            observations: [],
            decisions: [],
        }

        console.log("scratch pad", scratchpad)
        const isFirstRun = state.messages.length === 0;

        const systemPrompt = `You are an expert software architect orchestrating an architecture design process.

            Blueprint: ${JSON.stringify(state.blueprintSpec, null, 2)}

            Current scratchpad:
            - Todos: ${JSON.stringify(scratchpad.todos, null, 2)}
            - Observations: ${scratchpad.observations.join('\n') || 'none'}
            - Decisions: ${JSON.stringify(scratchpad.decisions, null, 2)}

            Use your tools to manage your todo list and track progress.
            When all todos are completed, respond with a plain message saying "DONE" — no tool calls.`;

        let messages;

        const pendingTodos = scratchpad.todos.filter(t => t.status !== "completed");

        if (isFirstRun) {
            messages = [
                new HumanMessage(`${systemPrompt}
                    The design pipeline has already produced:
                    - blueprintSpec: ${state.blueprintSpec ? 'ready' : 'missing'}
                    - adr: ${state.adr ? 'ready' : 'missing'}
                    - diagram: ${state.diagram ? 'ready' : 'missing'}

                    Create a todo list to track validation, review, and any missing steps. Then start working through them.`)
            ];
        } else if (pendingTodos.length > 0) {
            messages = [
                ...state.messages,
                new HumanMessage(
                    `There are still ${pendingTodos.length} pending todos:\n${JSON.stringify(pendingTodos, null, 2)}\n\nContinue working through them.`
                ),
            ];
        } else {
            messages = state.messages;
        }



        const response = await this.modelWithTools.invoke(messages);


        //Apply tool 
        const { updatedScratchpad, toolMessages } = await this.processTools(response, scratchpad);


        return {
            messages: [response, ...toolMessages],
            scratchpad: updatedScratchpad,
        }
    }

    private async processTools(aiMessage: AIMessage, scratchpad: typeof AgentState.State.scratchpad) {
        console.log("Processing tool calls")
        console.log("AI Message", JSON.stringify(aiMessage, null, 2))
        const toolCalls = aiMessage.tool_calls ?? [];
        const toolMessages: ToolMessage[] = [];
        let updatedScratchpad = { ...scratchpad };

        for (const toolCall of toolCalls) {
            let toolResult = "";
            try {

                const matchedTool = todoTools.find(tool => tool.name === toolCall.name) as any;
                if (!matchedTool) throw new Error(`Unknown tool: ${toolCall.name}`);

                toolResult = await matchedTool.invoke(toolCall.args) as string
                const parsedResult = JSON.parse(toolResult);

                switch (toolCall.name) {
                    case "create_todo":
                        updatedScratchpad = {
                            ...updatedScratchpad,
                            todos: [...updatedScratchpad.todos, {
                                id: parsedResult.id,
                                description: parsedResult.description,
                                status: "pending" as const,
                                priority: parsedResult.priority,
                                dependencies: parsedResult.dependencies ?? [],
                                assignedTo: parsedResult.assignedTo ?? "main",
                            }],
                        };
                        break;
                    case "update_todo":
                        updatedScratchpad = {
                            ...updatedScratchpad,
                            todos: updatedScratchpad.todos.map(t =>
                                t.id === parsedResult.id
                                    ? { ...t, status: parsedResult.status, result: parsedResult.result }
                                    : t
                            ),
                            currentFocus: parsedResult.id,
                        };
                        break;
                    case "add_observation":
                        updatedScratchpad = {
                            ...updatedScratchpad,
                            observations: [...updatedScratchpad.observations, parsedResult.observation],
                        };
                        break;
                    case "record_decision":
                        updatedScratchpad = {
                            ...updatedScratchpad,
                            decisions: [...updatedScratchpad.decisions, {
                                decision: parsedResult.decision,
                                reasoning: parsedResult.reasoning,
                                timestamp: parsedResult.timestamp,
                            }],
                        };
                        break;
                }

            } catch (err) {
                toolResult = `Error: ${err}`;
            }

            toolMessages.push(new ToolMessage({
                tool_call_id: toolCall.id!,
                content: toolResult,
            }));

        }

        console.log("tool message", JSON.stringify(toolMessages, null, 2))

        return { updatedScratchpad, toolMessages };
    }

    async createPlan() {

        const planningResult = await this.model.invoke([
            {
                role: "system",
                content: `You are an expert software architect.Based on the user's requirements and the current state of the design process, create a plan for the next steps to take. The plan should be a list of actionable items that will guide the architecture design process forward.`,
            },
            {
                role: "user",
                content: `Based on the current state of the design process, create a plan for the next steps to take. The plan should be a list of actionable items that will guide the architecture design process forward.`,
            },
        ]);

    }

}


export function shouldContinueOrchestration(state: typeof AgentState.State): Command {
    const messages = state.messages;
    if (messages.length === 0) return new Command({ goto: "__end__" });

    const todos = state.scratchpad?.todos ?? [];
    const pendingTodos = todos.filter(t => t.status != "completed")

    // Find the last AIMessage — tool messages may follow it, skip those
    const lastAIMessage = [...messages]
        .reverse()
        .find(m => AIMessage.isInstance(m)) as AIMessage | undefined;

    console.log("Last AI Message for orchestration decision:", JSON.stringify(lastAIMessage, null, 2))

    if (!lastAIMessage) return new Command({ goto: "__end__" });

    const toolCalls = lastAIMessage.tool_calls ?? [];

    if (toolCalls.length > 0) {
        return new Command({ goto: "orchestrate" });
    }

    if (pendingTodos.length > 0) {
        return new Command({
            goto: "orchestrate",
            update: {
                messages: [
                    new HumanMessage(`There are still ${pendingTodos.length} pending todos. pending todo(s):\n${JSON.stringify(pendingTodos, null, 2)}\n\n Looping back to orchestration to continue working through them.`)
                ]
            }
        })
    }

    return new Command({ goto: "__end__" });
}