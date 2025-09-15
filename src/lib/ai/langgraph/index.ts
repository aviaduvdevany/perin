import { createInitialChatState } from "./state/chat-state";
import { memoryNode } from "./nodes/memory-node";
import {
  multiIntegrationNode,
  createIntegrationNode,
} from "./nodes/integration-node";
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
import {
  MULTI_STEP_CONTROL_TOKENS,
  multiStepOrchestrator,
} from "./orchestrator/multi-step-orchestrator";
import {
  createDelegationSteps,
  registerDelegationStepExecutors,
} from "./orchestrator/delegation-step-executors";
import {
  fallbackToSimpleResponse,
  withRetry,
} from "@/lib/ai/resilience/error-handler";
import { getErrorActionToken } from "@/lib/integrations/error-handler";
import { unifiedDelegationAnalyzer } from "@/lib/ai/analysis/unified-delegation-analyzer";
import type { UnifiedDelegationAnalysis } from "@/lib/ai/analysis/unified-delegation-analyzer";

function extractNetworkParams(messages: ChatMessage[]): {
  counterpartUserId?: string;
  connectionId?: string;
  durationMins?: number;
  conversationText: string;
} {
  // For integration detection, use only the last user message
  // This prevents language mixing and context confusion
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user");

  const currentMessageText = lastUserMessage?.content || "";

  // For other purposes, keep the full conversation context
  // const fullConversationText = messages.map((m) => m.content).join("\n");

  // Guardrails: do not attempt to parse IDs from free text; require explicit IDs via UI
  return {
    counterpartUserId: undefined,
    connectionId: undefined,
    durationMins: undefined,
    conversationText: currentMessageText, // Use only current message for integration detection
  };
}

/**
 * Unified delegation analysis - combines intent detection and time parsing
 */
async function performUnifiedDelegationAnalysis(
  messages: ChatMessage[],
  delegationContext?: LangGraphChatState["delegationContext"],
  perinName?: string,
  tone?: string
): Promise<UnifiedDelegationAnalysis | null> {
  if (!delegationContext?.isDelegation) {
    return null;
  }

  const lastUserMessage =
    messages.findLast((m) => m.role === "user")?.content || "";

  console.log("🎯 UNIFIED ANALYSIS - Processing message:", {
    lastUserMessage,
    messageLength: lastUserMessage.length,
    timezone: delegationContext.externalUserTimezone,
  });

  // Build conversation context from all messages for time parsing
  const conversationContext = messages.map((m) => m.content).join(" ");

  // Perform unified analysis with owner personality
  const analysis = await unifiedDelegationAnalyzer.analyzeMessage(
    lastUserMessage,
    {
      delegationId: delegationContext.delegationId,
      externalUserName: delegationContext.externalUserName,
      externalUserTimezone: delegationContext.externalUserTimezone,
      constraints: delegationContext.constraints,
      conversationHistory: conversationContext,
      ownerPersonality: {
        perinName: perinName || "Perin",
        tone: tone || "friendly",
        language: "auto", // Detect from user's message
        communicationStyle: "warm", // Could be configured per user
      },
    }
  );

  console.log("✅ Unified analysis completed:", {
    requiresScheduling: analysis.requiresScheduling,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    timeDetected: !!analysis.timeAnalysis?.parsedDateTime,
    method: analysis.method,
    processingTime: analysis.processingTime,
  });

  return analysis;
}

/**
 * Extract meeting parameters from unified analysis results
 */
function extractMeetingParamsFromAnalysis(
  analysis: UnifiedDelegationAnalysis,
  delegationContext: LangGraphChatState["delegationContext"]
): {
  startTime: string;
  durationMins: number;
  title: string;
  timezone?: string;
  externalUserName?: string;
} | null {
  if (!analysis.timeAnalysis?.parsedDateTime || !delegationContext) {
    return null;
  }

  return {
    startTime: analysis.timeAnalysis.parsedDateTime.toISOString(),
    durationMins: analysis.meetingContext?.duration || 30,
    title: analysis.meetingContext?.title || "Meeting",
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
    // English keywords
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
    // Hebrew keywords
    "לקבוע",
    "פגישה",
    "פגישות",
    "הפגישות",
    "אירוע",
    "אירועים",
    "תזמון",
    "תזמן",
    "אשר",
    "אישור",
    "בטל",
    "ביטול",
    "דחה",
    "דחייה",
    "הציע",
    "הצעה",
    "תאם",
    "תיאום",
    "תכנן",
    "תכנון",
    "הזמן",
    "הזמנה",
    "שמור",
    "שמירה",
  ];

  const hasActionableKeyword = actionableKeywords.some((keyword) =>
    text.includes(keyword)
  );

  console.log("Tool mode detection:", {
    lastUserMessage: text,
    hasActionableKeyword,
    matchedKeywords: actionableKeywords.filter((keyword) =>
      text.includes(keyword)
    ),
    specialization,
  });

  return hasActionableKeyword;
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
    const openaiClient = initializeOpenAI();

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
      console.log("LangGraph: Adding user data to state:", {
        timezone: user.timezone,
        fullUser: user,
      });
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

    // Debug: Log message processing
    console.log("LangGraph: Message processing debug:", {
      totalMessages: messages.length,
      lastUserMessage: messages
        .slice()
        .reverse()
        .find((m) => m.role === "user")?.content,
      conversationText,
      messageRoles: messages.map((m, i) => `${i}: ${m.role}`),
    });

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

          // Step 2: Load integration contexts
          if (!state.delegationContext?.isDelegation) {
            // Regular mode: Load all relevant integrations
            const integrationResult = await multiIntegrationNode(state);
            state = {
              ...state,
              ...(integrationResult as Partial<LangGraphChatState>),
            };
          } else {
            // Delegation mode: Load only calendar integration for owner's scheduling
            try {
              const calendarNode = createIntegrationNode("calendar");
              const calendarResult = await calendarNode(state);

              // Check if calendar needs reauth
              const calendarContext = (
                calendarResult as { calendarContext?: Record<string, unknown> }
              ).calendarContext;

              if (
                calendarContext?.error &&
                typeof calendarContext.error === "string" &&
                calendarContext.error.includes("REAUTH_REQUIRED")
              ) {
                // Calendar needs reauth - provide clear error message
                state = {
                  ...state,
                  integrations: {
                    calendar: {
                      isConnected: false,
                      data: [],
                      count: 0,
                      error: "CALENDAR_REAUTH_REQUIRED",
                    },
                  },
                  currentStep: "delegation_calendar_reauth_required",
                };
              } else {
                // Calendar loaded successfully or failed for other reasons
                state = {
                  ...state,
                  integrations: {
                    calendar: calendarContext || {
                      isConnected: false,
                      data: [],
                      count: 0,
                    },
                  },
                  currentStep: "delegation_calendar_loaded",
                };
              }
            } catch (error) {
              console.error("Error loading calendar for delegation:", error);

              // Check if it's a reauth error
              if (
                error instanceof Error &&
                (error.message.includes("REAUTH_REQUIRED") ||
                  error.message.includes("invalid_grant") ||
                  error.message.includes("INVALID_GRANT"))
              ) {
                state = {
                  ...state,
                  integrations: {
                    calendar: {
                      isConnected: false,
                      data: [],
                      count: 0,
                      error: "CALENDAR_REAUTH_REQUIRED",
                    },
                  },
                  currentStep: "delegation_calendar_reauth_required",
                };
              } else {
                state = {
                  ...state,
                  integrations: {
                    calendar: {
                      isConnected: false,
                      data: [],
                      count: 0,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Calendar loading failed",
                    },
                  },
                  currentStep: "delegation_calendar_error",
                };
              }
            }
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

          // Step 3: Unified delegation analysis (intent + time parsing + contextual messages)
          const unifiedAnalysis = await performUnifiedDelegationAnalysis(
            messages,
            state.delegationContext,
            state.perinName,
            state.tone
          );

          // Store contextual messages in state for step executors to use
          if (unifiedAnalysis?.contextualMessages) {
            state.contextualMessages = unifiedAnalysis.contextualMessages;
            console.log("🗂️ Storing contextual messages in state:", {
              availabilityConfirmed:
                state.contextualMessages.availabilityConfirmed,
              meetingScheduled: state.contextualMessages.meetingScheduled,
              timeConflict: state.contextualMessages.timeConflict,
            });
          } else {
            console.log("⚠️ No contextual messages to store in state");
          }

          console.log("Unified Analysis Result:", {
            requiresScheduling: unifiedAnalysis?.requiresScheduling,
            reasoning: unifiedAnalysis?.reasoning,
            confidence: unifiedAnalysis?.confidence,
            timeDetected: !!unifiedAnalysis?.timeAnalysis?.parsedDateTime,
            userId,
          });

          if (unifiedAnalysis?.requiresScheduling) {
            // MULTI-STEP DELEGATION MODE
            console.log("Using multi-step delegation mode", {
              userId,
              delegationId: state.delegationContext?.delegationId,
              reasoning: unifiedAnalysis.reasoning,
              confidence: unifiedAnalysis.confidence,
            });

            // Emit multi-step initiation token to frontend
            controller.enqueue(
              new TextEncoder().encode(
                MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_INITIATED(
                  unifiedAnalysis.reasoning,
                  unifiedAnalysis.confidence
                )
              )
            );

            // Register delegation step executors
            registerDelegationStepExecutors(multiStepOrchestrator);

            // Extract meeting parameters from unified analysis
            const meetingParams = extractMeetingParamsFromAnalysis(
              unifiedAnalysis,
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
              // Could not extract clear meeting parameters - need user clarification
              console.log(
                "❓ Could not extract clear meeting parameters - asking for clarification"
              );

              // Use fallback suggestions from unified analysis if available
              const suggestions =
                unifiedAnalysis.timeAnalysis?.fallbackSuggestions || [];

              // Emit a clarification request message (language-aware)
              const lastUserMessage = messages.findLast(
                (m) => m.role === "user"
              );
              const isHebrew =
                lastUserMessage?.content &&
                /[\u0590-\u05FF]/.test(lastUserMessage.content);

              const clarificationMessage = isHebrew
                ? "אני צריך פרטים נוספים לתזמון הפגישה. האם תוכל לציין את היום והשעה? לדוגמה: 'תזמן פגישה ליום שישי בשעה 15:00'"
                : suggestions.length > 0
                ? `I need more details to schedule your meeting. ${suggestions.join(
                    " "
                  )}`
                : "I need more details to schedule your meeting. Could you please specify both the day and time? For example: 'Schedule a meeting for Friday at 3 PM'";

              controller.enqueue(
                new TextEncoder().encode(clarificationMessage)
              );
              controller.close();
              return;
            }
          }

          // Step 4: Decide execution mode (tool-calling vs direct streaming)
          const useToolMode = shouldUseToolMode(messages, specialization);
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

            const plannerResponse = await withRetry(
              async () => {
                return await openaiClient.chat.completions.create({
                  model: "gpt-3.5-turbo",
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
                  model: "gpt-3.5-turbo",
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
            const response = await withRetry(
              async () => {
                return await openaiClient.chat.completions.create({
                  model: "gpt-3.5-turbo",
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
