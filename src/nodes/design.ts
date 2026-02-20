
import { AgentState } from "../states";

import { z } from "zod";

const DiagramSchema = z.object({
    metadata: z.object({
        title: z.string(),
        style: z.enum(["microservices", "monolith", "event-driven", "serverless", "layered"]),
        adrSummary: z.string(),
    }),
    nodes: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(["service", "database", "queue", "cache", "gateway", "external", "client", "load_balancer"]),
        metadata: z.record(z.string(), z.string()).optional(),
    })),
    edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        protocol: z.enum(["http", "grpc", "amqp", "websocket", "tcp", "internal", "rest"]),
        direction: z.enum(["unidirectional", "bidirectional"]),
        label: z.string().optional(),
    })),
});



export class DesignNode {

    private model: any;

    constructor(model: any) {
        this.model = model;
    }

    async execute(state: typeof AgentState.State) {

        const structuredDesignModel = this.model.withStructuredOutput(DiagramSchema);

        const { adr, blueprintSpec, mode, sessionHistory, validationErrors } = state;

        const isRetry = validationErrors && validationErrors.length > 0;

        if (mode === "fresh") {

            const diagram = await structuredDesignModel.invoke([
                {
                    role: "system",
                    content: this.buildFreshDesignPrompt(),
                },
                {
                    role: "user",
                    content: this.buildFreshDesignUserPrompt(blueprintSpec, adr, isRetry ? validationErrors : null),
                },
            ]);

            console.log("Generated Diagram:");
            return { diagram };


        }



    }

    buildFreshDesignPrompt(): string {
        return `You are a technical diagram renderer. Your job is to convert an Architecture Decision Record (ADR) into a structured diagram representation.

            Rules:
            1. Every component mentioned in the ADR must become a node
            2. Every communication pattern must become an edge
            3. Node IDs must be kebab-case, unique, and descriptive (e.g., "api-gateway", "product-service")
            4. Edge IDs must follow the pattern: "{source}-to-{target}" (e.g., "api-gateway-to-product-service")
            5. Use the protocol specified in the ADR's communication patterns
            6. If the ADR mentions data flows, ensure edges exist for those paths
            7. Include metadata on nodes if the ADR mentions specific technologies (e.g., {"database": "PostgreSQL"})

            Node type selection guide:
            - "service": application services, APIs, workers
            - "database": any persistent storage (SQL, NoSQL, time-series)
            - "queue": message brokers, event buses (RabbitMQ, Kafka, SQS)
            - "cache": Redis, Memcached
            - "gateway": API Gateway, reverse proxy, load balancer entry point
            - "external": third-party APIs, payment gateways, external services
            - "client": web app, mobile app, CLI
            - "load_balancer": dedicated load balancers (if separate from gateway)

            Protocol selection guide:
            - "http": REST APIs, standard HTTP
            - "grpc": gRPC services
            - "amqp": RabbitMQ, message queues
            - "websocket": real-time bidirectional communication
            - "tcp": raw TCP connections
            - "internal": in-process communication, function calls
            - "rest": explicitly RESTful HTTP (use this over "http" when REST is specified)

            The diagram must be renderable — no orphaned nodes, all edges must reference valid node IDs.`;
    }


    buildFreshDesignUserPrompt(blueprintSpec: any, adr: any, validationErrors: string[] | null): string {
        let prompt = `Blueprint Specification:
        ${JSON.stringify(blueprintSpec, null, 2)}

        Architecture Decision Record:
        ${JSON.stringify(adr, null, 2)}

        Generate a complete diagram based on this ADR.`;

                if (validationErrors) {
                    prompt += `

        VALIDATION ERRORS FROM PREVIOUS ATTEMPT:
        ${validationErrors.join('\n')}

        Fix these errors in this attempt.`;
                }

        return prompt;

    }

}