// API error interface
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// API response interface
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: ApiError;
}

// Pagination interface
export interface Pagination {
  limit: number;
  offset: number;
  count: number;
}

// Users API response interface
export interface UsersApiResponse {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    is_beta_user: boolean;
  }>;
  pagination: Pagination;
}

// User API response interface
export interface UserApiResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    is_beta_user: boolean;
  };
}

// Memory API response interface
export interface MemoryApiResponse {
  memory: Record<string, unknown>;
  lastUpdated?: string;
}

// AI chat API request interface
export interface ChatApiRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  tone?: string;
  perinName?: string;
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination";
  // Optional hint from the client about connected integration types
  clientIntegrations?: (
    | "gmail"
    | "calendar"
    | "slack"
    | "notion"
    | "github"
    | "discord"
    | "zoom"
    | "teams"
  )[];
}

// AI memory API request interface
export interface MemoryApiRequest {
  key: string;
  value: unknown;
  context?: string;
}

// AI classify API request interface
export interface ClassifyApiRequest {
  message: string;
}

export enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}
