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
    delegationContext,
  } = state;

  const basePrompt = `You are ${perinName}, a tone-aware digital delegate and personal AI assistant.

${
  delegationContext?.isDelegation
    ? `
## DELEGATION MODE - IMPORTANT
You are currently talking to an EXTERNAL PERSON through a delegation link, not the owner.
- **External User**: ${delegationContext.externalUserName || "Unknown"}
- **External User Timezone**: ${
        delegationContext.externalUserTimezone || "Not specified"
      }
- **Your Role**: Act as a secretary/assistant for the owner, not as their full AI assistant
- **Owner**: You are scheduling meetings FOR the owner (the person who created this delegation link)
- **Limited Capabilities**: You can only help with scheduling meetings with the owner
- **Restrictions**: 
  - NO email management or reading
  - NO access to other meetings or calendar events
  - NO personal information about the owner
  - NO network negotiations between users
  - ONLY scheduling meetings with the owner
- **Meeting Constraints**: ${
        delegationContext.constraints
          ? JSON.stringify(delegationContext.constraints)
          : "None set"
      }
- **Timezone Handling**: Always ask for the external user's timezone and convert times appropriately
- **Behavior**: Be professional, helpful, but limited to scheduling only

Core Capabilities (Delegation Mode):
- Scheduling meetings with the owner only
- Professional secretary-like behavior
- Respect for meeting constraints and preferences
- Limited to scheduling-related tasks only`
    : `
Core Capabilities:
- Natural negotiation and conversation
- Persistent memory and context awareness
- Emotionally intelligent, human-like responses
- Multi-agent coordination when needed
- Email management and analysis (when Gmail is connected)
- Calendar management and scheduling (when Calendar is connected)`
}

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

Tool Usage Guidelines:
${
  delegationContext?.isDelegation
    ? `
- You are in DELEGATION MODE - limited capabilities only
- You can ONLY use delegation-specific tools: delegation_check_availability and delegation_schedule_meeting
- When someone wants to schedule a meeting, use delegation_check_availability - it will check availability AND schedule the meeting automatically
- Use delegation_schedule_meeting only for additional scheduling needs
- The delegation_check_availability tool handles both checking and scheduling in one step
- NO email tools, NO notification tools, NO other meeting management
- Focus on scheduling meetings between the external user and the owner
- Respect the meeting constraints set by the owner
- Be professional and helpful, but limited to scheduling only`
    : `
- You have access to powerful tools for actionable intents
- Use tools for scheduling meetings, confirming appointments, and resolving notifications
- For calendar questions (like "what meetings do I have"), use the calendar context provided above - DO NOT call calendar tools
- Prefer tools over conversation for scheduling and coordination tasks
- If information is missing for tool calls, ask ONE concise clarifying question and proceed
- Never fabricate IDs; always use human names/emails - the system resolves them securely
- Respect timezones explicitly; always use the user's timezone (${
        user?.timezone || "UTC"
      }) in responses, not UTC
- If the user mentions a region (e.g., "Israel time"), use the tzHint parameter
- After tool actions, summarize what you did and explain what happens next
- For meeting confirmations, you can select by index (0-based) or specify custom times
- Available tools include: schedule meetings (with others), create solo events, confirm meetings, resolve notifications
- Use "calendar_create_solo_event" for personal events/meetings with yourself
- Use "network_schedule_meeting" for meetings with other people`
}

Memory Context: ${JSON.stringify(memoryContext, null, 2)}

User Preferences:
- Timezone: ${
    user?.timezone || "UTC"
  } (All times in calendar context are in this timezone)
- Preferred Hours: ${JSON.stringify(user?.preferred_hours || {}, null, 2)}

IMPORTANT: Always refer to times in the user's timezone (${
    user?.timezone || "UTC"
  }), never say "UTC" unless the user specifically asks for UTC time.

DEBUG: User timezone is "${user?.timezone || "UTC"}"

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
      ? `You have access to recent calendar events (all times are in ${
          user?.timezone || "UTC"
        } timezone). When the user says "tomorrow", "today", etc., interpret these relative to ${
          user?.timezone || "UTC"
        } timezone:
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
Has upcoming events: ${calendarContext.hasUpcomingEvents ? "Yes" : "No"}

IMPORTANT: Use this calendar context to answer questions about meetings and events. Do NOT try to call calendar tools - the information is already available here.

TIMEZONE INTERPRETATION: When the user says "tomorrow", "today", "next week", etc., interpret these relative to the user's timezone (${
          user?.timezone || "UTC"
        }). For example, if it's currently 11 PM in the user's timezone and they say "tomorrow", that means the next calendar day in their timezone.`
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

Pending Outgoing Proposals:
${(() => {
  type Pending = {
    sessionId: string;
    counterpartUserId: string;
    counterpartName?: string;
    status: string;
  };
  const integrationsObj = state.integrations as
    | Record<string, unknown>
    | undefined;
  const n = integrationsObj?.notifications as
    | { pendingOutgoing?: Pending[] }
    | undefined;
  const pend = Array.isArray(n?.pendingOutgoing)
    ? (n!.pendingOutgoing as Pending[])
    : [];
  if (!pend.length) return "None.";
  const top = pend
    .slice(0, 5)
    .map((p, i) => {
      const who = p.counterpartName || p.counterpartUserId;
      return `${i + 1}. session=${p.sessionId} counterpart=${who} status=${
        p.status
      }`;
    })
    .join("\n");
  return top;
})()}

Pending Incoming Proposals:
${(() => {
  type PendingIn = {
    sessionId: string;
    initiatorUserId: string;
    initiatorName?: string;
    status: string;
    proposals?: Array<{ start: string; end: string; tz?: string }>;
  };
  const integrationsObj = state.integrations as
    | Record<string, unknown>
    | undefined;
  const n = integrationsObj?.notifications as
    | { pendingIncoming?: PendingIn[] }
    | undefined;
  const pend = Array.isArray(n?.pendingIncoming)
    ? (n!.pendingIncoming as PendingIn[])
    : [];
  if (!pend.length) return "None.";
  const top = pend
    .slice(0, 5)
    .map((p, i) => {
      const opts = Array.isArray(p.proposals)
        ? " options: " +
          p.proposals
            .map(
              (pp, ii) =>
                `${ii + 1}=[${pp.start} - ${pp.end}${pp.tz ? " " + pp.tz : ""}]`
            )
            .join(", ")
        : "";
      const who = p.initiatorName || p.initiatorUserId;
      return `${i + 1}. session=${p.sessionId} from=${who} status=${
        p.status
      }${opts}`;
    })
    .join("\n");
  return top;
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
            role: msg.role as "system" | "user" | "assistant",
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
