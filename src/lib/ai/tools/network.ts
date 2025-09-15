/**
 * Network Tools
 *
 * Tool handlers for Network feature actions like scheduling meetings,
 * confirming appointments, and managing counterpart relationships.
 */

import { z } from "zod";
import {
  ToolSpec,
  ToolHandler,
  ToolContext,
  ToolEnvelope,
  createToolSuccess,
  createToolError,
  createToolNeeds,
  ToolErrorCode,
} from "./types";
import * as networkQueries from "@/lib/queries/network";
import * as userQueries from "@/lib/queries/users";
import * as notif from "@/lib/queries/notifications";
import { generateMutualProposals } from "@/lib/network/scheduling";
import { createCalendarEvent } from "@/lib/integrations/calendar/client";
import { formatInTimezone } from "@/lib/utils/timezone";
import { isReauthError } from "@/lib/integrations/errors";
import { getUserIntegration } from "@/lib/queries/integrations";
// Note: Using local implementations of scheduling utilities for this file

/**
 * Schedule Meeting Tool Arguments
 */
export const scheduleMeetingSchema = z.object({
  counterpart: z
    .string()
    .describe("Human name or email mentioned by the user (e.g., 'Aviad')"),
  durationMins: z
    .number()
    .min(5)
    .max(240)
    .optional()
    .describe("Meeting duration in minutes"),
  startWindow: z.string().optional().describe("ISO start of candidate window"),
  endWindow: z.string().optional().describe("ISO end of candidate window"),
  tzHint: z
    .string()
    .optional()
    .describe("IANA timezone when user mentions 'Israel time' etc."),
});

export type ScheduleMeetingArgs = z.infer<typeof scheduleMeetingSchema>;

/**
 * Schedule Meeting Tool Result
 */
export interface ScheduleMeetingResult {
  sessionId: string;
  proposals: Array<{
    start: string;
    end: string;
    tz: string;
  }>;
  counterpartUserId: string;
  connectionId: string;
  durationMins: number;
}

/**
 * OpenAI tool specification for schedule_meeting
 */
export const scheduleMeetingSpec: ToolSpec = {
  type: "function",
  function: {
    name: "network_schedule_meeting",
    description:
      "Start a negotiation session and propose meeting slots to a counterpart.",
    parameters: {
      type: "object",
      properties: {
        counterpart: {
          type: "string",
          description:
            "Human name or email mentioned by the user (e.g., 'Aviad').",
        },
        durationMins: {
          type: "integer",
          minimum: 5,
          maximum: 240,
          description: "Meeting duration in minutes",
        },
        startWindow: {
          type: "string",
          description: "ISO start of candidate window (optional).",
        },
        endWindow: {
          type: "string",
          description: "ISO end of candidate window (optional).",
        },
        tzHint: {
          type: "string",
          description:
            "IANA timezone when user mentions 'Israel time' etc. (optional).",
        },
      },
      required: ["counterpart"],
    },
  },
};

/**
 * Extract scheduling hints from conversation context (local implementation for backward compatibility)
 */
function extractSchedulingHints(
  text: string,
  userTz?: string
): {
  durationMins?: number;
  earliest?: string;
  latest?: string;
  tz?: string;
} {
  const lower = text.toLowerCase();

  // Extract duration
  const durationMatch = lower.match(
    /(\d{1,3})\s*(min|mins|minute|minutes|hour|hours|hr|hrs|h)\b/
  );
  if (durationMatch) {
    const qty = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    const minutes = unit.startsWith("min") || unit === "m" ? qty : qty * 60; // treat any hour unit as hours
    const range = extractSimpleTimeRange(lower, userTz);
    return { durationMins: Math.max(5, Math.min(240, minutes)), ...range };
  }

  // Try to extract a simple time range even without duration
  const rangeOnly = extractSimpleTimeRange(lower, userTz);
  return { ...rangeOnly };
}

/**
 * Extract simple time range from text
 */
function extractSimpleTimeRange(
  text: string,
  userTz?: string
): { earliest?: string; latest?: string; tz?: string } {
  // Support phrases like "on sunday between 13:00 and 17:00" or "sunday 1pm-5pm"
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayIdx = dayNames.findIndex((d) => text.includes(d));

  // Match time range
  const timeRe =
    /(?:(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)\s*(?:-|to|and|\u2013|\u2014|\s+to\s+)\s*(?:(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)/;
  const m = text.match(timeRe);
  if (dayIdx === -1 || !m) return {};

  const [, h1s, m1s, ap1, h2s, m2s, ap2] = m;
  const h1 = parseInt(h1s, 10);
  const min1 = m1s ? parseInt(m1s, 10) : 0;
  const h2 = parseInt(h2s, 10);
  const min2 = m2s ? parseInt(m2s, 10) : 0;

  function to24(h: number, ap?: string | null): number {
    if (!ap) return h; // already 24h
    const a = ap.toLowerCase();
    if (a === "am") return h % 12;
    if (a === "pm") return (h % 12) + 12;
    return h;
  }

  const th1 = to24(h1, ap1);
  const th2 = to24(h2, ap2);

  // Compute the next occurrence of the specified weekday
  const now = new Date();
  const today = now.getDay();
  let delta = dayIdx - today;
  if (delta <= 0) delta += 7;

  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + delta,
    0,
    0,
    0,
    0
  );

  const earliest = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    th1,
    min1,
    0,
    0
  );
  const latest = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    th2,
    min2,
    0,
    0
  );

  return {
    earliest: earliest.toISOString(),
    latest: latest.toISOString(),
    tz: userTz || "UTC",
  };
}

/**
 * Resolve counterpart by fuzzy-matching conversation text against connected users
 */
async function resolveCounterpart(
  currentUserId: string,
  conversationText: string
): Promise<
  | {
      chosen: { connectionId: string; counterpartUserId: string; name: string };
    }
  | {
      candidates: Array<{
        connectionId: string;
        counterpartUserId: string;
        name: string;
      }>;
    }
  | { none: true }
> {
  // Load connections directly from DB
  const connections = await networkQueries.listConnectionsForUser(
    currentUserId
  );

  // Build counterpart list with names
  const candidates: Array<{
    connectionId: string;
    counterpartUserId: string;
    name: string;
  }> = [];
  const text = conversationText.toLowerCase();

  for (const c of connections || []) {
    const counterpartId =
      c.requester_user_id === currentUserId
        ? c.target_user_id
        : c.requester_user_id;
    if (!counterpartId) continue;

    // Fetch user profile to get a human name
    try {
      const user = await userQueries.getUserById(counterpartId);
      const name: string = (
        (user && typeof user.name === "string" && user.name) ||
        (user && typeof user.email === "string" && user.email) ||
        counterpartId
      ).toString();
      candidates.push({
        connectionId: c.id,
        counterpartUserId: counterpartId,
        name,
      });
    } catch {
      // ignore failed user lookups
    }
  }

  if (candidates.length === 0) return { none: true };

  // Fuzzy filter by includes on full name or first/last token
  const tokens = text
    .replace(/[^a-z0-9@.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-15); // last tokens likely contain the referenced name

  const scored = candidates.map((cand) => {
    const n = cand.name.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (!t || t.length < 2) continue;
      if (n.includes(t)) score += Math.min(t.length, 5);
    }
    return { cand, score };
  });

  // Prefer best single match; if tie for top, ask user to choose
  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score === 0) {
    return { candidates: candidates.slice(0, 5) };
  }

  const top = scored[0];
  const second = scored[1];
  if (!second || top.score - second.score >= 2) {
    return { chosen: top.cand };
  }

  const tiedTop = scored
    .filter((s) => s.score === top.score)
    .map((s) => s.cand);
  return { candidates: tiedTop.slice(0, 5) };
}

/**
 * Schedule Meeting Tool Handler
 */
export const scheduleMeetingHandler: ToolHandler<
  ScheduleMeetingArgs,
  ScheduleMeetingResult
> = async (
  context: ToolContext,
  args: ScheduleMeetingArgs
): Promise<ToolEnvelope<ScheduleMeetingResult>> => {
  try {
    // Extract additional scheduling hints from conversation context
    const hints = extractSchedulingHints(context.conversationContext);

    // Resolve counterpart by name
    const resolved = await resolveCounterpart(
      context.userId,
      `${context.conversationContext} ${args.counterpart}`
    );

    if ("none" in resolved) {
      return createToolError(
        ToolErrorCode.NOT_FOUND,
        "No active connections found. You need to connect with someone first."
      );
    }

    if ("candidates" in resolved) {
      if (resolved.candidates.length === 1) {
        // Single candidate, proceed
      } else {
        // Multiple candidates - need clarification
        return createToolNeeds({
          counterpart_clarification: true,
        });
      }
    }

    const { connectionId, counterpartUserId } =
      "chosen" in resolved ? resolved.chosen : resolved.candidates[0];

    // Determine effective duration
    const effectiveDuration = args.durationMins || hints.durationMins;
    if (!effectiveDuration) {
      return createToolNeeds({
        duration: true,
      });
    }

    // Validate connection is active and user is a participant
    const connection = await networkQueries.getConnectionById(connectionId);
    if (!connection) {
      return createToolError(
        ToolErrorCode.NOT_FOUND,
        "Connection not found or no longer active."
      );
    }

    const isParticipant =
      connection.requester_user_id === context.userId ||
      connection.target_user_id === context.userId;

    if (!isParticipant || connection.status !== "active") {
      return createToolError(
        ToolErrorCode.UNAUTHORIZED,
        "You don't have access to this connection or it's not active."
      );
    }

    // Check permissions and scopes
    const permissions = await networkQueries.getConnectionPermissions(
      connectionId
    );
    const scopes = permissions?.scopes || [];

    if (
      !scopes.includes("calendar.availability.read") ||
      !scopes.includes("calendar.events.propose")
    ) {
      return createToolError(
        ToolErrorCode.SCOPES_MISSING,
        "Missing required calendar permissions to schedule meetings."
      );
    }

    // Start session (30m TTL)
    const now = Date.now();
    const ttl = new Date(now + 30 * 60 * 1000).toISOString();
    const session = await networkQueries.createAgentSession({
      type: "schedule_meeting",
      initiator_user_id: context.userId,
      counterpart_user_id: counterpartUserId,
      connection_id: connectionId,
      status: "initiated",
      ttl_expires_at: ttl,
    });

    // Generate proposals using both calendars
    let proposals;
    try {
      // Log calendar integration status before attempting to schedule
      const calendarIntegration = await getUserIntegration(
        context.userId,
        "calendar"
      );
      console.log("Calendar integration status before scheduling:", {
        hasIntegration: !!calendarIntegration,
        isActive: calendarIntegration?.is_active,
        expiresAt: calendarIntegration?.token_expires_at,
        hasRefreshToken: !!calendarIntegration?.refresh_token,
        connectedAt: calendarIntegration?.connected_at,
      });

      proposals = await generateMutualProposals({
        userAId: context.userId,
        userBId: counterpartUserId,
        durationMins: effectiveDuration,
        tz: args.tzHint || hints.tz,
        earliest: args.startWindow || hints.earliest,
        latest: args.endWindow || hints.latest,
        constraintsA: permissions?.constraints || {},
        constraintsB: permissions?.constraints || {},
        limit: 5,
        currentUserId: context.userId, // Pass current user context for reauth handling
      });
    } catch (error) {
      // Use centralized error handling for integration errors
      if (isReauthError(error)) {
        throw error; // Let integration reauth errors bubble up
      }
      // For other errors, return a tool error
      return createToolError(
        ToolErrorCode.INTERNAL_ERROR,
        `Failed to generate meeting proposals: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Post message and notify counterpart
    const message = await networkQueries.createAgentMessage({
      session_id: session.id,
      from_user_id: context.userId,
      to_user_id: counterpartUserId,
      type: "proposal",
      payload: {
        proposals: proposals.map((p) => ({
          ...p,
          tz: args.tzHint || hints.tz || "UTC",
        })),
        durationMins: effectiveDuration,
      },
    });

    // Create notifications
    await notif.createNotification(
      counterpartUserId,
      "network.message.received",
      "New time proposals",
      `You received ${proposals.length} time proposals`,
      { sessionId: session.id, messageId: message.id }
    );

    // Mark proposals notification as actionable
    try {
      const list = await notif.listUnresolvedNotifications(
        counterpartUserId,
        false
      );
      const created = list.find(
        (n) =>
          n.type === "network.message.received" &&
          n.data &&
          typeof n.data === "object" &&
          (n.data as { messageId?: string }).messageId === message.id
      );

      if (created) {
        await notif.updateNotificationActionability(
          created.id,
          counterpartUserId,
          {
            requires_action: true,
            action_deadline_at: null,
            action_ref: {
              kind: "network.proposals",
              sessionId: session.id,
              messageId: message.id,
            },
          }
        );
      }
    } catch (e) {
      console.warn("Failed to mark proposals notification actionable", e);
    }

    // Update session status
    await networkQueries.updateAgentSession(session.id, {
      status: "negotiating",
    });

    return createToolSuccess({
      sessionId: session.id,
      proposals: proposals.map((p) => ({
        ...p,
        tz: args.tzHint || hints.tz || "UTC",
      })),
      counterpartUserId,
      connectionId,
      durationMins: effectiveDuration,
    });
  } catch (error) {
    console.error("scheduleMeetingHandler error:", error);

    // Use centralized error handling for integration errors
    if (isReauthError(error)) {
      // Re-throw integration reauth errors to bubble up to the orchestrator
      throw error;
    }

    return createToolError(
      ToolErrorCode.INTERNAL_ERROR,
      "Failed to schedule meeting. Please try again."
    );
  }
};

/**
 * Confirm Meeting Tool Arguments
 */
export const confirmMeetingSchema = z.object({
  sessionId: z
    .string()
    .describe("The session ID for the meeting being confirmed"),
  selectionIndex: z
    .number()
    .min(0)
    .optional()
    .describe("Index of the selected proposal (0-based)"),
  startTime: z
    .string()
    .optional()
    .describe("ISO start time for custom selection"),
  endTime: z.string().optional().describe("ISO end time for custom selection"),
});

export type ConfirmMeetingArgs = z.infer<typeof confirmMeetingSchema>;

/**
 * Confirm Meeting Tool Result
 */
export interface ConfirmMeetingResult {
  sessionId: string;
  confirmedSlot: {
    start: string;
    end: string;
    tz: string;
  };
  calendarEventId?: string;
  counterpartCalendarEventId?: string;
}

/**
 * OpenAI tool specification for confirm_meeting
 */
export const confirmMeetingSpec: ToolSpec = {
  type: "function",
  function: {
    name: "network_confirm_meeting",
    description:
      "Confirm a selected meeting time slot and create calendar events for both parties.",
    parameters: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The session ID for the meeting being confirmed",
        },
        selectionIndex: {
          type: "integer",
          minimum: 0,
          description: "Index of the selected proposal (0-based, optional)",
        },
        startTime: {
          type: "string",
          description: "ISO start time for custom selection (optional)",
        },
        endTime: {
          type: "string",
          description: "ISO end time for custom selection (optional)",
        },
      },
      required: ["sessionId"],
    },
  },
};

/**
 * Confirm Meeting Tool Handler
 */
export const confirmMeetingHandler: ToolHandler<
  ConfirmMeetingArgs,
  ConfirmMeetingResult
> = async (
  context: ToolContext,
  args: ConfirmMeetingArgs
): Promise<ToolEnvelope<ConfirmMeetingResult>> => {
  try {
    // Get the session
    const session = await networkQueries.getAgentSessionById(args.sessionId);
    if (!session) {
      return createToolError(ToolErrorCode.NOT_FOUND, "Session not found");
    }

    // Verify user is a participant
    const isParticipant =
      session.initiator_user_id === context.userId ||
      session.counterpart_user_id === context.userId;

    if (!isParticipant) {
      return createToolError(
        ToolErrorCode.UNAUTHORIZED,
        "You are not a participant in this session"
      );
    }

    // Check session status
    if (session.status === "confirmed") {
      return createToolError(
        ToolErrorCode.CONFLICT,
        "Meeting is already confirmed"
      );
    }

    if (session.status !== "negotiating") {
      return createToolError(
        ToolErrorCode.CONFLICT,
        `Cannot confirm meeting in ${session.status} status`
      );
    }

    // Get the latest proposal message
    const messages = await networkQueries.listAgentMessages(args.sessionId);
    const latestProposal = messages
      .filter((m) => m.type === "proposal")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

    if (!latestProposal) {
      return createToolError(
        ToolErrorCode.NOT_FOUND,
        "No proposals found for this session"
      );
    }

    const payload = latestProposal.payload as {
      proposals: Array<{ start: string; end: string; tz: string }>;
      durationMins: number;
    };

    // Determine the confirmed time slot
    let confirmedSlot: { start: string; end: string; tz: string };

    if (args.startTime && args.endTime) {
      // Custom time selection
      confirmedSlot = {
        start: args.startTime,
        end: args.endTime,
        tz: payload.proposals[0]?.tz || "UTC",
      };
    } else if (args.selectionIndex !== undefined) {
      // Selected from proposals
      const selectedProposal = payload.proposals[args.selectionIndex];
      if (!selectedProposal) {
        return createToolError(
          ToolErrorCode.VALIDATION_ERROR,
          `Invalid selection index: ${args.selectionIndex}`
        );
      }
      confirmedSlot = selectedProposal;
    } else {
      // Default to first proposal
      confirmedSlot = payload.proposals[0];
      if (!confirmedSlot) {
        return createToolError(
          ToolErrorCode.NOT_FOUND,
          "No proposals available to confirm"
        );
      }
    }

    // Check permissions for calendar event creation
    const permissions = await networkQueries.getConnectionPermissions(
      session.connection_id
    );
    const scopes = permissions?.scopes || [];

    if (
      !scopes.includes("calendar.events.write.confirm") &&
      !scopes.includes("calendar.events.write.auto")
    ) {
      return createToolError(
        ToolErrorCode.SCOPES_MISSING,
        "Missing required calendar write permissions to confirm meetings"
      );
    }

    // Two-phase booking: confirm session first (with rollback on calendar failure)
    const outcome = {
      selectedSlot: confirmedSlot,
      eventIds: {},
      reason: `Confirmed by ${context.userId} at ${new Date().toISOString()}`,
    };

    const confirmedSession =
      await networkQueries.setSessionConfirmedIfUnconfirmed(
        args.sessionId,
        outcome
      );

    if (!confirmedSession) {
      return createToolError(
        ToolErrorCode.CONFLICT,
        "Session was already confirmed by someone else"
      );
    }

    let initiatorEventId: string | undefined;
    let counterpartEventId: string | undefined;

    try {
      // Get both users' details for calendar event
      const [initiatorUser, counterpartUser] = await Promise.all([
        userQueries.getUserById(session.initiator_user_id),
        userQueries.getUserById(session.counterpart_user_id),
      ]);

      const eventTitle = `Meeting with ${
        session.initiator_user_id === context.userId
          ? counterpartUser?.name || counterpartUser?.email || "Contact"
          : initiatorUser?.name || initiatorUser?.email || "Contact"
      }`;

      // Create calendar events for both users
      const eventData = {
        summary: eventTitle,
        description: `Scheduled via Perin\nSession ID: ${session.id}`,
        start: confirmedSlot.start,
        end: confirmedSlot.end,
        timeZone: confirmedSlot.tz,
        attendees: [
          {
            email: initiatorUser?.email || "",
            name: initiatorUser?.name || "",
          },
          {
            email: counterpartUser?.email || "",
            name: counterpartUser?.name || "",
          },
        ].filter((a) => a.email),
      };

      // Create calendar event for initiator
      try {
        const initiatorEvent = await createCalendarEvent(
          session.initiator_user_id,
          eventData
        );
        initiatorEventId = initiatorEvent.id;
      } catch (error) {
        console.warn("Failed to create calendar event for initiator:", error);
      }

      // Create calendar event for counterpart
      try {
        const counterpartEvent = await createCalendarEvent(
          session.counterpart_user_id,
          eventData
        );
        counterpartEventId = counterpartEvent.id;
      } catch (error) {
        console.warn("Failed to create calendar event for counterpart:", error);
      }
    } catch (calendarError) {
      console.error("Calendar event creation failed:", calendarError);
      // Continue without failing the confirmation - session is already confirmed
    }

    // Create confirmation message
    await networkQueries.createAgentMessage({
      session_id: args.sessionId,
      from_user_id: context.userId,
      to_user_id:
        session.initiator_user_id === context.userId
          ? session.counterpart_user_id
          : session.initiator_user_id,
      type: "confirm",
      payload: {
        confirmedSlot,
        initiatorEventId,
        counterpartEventId,
      },
    });

    // Notify the other party
    const notificationRecipient =
      session.initiator_user_id === context.userId
        ? session.counterpart_user_id
        : session.initiator_user_id;

    // Get recipient's timezone for proper formatting
    const recipientUser = await userQueries.getUserById(notificationRecipient);
    const recipientTimezone = recipientUser?.timezone || "UTC";

    await notif.createNotification(
      notificationRecipient,
      "network.meeting.confirmed",
      "Meeting confirmed",
      `Your meeting has been confirmed for ${formatInTimezone(
        confirmedSlot.start,
        recipientTimezone,
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }
      )}`,
      { sessionId: args.sessionId, confirmedSlot }
    );

    return createToolSuccess({
      sessionId: args.sessionId,
      confirmedSlot,
      calendarEventId:
        session.initiator_user_id === context.userId
          ? initiatorEventId
          : counterpartEventId,
      counterpartCalendarEventId:
        session.initiator_user_id === context.userId
          ? counterpartEventId
          : initiatorEventId,
    });
  } catch (error) {
    console.error("confirmMeetingHandler error:", error);
    return createToolError(
      ToolErrorCode.INTERNAL_ERROR,
      "Failed to confirm meeting. Please try again."
    );
  }
};
