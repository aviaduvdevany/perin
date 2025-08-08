import type { LangGraphChatState } from "../state/chat-state";

export interface NegotiationInput {
  intent: "schedule" | "propose";
  counterpartUserId: string;
  connectionId: string;
  durationMins?: number;
}

export const networkNegotiationNode = async (
  state: LangGraphChatState,
  _input: NegotiationInput
): Promise<Partial<LangGraphChatState>> => {
  // Stub: For MVP we keep LangGraph path simple and use API routes to orchestrate
  // Later: call start session API and send proposals here
  return {
    currentStep: "network-negotiation:initialized",
  };
};
