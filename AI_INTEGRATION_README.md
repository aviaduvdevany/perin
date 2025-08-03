# 🧠 Perin AI Integration Documentation

This document provides a comprehensive overview of the AI integration system implemented in the Perin project, featuring OpenAI GPT-4, persistent memory, dynamic system prompts, and full TypeScript type safety.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Implementation Status](#implementation-status)
- [API Endpoints](#api-endpoints)
- [Smart Query System](#smart-query-system)
- [Memory Management](#memory-management)
- [Frontend Integration](#frontend-integration)
- [Type Safety](#type-safety)
- [Environment Configuration](#environment-configuration)
- [Usage Examples](#usage-examples)
- [Security & Best Practices](#security--best-practices)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

The AI integration follows a **layered architecture** with **smart queries** and **type-safe operations**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  Components: PerinChat, usePerinAI hook                   │
│  Features: Real-time streaming, memory management          │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  Routes: /api/ai/chat, /api/ai/memory, /api/ai/classify   │
│  Features: Authentication, validation, streaming           │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Smart Queries: Direct database execution with type safety │
│  AI Logic: OpenAI integration, prompt building, memory     │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  Tables: users (with memory JSONB column)                  │
│  Features: Persistent memory, user preferences             │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Implementation Status

### ✅ **Phase 1: AI MVP** - **COMPLETE**

- ✅ Core chat API (`/api/ai/chat`)
- ✅ Dynamic system prompts
- ✅ Real-time streaming responses
- ✅ User authentication integration
- ✅ Type-safe implementation

### ✅ **Phase 2: Memory Support** - **COMPLETE**

- ✅ Memory API (`/api/ai/memory`)
- ✅ Persistent user memory storage
- ✅ Memory retrieval and context injection
- ✅ Smart memory queries

### ✅ **Phase 3: Advanced Features** - **PARTIALLY COMPLETE**

- ✅ Intent classification (`/api/ai/classify`)
- 🔄 Voice input/output (planned)
- 🔄 Perin-to-Perin delegation (planned)

## 🛣️ API Endpoints

### 1. Chat API - `/api/ai/chat`

**Purpose**: Main AI interaction endpoint with streaming responses

**Method**: `POST`

**Request Body**:

```typescript
interface ChatApiRequest {
  messages: ChatMessage[];
  tone?: string;
  perinName?: string;
  specialization?: string;
}
```

**Example Request**:

```json
{
  "messages": [
    {
      "id": "1",
      "role": "user",
      "content": "Hello Perin, can you help me schedule a meeting?"
    }
  ],
  "tone": "friendly",
  "perinName": "Perin"
}
```

**Response**: Streaming text response with real-time character-by-character output

**Features**:

- ✅ Authentication required
- ✅ Dynamic system prompt construction
- ✅ Memory context injection
- ✅ Real-time streaming
- ✅ Error handling

### 2. Memory API - `/api/ai/memory`

**Purpose**: Manage persistent user memory and preferences

**Methods**: `GET`, `POST`, `DELETE`

#### GET - Retrieve Memory

```typescript
// Get all memory
GET /api/ai/memory

// Get specific memory keys
GET /api/ai/memory?keys=preferences,conversations
```

#### POST - Add Memory Entry

```typescript
interface MemoryApiRequest {
  key: string;
  content: string;
  type: "preference" | "fact" | "conversation";
}
```

#### DELETE - Clear Memory

```typescript
// Clear specific keys
DELETE /api/ai/memory?keys=old_conversations

// Clear all memory
DELETE /api/ai/memory
```

### 3. Classification API - `/api/ai/classify`

**Purpose**: Classify user intent for advanced routing

**Method**: `POST`

**Request Body**:

```typescript
interface ClassifyApiRequest {
  message: string;
}
```

**Response**: Intent classification with confidence scores

## 🧠 Smart Query System

### Overview

The AI integration uses **smart queries** - functions that execute database operations directly and return typed results. This provides:

- **Type Safety**: All operations return properly typed results
- **Error Handling**: Built-in try/catch with proper error logging
- **Simplified API Routes**: No manual query execution needed
- **Better Performance**: Direct database execution
- **Cleaner Code**: Less boilerplate in API routes

### AI Smart Queries

#### Memory Management Queries

```typescript
// Get user memory with context
export const getUserMemory = async (userId: string): Promise<UserMemory | null>

// Add memory entry
export const addMemoryEntry = async (userId: string, key: string, entry: MemoryEntry): Promise<boolean>

// Get relevant memory context
export const getRelevantMemoryContext = async (userId: string, context: string): Promise<Record<string, MemoryEntry>>

// Clear memory entries
export const clearMemoryEntries = async (userId: string, keys: string[]): Promise<boolean>
```

#### OpenAI Integration Queries

```typescript
// Execute AI chat with streaming
export const executePerinChat = async (request: PerinChatRequest): Promise<PerinChatResponse>

// Validate OpenAI configuration
export const validateOpenAIConfig = (): boolean

// Extract user ID from session safely
export const getUserIdFromSession = (session: Session | null): string | null
```

### API Route Usage

```typescript
// Before: Manual query execution
const sql = memoryQueries.getUserMemory(userId);
const result = await executeQuery(sql, [userId]);

// After: Direct smart query usage
const memory = await memoryQueries.getUserMemory(userId);
if (!memory) {
  return ErrorResponses.notFound("Memory not found");
}
```

## 💾 Memory Management

### Memory Structure

```typescript
interface MemoryEntry {
  content: string;
  timestamp: string;
  type: "preference" | "fact" | "conversation";
  relevance?: number;
}

interface UserMemory {
  userId: string;
  memory: Record<string, MemoryEntry>;
  lastUpdated: string;
}
```

### Memory Features

1. **Persistent Storage**: JSONB column in PostgreSQL
2. **Context-Aware Retrieval**: Fuzzy matching for relevant memories
3. **Type-Safe Operations**: Full TypeScript support
4. **Automatic Cleanup**: Memory management utilities
5. **Performance Optimized**: Efficient queries with indexing

### Memory Usage Examples

```typescript
// Store user preference
await addMemoryEntry(userId, "preferences", {
  content: "Prefers morning meetings",
  timestamp: new Date().toISOString(),
  type: "preference",
});

// Retrieve relevant context
const context = await getRelevantMemoryContext(userId, "meeting scheduling");
```

## 🎨 Frontend Integration

### React Hook - `usePerinAI`

```typescript
export function usePerinAI(): UsePerinAI {
  const { data: session } = useSession();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (request: PerinChatRequest): Promise<ReadableStream | null> => {
      // Implementation with streaming support
    },
    [session]
  );

  const getMemory = useCallback(
    async (keys?: string[]): Promise<PerinMemoryResponse | null> => {
      // Memory retrieval
    },
    [session]
  );

  return {
    sendMessage,
    isChatLoading,
    chatError,
    getMemory,
    // ... other methods
  };
}
```

### Chat Component - `PerinChat`

```typescript
export function PerinChat() {
  const { sendMessage, isChatLoading, chatError } = usePerinAI();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");

  const handleSendMessage = async () => {
    // Real-time streaming implementation
    const stream = await sendMessage({ messages, specialization: undefined });
    // Process streaming response
  };

  return (
    <div className="chat-interface">{/* Chat UI with streaming support */}</div>
  );
}
```

### Dashboard Integration

```typescript
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="dashboard">
      <div className="user-info">{/* User profile information */}</div>
      <div className="chat-interface">
        <PerinChat />
      </div>
    </div>
  );
}
```

## 🔒 Type Safety

### Type Organization

The AI integration uses a **comprehensive type system** organized in `src/types/`:

```typescript
// AI-specific types
import type {
  ChatMessage,
  PerinChatRequest,
  PerinChatResponse,
  MemoryEntry,
  UserMemory,
  IntentClassification,
} from "../types/ai";

// NextAuth integration
import type { Session } from "next-auth";

// Database types
import type { User as DatabaseUser } from "../types/database";
```

### Type Safety Features

1. **Full TypeScript Coverage**: All AI operations are fully typed
2. **NextAuth Integration**: Proper session and user type extensions
3. **Database Safety**: Separate database and NextAuth User types
4. **API Contracts**: Type-safe request/response handling
5. **Error Handling**: Typed error responses

### Type Usage Examples

```typescript
// Type-safe chat request
const request: PerinChatRequest = {
  messages: [{ id: "1", role: "user", content: "Hello Perin!" }],
  tone: "friendly",
  perinName: "Perin",
};

// Type-safe memory operations
const memory: UserMemory = await getUserMemory(userId);

// Type-safe session handling
const userId = getUserIdFromSession(session);
```

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/perin

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### Production Configuration

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-production-openai-key

# Database Configuration
DATABASE_URL=postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database

# NextAuth Configuration
NEXTAUTH_SECRET=production-secret-key
NEXTAUTH_URL=https://your-app.vercel.app
```

### Environment Validation

```typescript
// Validate OpenAI configuration
export const validateOpenAIConfig = (): boolean => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return false;
  }
  return true;
};
```

## 💡 Usage Examples

### Basic Chat Interaction

```typescript
import { usePerinAI } from "../hooks/usePerinAI";

function ChatExample() {
  const { sendMessage, isChatLoading } = usePerinAI();

  const handleChat = async () => {
    const request = {
      messages: [{ id: "1", role: "user", content: "Hello Perin!" }],
      tone: "friendly",
    };

    const stream = await sendMessage(request);
    // Process streaming response
  };

  return (
    <button onClick={handleChat} disabled={isChatLoading}>
      Send Message
    </button>
  );
}
```

### Memory Management

```typescript
import { usePerinAI } from "../hooks/usePerinAI";

function MemoryExample() {
  const { getMemory, addMemory } = usePerinAI();

  const handleMemoryOperations = async () => {
    // Get user memory
    const memory = await getMemory();

    // Add new memory entry
    await addMemory({
      key: "preferences",
      content: "Prefers morning meetings",
      type: "preference",
    });
  };

  return <button onClick={handleMemoryOperations}>Manage Memory</button>;
}
```

### Intent Classification

```typescript
import { usePerinAI } from "../hooks/usePerinAI";

function ClassificationExample() {
  const { classifyIntent } = usePerinAI();

  const handleClassification = async () => {
    const stream = await classifyIntent("I need to schedule a meeting");
    // Process classification result
  };

  return <button onClick={handleClassification}>Classify Intent</button>;
}
```

## 🛡️ Security & Best Practices

### Security Features

1. **Authentication Required**: All AI endpoints require valid session
2. **Input Validation**: Comprehensive request validation
3. **Error Handling**: Secure error responses without data leakage
4. **Rate Limiting**: Built-in protection against abuse
5. **Secure Storage**: Encrypted memory storage

### Best Practices

1. **Type Safety**: Full TypeScript coverage
2. **Smart Queries**: Direct database execution with error handling
3. **Streaming Responses**: Real-time user experience
4. **Memory Management**: Efficient persistent storage
5. **Error Recovery**: Graceful error handling and recovery

### Performance Optimizations

1. **Connection Pooling**: Efficient database connections
2. **Streaming**: Real-time response delivery
3. **Memory Caching**: Intelligent memory retrieval
4. **Type Optimization**: Efficient type imports
5. **Error Boundaries**: React error boundary integration

## 🐛 Troubleshooting

### Common Issues

#### 1. "OPENAI_API_KEY not configured" Error

**Cause**: Missing or invalid OpenAI API key
**Solution**:

```bash
# Add to .env.local
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### 2. "Authentication required" Error

**Cause**: User not authenticated
**Solution**:

```typescript
// Ensure user is logged in
const { data: session } = useSession();
if (!session) {
  // Redirect to login
}
```

#### 3. Streaming Response Issues

**Cause**: Incorrect stream handling
**Solution**:

```typescript
// Proper stream handling
const reader = stream.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Process chunk
}
```

#### 4. Memory Retrieval Issues

**Cause**: Database connection or query problems
**Solution**:

```typescript
// Check database connection
const memory = await getUserMemory(userId);
if (!memory) {
  // Handle missing memory
}
```

### Debug Mode

Enable debug logging for AI operations:

```typescript
// Add to API routes
console.log("AI Chat Interaction:", {
  userId,
  timestamp: new Date().toISOString(),
  messageCount: messages.length,
});
```

### Testing AI Integration

1. **Test chat functionality**:

   ```bash
   curl -X POST http://localhost:3000/api/ai/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     -d '{"messages":[{"id":"1","role":"user","content":"Hello"}]}'
   ```

2. **Test memory operations**:

   ```bash
   curl -X GET http://localhost:3000/api/ai/memory \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

3. **Test intent classification**:
   ```bash
   curl -X POST http://localhost:3000/api/ai/classify \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     -d '{"message":"Schedule a meeting"}'
   ```

## 📁 File Structure

```
src/
├── app/
│   └── api/
│       └── ai/
│           ├── chat/route.ts           # Main chat endpoint
│           ├── memory/route.ts         # Memory management
│           └── classify/route.ts       # Intent classification
├── components/
│   └── PerinChat.tsx                   # Chat UI component
├── hooks/
│   └── usePerinAI.ts                   # AI integration hook
├── lib/
│   └── ai/
│       ├── openai.ts                   # OpenAI integration
│       ├── memory.ts                   # Memory smart queries
│       └── prompts/
│           └── system.ts               # Dynamic prompts
├── types/
│   ├── ai.ts                           # AI type definitions
│   ├── database.ts                     # Database types
│   ├── api.ts                          # API types
│   └── next-auth.d.ts                  # NextAuth extensions
└── middleware.ts                       # Route protection
```

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

## 🔄 Version History

- **v1.0.0**: Initial AI integration with basic chat
- **v1.1.0**: Added memory management system
- **v1.2.0**: Implemented intent classification
- **v1.3.0**: Added comprehensive type safety
- **v1.4.0**: Enhanced streaming and error handling
- **v1.5.0**: Complete NextAuth integration and documentation

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
