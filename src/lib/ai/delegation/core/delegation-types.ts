/**
 * Delegation-specific types for the Delegation AI system
 */

export interface DelegationContext {
  delegationId: string;
  ownerUserId: string;
  ownerName: string;
  ownerTimezone: string;
  externalUserName?: string;
  externalUserTimezone?: string;
  constraints?: Record<string, unknown>;
  conversationHistory?: string;
  perinPersonality: {
    name: string;
    tone: string;
    communicationStyle: string;
    language: string;
  };
}

export interface TimeAnalysis {
  parsedDateTime: Date | null;
  confidence: "high" | "medium" | "low";
  extractedComponents: {
    date?: string;
    time?: string;
    timezone?: string;
  };
  reasoning: string;
  fallbackSuggestions?: string[];
}

export interface MeetingContext {
  duration?: number;
  title?: string;
  urgency?: "high" | "medium" | "low";
  meetingType?: string;
}

export interface ContextualMessages {
  // Success message when meeting is successfully scheduled
  meetingScheduled: string;

  // Conflict message when time slot is not available
  timeConflict: string;
}

// Base response interface
export interface BaseDelegationResponse {
  // Intent classification
  intent: "scheduling" | "conversation" | "information";
  confidence: number;

  // Perin's conversational response (always present)
  perinResponse: string;

  // Metadata
  method: "unified" | "fallback";
  processingTime: number;
}

// Simple conversation response (for greetings, questions, etc.)
export interface ConversationDelegationResponse extends BaseDelegationResponse {
  intent: "conversation" | "information";
  // No additional fields needed - just the response
}

// Scheduling-specific response (only when scheduling is detected)
export interface SchedulingDelegationResponse extends BaseDelegationResponse {
  intent: "scheduling";

  // Scheduling-specific analysis
  schedulingAnalysis: {
    timeAnalysis: TimeAnalysis;
    meetingContext: MeetingContext;
    contextualMessages: ContextualMessages;
  };
}

// Union type for all possible responses
export type DelegationResponse =
  | ConversationDelegationResponse
  | SchedulingDelegationResponse;

// Legacy interface for backward compatibility
export interface LegacyDelegationResponse {
  // Analysis data (for multi-step flow)
  analysis: {
    requiresScheduling: boolean;
    confidence: number;
    reasoning: string;
    timeAnalysis?: TimeAnalysis;
    meetingContext?: MeetingContext;
  };

  // Perin's conversational response
  perinResponse: string;

  // Contextual messages for multi-step flow
  contextualMessages?: ContextualMessages;

  // Metadata
  method: "unified" | "fallback";
  processingTime: number;
}

export interface DelegationAnalysisContext {
  delegationId: string;
  externalUserName?: string;
  externalUserTimezone?: string;
  constraints?: Record<string, unknown>;
  conversationHistory?: string;

  // Owner's Perin personality
  ownerPersonality?: {
    perinName?: string;
    tone?: string; // "professional", "friendly", "casual", etc.
    language?: string; // "auto", "hebrew", "english"
    communicationStyle?: string; // "formal", "warm", "direct", etc.
  };
}
