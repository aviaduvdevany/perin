import { USERS_TABLE } from "../tables";
import type { User } from "../db-types";

// User-related SQL queries
// All queries use parameterized SQL for safety

export const getUserById = (userId: string) => `
  SELECT * FROM ${USERS_TABLE}
  WHERE id = $1
`;

export const getUserByEmail = (email: string) => `
  SELECT * FROM ${USERS_TABLE}
  WHERE email = $1
`;

export const getAllUsers = (limit = 20, offset = 0) => `
  SELECT * FROM ${USERS_TABLE}
  ORDER BY created_at DESC
  LIMIT $1 OFFSET $2
`;

export const createUser = (user: {
  email: string;
  name?: string;
  hashed_password?: string;
  image?: string;
  perin_name?: string;
  tone?: string;
  avatar_url?: string;
  preferred_hours?: Record<string, unknown>;
  timezone?: string;
  memory?: Record<string, unknown>;
  is_beta_user?: boolean;
  role?: string;
}) => `
  INSERT INTO ${USERS_TABLE} (
    email, name, hashed_password, image, perin_name, tone, 
    avatar_url, preferred_hours, timezone, memory, is_beta_user, role
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  RETURNING *
`;

export const updateUser = (
  userId: string,
  updates: Partial<
    Pick<
      User,
      | "email"
      | "name"
      | "image"
      | "perin_name"
      | "tone"
      | "avatar_url"
      | "preferred_hours"
      | "timezone"
      | "memory"
      | "is_beta_user"
      | "role"
      | "email_verified"
      | "hashed_password"
    >
  >
) => `
  UPDATE ${USERS_TABLE}
  SET 
    email = COALESCE($2, email),
    name = COALESCE($3, name),
    image = COALESCE($4, image),
    perin_name = COALESCE($5, perin_name),
    tone = COALESCE($6, tone),
    avatar_url = COALESCE($7, avatar_url),
    preferred_hours = COALESCE($8, preferred_hours),
    timezone = COALESCE($9, timezone),
    memory = COALESCE($10, memory),
    is_beta_user = COALESCE($11, is_beta_user),
    role = COALESCE($12, role),
    email_verified = COALESCE($13, email_verified),
    updated_at = NOW()
  WHERE id = $1
  RETURNING *
`;

export const deleteUser = (userId: string) => `
  DELETE FROM ${USERS_TABLE}
  WHERE id = $1
`;

// Count queries
export const countUsers = () => `
  SELECT COUNT(*) as count FROM ${USERS_TABLE}
`;
