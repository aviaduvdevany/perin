# 🧠 Perin Types System Documentation

This document provides a comprehensive overview of the organized TypeScript types system in the Perin project, following best practices for type safety, maintainability, and NextAuth.js integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Type Organization](#type-organization)
- [NextAuth Integration](#nextauth-integration)
- [Type Files](#type-files)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Perin types system is organized using a **modular approach** with **centralized exports** and **NextAuth module augmentation**. This ensures:

- **Type Safety**: Full TypeScript coverage across the application
- **Maintainability**: Clear separation of concerns
- **NextAuth Compliance**: Proper integration with NextAuth.js
- **Developer Experience**: Intuitive imports and autocomplete
- **Scalability**: Easy to extend and modify

## 📁 Type Organization

```
src/types/
├── index.ts              # Central export point (barrel file)
├── next-auth.d.ts        # NextAuth module augmentation
├── ai.ts                 # AI-related types
├── database.ts           # Database schema types
└── api.ts                # API request/response types
```

### Type Categories

| Category     | File             | Purpose                    | Examples                      |
| ------------ | ---------------- | -------------------------- | ----------------------------- |
| **NextAuth** | `next-auth.d.ts` | Authentication types       | Session, JWT, User            |
| **AI**       | `ai.ts`          | AI integration types       | ChatMessage, PerinChatRequest |
| **Database** | `database.ts`    | Database schema types      | User, QueryResult             |
| **API**      | `api.ts`         | API request/response types | ApiResponse, ChatApiRequest   |

## 🔐 NextAuth Integration

### Module Augmentation Pattern

We use NextAuth's recommended **Module Augmentation** approach for extending authentication types:

```typescript
// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isBetaUser: boolean;
    } & DefaultSession["user"];
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

### Benefits of Module Augmentation

1. **Type Safety**: Automatic type checking across the application
2. **IDE Support**: Full autocomplete and IntelliSense
3. **NextAuth Compliance**: Follows official NextAuth patterns
4. **No Conflicts**: Avoids type conflicts with NextAuth internals
5. **Single Source of Truth**: Types defined once, used everywhere

## 📄 Type Files

### 1. `src/types/index.ts` - Central Export Point

```typescript
// Export all types from their respective modules
export * from "./ai";
export * from "./database";
export * from "./api";

// Re-export NextAuth types for convenience
export type { Session, User } from "next-auth";
export type { JWT } from "next-auth/jwt";
```

**Purpose**: Barrel file that provides a single import point for all types.

**Usage**:

```typescript
import type { ChatMessage, User, Session } from "../types";
```

### 2. `src/types/next-auth.d.ts` - NextAuth Extensions

```typescript
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isBetaUser: boolean;
    } & DefaultSession["user"];
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

**Purpose**: Extends NextAuth types with Perin-specific fields.

**Key Features**:

- Extends `DefaultSession["user"]` to preserve NextAuth defaults
- Adds custom fields: `id`, `role`, `isBetaUser`
- Maintains type safety across authentication flow

### 3. `src/types/ai.ts` - AI Integration Types

```typescript
// Chat message interface
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

// AI chat request interface
export interface PerinChatRequest {
  messages: ChatMessage[];
  tone?: string;
  perinName?: string;
  memory?: Record<string, MemoryEntry>;
  specialization?: string;
}

// Memory management types
export interface MemoryEntry {
  content: string;
  timestamp: string;
  type: "preference" | "fact" | "conversation";
  relevance?: number;
}

export interface UserMemory {
  userId: string;
  memory: Record<string, MemoryEntry>;
  lastUpdated: string;
}

// Intent classification
export interface IntentClassification {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  suggestedAction?: string;
}

// System prompt context
export interface SystemPromptContext {
  user: User;
  conversationHistory?: string;
  currentTime?: string;
  timezone?: string;
}
```

**Purpose**: Defines all types related to AI functionality.

**Key Features**:

- Chat message handling
- Memory management
- Intent classification
- System prompt construction

### 4. `src/types/database.ts` - Database Schema Types

```typescript
// Database user interface (separate from NextAuth User)
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

// Database operation types
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number | null;
}

export interface CreateUserData {
  email: string;
  name?: string;
  hashed_password: string;
  perin_name?: string;
  timezone?: string;
}

export interface UpdateUserData {
  name?: string;
  perin_name?: string;
  tone?: string;
  timezone?: string;
  preferred_hours?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  is_beta_user?: boolean;
  role?: string;
}
```

**Purpose**: Defines database schema types separate from NextAuth types.

**Key Features**:

- Complete database schema representation
- CRUD operation types
- Separation from NextAuth User type

### 5. `src/types/api.ts` - API Request/Response Types

```typescript
// Base API response types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface Pagination {
  limit: number;
  offset: number;
  count: number;
}

// Specific API response types
export interface UsersApiResponse extends ApiResponse {
  data?: {
    users: User[];
    pagination: Pagination;
  };
}

export interface UserApiResponse extends ApiResponse {
  data?: {
    user: User;
  };
}

export interface MemoryApiResponse extends ApiResponse {
  data?: {
    memory: UserMemory;
  };
}

// API request types
export interface ChatApiRequest {
  messages: ChatMessage[];
  tone?: string;
  perinName?: string;
  specialization?: string;
}

export interface MemoryApiRequest {
  key: string;
  content: string;
  type: "preference" | "fact" | "conversation";
}

export interface ClassifyApiRequest {
  message: string;
}
```

**Purpose**: Defines API request and response structures.

**Key Features**:

- Consistent API response patterns
- Type-safe request/response handling
- Error handling types

## 🔧 Usage Patterns

### 1. Importing Types

```typescript
// Import from central types file
import type { ChatMessage, User, Session } from "../types";

// Import specific types for better tree-shaking
import type { ChatMessage } from "../types/ai";
import type { User } from "../types/database";
import type { Session } from "next-auth";
```

### 2. Using NextAuth Types

```typescript
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

function MyComponent() {
  const { data: session } = useSession();

  // session.user.id, session.user.role, session.user.isBetaUser
  // are all properly typed thanks to module augmentation
}
```

### 3. Database vs NextAuth User Types

```typescript
import type { User as DatabaseUser } from "../types/database";
import type { User as NextAuthUser } from "next-auth";

// Database operations use DatabaseUser
const user: DatabaseUser = await getUserFromDatabase();

// Authentication uses NextAuthUser
const sessionUser: NextAuthUser = session.user;
```

### 4. AI Integration Types

```typescript
import type { PerinChatRequest, ChatMessage } from "../types";

const request: PerinChatRequest = {
  messages: [{ id: "1", role: "user", content: "Hello Perin!" }],
  tone: "friendly",
  perinName: "Perin",
};
```

## ✅ Best Practices

### 1. Type Organization

- ✅ **Use barrel exports** for clean imports
- ✅ **Separate concerns** into logical files
- ✅ **Follow naming conventions** consistently
- ✅ **Document complex types** with JSDoc comments

### 2. NextAuth Integration

- ✅ **Use module augmentation** for NextAuth extensions
- ✅ **Extend DefaultSession** to preserve NextAuth defaults
- ✅ **Keep JWT and Session types in sync**
- ✅ **Avoid creating separate auth type files**

### 3. Type Safety

- ✅ **Use strict TypeScript** configuration
- ✅ **Avoid `any` types** - use proper interfaces
- ✅ **Validate external data** with type guards
- ✅ **Use discriminated unions** for complex states

### 4. Performance

- ✅ **Import specific types** when possible
- ✅ **Use type-only imports** (`import type`)
- ✅ **Avoid circular dependencies**
- ✅ **Keep types lightweight**

## 🔄 Migration Guide

### From Scattered Types to Organized System

**Before (Scattered Types)**:

```typescript
// Types defined in multiple files
// Inconsistent naming
// No central organization
```

**After (Organized System)**:

```typescript
// Centralized types with clear organization
// Consistent naming conventions
// Single import point
import type { ChatMessage, User, Session } from "../types";
```

### Migration Steps

1. **Audit existing types** across the codebase
2. **Categorize types** by domain (AI, Database, API, etc.)
3. **Create type files** following the organization pattern
4. **Update imports** to use the new structure
5. **Test thoroughly** to ensure type safety
6. **Update documentation** to reflect new patterns

## 🐛 Troubleshooting

### Common Issues

#### 1. "Module has no exported member" Error

**Cause**: Incorrect import path or missing export
**Solution**:

```typescript
// Check the export in the type file
export interface MyType { ... }

// Ensure proper import
import type { MyType } from '../types';
```

#### 2. NextAuth Type Conflicts

**Cause**: Conflicting type definitions
**Solution**:

```typescript
// Use module augmentation instead of separate interfaces
declare module "next-auth" {
  interface Session { ... }
}
```

#### 3. Circular Dependencies

**Cause**: Types importing from each other
**Solution**:

```typescript
// Move shared types to a separate file
// Use interface merging instead of inheritance
```

#### 4. Type Inference Issues

**Cause**: Complex type structures
**Solution**:

```typescript
// Use explicit type annotations
// Break down complex types into smaller interfaces
// Use type guards for runtime validation
```

### Debug Mode

Enable TypeScript strict mode for better error detection:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NextAuth.js TypeScript Guide](https://next-auth.js.org/getting-started/typescript)
- [Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [Barrel Exports](https://basarat.gitbook.io/typescript/main-1/barrel)

## 🔄 Version History

- **v1.0.0**: Initial type organization
- **v1.1.0**: Added NextAuth module augmentation
- **v1.2.0**: Separated database and NextAuth User types
- **v1.3.0**: Added comprehensive API types
- **v1.4.0**: Implemented barrel exports and documentation

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
