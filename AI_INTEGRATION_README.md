# 🧠 Perin AI Integration System

> Complete guide to Perin's production-ready AI integration featuring OpenAI GPT-4, LangGraph workflows, multi-step orchestration, delegation system, and unified integrations with functional error handling.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [AI Workflow](#ai-workflow)
- [Integration System](#integration-system)
- [Multi-Step Orchestration](#multi-step-orchestration)
- [Delegation System](#delegation-system)
- [Tools System](#tools-system)
- [Error Handling & Resilience](#error-handling--resilience)
- [Memory Management](#memory-management)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Environment Setup](#environment-setup)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Perin's AI integration is a sophisticated system built with functional programming principles that provides:

- **Intelligent AI Assistant**: Context-aware conversations with persistent memory
- **LangGraph Workflows**: Multi-step reasoning with parallel integration loading
- **Multi-Step Orchestration**: Complex task decomposition with progress tracking
- **Delegation System**: External user scheduling through secure delegation links
- **Unified Integrations**: Single framework supporting Gmail, Calendar, and future services
- **Tools System**: Structured tool calling for actionable intents
- **Production-Ready Error Handling**: Retry logic, circuit breakers, and graceful degradation
- **Real-time Streaming**: Character-by-character response streaming with control tokens

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                    │
│  Components: PerinChat, usePerinAI hook                       │
│  Features: Real-time streaming, multi-step UI, delegation      │
├─────────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                         │
│  Routes: /api/ai/chat, /api/ai/memory, /api/ai/classify       │
│  Middleware: Rate limiting, security headers, auth            │
├─────────────────────────────────────────────────────────────────┤
│                  AI Processing Layer                           │
│  LangGraph: Memory → Integrations → Tools → OpenAI → Response │
│  Multi-Step: Orchestrator with progress tracking              │
│  Delegation: External user scheduling system                  │
├─────────────────────────────────────────────────────────────────┤
│                  Tools Layer                                   │
│  Network: Meeting scheduling, confirmation, negotiation       │
│  Delegation: Availability checking, owner scheduling          │
│  Notifications: Action resolution, time proposals             │
│  Calendar: Solo event creation                                │
├─────────────────────────────────────────────────────────────────┤
│                  Integration Layer                             │
│  Unified System: Gmail, Calendar, Slack, Notion...           │
│  OAuth2: Centralized token management and refresh            │
│  Registry: Dynamic integration configuration                  │
├─────────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)                   │
│  Smart Queries: Retry logic, connection pooling, timeouts    │
│  Tables: users (memory), user_integrations (tokens)          │
│  Network: connections, sessions, proposals                   │
└─────────────────────────────────────────────────────────────────┘
```

### Functional Programming Architecture

```typescript
// All components follow functional programming principles
export const withRetry = (operation, config) => {
  /* retry logic with circuit breakers */
};
export const loadIntegrationContext = (userId, type) => {
  /* context loading with error handling */
};
export const buildSystemPrompt = (state) => {
  /* dynamic prompt building */
};
export const categorizeError = (error) => {
  /* error classification and handling */
};
```

### File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── chat/route.ts              # Main AI chat endpoint
│   │   │   ├── memory/route.ts            # Memory management
│   │   │   └── classify/route.ts          # Intent classification
│   │   └── integrations/
│   │       ├── connect/route.ts           # Unified connection endpoint
│   │       └── callback/route.ts          # Unified OAuth callback
├── lib/
│   ├── ai/
│   │   ├── langgraph/
│   │   │   ├── index.ts                   # Main workflow orchestration
│   │   │   ├── orchestrator/
│   │   │   │   ├── multi-step-orchestrator.ts    # Multi-step execution
│   │   │   │   └── delegation-step-executors.ts  # Delegation tools
│   │   │   ├── nodes/
│   │   │   │   ├── memory-node.ts         # Memory loading
│   │   │   │   ├── integration-node.ts    # Unified integration loading
│   │   │   │   ├── openai-node.ts         # AI processing
│   │   │   │   ├── tool-executor-node.ts  # Tool execution
│   │   │   │   ├── network-negotiation-node.ts   # Network features
│   │   │   │   └── notifications-node.ts  # Notification handling
│   │   │   └── state/
│   │   │       └── chat-state.ts          # LangGraph state management
│   │   ├── tools/
│   │   │   ├── registry.ts                # Tool specifications
│   │   │   ├── types.ts                   # Tool type definitions
│   │   │   ├── network.ts                 # Network scheduling tools
│   │   │   ├── delegation.ts              # Delegation tools
│   │   │   ├── notifications.ts           # Notification tools
│   │   │   └── calendar.ts                # Calendar tools
│   │   ├── resilience/
│   │   │   └── error-handler.ts           # Functional error handling
│   │   ├── memory/
│   │   │   └── semantic-memory.ts         # Memory management
│   │   └── memory.ts                      # Memory database operations
│   └── integrations/
│       ├── registry.ts                    # Integration configuration
│       ├── service.ts                     # Functional integration utilities
│       └── oauth2-manager.ts              # OAuth2 token management
├── hooks/
│   └── usePerinAI.ts                      # Frontend AI interaction hook
└── middleware.ts                          # Security, rate limiting, auth
```

## ✨ Core Features

### 🤖 AI Assistant

- **Streaming Responses**: Real-time character-by-character output
- **Context Awareness**: Uses memory and integration data intelligently
- **Intent Classification**: Smart routing for different types of requests
- **Error Resilience**: Automatic retries with exponential backoff
- **Graceful Degradation**: Fallback responses when AI services fail
- **Circuit Breakers**: Prevents cascade failures during outages

### 🔄 LangGraph Workflow

- **Multi-Step Reasoning**: Complex task decomposition with state management
- **Parallel Processing**: Multiple integrations loaded simultaneously
- **Tool Integration**: Seamless integration with external services
- **State Persistence**: Centralized workflow state management
- **Progress Tracking**: Real-time progress updates for complex operations

### 🎯 Multi-Step Orchestration

- **Step Definition**: Structured step definitions with metadata
- **Progress Tracking**: Real-time progress updates with control tokens
- **Error Recovery**: Graceful handling of step failures
- **Pause/Resume**: Ability to pause and resume complex workflows
- **Step Skipping**: Optional step skipping for flexibility

### 🔗 Delegation System

- **External Scheduling**: Allow external users to schedule with calendar owners
- **Secure Links**: Time-limited delegation links with authentication
- **Availability Checking**: Real-time availability verification
- **Meeting Creation**: Automatic calendar event creation
- **Multi-Step Delegation**: Complex delegation workflows with progress tracking

### 🛠️ Tools System

- **Structured Tool Calling**: OpenAI function calling for actionable intents
- **Network Tools**: Meeting scheduling, confirmation, and negotiation
- **Delegation Tools**: Availability checking and owner scheduling
- **Notification Tools**: Action resolution and time proposals
- **Calendar Tools**: Solo event creation and management

### 🔗 Unified Integration System

- **Single Framework**: One system handles all integrations (Gmail, Calendar, Slack, etc.)
- **Smart Context Loading**: Only loads relevant data based on conversation context
- **Parallel Processing**: Multiple integrations loaded simultaneously
- **OAuth2 Management**: Centralized token handling with automatic refresh
- **Type-Safe**: Full TypeScript coverage with proper error handling

### 🛡️ Production-Ready Error Handling

- **Retry Logic**: Exponential backoff with jitter for failed operations
- **Circuit Breakers**: Automatic service isolation during failures
- **Error Categorization**: Smart handling based on error type (rate limits, timeouts, etc.)
- **Fallback Responses**: Simple keyword-based responses when AI is unavailable
- **Database Resilience**: Connection pooling with query retries

### 🧠 Memory Management

- **Simple Relevance Scoring**: Key-based memory retrieval
- **Context Matching**: Intelligent retrieval based on conversation content
- **Database Storage**: PostgreSQL JSONB for flexible storage
- **Memory Operations**: Add, retrieve, clear, and update entries

## 🔄 AI Workflow

### LangGraph Execution Flow

```
START
  ↓
LOAD_MEMORY (parallel with context extraction)
  ↓
DETECT_RELEVANT_INTEGRATIONS (keyword analysis)
  ↓
LOAD_INTEGRATION_CONTEXTS (parallel loading)
  ↓
LOAD_NOTIFICATIONS_CONTEXT (actionable items)
  ↓
NETWORK_NEGOTIATION (if scheduling intent)
  ↓
NOTIFICATIONS_ACTION (if user responds to notifications)
  ↓
AI_ANALYSIS (multi-step delegation detection)
  ↓
DECIDE_EXECUTION_MODE (tool mode vs direct mode)
  ↓
IF_TOOL_MODE:
  PLANNER_PHASE (tools enabled)
  ↓
  TOOL_EXECUTION_PHASE (if tools called)
  ↓
  RESPONDER_PHASE (streaming response)
ELSE:
  DIRECT_MODE (single streaming call)
  ↓
STREAM_RESPONSE (real-time to client)
  ↓
END
```

### State Management

```typescript
interface LangGraphChatState {
  // Input
  messages: ChatMessage[];
  userId: string;
  tone: string;
  perinName: string;
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination";

  // Context
  memoryContext: Record<string, unknown>;
  conversationContext: string;
  integrations: Record<string, IntegrationContext>;

  // Multi-step context
  multiStepContext?: MultiStepContext;

  // Delegation context
  delegationContext?: {
    delegationId: string;
    externalUserName?: string;
    constraints?: Record<string, unknown>;
    isDelegation: boolean;
    externalUserTimezone?: string;
  };

  // Processing
  systemPrompt: string;
  openaiResponse: string;
  streamChunks: string[];
  currentStep: string;
  error?: string;
}
```

### Multi-Step Orchestration Flow

```
MULTI_STEP_INITIATED
  ↓
STEP_START (step 1)
  ↓
STEP_PROGRESS (real-time updates)
  ↓
STEP_RESULT (success/failure)
  ↓
STEP_END (step 1)
  ↓
STEP_START (step 2)
  ↓
...
  ↓
MULTI_STEP_COMPLETE
```

### Error Recovery Flow

```
Operation Fails
  ↓
Categorize Error (rate limit, timeout, auth, etc.)
  ↓
If Retryable: Wait (exponential backoff) → Retry
  ↓
If Circuit Open: Return cached/fallback response
  ↓
If All Fails: Graceful degradation with simple response
```

## 🔗 Integration System

### Supported Integrations

| Integration | Status             | Capabilities                 |
| ----------- | ------------------ | ---------------------------- |
| Gmail       | ✅ Active          | Read emails, context loading |
| Calendar    | ✅ Active          | Read events, availability    |
| Slack       | 🚧 Framework Ready | Message reading (planned)    |
| Notion      | 🚧 Framework Ready | Page access (planned)        |
| GitHub      | 🚧 Framework Ready | Repository data (planned)    |
| Discord     | 🚧 Framework Ready | Server activity (planned)    |
| Zoom        | 🚧 Framework Ready | Meeting management (planned) |
| Teams       | 🚧 Framework Ready | Chat management (planned)    |

### Integration Registry

```typescript
// Each integration is configured in the registry
export const INTEGRATION_REGISTRY: Record<
  IntegrationType,
  IntegrationRegistryEntry
> = {
  gmail: {
    type: "gmail",
    name: "Gmail",
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
    keywords: ["email", "message", "inbox", "mail"],
    contextLoader: gmailContextLoader,
    contextTransformer: gmailContextTransformer,
  },
  calendar: {
    type: "calendar",
    name: "Google Calendar",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    keywords: ["calendar", "meeting", "appointment", "schedule"],
    contextLoader: calendarContextLoader,
    contextTransformer: calendarContextTransformer,
  },
  // More integrations...
};
```

### OAuth2 Flow

```typescript
// 1. Initiate connection
const { authUrl } = await connectIntegrationService("gmail");
window.location.href = authUrl; // Redirect to Google

// 2. Handle callback (automatic)
// → /api/integrations/callback?type=gmail&code=...

// 3. Use integration data
const context = await loadIntegrationContext(userId, "gmail");
```

## 🎯 Multi-Step Orchestration

### Step Definition

```typescript
interface StepDefinition {
  id: string;
  name: string;
  description: string;
  required?: boolean;
  estimatedDuration?: number; // in seconds
  data?: unknown; // Step-specific data
}
```

### Control Tokens

```typescript
export const MULTI_STEP_CONTROL_TOKENS = {
  STEP_START: (stepId: string, stepName: string) =>
    `[[PERIN_STEP:start:${stepId}:${stepName}]]`,
  STEP_PROGRESS: (message: string) => `[[PERIN_PROGRESS:${message}]]`,
  STEP_RESULT: (stepId: string, status: string, result?: string) =>
    `[[PERIN_STEP_RESULT:${stepId}:${status}${result ? `:${result}` : ""}]]`,
  STEP_END: (stepId: string) => `[[PERIN_STEP:end:${stepId}]]`,
  MULTI_STEP_COMPLETE: () => `[[PERIN_MULTI_STEP:complete]]`,
  MULTI_STEP_INITIATED: (reasoning: string, confidence: number) =>
    `[[PERIN_MULTI_STEP:initiated:${reasoning}:${confidence}]]`,
};
```

### Step Execution

```typescript
// Register step executors
registerDelegationStepExecutors(multiStepOrchestrator);

// Create delegation steps
const steps = createDelegationSteps(meetingParams);

// Execute multi-step delegation flow
const multiStepContext = await multiStepOrchestrator.executeSteps(
  state,
  steps,
  controller
);
```

## 🔐 Delegation System

### Delegation Flow

```
External User Access
  ↓
Delegation Link Validation
  ↓
Calendar Owner Context Loading
  ↓
Availability Checking
  ↓
Meeting Scheduling
  ↓
Calendar Event Creation
  ↓
Confirmation Response
```

### Delegation Tools

```typescript
// Check owner availability
const availabilityResult = await checkOwnerAvailabilityHandler(toolContext, {
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T11:00:00Z",
  durationMins: 60,
});

// Schedule with owner
const scheduleResult = await scheduleWithOwnerHandler(toolContext, {
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T11:00:00Z",
  title: "Meeting with External User",
  description: "Scheduled via delegation",
});
```

## 🛠️ Tools System

### Available Tools

| Tool                            | Purpose                     | Context               |
| ------------------------------- | --------------------------- | --------------------- |
| `network_schedule_meeting`      | Start negotiation session   | Network scheduling    |
| `network_confirm_meeting`       | Confirm proposed meeting    | Network confirmation  |
| `notifications_resolve`         | Resolve notification action | Notification handling |
| `delegation_check_availability` | Check owner availability    | Delegation system     |
| `delegation_schedule_meeting`   | Schedule with owner         | Delegation system     |
| `calendar_create_solo_event`    | Create solo calendar event  | Calendar management   |

### Tool Registry

```typescript
export const TOOL_SPECS: ToolSpec[] = [
  scheduleMeetingSpec,
  confirmMeetingSpec,
  resolveNotificationSpec,
  createSoloEventSpec,
  // More tools...
];

export const TOOL_HANDLERS = {
  network_schedule_meeting: {
    spec: scheduleMeetingSpec,
    handler: scheduleMeetingHandler,
    schema: scheduleMeetingSchema,
  },
  // More handlers...
};
```

### Tool Execution Flow

```typescript
// 1. Planner phase (tools enabled)
const plannerResponse = await openaiClient.chat.completions.create({
  model: "gpt-4",
  messages: plannerMessages,
  tools: getToolSpecsForContext(isDelegation),
  tool_choice: "auto",
  stream: false,
});

// 2. Tool execution phase
if (plannerMessage.tool_calls?.length > 0) {
  const toolResult = await toolExecutorNode(state);
  state = { ...state, ...toolResult };
}

// 3. Responder phase (streaming, no tools)
const responderResponse = await openaiClient.chat.completions.create({
  model: "gpt-4",
  messages: responderMessages,
  stream: true,
});
```

## 🛡️ Error Handling & Resilience

### Functional Error Handling

```typescript
// All error handling uses functional programming
import {
  withRetry,
  categorizeError,
  fallbackToSimpleResponse,
} from "@/lib/ai/resilience/error-handler";

// Retry any operation
const result = await withRetry(() => riskyOperation(), "operation-id", {
  maxRetries: 3,
  baseDelayMs: 1000,
  circuitBreaker: true,
});

// Get fallback response
const fallback = await fallbackToSimpleResponse("Hello there!");
```

### Error Categories

- **RATE_LIMIT**: API rate limits (60s backoff)
- **TIMEOUT**: Request timeouts (5s backoff)
- **AUTHENTICATION**: Auth failures (non-retryable)
- **CONTEXT_TOO_LARGE**: Input too big (non-retryable)
- **UNKNOWN**: Generic errors (retryable)

### Circuit Breaker Pattern

```typescript
// Circuit opens after 5 failures
// Stays open for 5 minutes
// Automatically resets on success
const status = getCircuitStatus("openai-chat-user123");
// → { open: false, failures: 0, lastFailure: 0 }
```

### Database Resilience

```typescript
// Enhanced connection pooling
const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000, // Close idle connections
  connectionTimeoutMillis: 2000, // Connection timeout
  query_timeout: 30000, // Query timeout
  statement_timeout: 30000, // Statement timeout
});

// All queries use retry logic
export const query = async (text, params) => {
  return withRetry(() => pool.query(text, params), "db-query");
};
```

## 🧠 Memory Management

### Memory System

```typescript
// Store memory with automatic importance calculation
await addMemoryEntry(
  userId,
  "user-preference",
  "Prefers morning meetings",
  "scheduling context"
);

// Retrieve relevant memories with smart scoring
const relevantMemories = await getRelevantMemoryContext(
  userId,
  "schedule a meeting",
  5 // limit
);
```

### Memory Features

- **Simple Relevance Scoring**: Based on key matching
- **Context Matching**: Intelligent retrieval based on conversation content
- **Database Storage**: PostgreSQL JSONB for flexible storage
- **Memory Operations**: Add, retrieve, clear, and update entries

### Memory Analytics

```typescript
const memory = await getUserMemory(userId);
// Returns:
// {
//   userId: "user123",
//   memory: { "preference": { key: "preference", value: "...", timestamp: "..." } },
//   lastUpdated: "2024-01-15T10:00:00Z"
// }
```

## 📡 API Reference

### Chat API

```typescript
POST /api/ai/chat

// Request
{
  "messages": [
    { "role": "user", "content": "Help me schedule a meeting" }
  ],
  "tone": "friendly",
  "perinName": "Perin",
  "specialization": "scheduling",
  "clientIntegrations": ["gmail", "calendar"]
}

// Response: Streaming text with real-time updates
// Control tokens for multi-step operations
```

### Memory API

```typescript
// Get memory
GET /api/ai/memory?keys=preferences,facts

// Add memory
POST /api/ai/memory
{
  "key": "meeting-preference",
  "content": "Prefers 9 AM meetings",
  "type": "preference"
}

// Clear memory
DELETE /api/ai/memory?keys=old-preferences
```

### Classification API

```typescript
POST /api/ai/classify
{
  "message": "Can you schedule a meeting for tomorrow?"
}

// Response: Streaming intent classification
```

### Integration API

```typescript
// Connect integration
POST /api/integrations/connect
{
  "type": "gmail",
  "userId": "user-id"
}

// Get available integrations
GET /api/integrations/connect
// Returns: { types: ['gmail', 'calendar', 'slack', ...] }
```

### Security Headers

All API responses include production-ready security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1642781234
```

## 💡 Usage Examples

### Basic AI Chat

```typescript
import { usePerinAI } from "@/hooks/usePerinAI";

function ChatExample() {
  const { sendMessage, isChatLoading, chatError } = usePerinAI();

  const handleChat = async () => {
    const stream = await sendMessage({
      messages: [{ role: "user", content: "Hello Perin!" }],
      tone: "friendly",
    });

    if (stream) {
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        console.log("Received:", chunk);
      }
    }
  };

  return (
    <button onClick={handleChat} disabled={isChatLoading}>
      {isChatLoading ? "Thinking..." : "Chat with Perin"}
    </button>
  );
}
```

### Multi-Step Delegation

```typescript
// Multi-step delegation automatically triggers when:
// 1. User is in delegation context
// 2. AI detects scheduling intent
// 3. Confidence threshold is met

// Control tokens are emitted for UI handling:
// [[PERIN_MULTI_STEP:initiated:reasoning:confidence]]
// [[PERIN_STEP:start:stepId:stepName]]
// [[PERIN_PROGRESS:message]]
// [[PERIN_STEP_RESULT:stepId:status:result]]
// [[PERIN_STEP:end:stepId]]
// [[PERIN_MULTI_STEP:complete]]
```

### Tool Integration

```typescript
// Tools are automatically called when:
// 1. Specialization is "scheduling"
// 2. Actionable keywords are detected
// 3. Tool mode is enabled

// Example tool call:
{
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "network_schedule_meeting",
        "arguments": "{\"counterpart\":\"John\",\"durationMins\":60}"
      }
    }
  ]
}
```

### Integration Connection

```typescript
import { connectIntegrationService } from "@/app/services/integrations";

// Connect Gmail
const connectGmail = async () => {
  try {
    const { authUrl } = await connectIntegrationService("gmail");
    window.location.href = authUrl;
  } catch (error) {
    console.error("Connection failed:", error);
  }
};

// The system handles:
// 1. OAuth2 flow automatically
// 2. Token storage and refresh
// 3. Context loading when relevant
```

### Error Handling Integration

```typescript
import {
  withRetry,
  fallbackToSimpleResponse,
} from "@/lib/ai/resilience/error-handler";

// Wrap any operation with retry logic
const robustOperation = async () => {
  return withRetry(
    async () => {
      // Your risky operation here
      return await someApiCall();
    },
    "my-operation",
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      circuitBreaker: true,
    }
  );
};

// Handle graceful degradation
const handleAIFailure = async (userMessage: string) => {
  const fallback = await fallbackToSimpleResponse(userMessage);
  return fallback; // Returns contextual fallback response
};
```

## ⚙️ Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/perin

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth2 (for Gmail/Calendar)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development Setup

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Set up database
# Create PostgreSQL database and run migrations

# 4. Set up Google OAuth2
# 1. Go to Google Cloud Console
# 2. Create OAuth2 credentials
# 3. Add redirect URIs:
#    - http://localhost:3000/api/integrations/callback?type=gmail
#    - http://localhost:3000/api/integrations/callback?type=calendar

# 5. Run development server
npm run dev
```

### Google Cloud Console Setup

1. **Create Project**: Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable APIs**: Gmail API, Calendar API
3. **Create Credentials**: OAuth 2.0 Client ID
4. **Configure Redirect URIs**:
   ```
   http://localhost:3000/api/integrations/callback?type=gmail
   http://localhost:3000/api/integrations/callback?type=calendar
   https://your-domain.com/api/integrations/callback?type=gmail
   https://your-domain.com/api/integrations/callback?type=calendar
   ```
5. **Set Scopes**:
   - Gmail: `https://www.googleapis.com/auth/gmail.modify`
   - Calendar: `https://www.googleapis.com/auth/calendar.events`

## 🚀 Production Deployment

### Performance Optimizations

```typescript
// Connection pooling
const pool = new Pool({
  max: 20, // Scale based on load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Rate limiting (per user per minute)
const RATE_LIMITS = {
  "/api/ai/chat": { requests: 10, windowMs: 60000 },
  "/api/ai/memory": { requests: 20, windowMs: 60000 },
};

// Circuit breakers prevent cascade failures
// Memory auto-pruning prevents unbounded growth
// Smart context loading reduces API calls
```

### Security Features

- **Rate Limiting**: Per-user limits on API endpoints
- **Input Validation**: Request size limits (1MB max)
- **SQL Injection Protection**: Parameterized queries only
- **XSS Protection**: Security headers on all responses
- **Authentication**: Required for all AI/integration endpoints
- **Token Security**: Encrypted OAuth2 token storage

### Monitoring & Observability

```typescript
// Error tracking
console.log("AI Chat Interaction:", {
  userId,
  timestamp: new Date().toISOString(),
  messageCount: messages.length,
  hasMemoryContext: Object.keys(memoryContext).length > 0,
});

// Circuit breaker status monitoring
const circuitStatus = getCircuitStatus("openai-chat");

// Memory analytics
const memoryAnalysis = await getUserMemory(userId);
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connection string updated
- [ ] Google OAuth2 redirect URIs updated for production domain
- [ ] Rate limiting configured appropriately
- [ ] Error tracking/monitoring set up
- [ ] Database connection pooling configured
- [ ] Security headers verified
- [ ] SSL/TLS certificates configured

## 🐛 Troubleshooting

### Common Issues

#### 1. OpenAI API Failures

```typescript
// Symptoms: AI responses fail or timeout
// Check: Circuit breaker status
const status = getCircuitStatus("openai-chat-userId");

// Solution: Wait for circuit to reset or check API key
if (status?.open) {
  // Circuit is open, will reset automatically in 5 minutes
  // Or force reset: clearAllCircuitState();
}
```

#### 2. Integration Connection Issues

```typescript
// Symptoms: OAuth redirect_uri_mismatch
// Check: Environment variables
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

// Solution: Ensure URLs match exactly:
// Google Console: http://localhost:3000/api/integrations/callback?type=gmail
// Environment: NEXTAUTH_URL=http://localhost:3000
```

#### 3. Multi-Step Orchestration Issues

```typescript
// Symptoms: Multi-step not triggering
// Check: Delegation context and AI analysis
console.log("Delegation context:", state.delegationContext);
console.log("AI analysis:", multiStepAnalysis);

// Solution: Ensure delegation context is properly set
// and AI analysis confidence meets threshold
```

#### 4. Tool Execution Issues

```typescript
// Symptoms: Tools not being called
// Check: Tool mode detection and specialization
console.log("Tool mode:", useToolMode);
console.log("Specialization:", specialization);

// Solution: Ensure actionable keywords are present
// or specialization is set to "scheduling"
```

#### 5. Database Connection Problems

```typescript
// Symptoms: Query timeouts or connection errors
// Check: Connection pool status
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

// Solution: Verify DATABASE_URL and network connectivity
```

#### 6. Memory System Issues

```typescript
// Symptoms: Memory not loading or saving
// Check: Database table structure and permissions
const memory = await getUserMemory(userId);
console.log("Memory loaded:", memory ? "success" : "failed");

// Solution: Verify users table has memory JSONB column
```

### Debug Mode

```typescript
// Enable detailed logging
process.env.DEBUG_AI = "true";

// Check error categorization
const error = new Error("rate limit exceeded");
const category = categorizeError(error);
console.log("Error category:", category);

// Monitor circuit breaker state
setInterval(() => {
  const status = getCircuitStatus("openai-chat");
  if (status?.failures > 0) {
    console.log("Circuit status:", status);
  }
}, 5000);
```

### Health Checks

```bash
# Test basic connectivity
curl http://localhost:3000/api/health

# Test AI endpoint (requires auth)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Test integration connection
curl -X GET http://localhost:3000/api/integrations/connect
```

## 📚 Additional Resources

- **OpenAI API**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **LangGraph**: [langchain-ai.github.io/langgraph](https://langchain-ai.github.io/langgraph/)
- **NextAuth.js**: [next-auth.js.org](https://next-auth.js.org/)
- **Google APIs**: [developers.google.com](https://developers.google.com/)
- **PostgreSQL**: [postgresql.org/docs](https://www.postgresql.org/docs/)

## 🔄 Version History

- **v2.0.0**: Complete unified integration system with functional error handling
- **v1.6.0**: Added calendar integration OAuth2 flow and onboarding integration
- **v1.5.0**: Enhanced documentation and type safety
- **v1.4.0**: Implemented service layer architecture
- **v1.3.0**: Added LangGraph workflow orchestration
- **v1.2.0**: Implemented Gmail integration
- **v1.1.0**: Added memory management and persistence
- **v1.0.0**: Initial release with basic AI chat

---

**Last Updated**: January 2025  
**Maintainer**: Perin Development Team  
**Architecture**: Functional Programming with Production-Ready Error Handling
