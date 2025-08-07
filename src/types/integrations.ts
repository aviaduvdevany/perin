// Base integration types for the unified framework

export type IntegrationType =
  | "gmail"
  | "calendar"
  | "slack"
  | "notion"
  | "github"
  | "discord"
  | "zoom"
  | "teams";

// OAuth2 token structure
export interface OAuth2Tokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

// Integration connection status
export interface IntegrationStatus {
  id: string;
  userId: string;
  type: IntegrationType;
  isActive: boolean;
  connectedAt: string;
  lastSyncAt?: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

// Generic context interface for all integrations
export interface IntegrationContext<T = unknown> {
  data?: T[];
  count?: number;
  metadata?: Record<string, unknown>;
  isConnected: boolean;
  lastSync?: string;
  error?: string;
}

// Provider configuration interface
export interface IntegrationProvider<T = unknown> {
  type: IntegrationType;
  name: string;
  scopes: string[];
  keywords: string[];
  contextLoader: (userId: string, params?: unknown) => Promise<T[]>;
  authUrl: string;
  callbackUrl: string;
  icon?: string;
  description?: string;
}

// Integration node result
export interface IntegrationNodeResult {
  context: IntegrationContext;
  currentStep: string;
  error?: string;
}

// OAuth2 configuration
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// Integration registry entry
export interface IntegrationRegistryEntry<T = unknown>
  extends IntegrationProvider<T> {
  oauth2Config: OAuth2Config;
  contextTransformer?: (data: T[]) => unknown;
}

// Service layer types
export interface ConnectIntegrationRequest {
  type: IntegrationType;
  userId: string;
}

export interface ConnectIntegrationResponse {
  authUrl: string;
  message: string;
}

export interface IntegrationCallbackRequest {
  code: string;
  state?: string;
}

export interface IntegrationCallbackResponse {
  success: boolean;
  message: string;
  integration?: IntegrationStatus;
}

// LangGraph integration state
export interface LangGraphIntegrationState {
  integrations: Record<IntegrationType, IntegrationContext>;
  currentStep: string;
  error?: string;
}

// Context detection result
export interface ContextDetectionResult {
  isRelevant: boolean;
  confidence: number;
  matchedKeywords: string[];
  suggestedAction?: string;
}
