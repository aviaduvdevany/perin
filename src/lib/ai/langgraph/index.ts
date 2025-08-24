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
import { getToolSpecsForContext } from "../tools/registry";
import { multiStepOrchestrator } from "./orchestrator/multi-step-orchestrator";
import {
  createDelegationSteps,
  registerDelegationStepExecutors,
} from "./orchestrator/delegation-step-executors";

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
 * Determine if we should use multi-step processing for delegation
 */
function shouldUseMultiStepDelegation(
  messages: ChatMessage[],
  delegationContext?: LangGraphChatState["delegationContext"]
): boolean {
  if (!delegationContext?.isDelegation) {
    return false;
  }

  const lastUserMessage =
    messages.findLast((m) => m.role === "user")?.content || "";
  const text = lastUserMessage.toLowerCase();

  // Keywords that suggest scheduling intent requiring multi-step processing
  const schedulingKeywords = [
    "schedule",
    "meeting",
    "appointment",
    "book",
    "reserve",
    "available",
    "time",
    "tomorrow",
    "today",
    "next week",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];

  return schedulingKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Extract meeting parameters from user message for delegation
 */
function extractDelegationMeetingParams(
  messages: ChatMessage[],
  delegationContext: LangGraphChatState["delegationContext"]
): {
  startTime: string;
  durationMins: number;
  title: string;
  timezone?: string;
  externalUserName?: string;
} | null {
  if (!delegationContext) return null;

  const lastUserMessage =
    messages.findLast((m) => m.role === "user")?.content || "";

  // Simple extraction - in production, this would use NLP
  const constraints =
    (delegationContext.constraints as Record<string, unknown>) || {};
  const defaultDuration = (constraints.defaultDuration as number) || 30;

  // For now, use a simple heuristic - in production this would be more sophisticated
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM tomorrow

  return {
    startTime: tomorrow.toISOString(),
    durationMins: defaultDuration,
    title: "Meeting",
    timezone: delegationContext.externalUserTimezone || "UTC",
    externalUserName: delegationContext.externalUserName,
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
  options?: {
    connectedIntegrationTypes?: IntegrationType[];
    delegationContext?: {
      delegationId: string;
      externalUserName?: string;
      constraints?: Record<string, unknown>;
      isDelegation: boolean;
      externalUserTimezone?: string;
    };
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

    // Attach client hint for connected integrations if provided
    if (options?.connectedIntegrationTypes?.length) {
      state = {
        ...state,
        connectedIntegrationTypes: options.connectedIntegrationTypes,
      } as unknown as LangGraphChatState;
    }

    // Add delegation context if provided
    if (options?.delegationContext) {
      state = {
        ...state,
        delegationContext: options.delegationContext,
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

          // Step 2: Load all relevant integration contexts (skip for delegation)
          if (!state.delegationContext?.isDelegation) {
            const integrationResult = await multiIntegrationNode(state);
            state = {
              ...state,
              ...(integrationResult as Partial<LangGraphChatState>),
            };
          } else {
            // For delegation, just set empty integrations
            state = {
              ...state,
              integrations: {},
              currentStep: "delegation_mode_skip_integrations",
            };
          }

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

          // Step 2a: Load notifications context so Perin knows about actionable items (skip for delegation)
          if (!state.delegationContext?.isDelegation) {
            const notifResult = await notificationsContextNode(state);
            state = {
              ...state,
              ...(notifResult as Partial<LangGraphChatState>),
            };
          }

          // Step 2.5: Network negotiation if scheduling intent (skip for delegation)
          if (
            specialization === "scheduling" &&
            !state.delegationContext?.isDelegation
          ) {
            const netResult = await networkNegotiationNode(state, {
              intent: "schedule",
              counterpartUserId: counterpartUserId || "",
              connectionId: connectionId || "",
              durationMins,
            });
            state = { ...state, ...(netResult as Partial<LangGraphChatState>) };
          }

          // Step 2.6: If user responds with a selection like "confirm 2", try to act on notification (skip for delegation)
          if (!state.delegationContext?.isDelegation) {
            const notifActionResult = await notificationsActionNode(state);
            state = {
              ...state,
              ...(notifActionResult as Partial<LangGraphChatState>),
            };
          }

          // Step 3: Check if we should use multi-step delegation processing
          const useMultiStepDelegation = shouldUseMultiStepDelegation(
            messages,
            state.delegationContext
          );

          if (useMultiStepDelegation) {
            // MULTI-STEP DELEGATION MODE
            console.log("Using multi-step delegation mode", {
              userId,
              delegationId: state.delegationContext?.delegationId,
            });

            // Register delegation step executors
            registerDelegationStepExecutors(multiStepOrchestrator);

            // Extract meeting parameters
            const meetingParams = extractDelegationMeetingParams(
              messages,
              state.delegationContext
            );

            if (meetingParams) {
              // Create delegation steps
              const steps = createDelegationSteps(meetingParams);

              // Execute multi-step delegation flow
              try {
                const multiStepContext =
                  await multiStepOrchestrator.executeSteps(
                    state,
                    steps,
                    controller
                  );

                // Update state with multi-step context
                state.multiStepContext = multiStepContext;

                controller.close();
                return;
              } catch (error) {
                console.error("Multi-step delegation failed:", error);
                controller.enqueue(
                  new TextEncoder().encode(
                    `I apologize, but I encountered an issue while processing your request: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`
                  )
                );
                controller.close();
                return;
              }
            } else {
              // Fall back to regular delegation mode if we can't extract parameters
              console.log(
                "Could not extract meeting parameters, falling back to regular mode"
              );
            }
          }

          // Step 4: Decide execution mode (tool-calling vs direct streaming)
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
                  tools: getToolSpecsForContext(
                    state.delegationContext?.isDelegation
                  ),
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
            // Filter out tool messages that don't have corresponding tool_calls
            const filteredMessages = state.messages.filter(
              (msg) => msg.role !== "tool"
            );

            console.log(
              "Responder phase - Original messages:",
              state.messages.map((m) => ({
                role: m.role,
                content: m.content?.substring(0, 50),
              }))
            );
            console.log(
              "Responder phase - Filtered messages:",
              filteredMessages.map((m) => ({
                role: m.role,
                content: m.content?.substring(0, 50),
              }))
            );

            // Rebuild system prompt with updated state (including user timezone)
            const updatedSystemPrompt = buildSystemPrompt(state);

            // Debug logging removed for cleaner logs

            const responderMessages: ChatMessage[] = [
              {
                role: "system",
                content:
                  updatedSystemPrompt +
                  "\n[system-note] Summarize the actions taken and provide a helpful response to the user.",
              },
              ...filteredMessages,
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
