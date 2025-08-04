import { hash, compare } from "bcryptjs";
import * as userQueries from "@/lib/queries/users";
import type { User } from "@/lib/db-types";

// Authentication helper utilities

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await compare(password, hashedPassword);
}

/**
 * Create a new user with hashed password
 */
export async function createUserWithPassword(userData: {
  email: string;
  password: string;
  name?: string;
  image?: string;
  perin_name?: string;
  tone?: string;
  avatar_url?: string;
  preferred_hours?: Record<string, unknown>;
  timezone?: string;
  memory?: Record<string, unknown>;
  is_beta_user?: boolean;
  role?: string;
}): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Check if user already exists
    const existingUser = await userQueries.getUserByEmail(userData.email);

    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    // Hash the password
    const hashedPassword = await hashPassword(userData.password);

    // Create user data
    const userToCreate = {
      email: userData.email,
      name: userData.name,
      hashed_password: hashedPassword,
      image: userData.image,
      perin_name: userData.perin_name || "Perin",
      tone: userData.tone,
      avatar_url: userData.avatar_url,
      preferred_hours: userData.preferred_hours,
      timezone: userData.timezone || "UTC",
      memory: userData.memory || {},
      is_beta_user: userData.is_beta_user || false,
      role: userData.role || "user",
    };

    // Create user
    const newUser = await userQueries.createUser(userToCreate);

    return { success: true, user: newUser };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await userQueries.updateUser(userId, {
      hashed_password: hashedPassword,
    });

    if (!updatedUser) {
      return {
        success: false,
        error: "Failed to update password",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating password:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
