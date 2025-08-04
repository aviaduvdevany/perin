# 🧠 Perin AI Integration Documentation

> Comprehensive guide to the AI integration system featuring OpenAI GPT-4, LangGraph workflows, Gmail integration, and persistent memory management.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [API Endpoints](#api-endpoints)
- [LangGraph Workflow](#langgraph-workflow)
- [Gmail Integration](#gmail-integration)
- [Memory Management](#memory-management)
- [Service Layer](#service-layer)
- [Type Safety](#type-safety)
- [Environment Configuration](#environment-configuration)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Perin AI integration provides a sophisticated AI assistant with:

- **Real-time Streaming**: Character-by-character response streaming
- **Persistent Memory**: Context-aware conversations across sessions
- **Gmail Integration**: Smart email context loading and analysis
- **LangGraph Workflow**: Multi-step reasoning and tool integration
- **Service Layer**: Clean API abstraction for client components
- **Type Safety**: Full TypeScript coverage throughout

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  Components: PerinChat, usePerinAI hook                   │
│  Service Layer: ai.ts, users.ts, integrations.ts          │
│  Features: Real-time streaming, memory management          │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  Routes: /api/ai/chat, /api/ai/memory, /api/ai/classify   │
│  Integrations: /api/integrations/gmail/*                   │
│  Features: Authentication, validation, streaming           │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  LangGraph Workflow: Memory → Gmail → OpenAI → Response   │
│  Smart Queries: Direct database execution with type safety │
│  AI Logic: OpenAI integration, prompt building, memory     │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  Tables: users (memory), user_integrations (OAuth tokens)  │
│  Features: Persistent memory, user preferences, integrations│
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── chat/route.ts           # Main chat endpoint (LangGraph)
│   │   │   ├── memory/route.ts         # Memory management
│   │   │   └── classify/route.ts       # Intent classification
│   │   └── integrations/
│   │       └── gmail/
│   │           ├── connect/route.ts    # Gmail OAuth connection
│   │           ├── callback/route.ts   # OAuth callback handler
│   │           └── emails/route.ts     # Email fetching endpoint
│   └── services/                       # Service layer
│       ├── internalApi.ts              # Base API utility
│       ├── users.ts                    # User services
│       ├── integrations.ts             # Integration services
│       └── ai.ts                       # AI services (future)
├── lib/
│   ├── ai/
│   │   ├── openai.ts                   # OpenAI integration
│   │   ├── memory.ts                   # Memory smart queries
│   │   ├── langgraph/                  # LangGraph workflow
│   │   │   ├── index.ts                # Main entry point
│   │   │   ├── state/chat-state.ts     # State management
│   │   │   ├── nodes/
│   │   │   │   ├── memory-node.ts      # Memory loading node
│   │   │   │   ├── gmail-node.ts       # Gmail integration node
│   │   │   │   └── openai-node.ts      # OpenAI interaction node
│   │   │   └── graphs/base-chat.ts     # Main workflow graph
│   │   └── prompts/
│   │       └── system.ts               # Dynamic prompts
│   ├── integrations/
│   │   └── gmail/
│   │       ├── auth.ts                 # Gmail OAuth authentication
│   │       └── client.ts               # Gmail API client
│   └── queries/
│       ├── users.ts                    # User smart queries
│       └── integrations.ts             # Integration smart queries
└── types/
    ├── ai.ts                           # AI type definitions
    ├── database.ts                     # Database types
    └── api.ts                          # API types
```

## ✨ Core Features

### 🤖 AI Assistant

- **Real-time Streaming**: Character-by-character response streaming
- **Persistent Memory**: Context-aware conversations across sessions
- **Dynamic Prompts**: Personalized system prompts based on user preferences
- **Intent Classification**: Smart routing for different types of requests

### 📧 Gmail Integration

- **OAuth2 Authentication**: Secure Gmail API access
- **Smart Context Loading**: Only loads emails when conversationally relevant
- **Email Analysis**: Summarize, categorize, and respond to emails
- **Token Management**: Automatic refresh and secure storage

### 🧠 LangGraph Workflow

- **Multi-Step Reasoning**: Complex task decomposition
- **Tool Integration**: Seamless integration with external services
- **State Management**: Centralized workflow state
- **Future-Ready**: Foundation for multi-agent coordination

## 🛣️ API Endpoints

### 1. Chat API - `POST /api/ai/chat`

**Purpose**: Main AI interaction endpoint with streaming responses

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
- ✅ Gmail context loading (when relevant)
- ✅ Real-time streaming
- ✅ Error handling

### 2. Memory API - `GET /api/ai/memory`

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

### 3. Classification API - `POST /api/ai/classify`

**Purpose**: Classify user intent for advanced routing

**Request Body**:

```typescript
interface ClassifyApiRequest {
  message: string;
}
```

**Response**: Intent classification with confidence scores

## 🧠 LangGraph Workflow

### Workflow Overview

The AI integration uses LangGraph for orchestrated multi-step reasoning:

```
START → LOAD_MEMORY → LOAD_GMAIL → CALL_OPENAI → STREAM_RESPONSE → END
```

### State Management

```typescript
interface LangGraphChatState {
  // Input messages from user
  messages: ChatMessage[];

  // User context and preferences
  userId: string;
  tone: string;
  perinName: string;
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination";

  // Memory and context
  memoryContext: Record<string, unknown>;
  conversationContext: string;

  // Email context (Gmail integration)
  emailContext: {
    recentEmails?: Array<{
      from: string;
      subject: string;
      snippet: string;
      date: string;
      unread: boolean;
    }>;
    emailCount?: number;
    hasUnread?: boolean;
  };

  // System prompt building
  systemPrompt: string;

  // OpenAI response handling
  openaiResponse: string;
  streamChunks: string[];

  // Workflow status
  currentStep: string;
  error?: string;

  // User data (loaded from database)
  user?: {
    perin_name?: string;
    tone?: string;
    timezone?: string;
    preferred_hours?: Record<string, unknown>;
    memory?: Record<string, unknown>;
  };
}
```

### Workflow Nodes

#### 1. Memory Node (`memory-node.ts`)

- Extracts conversation context from messages
- Loads relevant memory using `getRelevantMemoryContext`
- Returns memory context and conversation context

#### 2. Gmail Node (`gmail-node.ts`)

- Checks if user has Gmail connected
- Detects email-related keywords in conversation
- Loads recent emails only when contextually relevant
- Returns email context with recent emails and metadata

#### 3. OpenAI Node (`openai-node.ts`)

- Builds dynamic system prompt with all context
- Calls OpenAI API with streaming
- Returns streaming response chunks

### Main Entry Point

```typescript
export const executePerinChatWithLangGraph = async (
  messages: ChatMessage[],
  userId: string,
  tone: string = "friendly",
  perinName: string = "Perin",
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination",
  user?: UserData
): Promise<PerinChatResponse> => {
  // Create initial state
  const initialState = createInitialChatState(
    messages,
    userId,
    tone,
    perinName,
    specialization
  );

  // Create streaming response that processes workflow in real-time
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Load memory
        const memoryResult = await memoryNode(initialState);
        const stateWithMemory = { ...initialState, ...memoryResult };

        // Step 2: Load Gmail context (if relevant)
        const gmailResult = await gmailNode(stateWithMemory);
        const stateWithGmail = { ...stateWithMemory, ...gmailResult };

        // Step 3: Call OpenAI with real-time streaming
        const openaiClient = initializeOpenAI();
        const systemPrompt = buildSystemPrompt(stateWithGmail);

        const response = await openaiClient.chat.completions.create({
          model: "gpt-4",
          messages: messagesWithSystem.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        });

        // Stream chunks as they arrive
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return {
    stream,
    response: new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    }),
  };
};
```

## 📧 Gmail Integration

### Smart Context Loading

The Gmail integration uses intelligent context detection:

```typescript
export const gmailNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  // Check if user has Gmail connected
  const gmailIntegration = await integrationQueries.getUserIntegration(
    state.userId,
    "gmail"
  );

  if (!gmailIntegration || !gmailIntegration.is_active) {
    return {
      emailContext: {},
      currentStep: "gmail_not_connected",
    };
  }

  // Check if conversation mentions email-related keywords
  const conversationText = state.conversationContext.toLowerCase();
  const emailKeywords = ["email", "message", "inbox", "sent", "reply", "mail"];
  const mentionsEmail = emailKeywords.some((keyword) =>
    conversationText.includes(keyword)
  );

  // Smart context loading - only load emails if contextually relevant
  if (
    mentionsEmail ||
    state.messages.some((msg) =>
      ["email", "message", "inbox"].some((keyword) =>
        msg.content.toLowerCase().includes(keyword)
      )
    )
  ) {
    // Fetch recent emails for context
    const recentEmails = await fetchRecentEmails(state.userId, 5);

    return {
      emailContext: {
        recentEmails: recentEmails.map((email) => ({
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          date: email.date,
          unread: email.unread,
        })),
        emailCount: recentEmails.length,
        hasUnread: recentEmails.some((email) => email.unread),
      },
      currentStep: "gmail_context_loaded",
    };
  }

  return {
    emailContext: {},
    currentStep: "gmail_context_loaded",
  };
};
```

### System Prompt Integration

Email context is automatically included in the system prompt:

```typescript
export const buildSystemPrompt = (state: LangGraphChatState): string => {
  const { tone, perinName, memoryContext, user, emailContext } = state;

  const basePrompt = `You are ${perinName}, a tone-aware digital delegate and personal AI assistant.

Core Capabilities:
- Natural negotiation and conversation
- Persistent memory and context awareness
- Emotionally intelligent, human-like responses
- Multi-agent coordination when needed
- Email management and analysis (when Gmail is connected)

Your Tone: ${tone}
Your Name: ${perinName}

Key Principles:
1. Always maintain your assigned tone and personality
2. Use your name (${perinName}) naturally in conversation
3. Reference relevant memory and context when appropriate
4. Be emotionally intelligent and empathetic
5. Help with scheduling, coordination, and delegation tasks
6. Maintain persistent identity across conversations
7. When email context is available, use it to provide informed responses about emails

Memory Context: ${JSON.stringify(memoryContext, null, 2)}

User Preferences:
- Timezone: ${user?.timezone || "UTC"}
- Preferred Hours: ${JSON.stringify(user?.preferred_hours || {}, null, 2)}

Email Context: ${
    emailContext && emailContext.recentEmails
      ? `You have access to recent emails:
${emailContext.recentEmails
  .map(
    (email, index) =>
      `${index + 1}. From: ${email.from}
   Subject: ${email.subject}
   Snippet: ${email.snippet}
   Date: ${email.date}
   Unread: ${email.unread ? "Yes" : "No"}`
  )
  .join("\n\n")}

Total emails: ${emailContext.emailCount}
Unread emails: ${emailContext.hasUnread ? "Yes" : "No"}`
      : "No recent email context available"
  }

Remember: You are a digital delegate, not just a chatbot. Act with agency, empathy, and persistence. When email context is available, use it to provide helpful insights about the user's inbox.`;

  return basePrompt;
};
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

### Smart Memory Queries

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

### Memory Features

1. **Persistent Storage**: JSONB column in PostgreSQL
2. **Context-Aware Retrieval**: Fuzzy matching for relevant memories
3. **Type-Safe Operations**: Full TypeScript support
4. **Automatic Cleanup**: Memory management utilities
5. **Performance Optimized**: Efficient queries with indexing

## 🔧 Service Layer

### Overview

The service layer provides clean API abstraction for client components:

```typescript
// Before: Direct API calls in components
const response = await fetch("/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// After: Service layer abstraction
import { chatService } from "../services/ai";
const response = await chatService.sendMessage(data);
```

### Service Structure

```
src/app/services/
├── internalApi.ts          # Base API request utility
├── users.ts               # User-related API services
├── integrations.ts        # Integration-related API services
└── ai.ts                  # AI-related API services (future)
```

### Base API Utility

```typescript
const internalApiRequest = async (
  path: string,
  method: HTTPMethod,
  body?: unknown
) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const url = `${baseUrl}/api/${path}`;

  const options = {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("API response is not JSON");
    }

    return await response.json();
  } catch (error) {
    console.error("Error in internalApiRequest:", error);
    throw error;
  }
};
```

## 🔒 Type Safety

### Type Organization

```typescript
// AI-specific types
import type {
  ChatMessage,
  PerinChatRequest,
  PerinChatResponse,
  MemoryEntry,
  UserMemory,
  IntentClassification,
  LangGraphChatState,
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

# Gmail Integration Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback

# App Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
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

# Gmail Integration Configuration
GOOGLE_CLIENT_ID=production-google-client-id
GOOGLE_CLIENT_SECRET=production-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/integrations/gmail/callback

# App Configuration
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
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

### Gmail Integration

```typescript
import { connectGmailService } from "../services/integrations";

// Connect Gmail
const connectGmail = async () => {
  try {
    const { authUrl } = await connectGmailService();
    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Error connecting Gmail:", error);
  }
};

// Chat with email context
const chatWithEmails = async () => {
  const request = {
    messages: [
      { id: "1", role: "user", content: "Summarize my recent emails" },
    ],
  };

  const stream = await sendMessage(request);
  // Perin will automatically load and use email context
};
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

#### 4. Gmail Integration Issues

**Cause**: OAuth2 configuration problems
**Solution**:

- Check Google Cloud Console configuration
- Verify environment variables
- Ensure redirect URIs match exactly

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

3. **Test Gmail integration**:
   ```bash
   curl -X POST http://localhost:3000/api/integrations/gmail/connect \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

## 🔄 Version History

- **v1.0.0**: Initial AI integration with basic chat
- **v1.1.0**: Added memory management system
- **v1.2.0**: Implemented intent classification
- **v1.3.0**: Added comprehensive type safety
- **v1.4.0**: Enhanced streaming and error handling
- **v1.5.0**: Complete NextAuth integration
- **v1.6.0**: Added Gmail integration with LangGraph workflow
- **v1.7.0**: Implemented service layer architecture
- **v1.8.0**: Enhanced documentation and examples

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
