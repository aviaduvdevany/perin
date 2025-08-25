import type { LangGraphChatState } from "@/types/ai";
import { semanticMemoryManager } from "@/lib/ai/memory/semantic-memory";
import { withRetry } from "@/lib/ai/resilience/error-handler";

/**
 * Enhanced Memory Node for LangGraph with AI-powered semantic memory
 * Uses the new semantic memory system for intelligent memory retrieval
 */
export const memoryNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    console.log("🧠 Loading semantic memory context...");

    // Extract conversation context for memory retrieval
    const conversationText = state.conversationContext || "";

    if (!conversationText.trim()) {
      console.log("No conversation context available for memory retrieval");
      return {
        memoryContext: {},
        currentStep: "memory_loaded",
      };
    }

    // Use AI-powered semantic memory retrieval
    const memoryResponse = await withRetry(
      async () => {
        return await semanticMemoryManager.retrieveRelevantMemories({
          userId: state.userId,
          query: conversationText,
          limit: 5, // Get top 5 most relevant memories
          minRelevance: 0.3, // Only memories with 30%+ relevance
        });
      },
      "semantic-memory-retrieval",
      { maxRetries: 3, baseDelayMs: 500, circuitBreaker: false }
    );

    // Transform memories into the expected format
    const memoryContext: Record<string, unknown> = {};

    memoryResponse.memories.forEach((memory) => {
      memoryContext[memory.key] = {
        content: memory.content,
        relevance: memory.relevance,
        importance: memory.importance,
        lastAccessed: memory.lastAccessed,
        accessCount: memory.accessCount,
      };
    });

    // Log memory retrieval results
    console.log("✅ Semantic memory loaded:", {
      totalFound: memoryResponse.totalFound,
      averageRelevance: memoryResponse.averageRelevance,
      processingTime: memoryResponse.processingTime,
      memoryKeys: Object.keys(memoryContext),
    });

    // Update access counts for retrieved memories
    memoryResponse.memories.forEach((memory) => {
      semanticMemoryManager.updateMemoryAccess(memory.id);
    });

    return {
      memoryContext,
      currentStep: "memory_loaded",
    };
  } catch (error) {
    console.error("❌ Error in memory node:", error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error("Memory node error details:", {
        userId: state.userId,
        error: error.message,
        stack: error.stack,
      });
    }

    // Return empty memory context on error
    return {
      memoryContext: {},
      currentStep: "memory_error",
    };
  }
};
