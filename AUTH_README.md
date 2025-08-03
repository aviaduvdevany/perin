# 🔐 Perin Authentication System Documentation

This document provides a comprehensive overview of the authentication system implemented in the Perin project using NextAuth.js, PostgreSQL, and Next.js App Router.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [API Routes](#api-routes)
- [Middleware & Protection](#middleware--protection)
- [Frontend Components](#frontend-components)
- [Type Definitions](#type-definitions)
- [Environment Configuration](#environment-configuration)
- [Security Features](#security-features)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

The authentication system is built with a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  Pages: /auth/signin, /auth/signup, /dashboard             │
│  Components: SessionProvider, useAuth hook                 │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  Routes: /api/auth/[...nextauth], /api/auth/register       │
│  Middleware: Route protection                               │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Auth Helpers: Password hashing, validation                │
│  Smart Queries: Direct database execution with type safety │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  Tables: users (with Perin-specific fields)                │
│  Connection Pool: pg module with connection pooling        │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Schema

### Users Table Structure

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMP,
  hashed_password TEXT,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  -- Perin-specific fields
  perin_name TEXT DEFAULT 'Perin',
  tone TEXT,
  avatar_url TEXT,
  preferred_hours JSONB,
  timezone TEXT DEFAULT 'UTC',
  memory JSONB DEFAULT '{}',

  -- User management fields
  is_beta_user BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user'
);
```

### Key Fields Explained

| Field             | Type      | Description                    |
| ----------------- | --------- | ------------------------------ |
| `id`              | TEXT      | Unique user identifier (UUID)  |
| `email`           | TEXT      | User's email address (unique)  |
| `hashed_password` | TEXT      | Bcrypt-hashed password         |
| `email_verified`  | TIMESTAMP | Email verification timestamp   |
| `perin_name`      | TEXT      | Custom name for AI assistant   |
| `tone`            | TEXT      | Preferred communication tone   |
| `preferred_hours` | JSONB     | User's preferred working hours |
| `timezone`        | TEXT      | User's timezone                |
| `memory`          | JSONB     | AI memory/conversation history |
| `is_beta_user`    | BOOLEAN   | Beta feature access flag       |
| `role`            | TEXT      | User role (user, admin, etc.)  |

## 🔄 Authentication Flow

### 1. User Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Fill registration form
    F->>A: POST /api/auth/register
    A->>A: Validate input
    A->>A: Hash password
    A->>D: Check if user exists
    A->>D: Insert new user
    A->>F: Return success/error
    F->>U: Show result
```

### 2. User Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant N as NextAuth
    participant D as Database

    U->>F: Enter credentials
    F->>N: signIn('credentials')
    N->>D: Query user by email
    N->>N: Verify password hash
    N->>F: Create JWT session
    F->>U: Redirect to dashboard
```

### 3. Protected Route Access

```mermaid
sequenceDiagram
    participant U as User
    participant M as Middleware
    participant A as API
    participant D as Database

    U->>M: Request protected route
    M->>M: Check JWT token
    M->>A: Allow/deny access
    A->>D: Query user data
    A->>U: Return protected content
```

## 🛣️ API Routes

### Authentication Routes

#### `POST /api/auth/register`

**Purpose**: Register a new user account

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "perin_name": "Perin",
  "timezone": "UTC"
}
```

**Response**:

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Validation**:

- Email format validation
- Password strength (8+ chars, uppercase, lowercase, number)
- Required fields check
- Duplicate email check

#### `GET/POST /api/auth/[...nextauth]`

**Purpose**: NextAuth.js endpoints for authentication

**Endpoints**:

- `GET /api/auth/signin` - Sign in page
- `POST /api/auth/signin` - Process sign in
- `GET /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session
- `GET /api/auth/csrf` - CSRF token

### User Management Routes

#### `GET /api/users`

**Purpose**: Get all users (with pagination)

**Query Parameters**:

- `limit` (default: 20)
- `offset` (default: 0)

**Response**:

```json
{
  "users": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 100
  }
}
```

#### `GET /api/users/[id]`

**Purpose**: Get specific user by ID

**Response**:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "is_beta_user": false
  }
}
```

#### `PUT /api/users/[id]`

**Purpose**: Update user information

#### `DELETE /api/users/[id]`

**Purpose**: Delete user account

### Health Check

#### `GET /api/health`

**Purpose**: Check application and database health

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

## 🛡️ Middleware & Protection

### Route Protection Middleware

**File**: `src/middleware.ts`

```typescript
export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect API routes except auth and health
        if (req.nextUrl.pathname.startsWith("/api/")) {
          if (req.nextUrl.pathname.startsWith("/api/auth/")) {
            return true;
          }
          if (req.nextUrl.pathname === "/api/health") {
            return true;
          }
          return !!token;
        }

        // Protect dashboard routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }

        return true;
      },
    },
  }
);
```

### Protected Routes

| Route          | Protection Level | Description              |
| -------------- | ---------------- | ------------------------ |
| `/api/auth/*`  | Public           | Authentication endpoints |
| `/api/health`  | Public           | Health check             |
| `/api/users/*` | Authenticated    | User management          |
| `/dashboard/*` | Authenticated    | Dashboard pages          |
| `/auth/*`      | Public           | Auth pages               |

## 🎨 Frontend Components

### Session Provider

**File**: `src/components/providers/SessionProvider.tsx`

```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

### Authentication Hook

**File**: `src/hooks/useAuth.ts`

```typescript
export function useAuth() {
  const { data: session, status } = useSession();

  const login = async (email: string, password: string) => {
    // Login logic
  };

  const logout = async () => {
    // Logout logic
  };

  const register = async (userData) => {
    // Registration logic
  };

  return {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === "loading",
    login,
    logout,
    register,
  };
}
```

### Authentication Pages

#### Sign In Page (`/auth/signin`)

- Email and password form
- Error handling and validation
- Link to registration page
- Responsive design with Tailwind CSS

#### Sign Up Page (`/auth/signup`)

- Registration form with validation
- Password confirmation
- Link to sign in page
- Client-side validation

#### Dashboard Page (`/dashboard`)

- Protected route requiring authentication
- User information display
- Logout functionality
- Session management

## 🧠 Smart Query System

### Overview

The authentication system uses "smart queries" - functions that execute database operations directly and return typed results. This approach provides:

- **Type Safety**: All queries return properly typed results
- **Error Handling**: Built-in try/catch with proper error logging
- **Simplified API Routes**: No need for manual query execution
- **Better Performance**: Direct database execution
- **Cleaner Code**: Less boilerplate in API routes

### Smart Query Example

```typescript
// Before: Dumb query (just returns SQL string)
export const getUserById = (userId: string) => `
  SELECT * FROM ${USERS_TABLE}
  WHERE id = $1
`;

// After: Smart query (executes and returns result)
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
```

### API Route Usage

```typescript
// Before: Manual query execution
const sql = userQueries.getUserById(id);
const result = await executeQuery<User>(sql, [id]);
if (result.error) {
  return ErrorResponses.databaseError(result.error);
}

// After: Direct smart query usage
const user = await userQueries.getUserById(id);
if (!user) {
  return ErrorResponses.notFound("User not found");
}
```

### Benefits

1. **Type Safety**: Return types are explicitly defined
2. **Error Handling**: Centralized error management
3. **Simplified Code**: API routes are much cleaner
4. **Better Performance**: Direct database execution
5. **Consistent Patterns**: All queries follow the same structure

## 📝 Type Definitions

### NextAuth Type Extensions

**File**: `src/types/next-auth.d.ts`

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      isBetaUser: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
    isBetaUser: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    isBetaUser: boolean;
  }
}
```

### Database Types

**File**: `src/lib/db-types.ts`

```typescript
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
```

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/perin

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Production Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database

# NextAuth Configuration
NEXTAUTH_SECRET=production-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app

# App Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Example output
# sU5xe8V3v7MgOwNH3UEMSOBQPwR9xKe9MofEd3yPdus=
```

## 🔒 Security Features

### Password Security

- **Bcrypt hashing** with 12 salt rounds
- **Password validation**: minimum 8 characters, uppercase, lowercase, number
- **Secure password storage** (never stored in plain text)

### Session Security

- **JWT tokens** for stateless authentication
- **CSRF protection** via NextAuth.js
- **Secure cookie handling**
- **Automatic session expiration**

### Route Protection

- **Middleware-based protection** for API routes
- **Authentication checks** on protected pages
- **Role-based access control** (RBAC) support

### Input Validation

- **Email format validation** with regex
- **Required field validation**
- **SQL injection prevention** with parameterized queries
- **XSS protection** with proper escaping

### Database Security

- **Parameterized queries** to prevent SQL injection
- **Connection pooling** for performance and security
- **Error handling** without exposing sensitive information

## 💡 Usage Examples

### Client-Side Authentication

```typescript
import { useAuth } from "../hooks/useAuth";

function MyComponent() {
  const { session, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    const result = await login("user@example.com", "password123");
    if (result.success) {
      // Redirect to dashboard
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {session?.user?.name}!</p>
          <button onClick={logout}>Sign Out</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Sign In</button>
      )}
    </div>
  );
}
```

### Server-Side Authentication

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "../lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Handle authenticated request
  return Response.json({ user: session.user });
}
```

### Database Operations

```typescript
import * as userQueries from "../lib/queries/users";

// Get user by email (smart query - executes directly)
const user = await userQueries.getUserByEmail(email);

if (user) {
  // Process user data directly
  console.log(user.name, user.email);
}

// Create new user
const newUser = await userQueries.createUser({
  email: "user@example.com",
  name: "John Doe",
  hashed_password: hashedPassword,
});

// Update user
const updatedUser = await userQueries.updateUser(userId, {
  name: "Jane Doe",
  timezone: "UTC",
});

// Delete user
const deleted = await userQueries.deleteUser(userId);
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Invalid credentials" error

**Cause**: Wrong email/password or user doesn't exist
**Solution**:

- Check if user exists in database
- Verify password hashing is working
- Check NextAuth configuration

#### 2. "NEXTAUTH_SECRET not set" error

**Cause**: Missing or invalid secret
**Solution**:

```bash
# Generate new secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET=your-generated-secret
```

#### 3. Database connection errors

**Cause**: Invalid DATABASE_URL or database not accessible
**Solution**:

- Verify DATABASE_URL format
- Check database permissions
- Test connection manually

#### 4. TypeScript errors

**Cause**: Type mismatches or missing types
**Solution**:

```bash
# Check for type errors
npm run build

# Fix type issues in:
# - src/types/next-auth.d.ts
# - src/lib/db-types.ts
# - API route parameters
```

#### 5. Middleware not working

**Cause**: Incorrect middleware configuration
**Solution**:

- Check middleware.ts file
- Verify route patterns
- Test with different routes

### Debug Mode

Enable NextAuth debug mode for detailed logging:

```bash
# Add to .env.local
NEXTAUTH_DEBUG=true
```

### Testing Authentication

1. **Test registration**:

   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123","name":"Test User"}'
   ```

2. **Test health check**:

   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Test protected route**:
   ```bash
   curl http://localhost:3000/api/users
   # Should return 401 if not authenticated
   ```

## 📁 File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts    # NextAuth endpoints
│   │       └── register/route.ts         # Registration endpoint
│   ├── auth/
│   │   ├── signin/page.tsx               # Sign in page
│   │   └── signup/page.tsx               # Sign up page
│   ├── dashboard/page.tsx                # Protected dashboard
│   └── page.tsx                          # Home page
├── components/
│   └── providers/
│       └── SessionProvider.tsx           # NextAuth provider
├── hooks/
│   └── useAuth.ts                        # Authentication hook
├── lib/
│   ├── auth.ts                           # NextAuth configuration
│   ├── db.ts                             # Database connection (pg pool)
│   ├── db-types.ts                       # TypeScript types
│   ├── queries/
│   │   └── users.ts                      # Smart user queries
│   └── utils/
│       ├── auth-helpers.ts               # Auth utilities
│       └── error-handlers.ts             # Error handling
├── types/
│   └── next-auth.d.ts                    # NextAuth type extensions
└── middleware.ts                         # Route protection
```

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [PostgreSQL with Node.js](https://node-postgres.com/)
- [Bcrypt.js Documentation](https://github.com/dcodeIO/bcrypt.js/)

## 🔄 Version History

- **v1.0.0**: Initial authentication system with NextAuth.js
- **v1.1.0**: Added Perin-specific user fields
- **v1.2.0**: Enhanced security and error handling
- **v1.3.0**: Added comprehensive documentation
- **v1.4.0**: Implemented smart query system for better type safety and performance

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
