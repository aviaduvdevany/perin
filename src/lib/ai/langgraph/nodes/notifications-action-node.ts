import type { LangGraphChatState } from "../state/chat-state";
import * as networkQueries from "@/lib/queries/network";
import * as notif from "@/lib/queries/notifications";
import { ensureSessionNotExpired } from "@/lib/utils/network-auth";
import {
  getConnectionById,
  getConnectionPermissions,
} from "@/lib/queries/network";
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/integrations/calendar/client";

function parseConfirmSelection(text: string): { index?: number } {
  const lower = text.toLowerCase();
  const m = lower.match(/confirm\s*(?:option|slot|proposal)?\s*(\d{1,2})/);
  if (m) {
    const idx = parseInt(m[1], 10);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= 50) {
      return { index: idx };
    }
  }
  return {};
}

export const notificationsActionNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    const text = state.conversationContext || "";
    const sel = parseConfirmSelection(text);
    if (!sel.index) {
      return { currentStep: "notifications_action_noop" };
    }

    type ActionableNotif = {
      id: string;
      type: string;
      title: string;
      actionRef?: {
        kind?: string;
        sessionId?: string;
        messageId?: string;
      } | null;
    };
    const integrationsObj = state.integrations as
      | Record<string, unknown>
      | undefined;
    const notificationsCtx = integrationsObj?.notifications as
      | { unresolvedActionable?: ActionableNotif[] }
      | undefined;
    const actionable: ActionableNotif[] = Array.isArray(
      notificationsCtx?.unresolvedActionable
    )
      ? (notificationsCtx!.unresolvedActionable as ActionableNotif[])
      : [];
    const target = actionable.find(
      (n: ActionableNotif) =>
        n.actionRef && n.actionRef.kind === "network.proposals"
    );
    if (!target) {
      return { currentStep: "notifications_action_noop" };
    }

    const sessionId: string | undefined = target.actionRef?.sessionId;
    const messageId: string | undefined = target.actionRef?.messageId;
    if (!sessionId) return { currentStep: "notifications_action_noop" };

    // Load session and guardrails
    const sess = await networkQueries.getAgentSessionById(sessionId);
    if (!sess) return { currentStep: "notifications_action_error" };
    if (
      sess.initiator_user_id !== state.userId &&
      sess.counterpart_user_id !== state.userId
    ) {
      return { currentStep: "notifications_action_error" };
    }

    try {
      ensureSessionNotExpired(sess.ttl_expires_at);
    } catch {
      return { currentStep: "notifications_action_error" };
    }

    // Permission checks
    const connection = await getConnectionById(sess.connection_id);
    if (!connection || connection.status !== "active") {
      return { currentStep: "notifications_action_error" };
    }
    const permissions = await getConnectionPermissions(connection.id);
    const scopes = permissions?.scopes || [];
    const canConfirm =
      scopes.includes("calendar.events.write.auto") ||
      scopes.includes("calendar.events.write.confirm");
    if (!canConfirm) {
      return { currentStep: "notifications_action_error" };
    }

    // Load proposals from message
    const messages = await networkQueries.listAgentMessages(sessionId);
    const proposalMsg =
      messages.find((m) => m.id === messageId) ||
      messages.filter((m) => m.type === "proposal").slice(-1)[0];
    const payload = (proposalMsg?.payload || {}) as {
      proposals?: Array<{ start: string; end: string; tz?: string }>;
    };
    const proposals: Array<{ start: string; end: string; tz?: string }> =
      Array.isArray(payload.proposals) ? payload.proposals : [];
    const idx = (sel.index as number) - 1;
    if (!proposals[idx]) {
      return {
        currentStep: "notifications_need_valid_selection",
        integrations: {
          ...(state.integrations || {}),
          notifications: {
            ...(notificationsCtx || {}),
            needs: { selection: true },
            available: proposals.map((p, i) => ({ index: i + 1, ...p })),
          },
        },
      } as Partial<LangGraphChatState>;
    }

    const chosen = proposals[idx];
    const initiatorId = sess.initiator_user_id;
    const counterpartId = sess.counterpart_user_id;

    // Create events and confirm, mirroring the API route logic
    let eventA: { id: string } | null = null;
    let eventB: { id: string } | null = null;
    try {
      eventA = await createCalendarEvent(initiatorId, {
        summary: "Meeting",
        description: undefined,
        location: undefined,
        start: chosen.start,
        end: chosen.end,
        timeZone: chosen.tz || "UTC",
        attendees: [],
      });
      eventB = await createCalendarEvent(counterpartId, {
        summary: "Meeting",
        description: undefined,
        location: undefined,
        start: chosen.start,
        end: chosen.end,
        timeZone: chosen.tz || "UTC",
        attendees: [],
      });

      const outcome = {
        selectedSlot: {
          start: chosen.start,
          end: chosen.end,
          tz: chosen.tz || "UTC",
        },
        eventIds: {
          initiatorCalEventId: eventA.id,
          counterpartCalEventId: eventB.id,
        },
      } as const;

      const updated = await networkQueries.setSessionConfirmedIfUnconfirmed(
        sessionId,
        outcome
      );
      if (!updated) {
        if (eventA?.id) await deleteCalendarEvent(initiatorId, eventA.id);
        if (eventB?.id) await deleteCalendarEvent(counterpartId, eventB.id);
        return { currentStep: "notifications_action_conflict" };
      }

      await networkQueries.createAgentMessage({
        session_id: sessionId,
        from_user_id: state.userId,
        to_user_id: state.userId === initiatorId ? counterpartId : initiatorId,
        type: "confirm",
        payload: outcome,
      });

      // Mark the actionable notification resolved
      await notif.markNotificationResolved(target.id, state.userId);

      return {
        currentStep: "notifications_action_confirmed",
        integrations: {
          ...(state.integrations || {}),
          notifications: {
            ...(notificationsCtx || {}),
            lastAction: {
              kind: "confirm_meeting",
              sessionId,
              start: chosen.start,
              end: chosen.end,
            },
            unresolvedActionable: actionable.filter((n) => n.id !== target.id),
          },
        },
      } as Partial<LangGraphChatState>;
    } catch (error) {
      // Rollback on failure
      try {
        if (eventA?.id) await deleteCalendarEvent(initiatorId, eventA.id);
        if (eventB?.id) await deleteCalendarEvent(counterpartId, eventB.id);
      } catch {}
      console.error("notificationsActionNode confirm error:", error);
      return { currentStep: "notifications_action_error" };
    }
  } catch (error) {
    console.error("notificationsActionNode error:", error);
    return { currentStep: "notifications_action_error" };
  }
};
