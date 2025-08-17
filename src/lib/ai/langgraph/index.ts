import { createInitialChatState } from "./state/chat-state";
import { memoryNode } from "./nodes/memory-node";
import { multiIntegrationNode } from "./nodes/integration-node";
import { initializeOpenAI, buildSystemPrompt } from "./nodes/openai-node";
import { toolExecutorNode } from "./nodes/tool-executor-node";
import type {
  ChatMessage,
  PerinChatResponse,
  LangGraphChatState,
} from "@/types/ai";
import type { IntegrationType } from "@/types/integrations";
import { networkNegotiationNode } from "./nodes/network-negotiation-node";
import { notificationsContextNode } from "./nodes/notifications-node";
import { notificationsActionNode } from "./nodes/notifications-action-node";
import { TOOL_SPECS } from "../tools/registry";

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
 * Determine if we should use tool mode based on intent heuristics
 */
function shouldUseToolMode(
  messages: ChatMessage[],
  specialization?: string
): boolean {
  // Always enable tool mode for scheduling specialization
  if (specialization === "scheduling") {
    return true;
  }

  const lastUserMessage =
    messages.findLast((m) => m.role === "user")?.content || "";
  const text = lastUserMessage.toLowerCase();

  // Keywords that suggest actionable intents
  const actionableKeywords = [
    "schedule",
    "meeting",
    "appointment",
    "confirm",
    "reschedule",
    "cancel",
    "propose",
    "negotiate",
    "coordinate",
    "plan",
    "set up",
    "arrange",
    "book",
    "reserve",
  ];

  return actionableKeywords.some((keyword) => text.includes(keyword));
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
  },
  options?: { connectedIntegrationTypes?: IntegrationType[] }
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

    // Attach client hint for connected integrations if provided
    if (options?.connectedIntegrationTypes?.length) {
      state = {
        ...state,
        connectedIntegrationTypes: options.connectedIntegrationTypes,
      } as unknown as LangGraphChatState;
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

          // If Gmail requires reauth, emit a control token for the UI to react seamlessly
          try {
            const integrationsObj = (state.integrations || {}) as Record<
              string,
              unknown
            >;
            const gmailCtx = integrationsObj["gmail"] as
              | { error?: string }
              | undefined;
            const calCtx = integrationsObj["calendar"] as
              | { error?: string }
              | undefined;
            if (
              gmailCtx?.error === "GMAIL_REAUTH_REQUIRED" ||
              gmailCtx?.error === "GMAIL_NOT_CONNECTED"
            ) {
              controller.enqueue(
                new TextEncoder().encode(
                  "[[PERIN_ACTION:gmail_reauth_required]]"
                )
              );
              controller.close();
              return;
            }
            if (
              calCtx?.error === "CALENDAR_REAUTH_REQUIRED" ||
              calCtx?.error === "CALENDAR_NOT_CONNECTED"
            ) {
              controller.enqueue(
                new TextEncoder().encode(
                  "[[PERIN_ACTION:calendar_reauth_required]]"
                )
              );
              controller.close();
              return;
            }
          } catch {}

          // Step 2a: Load notifications context so Perin knows about actionable items
          const notifResult = await notificationsContextNode(state);
          state = {
            ...state,
            ...(notifResult as Partial<LangGraphChatState>),
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

          // Step 2.6: If user responds with a selection like "confirm 2", try to act on notification
          const notifActionResult = await notificationsActionNode(state);
          state = {
            ...state,
            ...(notifActionResult as Partial<LangGraphChatState>),
          };

          // Step 3: Decide execution mode (tool-calling vs direct streaming)
          const useToolMode = shouldUseToolMode(messages, specialization);
          const openaiClient = initializeOpenAI();
          const systemPrompt = buildSystemPrompt(state);

          if (useToolMode) {
            // TOOL MODE: Planner → Executor → Responder
            console.log("Using tool mode for actionable intent", {
              userId,
              specialization,
            });

            // Step 3a: Planner phase (non-streaming, tools enabled)
            const plannerMessages: ChatMessage[] = [
              {
                role: "system",
                content:
                  systemPrompt +
                  "\n[system-note] You have access to tools for actionable intents. Use them when appropriate.",
              },
              ...messages,
            ];

            const { withRetry } = await import(
              "@/lib/ai/resilience/error-handler"
            );

            const plannerResponse = await withRetry(
              async () => {
                return await openaiClient.chat.completions.create({
                  model: "gpt-4",
                  messages: plannerMessages.map((msg) => {
                    if (msg.role === "tool") {
                      return {
                        role: "tool" as const,
                        content: msg.content,
                        tool_call_id: msg.tool_call_id!,
                      };
                    }
                    return {
                      role: msg.role as "system" | "user" | "assistant",
                      content: msg.content,
                      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
                    };
                  }),
                  tools: TOOL_SPECS,
                  tool_choice: "auto",
                  stream: false,
                  temperature: 0.7,
                  max_tokens: 1000,
                });
              },
              `langgraph-planner-${userId}`,
              { maxRetries: 3, baseDelayMs: 1000, circuitBreaker: true }
            );

            const plannerMessage = plannerResponse.choices[0]?.message;
            if (!plannerMessage) {
              throw new Error("No planner response received");
            }

            // Add planner message to conversation
            const plannerChatMessage: ChatMessage = {
              role: "assistant",
              content: plannerMessage.content || "",
              tool_calls:
                plannerMessage.tool_calls as ChatMessage["tool_calls"],
            };

            state.messages = [...state.messages, plannerChatMessage];

            // Step 3b: Tool execution phase (if tools were called)
            if (
              plannerMessage.tool_calls &&
              plannerMessage.tool_calls.length > 0
            ) {
              try {
                const toolResult = await toolExecutorNode(state);
                state = {
                  ...state,
                  ...(toolResult as Partial<LangGraphChatState>),
                };
              } catch (toolError) {
                // Use centralized error handling for integration errors
                const { getErrorActionToken } = await import(
                  "@/lib/integrations/error-handler"
                );
                const actionToken = getErrorActionToken(toolError);

                if (actionToken) {
                  console.log(
                    "Orchestrator handling integration error:",
                    toolError instanceof Error
                      ? toolError.message
                      : "Unknown error"
                  );
                  controller.enqueue(new TextEncoder().encode(actionToken));
                  controller.close();
                  return;
                }

                // For other errors, continue with normal error handling
                throw toolError;
              }
            }

            // Step 3c: Responder phase (streaming, no tools)
            const responderMessages: ChatMessage[] = [
              {
                role: "system",
                content:
                  systemPrompt +
                  "\n[system-note] Summarize the actions taken and provide a helpful response to the user.",
              },
              ...state.messages,
            ];

            const responderResponse = await withRetry(
              async () => {
                return await openaiClient.chat.completions.create({
                  model: "gpt-4",
                  messages: responderMessages.map((msg) => {
                    if (msg.role === "tool") {
                      return {
                        role: "tool" as const,
                        content: msg.content,
                        tool_call_id: msg.tool_call_id!,
                      };
                    }
                    return {
                      role: msg.role as "system" | "user" | "assistant",
                      content: msg.content,
                      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
                    };
                  }),
                  stream: true,
                  temperature: 0.7,
                  max_tokens: 1000,
                });
              },
              `langgraph-responder-${userId}`,
              { maxRetries: 3, baseDelayMs: 1000, circuitBreaker: true }
            );

            // Stream responder output
            for await (const chunk of responderResponse) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
          } else {
            // DIRECT MODE: Single streaming call (current behavior)
            console.log("Using direct mode for conversational intent", {
              userId,
            });

            const currentStepHint = state.currentStep
              ? `\n[system-note] step=${state.currentStep}`
              : "";
            const messagesWithSystem: ChatMessage[] = [
              { role: "system", content: systemPrompt + currentStepHint },
              ...messages,
            ];

            const { withRetry } = await import(
              "@/lib/ai/resilience/error-handler"
            );

            const response = await withRetry(
              async () => {
                return await openaiClient.chat.completions.create({
                  model: "gpt-4",
                  messages: messagesWithSystem.map((msg) => ({
                    role: msg.role as "system" | "user" | "assistant",
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
