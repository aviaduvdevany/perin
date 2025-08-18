import { query } from "@/lib/db";
import { isValidTimezone } from "./timezone";

/**
 * Database timezone utilities for consistent timezone handling
 */

/**
 * Convert a date to UTC for database storage
 * All timestamps should be stored in UTC in the database
 */
export function toUtcForDb(date: Date | string | null): string | null {
  if (!date) return null;

  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toISOString();
}

/**
 * Convert a database UTC timestamp to a specific timezone
 */
export function fromDbUtcToTimezone(
  dbTimestamp: string | null,
  timezone: string
): Date | null {
  if (!dbTimestamp || !isValidTimezone(timezone)) {
    return dbTimestamp ? new Date(dbTimestamp) : null;
  }

  try {
    // Parse the UTC timestamp and convert to the target timezone
    const utcDate = new Date(dbTimestamp);
    return new Date(utcDate.toLocaleString("en-US", { timeZone: timezone }));
  } catch {
    return new Date(dbTimestamp);
  }
}

/**
 * Get current UTC timestamp for database operations
 */
export function getCurrentUtcTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create a date range in UTC for database queries
 */
export function createUtcDateRange(
  startDate: Date | string,
  endDate: Date | string
): { start: string; end: string } {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Convert user's local time to UTC for database storage
 */
export function userTimeToUtc(
  userDate: Date | string,
  userTimezone: string
): string {
  const date = typeof userDate === "string" ? new Date(userDate) : userDate;

  if (!isValidTimezone(userTimezone)) {
    return date.toISOString();
  }

  try {
    // Get the timezone offset and adjust
    const offset = date.getTimezoneOffset();
    const utcDate = new Date(date.getTime() + offset * 60000);
    return utcDate.toISOString();
  } catch {
    return date.toISOString();
  }
}

/**
 * Database migration to convert timestamp columns to timestamptz
 */
export async function migrateTimestampsToTimestamptz(): Promise<void> {
  const migrations = [
    // Convert users table timestamps
    `ALTER TABLE users 
     ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
     ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
     ALTER COLUMN email_verified TYPE timestamptz USING email_verified AT TIME ZONE 'UTC'`,

    // Convert user_connections table timestamps
    `ALTER TABLE user_connections 
     ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
     ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC'`,

    // Convert user_integrations table timestamps
    `ALTER TABLE user_integrations 
     ALTER COLUMN connected_at TYPE timestamptz USING connected_at AT TIME ZONE 'UTC',
     ALTER COLUMN last_sync_at TYPE timestamptz USING last_sync_at AT TIME ZONE 'UTC',
     ALTER COLUMN token_expires_at TYPE timestamptz USING token_expires_at AT TIME ZONE 'UTC'`,

    // Convert agent_sessions table timestamps
    `ALTER TABLE agent_sessions 
     ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
     ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC'`,

    // Convert connection_permissions table timestamps
    `ALTER TABLE connection_permissions 
     ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC'`,

    // Convert agent_messages table timestamps
    `ALTER TABLE agent_messages 
     ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,

    // Convert audit_logs table timestamps
    `ALTER TABLE audit_logs 
     ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,

    // Convert idempotency_keys table timestamps
    `ALTER TABLE idempotency_keys 
     ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
  ];

  for (const migration of migrations) {
    try {
      await query(migration);
      console.log("Successfully migrated timestamp column");
    } catch (error) {
      console.warn(
        "Migration failed (column might already be timestamptz):",
        error
      );
    }
  }
}

/**
 * Set database timezone to UTC for all connections
 */
export async function setDatabaseTimezone(): Promise<void> {
  try {
    await query("SET timezone = 'UTC'");
    console.log("Database timezone set to UTC");
  } catch (error) {
    console.warn("Failed to set database timezone:", error);
  }
}

/**
 * Get database timezone setting
 */
export async function getDatabaseTimezone(): Promise<string> {
  try {
    const result = await query("SHOW timezone");
    return result.rows[0]?.TimeZone || "UTC";
  } catch (error) {
    console.warn("Failed to get database timezone:", error);
    return "UTC";
  }
}

/**
 * Validate that all timestamp columns are using timestamptz
 */
export async function validateTimestampColumns(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check for timestamp columns that should be timestamptz
    const result = await query(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type = 'timestamp without time zone'
        AND table_name NOT LIKE 'pg_%'
    `);

    if (result.rows.length > 0) {
      issues.push(
        `Found ${result.rows.length} timestamp columns that should be timestamptz:`,
        ...result.rows.map((row) => `  ${row.table_name}.${row.column_name}`)
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push(`Failed to validate timestamp columns: ${error}`);
    return {
      valid: false,
      issues,
    };
  }
}

/**
 * Helper function to ensure all date operations use UTC
 */
export function ensureUtcDate(date: Date | string | null): Date | null {
  if (!date) return null;

  const dateObj = typeof date === "string" ? new Date(date) : date;

  // If the date is already in UTC format, return as is
  if (dateObj.toISOString() === dateObj.toISOString()) {
    return dateObj;
  }

  // Convert to UTC
  return new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
}
