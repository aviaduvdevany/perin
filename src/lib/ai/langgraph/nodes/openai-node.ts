import OpenAI from "openai";
import type { LangGraphChatState } from "@/types/ai";
import type { ChatMessage } from "@/types/ai";
import {
  fallbackToSimpleResponse,
  withRetry,
} from "@/lib/ai/resilience/error-handler";

// Initialize OpenAI client only on server-side
let openai: OpenAI | null = null;

export const initializeOpenAI = (): OpenAI => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not configured");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
};

/**
 * Build dynamic system prompt based on user preferences and context
 */
export const buildSystemPrompt = (state: LangGraphChatState): string => {
  const {
    tone,
    perinName,
    memoryContext,
    user,
    emailContext,
    calendarContext,
    integrations,
  } = state;

  const basePrompt = `You are ${perinName}, a tone-aware digital delegate and personal AI assistant.

Core Capabilities:
- Natural negotiation and conversation
- Persistent memory and context awareness
- Emotionally intelligent, human-like responses
- Multi-agent coordination when needed
- Email management and analysis (when Gmail is connected)
- Calendar management and scheduling (when Calendar is connected)

Your Tone: ${tone}
Your Name: ${perinName}

Key Principles:
1. Always maintain your assigned tone and personality
2. Use your name (${perinName}) naturally in conversation
3. Reference relevant memory and context when appropriate
4. Be emotionally intelligent and empathetic
5. Help with scheduling, coordination, and delegation tasks
6. Maintain persistent identity across conversations
7. When email context is available, use it to provide informed responses about emails
8. When calendar context is available, use it to help with scheduling and provide insights about upcoming events

Memory Context: ${JSON.stringify(memoryContext, null, 2)}

User Preferences:
- Timezone: ${user?.timezone || "UTC"}
- Preferred Hours: ${JSON.stringify(user?.preferred_hours || {}, null, 2)}

Email Context: ${
    emailContext && emailContext.recentEmails
      ? `You have access to recent emails:
${emailContext.recentEmails
  .map(
    (email, index) =>
      `${index + 1}. From: ${email.from}
   Subject: ${email.subject}
   Snippet: ${email.snippet}
   Date: ${email.date}
   Unread: ${email.unread ? "Yes" : "No"}`
  )
  .join("\n\n")}

Total emails: ${emailContext.emailCount}
Unread emails: ${emailContext.hasUnread ? "Yes" : "No"}`
      : "No recent email context available"
  }

Calendar Context: ${
    calendarContext && calendarContext.recentEvents
      ? `You have access to recent calendar events:
${calendarContext.recentEvents
  .map(
    (event, index) =>
      `${index + 1}. ${event.summary}
   Description: ${event.description}
   Start: ${event.start}
   End: ${event.end}
   Location: ${event.location}
   All Day: ${event.isAllDay ? "Yes" : "No"}
   Attendees: ${event.attendees}`
  )
  .join("\n\n")}

Total events: ${calendarContext.eventCount}
Next event: ${
          calendarContext.nextEvent ? calendarContext.nextEvent.summary : "None"
        }
Has upcoming events: ${calendarContext.hasUpcomingEvents ? "Yes" : "No"}`
      : "No recent calendar context available"
  }

Remember: You are a digital delegate, not just a chatbot. Act with agency, empathy, and persistence. When email context is available, use it to provide helpful insights about the user's inbox. When calendar context is available, use it to help with scheduling and provide insights about upcoming events.

Notifications Context:
${(() => {
  type ActionableNotif = {
    id: string;
    type: string;
    title: string;
    actionRef?: unknown;
  };
  const integrationsObj = state.integrations as
    | Record<string, unknown>
    | undefined;
  const n = integrationsObj?.notifications as
    | { unresolvedActionable?: ActionableNotif[]; count?: number }
    | undefined;
  if (
    !n ||
    !Array.isArray(n.unresolvedActionable) ||
    n.unresolvedActionable.length === 0
  ) {
    return "No actionable notifications.";
  }
  const lines = n.unresolvedActionable
    .slice(0, 5)
    .map((item: ActionableNotif, i: number) => {
      const ref =
        typeof item.actionRef === "object"
          ? JSON.stringify(item.actionRef)
          : String(item.actionRef ?? "");
      return `${i + 1}. [${item.type}] ${item.title} (id=${
        item.id
      }) actionRef=${ref}`;
    })
    .join("\n");
  const count =
    typeof n.count === "number" ? n.count : n.unresolvedActionable.length;
  return `You have ${count} unresolved actionable notifications. Top items:\n${lines}`;
})()}

${
  integrations
    ? `Additional Integration Contexts: ${JSON.stringify(
        integrations,
        null,
        2
      )}`
    : ""
}`;

  return basePrompt;
};

/**
 * OpenAI node for LangGraph workflow
 * Handles OpenAI API calls and streaming responses
 */
export const openaiNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    // Initialize OpenAI client
    const openaiClient = initializeOpenAI();

    // Build system prompt
    const systemPrompt = buildSystemPrompt(state);

    // Prepare messages with system prompt
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...state.messages,
    ];

    // Execute OpenAI chat completion with retry and circuit breaker
    const response = await withRetry(
      async () => {
        return await openaiClient.chat.completions.create({
          model: "gpt-4",
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        });
      },
      `openai-chat-${state.userId}`,
      { maxRetries: 3, baseDelayMs: 1000, circuitBreaker: true }
    );

    // Collect streaming response
    let fullResponse = "";
    const streamChunks: string[] = [];

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        streamChunks.push(content);
      }
    }

    return {
      systemPrompt,
      openaiResponse: fullResponse,
      streamChunks,
      currentStep: "openai_completed",
    };
  } catch (error) {
    console.error("Error in OpenAI node:", error);

    // Provide graceful degradation
    const lastUserMessage =
      state.messages.findLast((msg) => msg.role === "user")?.content || "";
    const fallbackResponse = await fallbackToSimpleResponse(lastUserMessage);

    return {
      currentStep: "openai_error_with_fallback",
      openaiResponse: fallbackResponse,
      streamChunks: [fallbackResponse],
      error: error instanceof Error ? error.message : "OpenAI API call failed",
    };
  }
};
