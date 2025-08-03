import { executeChatGraph } from "./graphs/base-chat";
import { createInitialChatState } from "./state/chat-state";
import type { ChatMessage, PerinChatResponse } from "../../../types";

/**
 * Main LangGraph chat execution function
 * Wraps the existing OpenAI integration in a LangGraph workflow
 */
export const executePerinChatWithLangGraph = async (
  messages: ChatMessage[],
  userId: string,
  tone: string = "friendly",
  perinName: string = "Perin",
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination",
  user?: {
    perin_name?: string;
    tone?: string;
    timezone?: string;
    preferred_hours?: Record<string, unknown>;
    memory?: Record<string, unknown>;
  }
): Promise<PerinChatResponse> => {
  try {
    // Create initial state
    const initialState = createInitialChatState(
      messages,
      userId,
      tone,
      perinName,
      specialization
    );

    // Add user data if provided
    if (user) {
      initialState.user = user;
    }

    // Execute the LangGraph workflow
    const result = await executeChatGraph(initialState);

    // Check for errors
    if (result.error) {
      throw new Error(result.error);
    }

    // Create streaming response from the result
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream the collected chunks
          for (const chunk of result.streamChunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Create response object
    const responseObj = new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

    return {
      stream,
      response: responseObj,
    };
  } catch (error) {
    console.error("Error in LangGraph chat execution:", error);
    throw error;
  }
};

// Export types for external use
export type { LangGraphChatState } from "./state/chat-state";
export { createInitialChatState } from "./state/chat-state";
