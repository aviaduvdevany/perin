# 🎬 Multi-Step Messaging System - Implementation Guide

> **A real-time, action-driven multi-step UI experience for AI task orchestration with natural conversation flow**

## 🎯 Overview

The Multi-Step Messaging System provides a beautiful, **real-time UI** that breaks down complex AI tasks into discrete steps, showing users exactly what's happening behind the scenes **as it happens**. It combines:

- **Real-time streaming updates** from the backend with immediate UI sync
- **Action-driven step creation** - steps appear only when they actually start
- **Cinematic animations** with emotional design and minimum duration guarantees
- **Intelligent step orchestration** with progress tracking and failure handling
- **Separate chat messages** for natural conversation flow
- **Smart date parsing** for user-specified times and dates
- **Glassmorphism UI** with dark/light mode support
- **Error handling** with user-friendly feedback and process termination

## ✨ Key Features

### 🤖 AI-Powered Detection

- Automatically detects when multi-step orchestration is needed
- Uses OpenAI to analyze user intent vs simple keyword matching
- Only triggers for delegation tasks (scheduling, coordination)

### 🎭 Real-Time Experience

- **Action-Driven Steps**: Steps appear immediately when backend actions start
- **Live Progress Updates**: Real-time progress messages from actual operations
- **Failure Handling**: Process stops immediately when required steps fail
- **Minimum Duration**: Cinematic effects ensure steps are visible for at least 1.5 seconds
- **Status Icons**: CheckCircle (✅), AlertCircle (❌), Loader2 (🔄), Circle (⚪)
- **Celebration Mode**: Sparkles and success animations when completed

### 💬 Natural Conversation

- **Separate Chat Messages**: User-friendly messages appear as distinct chat bubbles
- **Conversation Continuity**: Users can respond and continue the conversation naturally
- **Context Preservation**: Multi-step context doesn't interfere with chat flow
- **Error Communication**: Clear, conversational error messages

### 📅 Smart Date Parsing

- **Multiple Formats**: "Wednesday at 14:00", "tomorrow at 3pm", "today at 10am"
- **Day Recognition**: Monday-Sunday, today, tomorrow
- **Time Parsing**: 24-hour (14:00) and 12-hour (2pm) formats
- **Timezone Support**: Respects user timezone preferences

### 📡 Real-Time Updates

- **Immediate Processing**: Step definitions and status updates processed instantly
- **Control Tokens**: Custom streaming protocol for UI coordination
- **Race Condition Safe**: Handles React state timing issues
- **Backend Sync**: UI perfectly mirrors actual backend execution state

## 🏗️ Architecture

### Backend Components

```
MultiStepOrchestrator ─────→ Step Executors ─────→ Control Tokens
       │                           │                     │
       └── Real-Time Steps        └── Live Progress     └── Stream to Frontend
```

**Core Files:**

- `src/lib/ai/langgraph/orchestrator/multi-step-orchestrator.ts` - Real-time orchestration logic
- `src/lib/ai/langgraph/orchestrator/delegation-step-executors.ts` - Enhanced step implementations
- `src/lib/ai/langgraph/index.ts` - AI detection, date parsing, and integration

### Frontend Components

```
DelegationChat ─────→ useMultiStepParser ─────→ MultiStepMessage
      │                        │                        │
      └── Stream Processing    └── Real-Time State      └── Live UI Updates
```

**Core Files:**

- `src/hooks/useMultiStepParser.ts` - Real-time token parsing and state management
- `src/components/ui/MultiStepMessage.tsx` - Real-time UI component
- `src/components/delegation/DelegationChat.tsx` - Chat integration with separate messages

## 🎮 Control Token Protocol

The system uses custom control tokens embedded in the streaming response:

### Step Management

```typescript
[[PERIN_MULTI_STEP:initiated:reasoning:confidence]]  // AI initiates multi-step
[[PERIN_STEP:start:step_id:step_name]]              // Step starts (real-time)
[[PERIN_STEP_RESULT:step_id:status:message]]        // Step completion
[[PERIN_STEP:end:step_id]]                          // Step cleanup
[[PERIN_MULTI_STEP:complete]]                       // Process complete
```

### Progress Updates

```typescript
[[PERIN_PROGRESS:message]]                          // Real-time progress
```

### Separate Messages

```typescript
[[PERIN_SEPARATE_MESSAGE:user_friendly_message]]    // Natural chat message
```

## 🔧 Implementation Details

### Real-Time Backend Execution

```typescript
// In multi-step-orchestrator.ts - Key improvement
async executeSteps(state, steps, streamController, sessionId) {
  // Emit step definition ONLY when it's about to start (real-time)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Emit step start just before execution
    this.emitToStream(streamController, MULTI_STEP_CONTROL_TOKENS.STEP_START(step.id, step.name));

    // Execute step with real-time progress
    const result = await stepExecutor(state, step, context, onProgress);

    // Handle required step failures
    if (result.status === "failed" && step.required) {
      const failureMessage = `There are conflicts in the time you suggested. Would you like to try a different time for that day?`;

      this.emitToStream(streamController, MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE());
      this.emitToStream(streamController, MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage));
      return context; // Stop process, don't throw error
    }
  }
}
```

### Smart Date Parsing

```typescript
// In index.ts - Intelligent date parsing
function parseDateTimeFromMessage(
  message: string,
  timezone: string
): Date | null {
  const lowerMessage = message.toLowerCase();

  // Parse day of week
  const dayPatterns = [
    { pattern: /monday|mon/i, dayOffset: 1 },
    { pattern: /tuesday|tue/i, dayOffset: 2 },
    { pattern: /wednesday|wed/i, dayOffset: 3 },
    // ... etc
  ];

  // Parse time patterns
  const timePatterns = [
    /(\d{1,2}):(\d{2})/, // 14:00, 2:30
    /(\d{1,2})\s*(am|pm)/i, // 2pm, 2:30pm
    /(\d{1,2})\s*(\d{2})\s*(am|pm)/i, // 2 30pm
  ];

  // Calculate target date and time
  // ... implementation details
}
```

### Separate Message Handling

```typescript
// In DelegationChat.tsx - Natural conversation flow
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

### Real-Time Frontend Processing

```typescript
// In useMultiStepParser.ts - Immediate processing
const parseControlTokens = (chunk: string) => {
  const updates: ParsedUpdate[] = [];

  // Parse all control token patterns
  Object.entries(CONTROL_TOKEN_PATTERNS).forEach(([type, pattern]) => {
    const matches = chunk.matchAll(pattern);
    for (const match of matches) {
      updates.push(parseUpdate(type, match));
    }
  });

  // Process ALL updates immediately for real-time sync
  if (hasInitiation || aiInitiated || hasStepUpdates) {
    processUpdatesImmediately(updates);
  }
};
```

### Cinematic Minimum Duration

```typescript
// In MultiStepMessage.tsx - Smooth animations
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

## 🎯 Critical Fixes

### 1. **Real-Time Action-Driven Steps**

**Problem**: Steps were pre-rendered in a "cinematic show" instead of reflecting actual backend operations.

**Solution**:

- Emit `STEP_START` tokens just before step execution
- Process all updates immediately in frontend
- Sync UI state with actual backend events

### 2. **Separate Chat Messages**

**Problem**: User-friendly messages were mixed with debug text in the multi-step component.

**Solution**:

- Introduce `SEPARATE_MESSAGE` control token
- Create distinct chat bubbles for user communication
- Enable natural conversation flow

### 3. **Smart Date Parsing**

**Problem**: System always used hardcoded "tomorrow at 2 PM" regardless of user input.

**Solution**:

- Implement intelligent date/time parsing
- Support multiple formats and day recognition
- Parse user-specified dates correctly

### 4. **Error Handling & Stopping**

**Problem**: System continued to next steps even when required steps failed.

**Solution**:

- Stop process immediately on required step failure
- Emit user-friendly failure message
- Don't throw errors that generate debug text

### 5. **Clean UI Output**

**Problem**: Debug text and raw messages appeared in the UI component.

**Solution**:

- Remove all raw text emissions from orchestrator
- Only emit control tokens and separate messages
- Keep UI component clean and focused

## 🚀 Usage Examples

### Example 1: Successful Scheduling

**User**: "i want a meeting with Aviad on Wednesday at 14:00"

**Flow**:

1. AI detects multi-step intent
2. Parses "Wednesday at 14:00" → Next Wednesday at 2 PM
3. Shows multi-step UI wrapper
4. Step 1: "Check Availability" → ✅ Available
5. Step 2: "Schedule Meeting" → ✅ Scheduled
6. Separate message: "Perfect! I've scheduled your meeting with Aviad for Wednesday at 2 PM."

### Example 2: Conflict Detection

**User**: "i want a meeting with Aviad tomorrow at 2pm"

**Flow**:

1. AI detects multi-step intent
2. Parses "tomorrow at 2pm" → Tomorrow at 2 PM
3. Shows multi-step UI wrapper
4. Step 1: "Check Availability" → ❌ Conflicts found
5. Process stops (no Step 2)
6. Separate message: "There are conflicts in the time you suggested. Would you like to try a different time for that day?"

### Example 3: Different Day Success

**User**: "i want a meeting with Aviad on Tuesday at 3pm"

**Flow**:

1. AI detects multi-step intent
2. Parses "Tuesday at 3pm" → Next Tuesday at 3 PM
3. Shows multi-step UI wrapper
4. Step 1: "Check Availability" → ✅ Available (different day)
5. Step 2: "Schedule Meeting" → ✅ Scheduled
6. Separate message: "Great! I've scheduled your meeting with Aviad for Tuesday at 3 PM."

## 🎨 UI/UX Features

### Real-Time Visual Feedback

- **Step Status Icons**:

  - ⚪ Pending (gray circle)
  - 🔄 Processing (spinning loader)
  - ✅ Completed (green checkmark)
  - ❌ Failed (red X)

- **Progress Bar**: Real-time progress with color coding
- **Status Text**: Live updates from backend operations
- **Celebration Mode**: Sparkles and success animations

### Cinematic Effects

- **Minimum Duration**: Steps visible for at least 1.5 seconds
- **Smooth Transitions**: Fade-in/out animations
- **Emotional Design**: Color-coded status with appropriate icons
- **Glassmorphism**: Modern glass effect with backdrop blur

### Natural Conversation

- **Separate Messages**: User-friendly chat bubbles
- **Conversation Flow**: Natural back-and-forth interaction
- **Context Preservation**: Multi-step doesn't break chat flow
- **Error Communication**: Clear, conversational error messages

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

## 🎯 Success Metrics

### Technical Performance

- **Real-Time Sync**: UI updates within 100ms of backend events
- **Step Completion**: >95% of steps complete successfully
- **Error Handling**: 100% of failures handled gracefully
- **Date Parsing**: >90% accuracy on user-specified dates

### User Experience

- **Engagement**: Increased interaction with multi-step processes
- **Completion**: Higher task completion rates
- **Satisfaction**: Positive feedback on transparency and real-time updates
- **Conversation Flow**: Natural chat interaction maintained

---

**This implementation guide reflects the current state of the multi-step messaging system. The system now provides a real-time, action-driven experience with natural conversation flow and intelligent date parsing.**
