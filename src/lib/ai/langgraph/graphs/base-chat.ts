import { memoryNode } from "../nodes/memory-node";
import { openaiNode } from "../nodes/openai-node";
import type { LangGraphChatState } from "@/types/ai";
import { gmailNode } from "../nodes/gmail-node";
import { calendarNode } from "../nodes/calendar-node";

/**
 * Simplified chat graph execution
 * For now, we'll use a simple sequential approach while maintaining the LangGraph structure
 */
export const executeChatGraph = async (
  initialState: LangGraphChatState
): Promise<LangGraphChatState> => {
  try {
    // Step 1: Load memory
    const memoryResult = await memoryNode(initialState);
    const stateWithMemory = { ...initialState, ...memoryResult };

    // Step 2: Load Gmail context (if relevant)
    const gmailResult = await gmailNode(stateWithMemory);
    const stateWithGmail = { ...stateWithMemory, ...gmailResult };

    // Step 3: Load Calendar context (if relevant)
    const calendarResult = await calendarNode(stateWithGmail);
    const stateWithCalendar = { ...stateWithGmail, ...calendarResult };

    // Step 4: Call OpenAI with enhanced context
    const openaiResult = await openaiNode(stateWithCalendar);
    const finalState = { ...stateWithCalendar, ...openaiResult };

    return finalState;
  } catch (error) {
    console.error("Error executing chat graph:", error);
    return {
      ...initialState,
      currentStep: "graph_error",
      error: error instanceof Error ? error.message : "Graph execution failed",
    };
  }
};
