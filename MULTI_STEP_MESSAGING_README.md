# 🔄 Multi-Step Messaging System

> A real-time, action-driven multi-step UI experience for AI task orchestration with cinematic effects and natural conversation flow.

## 📋 Table of Contents

- [Overview](#overview)
- [Current Implementation](#current-implementation)
- [Architecture](#architecture)
- [Control Token Protocol](#control-token-protocol)
- [Key Features](#key-features)
- [Implementation Details](#implementation-details)
- [Usage Examples](#usage-examples)
- [Technical Specifications](#technical-specifications)

## 🎯 Overview

The multi-step messaging system provides a real-time, action-driven experience where the UI syncs with actual backend operations. Instead of a pre-rendered "cinematic show," the system displays step progress as actions actually happen, with a minimum duration for smooth animations.

### Key Benefits

- **Real-Time Sync**: UI reflects actual backend operations, not simulated progress
- **Action-Driven**: Steps appear and update based on real tool execution
- **Cinematic Minimum**: Smooth animations with minimum duration, but can extend for longer operations
- **Natural Conversation**: Separate chat messages for user-friendly communication
- **Error Handling**: Graceful failure handling with clear user feedback
- **Date Intelligence**: Smart parsing of user-specified dates and times

## 🔍 Current Implementation

### ✅ **Implemented Features:**

1. **Real-Time Multi-Step Orchestrator**: Backend orchestrates actual tool execution
2. **Action-Driven UI**: Frontend syncs with real backend events
3. **Control Token Protocol**: Streaming protocol for UI coordination
4. **Separate Chat Messages**: User-friendly messages as distinct chat bubbles
5. **Smart Date Parsing**: Intelligent parsing of user-specified dates and times
6. **Error Recovery**: Stops on required step failures with clear messaging
7. **Cinematic Effects**: Minimum duration animations with real-time extension

### 🎯 **Current Use Cases:**

- **Delegation Scheduling**: Check availability → Schedule meeting
- **Date/Time Parsing**: "Wednesday at 14:00" → Next Wednesday at 2 PM
- **Conflict Detection**: Real-time availability checking with conflict reporting
- **Natural Conversation**: Separate messages for user interaction

## 🏗️ Architecture

### High-Level Flow

```
User Request → AI Analysis → Multi-Step Detection → Step Execution → Real-Time UI Updates
                ↓                    ↓                    ↓                    ↓
            [Date Parsing]    [Step Definition]    [Tool Execution]    [Control Tokens]
                ↓                    ↓                    ↓                    ↓
            [Smart Parsing]   [Step Orchestrator]  [Progress Updates]  [UI Sync]
                ↓                    ↓                    ↓                    ↓
            [ISO DateTime]    [Step Results]       [Status Changes]    [Cinematic UI]
```

### Core Components

#### 1. **Multi-Step Orchestrator** (`multi-step-orchestrator.ts`)

```typescript
class MultiStepOrchestrator {
  async executeSteps(
    state: LangGraphChatState,
    steps: StepDefinition[],
    streamController: ReadableStreamDefaultController
  ): Promise<MultiStepContext>;
}
```

**Key Features:**

- Emits step definitions just before execution
- Real-time progress updates during tool execution
- Handles required step failures by stopping the process
- Emits separate messages for user-friendly communication

#### 2. **Step Executors** (`delegation-step-executors.ts`)

```typescript
export const delegationCheckAvailabilityExecutor: StepExecutor = async (
  state: LangGraphChatState,
  step: StepDefinition,
  context: MultiStepContext,
  onProgress: (message: string) => void
) => Promise<StepResult>;
```

**Key Features:**

- Real-time progress messages during execution
- Proper error handling with status updates
- Integration with actual calendar tools

#### 3. **Frontend Parser** (`useMultiStepParser.ts`)

```typescript
export const useMultiStepParser = () => {
  const parseControlTokens = (chunk: string) => {
    // Parse control tokens and update UI state
  };

  const processUpdatesImmediately = (updates: ParsedUpdate[]) => {
    // Real-time UI updates based on backend events
  };
};
```

**Key Features:**

- Immediate processing of all control tokens
- Real-time UI state updates
- Separate message handling

#### 4. **UI Component** (`MultiStepMessage.tsx`)

```typescript
const MultiStepMessage: React.FC<MultiStepMessageProps> = ({
  steps,
  currentStepIndex,
  status,
  progressMessages,
  showTimings = true,
  className,
}) => {
  // Real-time step rendering with cinematic effects
};
```

**Key Features:**

- Minimum duration animations (1500ms)
- Real-time status updates
- Cinematic effects that extend for longer operations

## 🔧 Control Token Protocol

### Token Definitions

```typescript
const MULTI_STEP_CONTROL_TOKENS = {
  MULTI_STEP_INITIATED: (reasoning: string, confidence: number) =>
    `[[PERIN_MULTI_STEP:initiated:${reasoning}:${confidence}]]`,
  STEP_START: (stepId: string, stepName: string) =>
    `[[PERIN_STEP:start:${stepId}:${stepName}]]`,
  PROGRESS: (message: string) => `[[PERIN_PROGRESS:${message}]]`,
  STEP_RESULT: (stepId: string, status: string, result: string) =>
    `[[PERIN_STEP_RESULT:${stepId}:${status}:${result}]]`,
  MULTI_STEP_COMPLETE: () => `[[PERIN_MULTI_STEP:complete]]`,
  SEPARATE_MESSAGE: (message: string) =>
    `[[PERIN_SEPARATE_MESSAGE:${message}]]`,
} as const;
```

### Token Flow

1. **Initiation**: `MULTI_STEP_INITIATED` - AI detects multi-step request
2. **Step Start**: `STEP_START` - Just before step execution begins
3. **Progress**: `PROGRESS` - Real-time updates during execution
4. **Step Result**: `STEP_RESULT` - Step completion/failure status
5. **Completion**: `MULTI_STEP_COMPLETE` - All steps finished
6. **Separate Message**: `SEPARATE_MESSAGE` - User-friendly chat message

## 🎯 Key Features

### 1. **Real-Time Action-Driven UI**

```typescript
// Backend emits step start just before execution
this.emitToStream(
  streamController,
  MULTI_STEP_CONTROL_TOKENS.STEP_START(step.id, step.name)
);

// Frontend immediately shows step as "processing"
useEffect(() => {
  steps.forEach((step) => {
    if (step.status === "running" && !stepStartTimes.current.has(step.id)) {
      stepStartTimes.current.set(step.id, Date.now());
      setCinematicSteps((prev) => {
        /* update to processing */
      });
    }
  });
}, [steps]);
```

### 2. **Smart Date Parsing**

```typescript
function parseDateTimeFromMessage(
  message: string,
  timezone: string
): Date | null {
  // Supports multiple formats:
  // - "Wednesday at 14:00" → Next Wednesday at 2 PM
  // - "Tuesday at 3pm" → Next Tuesday at 3 PM
  // - "tomorrow at 2:30" → Tomorrow at 2:30 PM
  // - "today at 10am" → Today at 10 AM
}
```

### 3. **Cinematic Minimum Duration**

```typescript
const CINEMATIC_TIMING = {
  MINIMUM_STEP_DURATION: 1500, // Minimum time to show a step
};

const handleRealTimeStepUpdate = useCallback(
  (stepId: string, status: string) => {
    const startTime = stepStartTimes.current.get(stepId);
    const elapsed = Date.now() - (startTime || 0);
    const remaining = Math.max(
      0,
      CINEMATIC_TIMING.MINIMUM_STEP_DURATION - elapsed
    );

    if (remaining > 0) {
      setTimeout(() => updateStatus(status), remaining);
    } else {
      updateStatus(status);
    }
  },
  []
);
```

### 4. **Separate Chat Messages**

```typescript
// Backend emits user-friendly message
this.emitToStream(
  streamController,
  MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage)
);

// Frontend creates separate chat bubble
if (separateMessages.length > 0) {
  setMessages((prev) => [
    ...prev,
    ...separateMessages.map((message, index) => ({
      id: `separate-${Date.now()}-${index}`,
      content: message,
      fromExternal: false,
      timestamp: new Date(),
      isSeparateMessage: true,
    })),
  ]);
}
```

### 5. **Error Handling & Stopping**

```typescript
// Stop on required step failure
if (context.stepResults[i].status === "failed" && step.required) {
  const failureMessage = `There are conflicts in the time you suggested. Would you like to try a different time for that day?`;

  this.emitToStream(
    streamController,
    MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
  );
  this.emitToStream(
    streamController,
    MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage)
  );
  return context; // Don't throw error, just stop
}
```

## 📋 Implementation Details

### Backend Implementation

#### 1. **Multi-Step Detection** (`index.ts`)

```typescript
async function shouldUseMultiStepDelegation(
  messages: ChatMessage[],
  delegationContext?: LangGraphChatState["delegationContext"],
  openaiClient?: OpenAI
): Promise<{ useMultiStep: boolean; reasoning: string; confidence: number }>;
```

#### 2. **Date Parsing** (`index.ts`)

```typescript
function extractDelegationMeetingParams(
  messages: ChatMessage[],
  delegationContext: LangGraphChatState["delegationContext"]
): {
  startTime: string;
  durationMins: number;
  title: string;
  timezone?: string;
  externalUserName?: string;
} | null;
```

#### 3. **Step Execution** (`delegation-step-executors.ts`)

```typescript
export const delegationCheckAvailabilityExecutor: StepExecutor = async (
  state: LangGraphChatState,
  step: StepDefinition,
  context: MultiStepContext,
  onProgress: (message: string) => void
) => Promise<StepResult>;
```

### Frontend Implementation

#### 1. **Control Token Parsing** (`useMultiStepParser.ts`)

```typescript
const parseControlTokens = (chunk: string) => {
  const updates: ParsedUpdate[] = [];

  // Parse all control token patterns
  Object.entries(CONTROL_TOKEN_PATTERNS).forEach(([type, pattern]) => {
    const matches = chunk.matchAll(pattern);
    for (const match of matches) {
      updates.push(parseUpdate(type, match));
    }
  });

  // Process updates immediately for real-time sync
  if (hasInitiation || aiInitiated || hasStepUpdates) {
    processUpdatesImmediately(updates);
  }
};
```

#### 2. **Real-Time UI Updates** (`MultiStepMessage.tsx`)

```typescript
useEffect(() => {
  steps.forEach((step) => {
    if (step.status === "running" && !stepStartTimes.current.has(step.id)) {
      // Step just started
      stepStartTimes.current.set(step.id, Date.now());
      setCinematicSteps((prev) => {
        /* update to processing */
      });
    } else if (step.status === "completed" || step.status === "failed") {
      handleRealTimeStepUpdate(step.id, step.status, step.progressMessage);
    }
  });
}, [steps, handleRealTimeStepUpdate]);
```

#### 3. **Separate Message Handling** (`DelegationChat.tsx`)

```typescript
// Check if this chunk contains a separate message token
if (chunk.includes("[[PERIN_SEPARATE_MESSAGE:")) {
  const match = chunk.match(/\[\[PERIN_SEPARATE_MESSAGE:([^\]]+)\]\]/);
  if (match) {
    separateMessages.push(match[1]);
  }
}

// Add separate messages as individual chat messages
if (separateMessages.length > 0) {
  setMessages((prev) => [
    ...prev,
    ...separateMessages.map((message, index) => ({
      id: `separate-${Date.now()}-${index}`,
      content: message,
      fromExternal: false,
      timestamp: new Date(),
      isSeparateMessage: true,
    })),
  ]);
}
```

## 🎭 Usage Examples

### Example 1: Successful Meeting Scheduling

**User Input**: "i want a meeting with Aviad on Wednesday at 14:00"

**System Flow**:

1. **AI Analysis**: Detects multi-step scheduling intent
2. **Date Parsing**: Parses "Wednesday at 14:00" → Next Wednesday at 2 PM
3. **Multi-Step Initiation**: Shows multi-step UI wrapper
4. **Step 1**: "Check Availability" → ✅ Available
5. **Step 2**: "Schedule Meeting" → ✅ Scheduled
6. **Separate Message**: "Perfect! I've scheduled your meeting with Aviad for Wednesday at 2 PM."

### Example 2: Conflict Detection

**User Input**: "i want a meeting with Aviad tomorrow at 2pm"

**System Flow**:

1. **AI Analysis**: Detects multi-step scheduling intent
2. **Date Parsing**: Parses "tomorrow at 2pm" → Tomorrow at 2 PM
3. **Multi-Step Initiation**: Shows multi-step UI wrapper
4. **Step 1**: "Check Availability" → ❌ Conflicts found
5. **Process Stops**: Required step failed, no further steps
6. **Separate Message**: "There are conflicts in the time you suggested. Would you like to try a different time for that day?"

### Example 3: Different Day Request

**User Input**: "i want a meeting with Aviad on Tuesday at 3pm"

**System Flow**:

1. **AI Analysis**: Detects multi-step scheduling intent
2. **Date Parsing**: Parses "Tuesday at 3pm" → Next Tuesday at 3 PM
3. **Multi-Step Initiation**: Shows multi-step UI wrapper
4. **Step 1**: "Check Availability" → ✅ Available (different day)
5. **Step 2**: "Schedule Meeting" → ✅ Scheduled
6. **Separate Message**: "Great! I've scheduled your meeting with Aviad for Tuesday at 3 PM."

## 🔧 Technical Specifications

### Control Token Patterns

```typescript
const CONTROL_TOKEN_PATTERNS = {
  MULTI_STEP_INITIATED: /\[\[PERIN_MULTI_STEP:initiated:([^:]+):([^\]]+)\]\]/g,
  STEP_START: /\[\[PERIN_STEP:start:([^:]+):([^\]]+)\]\]/g,
  PROGRESS: /\[\[PERIN_PROGRESS:([^\]]+)\]\]/g,
  STEP_RESULT: /\[\[PERIN_STEP_RESULT:([^:]+):([^:]+):([^\]]+)\]\]/g,
  MULTI_STEP_COMPLETE: /\[\[PERIN_MULTI_STEP:complete\]\]/g,
  SEPARATE_MESSAGE: /\[\[PERIN_SEPARATE_MESSAGE:([^\]]+)\]\]/g,
} as const;
```

### Step Definition Interface

```typescript
interface StepDefinition {
  id: string;
  name: string;
  description: string;
  required: boolean;
  data?: unknown;
}

interface StepResult {
  stepId: string;
  status: "completed" | "failed";
  result?: unknown;
  progressMessage?: string;
}
```

### Multi-Step State Interface

```typescript
interface MultiStepState {
  isMultiStep: boolean;
  steps: StepDefinition[];
  currentStepIndex: number;
  status: "idle" | "running" | "completed" | "failed";
  progressMessages: string[];
  aiInitiated: boolean;
}
```

### Cinematic Timing Configuration

```typescript
const CINEMATIC_TIMING = {
  MINIMUM_STEP_DURATION: 1500, // Minimum time to show a step
  STEP_REVEAL_DELAY: 300, // Delay between step reveals
  PROGRESS_UPDATE_INTERVAL: 100, // Progress update frequency
} as const;
```

## 🚀 Future Enhancements

### Planned Features

1. **Parallel Step Execution**: Execute independent steps simultaneously
2. **Conditional Steps**: Execute steps based on previous results
3. **Step Templates**: Reusable step workflows
4. **Advanced Date Parsing**: Support for relative dates ("next week", "in 2 days")
5. **Step Retry Logic**: Automatic retry for failed steps
6. **Step Skipping**: Allow users to skip optional steps

### Performance Optimizations

1. **Step Caching**: Cache step results for repeated operations
2. **Lazy Loading**: Load step definitions on demand
3. **Streaming Optimization**: Optimize control token streaming
4. **UI Performance**: Virtual scrolling for long step lists

---

**This document reflects the current state of the multi-step messaging system as implemented. The system provides a real-time, action-driven experience with cinematic effects and natural conversation flow.**
