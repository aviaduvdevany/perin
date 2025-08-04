import { query } from "@/lib/db";

// Database helper utilities

export interface QueryResult<T> {
  data: T[] | null;
  error: string | null;
  count?: number | null;
}

/**
 * Execute a database query with error handling
 */
export async function executeQuery<T>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  try {
    const result = await query(sql, params);
    return {
      data: result.rows,
      error: null,
      count: result.rowCount,
    };
  } catch (error) {
    console.error("Database query error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * Execute a single row query (for SELECT queries that should return one result)
 */
export async function executeSingleQuery<T>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const result = await executeQuery<T>(sql, params);

  if (result.data && result.data.length > 0) {
    return {
      data: [result.data[0]],
      error: null,
      count: 1,
    };
  }

  return {
    data: null,
    error: "No results found",
    count: 0,
  };
}

/**
 * Execute an insert/update/delete query
 */
export async function executeMutation(
  sql: string,
  params: unknown[] = []
): Promise<{
  success: boolean;
  error: string | null;
  affectedRows?: number | null;
}> {
  try {
    const result = await query(sql, params);
    return {
      success: true,
      error: null,
      affectedRows: result.rowCount,
    };
  } catch (error) {
    console.error("Database mutation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * Build a WHERE clause with parameterized queries
 */
export function buildWhereClause(conditions: Record<string, unknown>): {
  clause: string;
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null) {
      clauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  return {
    clause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}
