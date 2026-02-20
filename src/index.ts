import 'dotenv/config';
import { MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./states";
import { graph } from "./graph";

const checkpointer = new MemorySaver();

const compiledGraph = graph.compile({ checkpointer });

const threadId = "user-session-abc123";

async function run() {

const result = await compiledGraph.invoke(
  { userInput: "Design a multi-tenant SaaS API with auth and billing" },
  { configurable: { thread_id: threadId } }
);
console.log("Final Result:", JSON.stringify(result.diagram, null, 2));

}

run();