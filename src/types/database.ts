// Database user interface
export interface User {
  id: string;
  email: string;
  email_verified: string | null;
  hashed_password: string | null;
  name: string | null;
  image: string | null;
  created_at: string;
  updated_at: string;

  // Perin-specific fields
  perin_name: string;
  tone: string | null;
  avatar_url: string | null;
  preferred_hours: Record<string, unknown> | null;
  timezone: string;
  memory: Record<string, unknown>;

  // User management fields
  is_beta_user: boolean;
  role: string;
}

// Database query result interface
export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

// User creation interface
export interface CreateUserData {
  email: string;
  name: string;
  hashed_password: string;
  perin_name?: string;
  tone?: string;
  timezone?: string;
  preferred_hours?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  is_beta_user?: boolean;
  role?: string;
}

// User update interface
export interface UpdateUserData {
  email?: string;
  name?: string;
  perin_name?: string;
  tone?: string;
  timezone?: string;
  preferred_hours?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  is_beta_user?: boolean;
  role?: string;
}
