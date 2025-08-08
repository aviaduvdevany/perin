import { createInitialChatState } from "./state/chat-state";
import { memoryNode } from "./nodes/memory-node";
import { multiIntegrationNode } from "./nodes/integration-node";
import { initializeOpenAI, buildSystemPrompt } from "./nodes/openai-node";
import type {
  ChatMessage,
  PerinChatResponse,
  LangGraphChatState,
} from "@/types/ai";
import { networkNegotiationNode } from "./nodes/network-negotiation-node";

function extractNetworkParams(messages: ChatMessage[]): {
  counterpartUserId?: string;
  connectionId?: string;
  durationMins?: number;
  conversationText: string;
} {
  const text = messages.map((m) => m.content).join("\n");
  // Guardrails: do not attempt to parse IDs from free text; require explicit IDs via UI
  return {
    counterpartUserId: undefined,
    connectionId: undefined,
    durationMins: undefined,
    conversationText: text.slice(-1000),
  };
}

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
    let state: LangGraphChatState = createInitialChatState(
      messages,
      userId,
      tone,
      perinName,
      specialization
    );

    // Add user data if provided
    if (user) {
      state = { ...state, user };
    }

    // Derive conversation context
    const { conversationText, counterpartUserId, connectionId, durationMins } =
      extractNetworkParams(messages);
    state = { ...state, conversationContext: conversationText };

    // Create a streaming response that processes the workflow in real-time
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Load memory (non-streaming)
          const memoryResult = await memoryNode(state);
          state = {
            ...state,
            ...(memoryResult as Partial<LangGraphChatState>),
          };

          // Step 2: Load all relevant integration contexts
          const integrationResult = await multiIntegrationNode(state);
          state = {
            ...state,
            ...(integrationResult as Partial<LangGraphChatState>),
          };

          // Step 2.5: Network negotiation if scheduling intent
          if (specialization === "scheduling") {
            const netResult = await networkNegotiationNode(state, {
              intent: "schedule",
              counterpartUserId: counterpartUserId || "",
              connectionId: connectionId || "",
              durationMins,
            });
            state = { ...state, ...(netResult as Partial<LangGraphChatState>) };
          }

          // Step 3: Call OpenAI with real-time streaming and error handling
          const openaiClient = initializeOpenAI();
          const systemPrompt = buildSystemPrompt(state);

          // Prepare messages with system prompt and current step hint
          const currentStepHint = state.currentStep
            ? `\n[system-note] step=${state.currentStep}`
            : "";
          const messagesWithSystem: ChatMessage[] = [
            { role: "system", content: systemPrompt + currentStepHint },
            ...messages,
          ];

          // Import error handling utilities
          const { withRetry } = await import(
            "@/lib/ai/resilience/error-handler"
          );

          // Execute OpenAI chat completion with streaming and retry logic
          const response = await withRetry(
            async () => {
              return await openaiClient.chat.completions.create({
                model: "gpt-4",
                messages: messagesWithSystem.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
                stream: true,
                temperature: 0.7,
                max_tokens: 1000,
              });
            },
            `langgraph-openai-${userId}`,
            { maxRetries: 3, baseDelayMs: 1000, circuitBreaker: true }
          );

          // Stream chunks as they arrive
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Error in streaming chat execution:", error);

          try {
            // Provide graceful fallback response
            const { fallbackToSimpleResponse } = await import(
              "@/lib/ai/resilience/error-handler"
            );
            const lastUserMessage =
              messages.findLast((msg) => msg.role === "user")?.content || "";
            const fallbackResponse = await fallbackToSimpleResponse(
              lastUserMessage
            );

            // Stream the fallback response
            controller.enqueue(new TextEncoder().encode(fallbackResponse));
            controller.close();
          } catch (fallbackError) {
            console.error("Error in fallback response:", fallbackError);
            controller.error(error);
          }
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
