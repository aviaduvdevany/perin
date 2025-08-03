// 🧠 Perin Project Conventions — Cursor Reference

// This file outlines the conventions, file structure, and coding practices
// to be followed across the Perin Next.js monolith project

// -------------------------------------------------------------
// 📁 Project Structure (simplified outline)
// -------------------------------------------------------------

- /app → Next.js app directory

  - /api → API route handlers
    - /<route>/route.ts → Route handlers with exported HTTP methods (GET, POST, etc.)
  - /auth → Authentication pages (signin, signup)
  - /dashboard → Protected dashboard pages

- /lib

  - /queries → Smart query functions per domain (execute directly, return typed results)
  - /db.ts → PostgreSQL client config (pg module with connection pooling)
  - /tables.ts → Constants for table names
  - /db-types.ts → Type definitions for DB schemas (from pg output or manually defined)
  - /utils → Helpers (formatting, error handling, auth utilities, etc.)

- /components

  - /providers → React context providers (SessionProvider, etc.)

- /hooks

  - useAuth.ts → Authentication hook for client-side auth management

- /types

  - next-auth.d.ts → NextAuth type extensions

- /constants

  - config.ts → App-wide constants (API URLs, feature flags)
  - copy.ts → Friendly microcopy & messaging

- middleware.ts → Route protection middleware
- tailwind.config.ts
- tsconfig.json

// -------------------------------------------------------------
// 🧩 API Layer Conventions
// -------------------------------------------------------------

// 1. Each route file exports HTTP method handlers
// Good: /app/api/users/route.ts

export async function POST(req: Request) { /_ ... _/ }

// 2. SQL queries are defined in lib/queries/\*.ts
// Use smart query functions that execute directly and return typed results

import { query } from '../db';
import { USERS_TABLE } from '../tables';
import type { User } from '../db-types';

export const getUserById = async (userId: string): Promise<User | null> => {
const sql = `    SELECT * FROM ${USERS_TABLE}
    WHERE id = $1
 `;

try {
const result = await query(sql, [userId]);
return result.rows[0] || null;
} catch (error) {
console.error('Error getting user by ID:', error);
throw error;
}
};

// 3. All table names imported from lib/tables.ts

export const USERS_TABLE = 'users';

// 4. Database types stored in lib/db-types.ts
// Can be manually defined or generated using tools like pg-to-ts

export interface User {
id: string;
email: string;
name: string | null;
created_at: string;
updated_at: string;
}

// 5. API routes use smart queries directly

export async function GET(request: NextRequest) {
try {
const user = await userQueries.getUserById(id);
return NextResponse.json({ user });
} catch (error) {
return ErrorResponses.databaseError('Failed to fetch user');
}
}

// -------------------------------------------------------------
// 🔐 Authentication Conventions
// -------------------------------------------------------------

// 1. Use NextAuth.js for authentication
// 2. Smart queries handle all database operations
// 3. Middleware protects routes automatically
// 4. Type-safe session management
// 5. Secure password hashing with bcrypt

// -------------------------------------------------------------
// 🛡️ Security Best Practices
// -------------------------------------------------------------

// 1. Parameterized SQL queries (prevents SQL injection)
// 2. Input validation and sanitization
// 3. Error handling without exposing sensitive data
// 4. JWT tokens for stateless authentication
// 5. CSRF protection via NextAuth
// 6. Secure password hashing (bcrypt with 12 salt rounds)
