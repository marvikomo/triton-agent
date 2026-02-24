import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";

export type SupportedChatModel = ChatAnthropic | ChatOpenAI;

export function createChatModel(): SupportedChatModel {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAIKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return new ChatAnthropic({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5-20251101",
      apiKey: anthropicKey,
    });
  }

  if (openAIKey) {
    return new ChatOpenAI({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      apiKey: openAIKey,
    });
  }

  throw new Error(
    "No API key found. Please set ANTHROPIC_API_KEY or OPEN_API_KEY/OPENAI_API_KEY."
  );
}

