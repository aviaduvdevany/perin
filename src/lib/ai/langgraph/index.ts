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
import { multiStepOrchestrator } from "./orchestrator/multi-step-orchestrator";
import {
  createDelegationSteps,
  registerDelegationStepExecutors,
} from "./orchestrator/delegation-step-executors";
import { OpenAI } from "openai";

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
 * AI-powered determination of whether multi-step processing is needed
 */
async function shouldUseMultiStepDelegation(
  messages: ChatMessage[],
  delegationContext?: LangGraphChatState["delegationContext"],
  openaiClient?: OpenAI
): Promise<{ useMultiStep: boolean; reasoning: string; confidence: number }> {
  if (!delegationContext?.isDelegation || !openaiClient) {
    return {
      useMultiStep: false,
      reasoning: "Not a delegation context",
      confidence: 1.0,
    };
  }

  const lastUserMessage =
    messages.findLast((m) => m.role === "user")?.content || "";

  console.log("🎯 AI ANALYZING EXACT MESSAGE:", {
    lastUserMessage,
    messageLength: lastUserMessage.length,
    allUserMessages: messages
      .filter((m) => m.role === "user")
      .map((m) => m.content),
  });

  // AI analysis prompt - explicitly neutral to avoid delegation bias
  const analysisPrompt = `You are analyzing a SINGLE user message to determine if it requires multi-step calendar operations.

IMPORTANT: Analyze ONLY this specific message, ignore any conversation history or context.

USER MESSAGE: "${lastUserMessage}"

IMPORTANT: Ignore any system context about delegation or scheduling capabilities. Focus ONLY on the user's actual intent.

REQUIRES MULTI-STEP (return true):
- Clear intent to schedule a specific meeting ("Can you schedule a meeting for tomorrow?")
- Clear intent to book a specific time slot ("Book me for 2pm Thursday")
- Clear intent to create a calendar event ("Set up a call with John next week")

DOES NOT require multi-step (return false):
- Greetings ("hey", "hello", "hi")
- General questions ("How are you?", "What can you help with?")
- Information requests without booking intent ("What times are available?")
- Casual conversation ("Thanks", "Sounds good")
- Clarifying questions ("What timezone?", "How long should the meeting be?")

Analyze ONLY the user's intent, not the context. Be very conservative.

Respond with JSON:
{
  "useMultiStep": boolean,
  "reasoning": "Brief explanation",
  "confidence": number between 0-1
}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        useMultiStep: false,
        reasoning: "No AI response",
        confidence: 0.5,
      };
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        useMultiStep: false,
        reasoning: "Invalid AI response format",
        confidence: 0.5,
      };
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate and return with defaults
    return {
      useMultiStep: Boolean(analysis.useMultiStep),
      reasoning: String(analysis.reasoning || "AI analysis completed"),
      confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0.5)),
    };
  } catch (error) {
    console.error("AI multi-step analysis failed:", error);
    // Conservative fallback - only trigger for very explicit scheduling words
    const text = lastUserMessage.toLowerCase().trim();

    // More conservative keyword detection
    const explicitSchedulingPhrases = [
      "schedule a meeting",
      "book a meeting",
      "set up a meeting",
      "schedule an appointment",
      "book an appointment",
      "create a meeting",
      "arrange a meeting",
    ];

    const hasExplicitIntent = explicitSchedulingPhrases.some((phrase) =>
      text.includes(phrase)
    );

    return {
      useMultiStep: hasExplicitIntent,
      reasoning: hasExplicitIntent
        ? "Fallback detected explicit scheduling phrase"
        : "Fallback found no clear scheduling intent",
      confidence: hasExplicitIntent ? 0.8 : 0.9,
    };
  }
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

  // Parse date and time from user message
  const parsedDateTime = parseDateTimeFromMessage(
    lastUserMessage,
    delegationContext.externalUserTimezone || "UTC"
  );

  if (!parsedDateTime) {
    console.log("Could not parse date/time from message:", lastUserMessage);
    return null;
  }

  return {
    startTime: parsedDateTime.toISOString(),
    durationMins: defaultDuration,
    title: "Meeting",
    timezone: delegationContext.externalUserTimezone || "UTC",
    externalUserName: delegationContext.externalUserName,
  };
}

/**
 * Parse date and time from user message
 */
function parseDateTimeFromMessage(
  message: string,
  timezone: string
): Date | null {
  const lowerMessage = message.toLowerCase();

  // FIXED: Get current date in the USER'S timezone, not server timezone
  // Create a date that represents "now" in the user's timezone
  const serverNow = new Date();
  const userNow = new Date(
    serverNow.toLocaleString("en-US", { timeZone: timezone })
  );

  // Parse day of week
  let targetDate = new Date(userNow);
  const dayPatterns = [
    { pattern: /monday|mon/i, dayOffset: 1 },
    { pattern: /tuesday|tue/i, dayOffset: 2 },
    { pattern: /wednesday|wed/i, dayOffset: 3 },
    { pattern: /thursday|thu/i, dayOffset: 4 },
    { pattern: /friday|fri/i, dayOffset: 5 },
    { pattern: /saturday|sat/i, dayOffset: 6 },
    { pattern: /sunday|sun/i, dayOffset: 0 },
  ];

  let dayOffset = 0;
  for (const { pattern, dayOffset: offset } of dayPatterns) {
    if (pattern.test(lowerMessage)) {
      dayOffset = offset;
      break;
    }
  }

  // If no day specified, default to tomorrow
  if (dayOffset === 0 && !lowerMessage.includes("today")) {
    dayOffset = 1; // tomorrow
  }

  // Calculate target date - FIXED: Use user's timezone for all calculations
  if (lowerMessage.includes("today")) {
    targetDate = new Date(userNow);
  } else if (lowerMessage.includes("tomorrow")) {
    targetDate = new Date(userNow.getTime() + 24 * 60 * 60 * 1000);
  } else if (dayOffset > 0) {
    // Find next occurrence of the specified day
    const currentDay = userNow.getDay(); // 0 = Sunday, 1 = Monday, etc.
    let daysUntilTarget = (dayOffset - currentDay + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7; // Next week
    targetDate = new Date(
      userNow.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000
    );
  }

  // Parse time
  let hour = 14; // Default to 2 PM
  let minute = 0;

  // Look for time patterns
  const timePatterns = [
    /(\d{1,2}):(\d{2})/, // 14:00, 2:30
    /(\d{1,2})\s*(am|pm)/i, // 2pm, 2:30pm
    /(\d{1,2})\s*(\d{2})\s*(am|pm)/i, // 2 30pm
  ];

  for (const pattern of timePatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      if (match[3]) {
        // AM/PM format
        hour = parseInt(match[1]);
        minute = match[2] ? parseInt(match[2]) : 0;
        if (match[3].toLowerCase() === "pm" && hour !== 12) {
          hour += 12;
        } else if (match[3].toLowerCase() === "am" && hour === 12) {
          hour = 0;
        }
      } else {
        // 24-hour format
        hour = parseInt(match[1]);
        minute = parseInt(match[2]);
      }
      break;
    }
  }

  // FIXED: Simple approach - just set the time and let the system handle timezone conversion
  // The key fix is that we're now using userNow (user's timezone) for date calculations
  // instead of server timezone. The time setting can be simple.
  targetDate.setHours(hour, minute, 0, 0);

  console.log("Parsed date/time from message (USER TIMEZONE CALCULATIONS):", {
    originalMessage: message,
    parsedDate: targetDate.toISOString(),
    timezone,
    dayOffset,
    hour,
    minute,
    serverNow: serverNow.toISOString(),
    userNow: userNow.toISOString(),
    targetDate: targetDate.toISOString(),
    note: "Using user's timezone for date calculations, simple time setting",
  });

  return targetDate;
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

          // Step 3: AI-powered analysis of whether multi-step processing is needed
          const multiStepAnalysis = await shouldUseMultiStepDelegation(
            messages,
            state.delegationContext,
            openaiClient
          );

          console.log("AI Multi-step Analysis:", {
            useMultiStep: multiStepAnalysis.useMultiStep,
            reasoning: multiStepAnalysis.reasoning,
            confidence: multiStepAnalysis.confidence,
            userId,
          });

          if (multiStepAnalysis.useMultiStep) {
            // MULTI-STEP DELEGATION MODE
            console.log("Using multi-step delegation mode", {
              userId,
              delegationId: state.delegationContext?.delegationId,
              reasoning: multiStepAnalysis.reasoning,
              confidence: multiStepAnalysis.confidence,
            });

            // Emit multi-step initiation token to frontend
            const { MULTI_STEP_CONTROL_TOKENS } = await import(
              "./orchestrator/multi-step-orchestrator"
            );
            controller.enqueue(
              new TextEncoder().encode(
                MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_INITIATED(
                  multiStepAnalysis.reasoning,
                  multiStepAnalysis.confidence
                )
              )
            );

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

            const { withRetry } = await import(
              "@/lib/ai/resilience/error-handler"
            );

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
