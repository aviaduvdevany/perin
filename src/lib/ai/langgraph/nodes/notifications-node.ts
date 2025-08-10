import type { LangGraphChatState } from "../state/chat-state";
import * as notif from "@/lib/queries/notifications";
import * as network from "@/lib/queries/network";
import * as users from "@/lib/queries/users";

/**
 * Loads unresolved actionable notifications for the user, with a focus on
 * scheduling-related items (e.g., time proposals) so Perin can proactively
 * ask for confirmation and handle follow-ups in chat.
 */
export const notificationsContextNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    const unresolved = await notif.listUnresolvedNotifications(
      state.userId,
      true
    );

    // Extract scheduling-relevant notifications
    const schedulingRelated = unresolved.filter((n) => {
      const t = String(n.type || "");
      return (
        t.startsWith("calendar.") ||
        t.startsWith("assistant.") ||
        t.startsWith("network.")
      );
    });

    const actionable = schedulingRelated.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      createdAt: n.created_at,
      requiresAction: n.requires_action,
      isResolved: n.is_resolved,
      actionRef: n.action_ref || null,
      data: n.data || null,
    }));

    // Outgoing proposals: sessions I initiated and are still negotiating
    const myNegotiatingSessions = await network.listNegotiatingSessionsForUser(
      state.userId,
      20
    );
    const pendingOutgoing = [] as Array<{
      sessionId: string;
      counterpartUserId: string;
      counterpartName?: string;
      status: string;
      updatedAt: string;
    }>;
    for (const s of myNegotiatingSessions.slice(0, 10)) {
      let counterpartName: string | undefined;
      try {
        const u = await users.getUserById(s.counterpart_user_id);
        counterpartName =
          (u?.name as string) || (u?.email as string) || undefined;
      } catch {}
      pendingOutgoing.push({
        sessionId: s.id,
        counterpartUserId: s.counterpart_user_id,
        ...(counterpartName ? { counterpartName } : {}),
        status: s.status,
        updatedAt: s.updated_at,
      });
    }

    // Incoming proposals awaiting my confirmation (I'm the counterpart)
    const incomingNegotiations =
      await network.listNegotiatingSessionsForCounterpart(state.userId, 10);
    // Enrich with last proposal options (if available)
    const pendingIncoming = [] as Array<{
      sessionId: string;
      initiatorUserId: string;
      initiatorName?: string;
      status: string;
      updatedAt: string;
      proposals?: Array<{ start: string; end: string; tz?: string }>;
    }>;
    for (const s of incomingNegotiations.slice(0, 3)) {
      let proposals:
        | Array<{ start: string; end: string; tz?: string }>
        | undefined;
      try {
        const msgs = await network.listAgentMessages(s.id);
        const lastProposal = [...msgs]
          .reverse()
          .find((m) => m.type === "proposal");
        const payload = (lastProposal?.payload || {}) as {
          proposals?: Array<{ start: string; end: string; tz?: string }>;
        };
        if (Array.isArray(payload.proposals)) {
          proposals = payload.proposals.slice(0, 5);
        }
      } catch {
        // ignore
      }
      let initiatorName: string | undefined;
      try {
        const u = await users.getUserById(s.initiator_user_id);
        initiatorName =
          (u?.name as string) || (u?.email as string) || undefined;
      } catch {}
      pendingIncoming.push({
        sessionId: s.id,
        initiatorUserId: s.initiator_user_id,
        ...(initiatorName ? { initiatorName } : {}),
        status: s.status,
        updatedAt: s.updated_at,
        ...(proposals ? { proposals } : {}),
      });
    }

    return {
      currentStep: "notifications_loaded",
      integrations: {
        ...(state.integrations || {}),
        notifications: {
          unresolvedActionable: actionable,
          count: actionable.length,
          pendingOutgoing,
          pendingIncoming,
        },
      },
    } as Partial<LangGraphChatState>;
  } catch (error) {
    console.error("notificationsContextNode error:", error);
    return {
      currentStep: "notifications_error",
      integrations: {
        ...(state.integrations || {}),
        notifications: {
          error: error instanceof Error ? error.message : "error",
        },
      },
    } as Partial<LangGraphChatState>;
  }
};

/**
 * Helper to resolve a notification by id.
 */
export const resolveNotificationInChat = async (
  userId: string,
  notificationId: string
): Promise<boolean> => {
  try {
    return await notif.markNotificationResolved(notificationId, userId);
  } catch (e) {
    console.error("resolveNotificationInChat error:", e);
    return false;
  }
};
