// Database type definitions
// These can be manually defined or generated using tools like pg-to-ts

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

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

// Add more interfaces as tables are created:
// export interface Post {
//   id: string;
//   user_id: string;
//   title: string;
//   content: string;
//   created_at: string;
//   updated_at: string;
// }
