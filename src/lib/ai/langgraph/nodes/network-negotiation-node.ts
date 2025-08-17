import type { LangGraphChatState } from "../state/chat-state";
import * as networkQueries from "@/lib/queries/network";
import * as userQueries from "@/lib/queries/users";
import * as notif from "@/lib/queries/notifications";
import { generateMutualProposals } from "@/lib/network/scheduling";

export interface NegotiationInput {
  intent: "schedule" | "propose";
  counterpartUserId: string;
  connectionId: string;
  durationMins?: number;
}

/**
 * Very light entity extraction from the user's message.
 * - Extracts simple durations like "30 min", "1 hour", "90 minutes".
 * - We intentionally avoid aggressive date parsing to prefer explicit user confirmation.
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
    const minutes =
      unit.startsWith("min") || unit === "m"
        ? qty
        : // treat any hour unit as hours
          qty * 60;
    const range = extractSimpleTimeRange(lower, userTz);
    return { durationMins: Math.max(5, Math.min(240, minutes)), ...range };
  }

  // Try to extract a simple time range even without duration
  const rangeOnly = extractSimpleTimeRange(lower, userTz);
  return { ...rangeOnly };
}

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
 * Select a counterpart by fuzzy-matching the conversation text against the
 * names/emails of connected users. Returns a chosen match (if exactly one),
 * or a list of candidates for clarification.
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
    // Fetch user profile to get a human name (fallback to id fragment)
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
      // ignore
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

export const networkNegotiationNode = async (
  state: LangGraphChatState,
  input: NegotiationInput
): Promise<Partial<LangGraphChatState>> => {
  try {
    // Extract simple scheduling hints from the user's message
    const {
      durationMins: hintedDuration,
      earliest,
      latest,
      tz,
    } = extractSchedulingHints(
      state.conversationContext || "",
      state.user && typeof state.user.timezone === "string"
        ? state.user.timezone
        : undefined
    );

    // Resolve counterpart by name if not explicitly provided
    let connectionId = input.connectionId;
    let counterpartUserId = input.counterpartUserId;

    if (!connectionId || !counterpartUserId) {
      const resolved = await resolveCounterpart(
        state.userId,
        state.conversationContext || ""
      );

      if ("chosen" in resolved) {
        connectionId = resolved.chosen.connectionId;
        counterpartUserId = resolved.chosen.counterpartUserId;
      } else if ("candidates" in resolved) {
        return {
          currentStep: "network_need_counterpart_clarification",
          integrations: {
            ...(state.integrations || {}),
            network: {
              ...(state.integrations?.network as Record<string, unknown>),
              candidates: resolved.candidates,
              needs: { counterpart: true },
            },
          },
        } as Partial<LangGraphChatState>;
      } else {
        return {
          currentStep: "network_no_connections",
          integrations: {
            ...(state.integrations || {}),
            network: {
              ...(state.integrations?.network as Record<string, unknown>),
              candidates: [],
              needs: { counterpart: true },
            },
          },
        } as Partial<LangGraphChatState>;
      }
    }

    if (input.intent === "schedule") {
      // If we don't yet have a duration, ask user for it via the model
      const effectiveDuration = input.durationMins || hintedDuration;
      if (!effectiveDuration) {
        return {
          currentStep: "network_need_duration_clarification",
          integrations: {
            ...(state.integrations || {}),
            network: {
              ...(state.integrations?.network as Record<string, unknown>),
              needs: { duration: true },
            },
          },
        } as Partial<LangGraphChatState>;
      }
      // Validate connection is active and the current user is a participant
      const connection = await networkQueries.getConnectionById(connectionId!);
      if (!connection) {
        return { currentStep: "network_session_error" };
      }
      const isParticipant =
        connection.requester_user_id === state.userId ||
        connection.target_user_id === state.userId;
      if (!isParticipant || connection.status !== "active") {
        return { currentStep: "network_session_error" };
      }

      // Start session (30m TTL)
      const now = Date.now();
      const ttl = new Date(now + 30 * 60 * 1000).toISOString();
      const session = await networkQueries.createAgentSession({
        type: "schedule_meeting",
        initiator_user_id: state.userId,
        counterpart_user_id: counterpartUserId!,
        connection_id: connectionId!,
        status: "initiated",
        ttl_expires_at: ttl,
      });

      // Permissions and constraints (same for both sides in MVP)
      const permissions = await networkQueries.getConnectionPermissions(
        connectionId!
      );
      const scopes = permissions?.scopes || [];
      if (
        !scopes.includes("calendar.availability.read") ||
        !scopes.includes("calendar.events.propose")
      ) {
        return { currentStep: "network_proposals_error" };
      }

      // Generate proposals using both calendars
      const counterpartId = counterpartUserId!;
      const proposals = await generateMutualProposals({
        userAId: state.userId,
        userBId: counterpartId,
        durationMins: effectiveDuration,
        tz,
        earliest,
        latest,
        constraintsA: permissions?.constraints || {},
        constraintsB: permissions?.constraints || {},
        limit: 5,
      });

      // Post message and notify counterpart
      const message = await networkQueries.createAgentMessage({
        session_id: session.id,
        from_user_id: state.userId,
        to_user_id: counterpartId,
        type: "proposal",
        payload: {
          proposals: proposals.map((p) => ({
            ...p,
            tz:
              (state.user &&
                typeof state.user.timezone === "string" &&
                state.user.timezone) ||
              "UTC",
          })),
          durationMins: effectiveDuration,
        },
      });

      // Mirror session started notification as in API route for parity
      await notif.createNotification(
        counterpartId,
        "network.session.started",
        "New scheduling session",
        `User ${state.userId} started a scheduling session with you`,
        { sessionId: session.id, connectionId: connectionId }
      );

      await notif.createNotification(
        counterpartId,
        "network.message.received",
        "New time proposals",
        `You received ${proposals.length} time proposals`,
        { sessionId: session.id, messageId: message.id }
      );

      // Mark this proposals notification as actionable with an action_ref
      try {
        const list = await notif.listUnresolvedNotifications(
          counterpartId,
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
            counterpartId,
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

      await networkQueries.updateAgentSession(session.id, {
        status: "negotiating",
      });

      return {
        currentStep: "network_session_started",
        integrations: {
          ...(state.integrations || {}),
          network: {
            ...(state.integrations?.network as Record<string, unknown>),
            sessionId: session.id,
            proposals: proposals,
            counterpartUserId,
            connectionId,
            durationMins: effectiveDuration,
          },
        },
      };
    }

    if (input.intent === "propose" && input.durationMins) {
      // Assume a session exists in context; this node does not persist sessionId yet
      return { currentStep: "network_proposals_pending" };
    }

    return { currentStep: "network_noop" };
  } catch (error) {
    console.error("networkNegotiationNode error:", error);
    return {
      currentStep: "network_error",
    };
  }
};
