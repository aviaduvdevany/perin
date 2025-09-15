/**
 * Main exports for the Delegation AI system
 */

export { DelegationAI } from "./core/delegation-ai";
export { executeDelegationChat } from "./core/delegation-langgraph";
export { buildDelegationPrompt } from "./core/delegation-prompts";

export type {
  DelegationContext,
  DelegationResponse,
  DelegationAnalysisContext,
  TimeAnalysis,
  MeetingContext,
  ContextualMessages,
} from "./core/delegation-types";
