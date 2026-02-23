import { tool } from "@langchain/core/tools";
import { z } from "zod";


async function runSubAgentLoop(model: any, systemPrompt: string, userPrompt: string) {
    
}

export const createSpawnSubAgentTool = (model: any) => {
    return tool(
        async ({agentType, task, context} ) => {
          const systemPrompts: Record<string, string> = {
            adr_writer : `You are an expert software architect specializing in Architecture Decision Records (ADRs).
            Write clear, structured ADRs in the format:
            - Title
            - Status
            - Context
            - Decision
            - Consequences
            Use the note tool to draft sections, then done to return the complete ADR.`,

            diagram_generator: `You are an expert software architect specializing in system diagrams.
            Generate clear ASCII/Mermaid architecture diagrams based on the provided context.
            Use the note tool to plan the diagram structure, then done to return the complete diagram.`,

            security_reviewer: `You are a security architect reviewing architecture designs.
            Identify security risks, missing controls, and compliance gaps.
            Use the note tool to document findings, then done to return a structured security review.`,

            gap_analyzer: `You are a software architect specializing in identifying gaps in architecture designs.
            Analyze completeness, scalability, operational readiness, and missing components.
            Use the note tool to track findings, then done to return a prioritized gap analysis.`,
          };

         const systemPrompt = systemPrompts[agentType] ?? `You are an expert software architect. Complete the given task thoroughly. Use the note tool to track progress and done to return your final result.`;
         try{

            const result = await runSubAgentLoop(model, systemPrompt, task + (context ? `\n\nContext:\n${context}` : ""));

             return JSON.stringify({
                    agentType,
                    task,
                    result,
                    completedAt: new Date().toISOString(),
                });

         }catch(err) {
            return JSON.stringify({ agentType, task, error: String(err) })
         }



        },
        {
            name: "spawn_sub_agent",
            description: "Spawn a focused sub-agent to complete a specific task (e.g. write an ADR, generate a diagram, perform a security review). The sub-agent runs autonomously and returns its result.",
            schema: z.object({
                agentType: z.enum(["adr_writer", "diagram_generator", "security_reviewer", "gap_analyzer"])
                    .describe("The type of specialist sub-agent to spawn"),
                task: z.string()
                    .describe("The specific task for the sub-agent to complete"),
                context: z.string().optional()
                    .describe("Relevant context from the blueprint or prior work to pass to the sub-agent"),
            }),
        }
    )
}