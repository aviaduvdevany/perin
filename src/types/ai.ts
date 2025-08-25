// Chat message interface
export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

// AI chat request interface
export interface PerinChatRequest {
  messages: ChatMessage[];
  tone?: string;
  perinName?: string;
  memory?: Record<string, unknown>;
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination";
}

// AI chat response interface
export interface PerinChatResponse {
  stream: ReadableStream;
  response: Response;
}

// Memory entry interface
export interface MemoryEntry {
  key: string;
  value: unknown;
  timestamp: string;
  context?: string;
}

// User memory interface
export interface UserMemory {
  userId: string;
  memory: Record<string, MemoryEntry>;
  lastUpdated: string;
}

// Memory request interface
export interface PerinMemoryRequest {
  key: string;
  value: unknown;
  context?: string;
}

// Memory response interface
export interface PerinMemoryResponse {
  memory: Record<string, unknown>;
  lastUpdated: string;
}

// Intent classification interface
export interface IntentClassification {
  intent:
    | "schedule"
    | "cancel"
    | "clarify"
    | "negotiate"
    | "coordinate"
    | "memory"
    | "general";
  confidence: number;
  entities: Record<string, unknown>;
  suggestedAction?: string;
}

// System prompt context interface
export interface SystemPromptContext {
  user: {
    perin_name?: string;
    tone?: string;
    timezone?: string;
    preferred_hours?: Record<string, unknown>;
    memory?: Record<string, unknown>;
  };
  conversationHistory?: string;
  currentTime?: string;
  timezone?: string;
}

// LangGraph-specific types
import type { IntegrationType } from "@/types/integrations";

// Multi-step messaging interfaces
export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  required?: boolean;
  estimatedDuration?: number; // in seconds
}

export interface StepResult {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime?: Date;
  endTime?: Date;
  result?: unknown;
  error?: string;
  progressMessage?: string;
}

export interface MultiStepContext {
  sessionId: string;
  currentStepIndex: number;
  totalSteps: number;
  steps: StepDefinition[];
  stepResults: StepResult[];
  progressMessages: string[];
  status: "running" | "paused" | "completed" | "failed";
  startTime: Date;
  lastUpdateTime: Date;
  canPause?: boolean;
  canSkip?: boolean;
}

export interface LangGraphChatState {
  messages: ChatMessage[];
  userId: string;
  tone: string;
  perinName: string;
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination";
  memoryContext: Record<string, unknown>;
  conversationContext: string;
  systemPrompt: string;
  openaiResponse: string;
  streamChunks: string[];
  currentStep: string;
  error?: string;
  // Multi-step context
  multiStepContext?: MultiStepContext;
  user?: {
    perin_name?: string;
    tone?: string;
    timezone?: string;
    preferred_hours?: Record<string, unknown>;
    memory?: Record<string, unknown>;
  };
  // Connected integrations hint from client (optional optimization)
  connectedIntegrationTypes?: IntegrationType[];
  // Legacy context fields for backward compatibility
  emailContext: {
    recentEmails?: Array<{
      from: string;
      subject: string;
      snippet: string;
      date: string;
      unread: boolean;
    }>;
    emailCount?: number;
    hasUnread?: boolean;
  };
  calendarContext: {
    recentEvents?: Array<{
      id: string;
      summary: string;
      description: string;
      start: string;
      end: string;
      location: string;
      isAllDay: boolean;
      attendees: number;
    }>;
    eventCount?: number;
    availability?: Array<{
      start: string;
      end: string;
    }>;
    nextEvent?: {
      id: string;
      summary: string;
      start: string;
      end: string;
    } | null;
    hasUpcomingEvents?: boolean;
  };
  // New unified integrations field
  integrations?: Record<string, unknown>;
  // Tool execution results
  toolExecutionResults?: Record<string, unknown>;
  // Delegation context for external users
  delegationContext?: {
    delegationId: string;
    externalUserName?: string;
    externalUserEmail?: string;
    constraints?: Record<string, unknown>;
    isDelegation: boolean;
    externalUserTimezone?: string;
  };
}

// Gmail integration API types
export interface GmailConnectResponse {
  authUrl: string;
  message: string;
}

export interface GmailCallbackRequest {
  code: string;
}

export interface GmailCallbackResponse {
  message: string;
  integration: {
    id: string;
    type: string;
    connected_at: string;
    scopes: string[];
  };
}

export interface GmailEmailsResponse {
  emails: Array<{
    id: string;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
    unread: boolean;
  }>;
  count: number;
  message: string;
}
