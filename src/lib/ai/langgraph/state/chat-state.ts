import type { ChatMessage, LangGraphChatState } from "../../../../types";

// Re-export the centralized type
export type { LangGraphChatState };

/**
 * Initial state factory function
 */
export const createInitialChatState = (
  messages: ChatMessage[],
  userId: string,
  tone: string = "friendly",
  perinName: string = "Perin",
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination"
): LangGraphChatState => ({
  messages,
  userId,
  tone,
  perinName,
  specialization,
  memoryContext: {},
  conversationContext: "",
  systemPrompt: "",
  openaiResponse: "",
  streamChunks: [],
  currentStep: "initialized",
  emailContext: {},
});
