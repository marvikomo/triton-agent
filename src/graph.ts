import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./states";
import { IntakeNode } from "./nodes/intake";
import { ChatAnthropic } from "@langchain/anthropic";
import { PlanNode } from "./nodes/plan";
import { ReasonNode } from "./nodes/reason";
import { DesignNode } from "./nodes/design";
import { OrchestrationNode, shouldContinueOrchestration } from "./nodes/orchestration";

const model = new ChatAnthropic({ 
  model: "claude-opus-4-5-20251101",
  apiKey: process.env.ANTHROPIC_API_KEY
});

const intakeNode = new IntakeNode(model);
const planNode = new PlanNode(model);
const reasonNode = new ReasonNode(model);
const designNode = new DesignNode(model);
const orchestrationNode = new OrchestrationNode(model);

const shouldRetry = (state: typeof AgentState.State) => {
  if (state.validationErrors.length > 0 && state.retryCount < 2) {
    return "design"; // loop back
  }
  return "respond"; // move forward
};

export const graph = new StateGraph(AgentState)
  .addNode("intake", intakeNode.execute.bind(intakeNode))
   .addNode("plan", planNode.execute.bind(planNode))
//    .addNode("reason", reasonNode.execute.bind(reasonNode))
//    .addNode("design", designNode.execute.bind(designNode))
   .addNode("orchestrate", orchestrationNode.execute.bind(orchestrationNode))
//   .addNode("validate", ValidateNode)
//   .addNode("respond", RespondNode)
  .addEdge(START, "intake")
   .addEdge("intake", "plan")
//    .addEdge("plan", "reason")
//    .addEdge("reason", "design")
   .addEdge("plan", "orchestrate")
//    .addEdge("design", "orchestrate")
//   .addEdge("design", "validate")
//   .addConditionalEdges("validate", shouldRetry) // ← the retry loop
//   .addEdge("design", END)
.addConditionalEdges("orchestrate", shouldContinueOrchestration, {
    orchestrate: "orchestrate",
    end: END,
})