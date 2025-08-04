# 🔧 Service Layer Architecture

This document outlines the service layer architecture implemented in the Perin project, which provides a clean separation between client components and API calls.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Service Layer Structure](#service-layer-structure)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## 🎯 Overview

The service layer provides a centralized, type-safe way to interact with the backend API. Instead of making direct `fetch` calls in client components, all API interactions go through dedicated service functions.

### Benefits

- **Separation of Concerns**: Client components focus on UI, services handle data fetching
- **Type Safety**: Full TypeScript support with proper error handling
- **Maintainability**: Centralized API logic, easier to update and test
- **Reusability**: Services can be used across multiple components
- **Consistency**: Standardized error handling and response formatting

## 🏗️ Architecture

### Service Layer Structure

```
src/app/services/
├── internalApi.ts          # Base API request utility
├── users.ts               # User-related API services
├── integrations.ts        # Integration-related API services
└── [future-services].ts   # Additional service modules
```

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Component     │───▶│   Service       │───▶│   API Route     │
│   (UI Layer)    │    │   (Data Layer)  │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State         │    │   Error         │    │   Database      │
│   Management    │    │   Handling      │    │   Operations    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Service Layer Structure

### 1. Base API Utility (`internalApi.ts`)

The foundation service that handles all HTTP requests:

```typescript
import { HTTPMethod } from "@/types/api";

const internalApiRequest = async (
  path: string,
  method: HTTPMethod,
  body?: any
) => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/${path}`;
  const options = {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, options);
  return response.json();
};

export default internalApiRequest;
```

**Features:**

- Environment-based API URL configuration
- Automatic JSON serialization/deserialization
- Standardized headers
- Type-safe HTTP methods

### 2. User Services (`users.ts`)

Services for user-related operations:

```typescript
import { UpdateUserData } from "@/types/database";
import internalApiRequest from "./internalApi";

export const updateUserProfileService = async (data: UpdateUserData) => {
  const response = await internalApiRequest("users/profile", "PUT", data);
  return response;
};
```

**Available Services:**

- `updateUserProfileService` - Update user profile data
- `getUserProfileService` - Fetch user profile (future)
- `deleteUserService` - Delete user account (future)

### 3. Integration Services (`integrations.ts`)

Services for third-party integrations:

```typescript
import internalApiRequest from "./internalApi";

export const connectGmailService = async () => {
  const response = await internalApiRequest(
    "integrations/gmail/connect",
    "POST"
  );
  return response;
};
```

**Available Services:**

- `connectGmailService` - Initiate Gmail OAuth connection
- `fetchGmailEmailsService` - Fetch recent emails (future)
- `disconnectGmailService` - Disconnect Gmail integration (future)

## 💡 Usage Examples

### Before (Direct API Calls)

```typescript
// ❌ Old way - Direct fetch in component
const handleUpdateProfile = async (data) => {
  try {
    const response = await fetch("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      // Handle success
    }
  } catch (error) {
    console.error("Error updating profile:", error);
  }
};
```

### After (Service Layer)

```typescript
// ✅ New way - Using service layer
import { updateUserProfileService } from "../services/users";

const handleUpdateProfile = async (data) => {
  try {
    const result = await updateUserProfileService(data);
    // Handle success
  } catch (error) {
    console.error("Error updating profile:", error);
  }
};
```

### Component Integration

```typescript
import React, { useState } from "react";
import { updateUserProfileService } from "../services/users";
import { connectGmailService } from "../services/integrations";

export default function ProfileComponent() {
  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = async (profileData) => {
    setLoading(true);
    try {
      const result = await updateUserProfileService(profileData);
      console.log("Profile updated:", result);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGmailConnect = async () => {
    try {
      const { authUrl } = await connectGmailService();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Failed to connect Gmail:", error);
    }
  };

  return <div>{/* Component JSX */}</div>;
}
```

## 🛡️ Best Practices

### 1. Service Organization

- **Group by Domain**: Organize services by business domain (users, integrations, etc.)
- **Single Responsibility**: Each service function should have one clear purpose
- **Consistent Naming**: Use descriptive names ending with `Service`

### 2. Error Handling

```typescript
// Service with proper error handling
export const updateUserProfileService = async (data: UpdateUserData) => {
  try {
    const response = await internalApiRequest("users/profile", "PUT", data);
    return response;
  } catch (error) {
    // Log error for debugging
    console.error("Service error:", error);
    // Re-throw for component handling
    throw error;
  }
};
```

### 3. Type Safety

```typescript
// Use proper TypeScript types
import { UpdateUserData } from "@/types/database";

export const updateUserProfileService = async (data: UpdateUserData) => {
  const response = await internalApiRequest("users/profile", "PUT", data);
  return response as Promise<{ message: string; user: User }>;
};
```

### 4. Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

## 🔄 Migration Guide

### Step 1: Identify Direct API Calls

Find components with direct `fetch` calls:

```typescript
// Search for patterns like:
fetch("/api/...");
```

### Step 2: Create Service Functions

Add appropriate service functions to existing or new service files:

```typescript
// src/app/services/[domain].ts
export const yourApiService = async (data) => {
  const response = await internalApiRequest("your/endpoint", "POST", data);
  return response;
};
```

### Step 3: Update Components

Replace direct API calls with service calls:

```typescript
// Before
const response = await fetch("/api/your/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// After
import { yourApiService } from "../services/[domain]";
const response = await yourApiService(data);
```

### Step 4: Test and Validate

- Test all migrated functionality
- Verify error handling works correctly
- Check that TypeScript types are properly inferred

## 📁 File Structure

```
src/
├── app/
│   ├── services/                    # Service layer
│   │   ├── internalApi.ts          # Base API utility
│   │   ├── users.ts                # User services
│   │   ├── integrations.ts         # Integration services
│   │   └── ai.ts                   # AI services (future)
│   ├── components/                 # UI components
│   │   └── [components].tsx        # Use services, not direct API calls
│   └── api/                        # Backend API routes
│       └── [routes].ts             # Unchanged
├── types/
│   ├── api.ts                      # API-related types
│   └── database.ts                 # Database types
└── lib/
    └── [utilities]                 # Shared utilities
```

## 🚀 Future Enhancements

### Planned Service Additions

1. **AI Services** (`ai.ts`)

   - `chatService` - AI chat interactions
   - `memoryService` - Memory management
   - `classifyService` - Intent classification

2. **Enhanced Error Handling**

   - Custom error classes
   - Retry logic for failed requests
   - Offline support

3. **Caching Layer**

   - Request caching for performance
   - Cache invalidation strategies

4. **Request Interceptors**
   - Authentication headers
   - Request/response logging
   - Rate limiting

## 🔧 Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional (for enhanced features)
NEXT_PUBLIC_API_TIMEOUT=10000
NEXT_PUBLIC_ENABLE_CACHE=true
```

### TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 📚 Additional Resources

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
