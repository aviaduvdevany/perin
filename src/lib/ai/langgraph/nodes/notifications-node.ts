import type { LangGraphChatState } from "../state/chat-state";
import * as notif from "@/lib/queries/notifications";

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

    return {
      currentStep: "notifications_loaded",
      integrations: {
        ...(state.integrations || {}),
        notifications: {
          unresolvedActionable: actionable,
          count: actionable.length,
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
