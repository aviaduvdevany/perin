import type { LangGraphChatState } from "../state/chat-state";

export interface NegotiationInput {
  intent: "schedule" | "propose";
  counterpartUserId: string;
  connectionId: string;
  durationMins?: number;
}

function detectCounterpartFromText(_text: string): string | null {
  // Placeholder: UI should pass counterpartUserId; we keep a stub here.
  return null;
}

export const networkNegotiationNode = async (
  state: LangGraphChatState,
  input: NegotiationInput
): Promise<Partial<LangGraphChatState>> => {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_API_URL || "";

    const connectionId = input.connectionId;
    const counterpartUserId =
      input.counterpartUserId ||
      detectCounterpartFromText(state.conversationContext) ||
      "";

    if (!connectionId || !counterpartUserId) {
      return { currentStep: "network_missing_params" };
    }

    if (input.intent === "schedule") {
      // Start session then send proposals
      const start = await fetch(`${base}/api/network/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "schedule_meeting",
          counterpartUserId,
          connectionId,
        }),
      });
      if (!start.ok) {
        return { currentStep: "network_session_error" };
      }
      const { session } = await start.json();

      if (input.durationMins) {
        const proposals = await fetch(
          `${base}/api/network/sessions/${session.id}/proposals`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ durationMins: input.durationMins }),
          }
        );
        if (!proposals.ok) {
          return { currentStep: "network_proposals_error" };
        }
      }

      return {
        currentStep: "network_session_started",
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
