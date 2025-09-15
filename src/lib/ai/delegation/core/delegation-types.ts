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
  // Success scenarios
  availabilityConfirmed?: string;
  meetingScheduled?: string;

  // Conflict scenarios
  timeConflict?: string;
  unavailable?: string;

  // Clarification scenarios
  needsMoreInfo?: string;
  clarifyTime?: string;
  clarifyDate?: string;

  // Progress messages
  checkingAvailability?: string;
  schedulingMeeting?: string;

  // Error scenarios
  calendarError?: string;
  generalError?: string;
}

export interface DelegationResponse {
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
