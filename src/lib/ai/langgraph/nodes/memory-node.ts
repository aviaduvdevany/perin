import { getRelevantMemoryContext } from "@/lib/ai/memory";
import type { LangGraphChatState } from "@/types/ai";

/**
 * Memory node for LangGraph workflow
 * Loads relevant memory context based on conversation
 */
export const memoryNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    // Extract conversation context from messages
    const conversationContext = state.messages
      .map((msg) => msg.content)
      .join(" ")
      .slice(-500); // Last 500 characters for context

    // Load relevant memory context using existing function
    const memoryContext = await getRelevantMemoryContext(
      state.userId,
      conversationContext,
      5 // maxEntries
    );

    return {
      memoryContext: memoryContext as Record<string, unknown>, // Type assertion for compatibility
      conversationContext,
      currentStep: "memory_loaded",
    };
  } catch (error) {
    console.error("Error in memory node:", error);
    return {
      memoryContext: {},
      conversationContext: "",
      currentStep: "memory_error",
      error: error instanceof Error ? error.message : "Memory loading failed",
    };
  }
};
