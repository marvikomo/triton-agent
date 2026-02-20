
import { AgentState } from "../states";
import { z } from "zod";

const BlueprintSchema = z.object({
    domains: z.array(z.string()),
    actors: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })),
    components: z.array(z.object({
        name: z.string(),
        type: z.string(),
        purpose: z.string(),
        strategy: z.string().optional(),
    })),
    constraints: z.array(z.object({
        type: z.string(),
        requirement: z.string(),
    })),
    data_flows: z.array(z.object({
        flow: z.string(),
        path: z.array(z.string()),
    })).optional(),
    api_structure: z.object({
        versioning: z.string(),
        authentication: z.string(),
        tenant_identification: z.string(),
        rate_limiting: z.string(),
    }).optional(),
});


export class PlanNode {

    private model: any;

    constructor(model: any) {
        this.model = model;
    }

    async execute(state: typeof AgentState.State) {
        if (state.mode === "fresh") {
            const structuredModel = this.model.withStructuredOutput(BlueprintSchema);

            const blueprintSpec = await structuredModel.invoke([
                {
                    role: "system",
                    content: `You are a solutions architect. Analyze the user's requirements and produce a blueprint spec.

                                Extract:
                                - domains: business domains involved (e.g., "authentication", "payments", "inventory")
                                - actors: external entities interacting with the system (e.g., "end user", "admin", "third-party API")
                                - components: services, databases, queues, gateways that need to exist
                                - constraints: requirements like "must be async", "real-time", "multi-tenant", "GDPR compliant"`,
                },
                {
                    role: "user",
                    content: state.userInput,
                },
            ]);

            console.log("Generated Blueprint Spec:");

            return { blueprintSpec };
        }

        // iterate mode logic below...

    }


}