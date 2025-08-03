// 🧠 Perin Project Conventions — Cursor Reference

// This file outlines the conventions, file structure, and coding practices
// to be followed across the Perin Next.js monolith project

// -------------------------------------------------------------
// 📁 Project Structure (simplified outline)
// -------------------------------------------------------------

- /app                  → Next.js app directory
  - /api                → API route handlers
    - /<route>/route.ts → Route handlers with exported HTTP methods (GET, POST, etc.)

- /lib
  - /queries            → SQL query files per domain (pure SQL tagged strings)
  - /db.ts              → Neon client config (pg module)
  - /tables.ts          → Constants for table names
  - /db-types.ts        → Type definitions for DB schemas (from pg output or manually defined)
  - /utils              → Helpers (formatting, error handling, etc.)


- /constants
  - config.ts           → App-wide constants (API URLs, feature flags)
  - copy.ts             → Friendly microcopy & messaging

- middleware.ts
- tailwind.config.ts
- tsconfig.json


// -------------------------------------------------------------
// 🧩 API Layer Conventions
// -------------------------------------------------------------

// 1. Each route file exports HTTP method handlers
//    Good: /app/api/meetings/route.ts

export async function POST(req: Request) { /* ... */ }

// 2. SQL queries are defined in lib/queries/*.ts
//    Use parameterized SQL tagged templates for safety

import { sql } from '@vercel/postgres';
import { MEETINGS_TABLE } from '../tables';

export const getMeetingsByUser = (userId: string) => sql`
  SELECT * FROM ${sql.identifier([MEETINGS_TABLE])}
  WHERE user_id = ${userId}
`;

// 3. All table names imported from lib/tables.ts

export const USERS_TABLE = 'users';
export const MEETINGS_TABLE = 'meetings';

// 4. Database types stored in lib/db-types.ts
//    Can be manually defined or generated using tools like pg-to-ts

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
}

