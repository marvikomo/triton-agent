
import { AgentState } from "../states";
import { z } from "zod";

const ADRSchema = z.object({
    decisions: z.array(z.object({
        question: z.string(),
        decision: z.string(),
        rationale: z.string(),
        tradeoffs: z.string(),
    })),
    architecturalConcerns: z.array(z.object({
        concern: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        recommendation: z.string(),
    })),
    communicationPatterns: z.array(z.object({
        from: z.string(),
        to: z.string(),
        protocol: z.enum(["http", "grpc", "amqp", "websocket", "tcp", "internal"]),
        direction: z.enum(["unidirectional", "bidirectional"]),
        rationale: z.string(),
    })),
    dataFlows: z.array(z.object({
        description: z.string(),
        path: z.array(z.string()),
        dataType: z.string(),
    })),
    summary: z.string(),
});

export class ReasonNode {

    private model: any;

    constructor(model: any) {
        this.model = model;
    }

    async execute(state: typeof AgentState.State) {

        const structuredModel = this.model.withStructuredOutput(ADRSchema);

        const { blueprintSpec, mode, sessionHistory } = state;

        const systemPrompt = mode === "fresh"
            ? this.buildFreshModePrompt()
            : this.buildIterateModePrompt();

        const userPrompt = mode === "fresh"
            ? this.buildFreshUserPrompt(blueprintSpec)
            : this.buildIterateUserPrompt(blueprintSpec, (sessionHistory as any).at(-1));

        const adr = await structuredModel.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ]);


        console.log("Generated ADR:");
        
        return { adr }


    }

    buildFreshModePrompt(): string {

        return `You are a senior solutions architect performing architectural reasoning.

    Your job is to analyze a blueprint spec and work through four critical reasoning steps:

    1. **Component Analysis**
    - What is each component's responsibility?
    - Are there missing components needed for the system to function?
    - Are there redundant components that could be consolidated?

    2. **Communication Patterns**
    - How should components communicate?
    - When to use sync (HTTP/gRPC) vs async (message queues)?
    - What protocols fit each connection best?

    3. **Data Flow Analysis**
    - Trace key data flows through the system
    - Identify bottlenecks or single points of failure
    - Where does data transformation happen?

    4. **Architectural Concerns**
    - Security: Are there auth/authorization gaps?
    - Scalability: What are the scaling bottlenecks?
    - Resilience: What happens when a component fails?
    - Performance: Are there obvious latency issues?

    Output an Architecture Decision Record (ADR) that captures your reasoning.

    Guidelines:
    - Be opinionated but justify every decision
    - Flag concerns even if you make a decision — the user needs to know the tradeoffs
    - If the blueprint is ambiguous, make reasonable assumptions and state them clearly
    - Prioritize simplicity unless requirements explicitly demand complexity`;

    }

    buildIterateModePrompt() {
    }

    buildFreshUserPrompt(blueprintSpec: any) {
        return `Blueprint Specification:
        ${JSON.stringify(blueprintSpec, null, 2)}

        Perform architectural reasoning on this blueprint and produce an ADR.

        Focus on:
        - Component responsibilities and boundaries
        - Communication protocols between components
        - Data flow paths
        - Security, scalability, and resilience concerns

        Be thorough but concise. Justify every major decision.`;

    }

    buildIterateUserPrompt(blueprintSpec: any, lastSession: any) {
    }


}