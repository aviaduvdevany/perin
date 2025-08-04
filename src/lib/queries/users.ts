import { USERS_TABLE } from "@/lib/tables";
import type { User } from "@/lib/db-types";
import { query } from "@/lib/db";

// User-related SQL queries
// All queries use parameterized SQL for safety and execute directly

export const getUserById = async (userId: string): Promise<User | null> => {
  const sql = `
    SELECT * FROM ${USERS_TABLE}
    WHERE id = $1
  `;

  try {
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const sql = `
    SELECT * FROM ${USERS_TABLE}
    WHERE email = $1
  `;

  try {
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

export const getAllUsers = async (
  limit = 20,
  offset = 0
): Promise<{ users: User[]; count: number }> => {
  const sql = `
    SELECT * FROM ${USERS_TABLE}
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  try {
    const result = await query(sql, [limit, offset]);
    return {
      users: result.rows,
      count: result.rowCount !== null ? result.rowCount : 0,
    };
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

export const createUser = async (user: {
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
}): Promise<User> => {
  const sql = `
    INSERT INTO ${USERS_TABLE} (
      email, name, hashed_password, image, perin_name, tone, 
      avatar_url, preferred_hours, timezone, memory, is_beta_user, role
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  try {
    const result = await query(sql, [
      user.email,
      user.name,
      user.hashed_password,
      user.image,
      user.perin_name,
      user.tone,
      user.avatar_url,
      user.preferred_hours,
      user.timezone,
      user.memory,
      user.is_beta_user,
      user.role,
    ]);

    return result.rows[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (
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
): Promise<User | null> => {
  const sql = `
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
      hashed_password = COALESCE($14, hashed_password),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  try {
    const result = await query(sql, [
      userId,
      updates.email,
      updates.name,
      updates.image,
      updates.perin_name,
      updates.tone,
      updates.avatar_url,
      updates.preferred_hours,
      updates.timezone,
      updates.memory,
      updates.is_beta_user,
      updates.role,
      updates.email_verified,
      updates.hashed_password,
    ]);

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const sql = `
    DELETE FROM ${USERS_TABLE}
    WHERE id = $1
  `;

  try {
    const result = await query(sql, [userId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Count queries
export const countUsers = async (): Promise<number> => {
  const sql = `
    SELECT COUNT(*) as count FROM ${USERS_TABLE}
  `;

  try {
    const result = await query(sql);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error("Error counting users:", error);
    throw error;
  }
};
