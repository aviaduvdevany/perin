import { Pool } from "pg";

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Export the pool for use in queries
export default pool;

// Export a query helper for convenience
export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);
