import { Pool } from "pg";

// Database connection configuration with production-ready settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  // Production-ready connection settings
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
  query_timeout: 30000, // Query timeout of 30 seconds
  statement_timeout: 30000, // Statement timeout of 30 seconds
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export the pool for use in queries
export default pool;

// Export a query helper with error handling
export const query = async (text: string, params?: unknown[]) => {
  const { withRetry } = await import("@/lib/ai/resilience/error-handler");
  
  return withRetry(
    async () => {
      return await pool.query(text, params);
    },
    `db-query-${text.substring(0, 50).replace(/\s+/g, '-')}`,
    { maxRetries: 2, baseDelayMs: 100, circuitBreaker: false }
  );
};
