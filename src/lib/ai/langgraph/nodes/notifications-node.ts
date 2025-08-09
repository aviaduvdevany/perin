import type { LangGraphChatState } from "@/types/ai";
import { listUnresolvedNotifications } from "@/lib/queries/notifications";

// Optional LangGraph node to surface unresolved actionable notifications
export const notificationsNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    const unresolved = await listUnresolvedNotifications(state.userId, true);

    const limited = unresolved.slice(0, 5).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      created_at: n.created_at,
      requires_action: n.requires_action ?? false,
    }));

    return {
      memoryContext: {
        ...(state.memoryContext as Record<string, unknown>),
        notifications: {
          unresolved: limited,
        },
      },
      currentStep: "notifications_loaded",
    } as Partial<LangGraphChatState>;
  } catch (error) {
    console.error("Error in notifications node:", error);
    return {
      currentStep: "notifications_error",
    } as Partial<LangGraphChatState>;
  }
};
