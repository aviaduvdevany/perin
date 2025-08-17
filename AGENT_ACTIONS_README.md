# 🤖 Perin Agent Actions — LLM Tool-Calling Architecture

This document describes Perin's **implemented** modular, reusable, future‑proof architecture that enables the AI to understand natural language, decide on actions, execute them safely in the backend, and respond to users. The system generalizes beyond scheduling/negotiation and serves as the default "LLM planner + tool executor" loop for the application.

## ✅ System Overview

The agent actions system provides:

- **Intelligent Tool Calling**: LLM interprets messages and emits structured tool calls (action + JSON args)
- **Safe Backend Execution**: Tools execute via typed handlers with strong server guardrails
- **Contextual Responses**: Results feed back to LLM for user-facing replies and follow-ups
- **Production Safety**: All operations enforce membership, scopes, rate limits, idempotency, audit logs, and notifications

---

## 🧭 System Flow

### High-Level Architecture

```
1. User → Perin (natural language)
2. LLM Planner → emits tool call (e.g., `network.schedule_meeting` with normalized params)
3. Tool Executor → resolves counterpart/IDs, validates permissions, performs operation
4. Tool Result → sent back to LLM as context
5. LLM Responder → generates final reply and next-step prompts
```

### Execution Modes

- **Tool Mode**: For actionable intents (scheduling, coordination)

  - Planner phase (non-streaming, tools enabled)
  - Tool execution phase
  - Responder phase (streaming, summarizes actions)

- **Direct Mode**: For conversational intents
  - Single streaming call (current behavior)

### Intent Detection

The system automatically detects actionable intents using keyword analysis:

- `schedule`, `meeting`, `appointment`, `confirm`, `reschedule`, `cancel`
- `propose`, `negotiate`, `coordinate`, `plan`, `set up`, `arrange`, `book`, `reserve`

---

## 🏗️ Architecture Components

### Core Files

```
src/
├── lib/
│   ├── ai/
│   │   ├── langgraph/
│   │   │   ├── index.ts                    # Main orchestrator (planner → executor → responder)
│   │   │   └── nodes/
│   │   │       └── tool-executor-node.ts   # Executes tool calls with validation
│   │   └── tools/
│   │       ├── registry.ts                 # Tool specs + handlers registry
│   │       ├── types.ts                    # ToolEnvelope, ToolContext, etc.
│   │       ├── network.ts                  # schedule_meeting, confirm_meeting
│   │       └── notifications.ts            # resolve_notification
├── app/
│   └── api/
│       └── ai/
│           └── chat/
│               └── route.ts                # Entry point with intent detection
```

### Tool System

#### Tool Registry (`src/lib/ai/tools/registry.ts`)

Central registry mapping tool names to OpenAI specifications and server handlers:

```typescript
export const TOOL_SPECS: ToolSpec[] = [
  scheduleMeetingSpec,
  confirmMeetingSpec,
  resolveNotificationSpec,
];

export const TOOL_HANDLERS = {
  network_schedule_meeting: {
    spec: scheduleMeetingSpec,
    handler: scheduleMeetingHandler,
    schema: scheduleMeetingSchema,
  },
  // ... more tools
};
```

#### Tool Types (`src/lib/ai/tools/types.ts`)

Consistent error handling with `ToolEnvelope` pattern:

```typescript
export type ToolEnvelope<T> =
  | { ok: true; data: T; needs?: undefined; error?: undefined }
  | { ok: false; needs: Record<string, boolean>; error?: undefined }
  | { ok: false; error: { code: string; message: string }; needs?: undefined };
```

#### Tool Context

All tools receive consistent context:

```typescript
interface ToolContext {
  userId: string;
  conversationContext: string;
  memoryContext: Record<string, unknown>;
  integrations: Record<string, unknown>;
}
```

---

## 🛠️ Available Tools

### Network Tools

#### `network_schedule_meeting`

**Purpose**: Start a negotiation session and propose meeting slots to a counterpart.

**Arguments**:

```typescript
{
  counterpart: string;           // Human name or email (e.g., 'Aviad')
  durationMins?: number;        // Meeting duration (5-240 minutes)
  startWindow?: string;         // ISO start of candidate window
  endWindow?: string;           // ISO end of candidate window
  tzHint?: string;             // IANA timezone (e.g., 'Asia/Jerusalem')
}
```

**Result**:

```typescript
{
  sessionId: string;
  proposals: Array<{
    start: string;
    end: string;
    tz: string;
  }>;
  counterpartUserId: string;
  connectionId: string;
  durationMins: number;
}
```

**Features**:

- Automatic counterpart resolution by name/email
- Calendar integration for mutual availability
- Session creation with 30-minute TTL
- Notification system integration
- Scope validation (`calendar.availability.read`, `calendar.events.propose`)

#### `network_confirm_meeting`

**Purpose**: Confirm a meeting from available proposals or custom time.

**Arguments**:

```typescript
{
  sessionId: string;            // Session ID to confirm
  selectionIndex?: number;      // Index of selected proposal (0-based)
  startTime?: string;          // Custom ISO start time
  endTime?: string;            // Custom ISO end time
}
```

**Features**:

- Two-phase booking with rollback on failure
- Re-checks free/busy status
- Updates session transcript and notifications
- Calendar event creation

### Notification Tools

#### `notifications_resolve`

**Purpose**: Resolve actionable notifications after completing required actions.

**Arguments**:

```typescript
{
  notificationId: string;       // ID of notification to resolve
  resolution?: string;         // Optional resolution note
}
```

---

## 🔒 Safety & Guardrails

### Security Features

- **No ID Fabrication**: LLM never provides IDs; server resolves names/emails to `connectionId`/`counterpartUserId`
- **Membership Validation**: Active connection checks on every action
- **Scope Enforcement**: Calendar operations require specific permissions
- **Idempotency**: Duplicate proposals return 409; two-phase booking prevents races
- **Rate Limiting**: Per-user limits on tool executions
- **Audit Logging**: All tool calls logged with timestamps and outcomes

### Error Handling

Standardized error codes with user-friendly messages:

```typescript
enum ToolErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  SCOPES_MISSING = "SCOPES_MISSING",
  CONNECTION_INACTIVE = "CONNECTION_INACTIVE",
  RATE_LIMITED = "RATE_LIMITED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

### Missing Information Handling

When required information is missing, tools return `needs` objects:

```typescript
// Example: Missing duration
{ ok: false, needs: { duration: true } }

// Example: Multiple counterpart candidates
{ ok: false, needs: { counterpart_clarification: true } }
```

The LLM then asks clarifying questions before proceeding.

---

## 🔄 Execution Flow Details

### Tool Mode Execution

1. **Intent Detection**: Chat route analyzes message for actionable keywords
2. **Planner Phase**:
   - Non-streaming OpenAI call with tools enabled
   - LLM decides whether to call tools
   - Tool calls collected and validated
3. **Tool Execution**:
   - Each tool call executed with validation
   - Results formatted as tool messages
   - Error handling with reauth support
4. **Responder Phase**:
   - Streaming response summarizing actions
   - Contextual follow-up suggestions

### Direct Mode Execution

- Single streaming call for conversational intents
- No tool calling overhead
- Immediate response generation

---

## 🧪 Usage Examples

### Scheduling a Meeting

**User Input**: "Can you set a half-hour meeting with Aviad tomorrow between 12:00 and 14:00 Israel time?"

**System Flow**:

1. Intent detection: `scheduling` → Tool mode enabled
2. Planner: Calls `network_schedule_meeting` with extracted parameters
3. Tool execution: Resolves "Aviad", generates proposals, creates session
4. Responder: "I've created a scheduling session with Aviad and sent 3 time proposals for tomorrow between 12:00-14:00 Israel time. He'll receive a notification and can confirm one of the slots."

### Confirming a Meeting

**User Input**: "Confirm option 2 from the scheduling session"

**System Flow**:

1. Intent detection: `confirm` → Tool mode enabled
2. Planner: Calls `network_confirm_meeting` with session context
3. Tool execution: Confirms proposal, creates calendar event
4. Responder: "Perfect! I've confirmed the meeting for [time]. Calendar invites have been sent to both participants."

### Resolving Notifications

**User Input**: "Mark the scheduling notification as resolved"

**System Flow**:

1. Intent detection: `resolve` → Tool mode enabled
2. Planner: Calls `notifications_resolve` with notification ID
3. Tool execution: Marks notification as resolved
4. Responder: "Done! The notification has been marked as resolved."

---

## 🔧 Development Guide

### Adding a New Tool

1. **Define the Schema**:

```typescript
// src/lib/ai/tools/your-tool.ts
export const yourToolSchema = z.object({
  param1: z.string().describe("Description for LLM"),
  param2: z.number().optional(),
});

export type YourToolArgs = z.infer<typeof yourToolSchema>;
```

2. **Create the Handler**:

```typescript
export const yourToolHandler: ToolHandler<
  YourToolArgs,
  YourToolResult
> = async (context, args) => {
  try {
    // Your business logic here
    const result = await performAction(context.userId, args);
    return createToolSuccess(result);
  } catch (error) {
    return createToolError(ToolErrorCode.INTERNAL_ERROR, "Action failed");
  }
};
```

3. **Define the Spec**:

```typescript
export const yourToolSpec: ToolSpec = {
  type: "function",
  function: {
    name: "your_tool_name",
    description: "What this tool does",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "..." },
        param2: { type: "number", description: "..." },
      },
      required: ["param1"],
    },
  },
};
```

4. **Register the Tool**:

```typescript
// src/lib/ai/tools/registry.ts
export const TOOL_SPECS = [
  // ... existing tools
  yourToolSpec,
];

export const TOOL_HANDLERS = {
  // ... existing handlers
  your_tool_name: {
    spec: yourToolSpec,
    handler: yourToolHandler,
    schema: yourToolSchema,
  },
};
```

### Testing Tools

Tools can be tested independently:

```typescript
const context: ToolContext = {
  userId: "test-user",
  conversationContext: "Test conversation",
  memoryContext: {},
  integrations: {},
};

const result = await yourToolHandler(context, { param1: "test" });
expect(result.ok).toBe(true);
```

---

## 📊 Monitoring & Observability

### Logging

The system provides comprehensive logging:

- Tool execution attempts and results
- Duration tracking for performance monitoring
- Error categorization and handling
- Integration status and reauth events

### Metrics

Key metrics tracked:

- Tool call success rates
- Average execution times
- Missing field frequency
- Error type distribution

### Circuit Breakers

Integration failures trigger circuit breakers:

- Prevents cascade failures during outages
- Automatic recovery after 5 minutes
- Fallback responses when services are unavailable

---

## 🚀 Performance Optimizations

### Streaming Efficiency

- Tool mode: Non-streaming planner + streaming responder
- Direct mode: Single streaming call
- Optimized for both latency and user experience

### Context Loading

- Smart integration context loading based on conversation
- Parallel loading of multiple integrations
- Caching of frequently accessed data

### Error Recovery

- Exponential backoff for retryable errors
- Graceful degradation with fallback responses
- Circuit breakers prevent cascade failures

---

## 🔮 Future Enhancements

### Planned Features

1. **Additional Tools**:

   - Email composition and sending
   - File management and sharing
   - Calendar event modification
   - Integration connection management

2. **Enhanced Intelligence**:

   - Multi-step reasoning chains
   - Context-aware tool selection
   - Learning from user preferences

3. **Advanced Safety**:
   - Fine-grained permission controls
   - Action approval workflows
   - Enhanced audit trails

### Architecture Evolution

- Support for multiple tool calls per turn
- Dynamic tool loading based on context
- Plugin architecture for third-party tools
- Cross-tool coordination and workflows

---

## 📚 API Reference

### Chat Endpoint

```typescript
POST /api/ai/chat

Request:
{
  messages: ChatMessage[];
  tone?: string;
  perinName?: string;
  specialization?: "negotiation" | "scheduling" | "memory" | "coordination";
  clientIntegrations?: IntegrationType[];
}

Response: Streaming text with real-time updates
```

### Tool Execution

Tools are executed automatically based on conversation context. No direct API access is provided for security reasons.

---

## 🛡️ Security Considerations

### Authentication

- All tool executions require valid user session
- User context validated on every operation
- Session-based rate limiting

### Authorization

- Scope-based permission checks
- Connection membership validation
- Resource ownership verification

### Data Protection

- No sensitive data in tool arguments
- Encrypted storage of integration tokens
- Audit logging of all operations

---

## 📝 Best Practices

### For Developers

1. **Tool Design**:

   - Keep tools focused and single-purpose
   - Use descriptive parameter names
   - Provide clear error messages
   - Handle edge cases gracefully

2. **Error Handling**:

   - Always use `ToolEnvelope` pattern
   - Categorize errors appropriately
   - Provide actionable error messages
   - Log errors for debugging

3. **Performance**:
   - Minimize tool execution time
   - Use async operations efficiently
   - Cache frequently accessed data
   - Monitor execution metrics

### For Users

1. **Natural Language**:

   - Be specific about what you want to do
   - Provide context when needed
   - Use clear time references
   - Mention people by name or email

2. **Follow-up Actions**:
   - Respond to clarification questions
   - Confirm actions when prompted
   - Check notifications for updates
   - Use the system's suggestions

---

## 🎯 Success Metrics

### User Experience

- **Response Time**: < 3 seconds for tool execution
- **Success Rate**: > 95% successful tool calls
- **Clarification Rate**: < 10% require follow-up questions
- **User Satisfaction**: Measured through feedback

### System Performance

- **Availability**: 99.9% uptime
- **Error Rate**: < 1% tool execution failures
- **Latency**: < 500ms average tool execution time
- **Throughput**: Support for 1000+ concurrent users

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Status**: Production Ready  
**Maintainer**: Perin Development Team

---

_This system represents a production-ready implementation of LLM tool-calling architecture, providing safe, efficient, and user-friendly AI-powered automation for scheduling, coordination, and task management._
