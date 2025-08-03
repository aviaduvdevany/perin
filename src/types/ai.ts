// Chat message interface
export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
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
