export type IntentType =
  | "scheduling"
  | "information"
  | "coordination"
  | "delegation"
  | "preference"
  | "general";

export interface UserIntent {
  type: IntentType;
  subtype?: string;
  confidence: number;
  parameters: Record<string, unknown>;
  timeExpression?: TimeExpression;
  urgency: "low" | "medium" | "high";
}

export interface ExtractedEntity {
  type: "person" | "time" | "location" | "event" | "preference";
  value: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface IntentAnalysis {
  primaryIntent: UserIntent;
  secondaryIntents: UserIntent[];
  confidence: number;
  entities: ExtractedEntity[];
  context: ConversationContext;
  language: string;
  requiresAction: boolean;
  suggestedTools: ToolSuggestion[];
}

export interface ToolSuggestion {
  toolName: string;
  confidence: number;
  reasoning: string;
  parameters?: Record<string, unknown>;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: UserIntent;
  entities?: ExtractedEntity[];
  context?: Record<string, unknown>;
}

export interface ConversationState {
  phase:
    | "greeting"
    | "introduction"
    | "exploration"
    | "inquiry"
    | "action"
    | "discussion"
    | "general";
  mood: "positive" | "negative" | "neutral" | "stressed";
  engagement: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  topic:
    | "scheduling"
    | "communication"
    | "information"
    | "delegation"
    | "general";
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
  communicationStyle?: "formal" | "informal" | "neutral";
  responseLength?: "concise" | "detailed" | "balanced";
  notificationPreferences?: Record<string, boolean>;
  privacySettings?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface IntegrationContext {
  availableIntegrations: string[];
  activeIntegrations: string[];
  lastUsed: Date | null;
}

export interface MemoryContext {
  recentMemories: MemoryEntry[];
  relevantMemories: MemoryEntry[];
  memoryCount: number;
}

export interface MemoryEntry {
  id: string;
  key: string;
  content: string;
  context: Record<string, unknown>;
  importance: number;
  relevance: number;
  accessCount: number;
  lastAccessed: Date;
  semanticEmbedding?: number[];
}

export interface DelegationContext {
  delegationId: string;
  delegatorId: string;
  delegateeId: string;
  permissions: string[];
  constraints: Record<string, unknown>;
  expiresAt?: Date;
}

export interface ConversationContext {
  conversationHistory: ConversationTurn[];
  userPreferences: UserPreferences;
  currentState: ConversationState;
  integrationContext: IntegrationContext;
  memoryContext: MemoryContext;
  delegationContext?: DelegationContext;
}

export interface LanguageInfo {
  language: string;
  confidence: number;
  script?: string;
  region?: string;
}

export interface TimeExpression {
  expression: string;
  type:
    | "specific_time"
    | "relative_time"
    | "duration"
    | "recurring"
    | "approximate";
  value: string; // ISO 8601 datetime string or duration string
  confidence: number;
  language: string;
  metadata?: {
    relative?: boolean;
    timezone?: string;
    duration_seconds?: number;
    [key: string]: unknown;
  };
}
