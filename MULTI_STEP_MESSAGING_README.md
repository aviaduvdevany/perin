# 🔄 Multi-Step Messaging System

> A comprehensive plan for implementing multi-step messaging across the Perin app, enabling step-by-step interactions with intermediate feedback and better user experience.

## 📋 Table of Contents

- [Overview](#overview)
- [Current State Analysis](#current-state-analysis)
- [Proposed Architecture](#proposed-architecture)
- [Implementation Plan](#implementation-plan)
- [Technical Requirements](#technical-requirements)
- [Migration Strategy](#migration-strategy)
- [Benefits & Use Cases](#benefits--use-cases)

## 🎯 Overview

The multi-step messaging system will enable Perin to send multiple messages to users in sequence without requiring user input between steps. This creates a more natural, conversational experience where users can see the AI's thought process and progress through complex tasks.

### Key Benefits

- **Better UX**: Users see step-by-step progress instead of waiting for final results
- **Transparency**: Clear visibility into what Perin is doing
- **Error Handling**: Graceful handling of failures at each step
- **Consistency**: Unified experience across all chat interfaces
- **Scalability**: Framework for complex multi-step workflows

## 🔍 Current State Analysis

### Existing Infrastructure

#### ✅ **What We Have:**

1. **LangGraph System**: Planner → Executor → Responder workflow
2. **Streaming Responses**: Real-time text streaming to frontend
3. **Tool Execution**: Parallel tool execution with results
4. **Control Tokens**: `[[PERIN_ACTION:...]]` for UI actions
5. **Multiple Chat Interfaces**: Main chat, mobile chat, delegation chat

#### ❌ **What's Missing:**

1. **Multi-Message Support**: Can only send one final response
2. **Intermediate Feedback**: No way to show progress between steps
3. **Step-by-Step UI**: Frontend doesn't support multiple sequential messages
4. **State Management**: No way to track multi-step progress
5. **Error Recovery**: Can't handle failures at intermediate steps

### Current Limitations

```typescript
// Current: Single response only
const response = await sendMessage(messages);
// Returns: One final message

// Desired: Multiple sequential messages
const responses = await sendMultiStepMessage(messages);
// Returns: ["Step 1: Checking availability...", "Step 2: Scheduling meeting...", "Step 3: Confirmation"]
```

## 🏗️ Proposed Architecture

### High-Level Design

```
User Request → Multi-Step Orchestrator → Step 1 → Step 2 → Step 3 → Final Response
                ↓
            [Progress Messages]
                ↓
            [Tool Execution]
                ↓
            [Intermediate Feedback]
                ↓
            [Next Step Decision]
```

### Core Components

#### 1. **Multi-Step Orchestrator**

```typescript
interface MultiStepOrchestrator {
  executeSteps(steps: Step[]): Promise<StepResult[]>;
  sendProgressMessage(message: string): void;
  handleStepFailure(step: Step, error: Error): void;
  continueOrAbort(): boolean;
}
```

#### 2. **Step Definition**

```typescript
interface Step {
  id: string;
  name: string;
  description: string;
  execute: (context: StepContext) => Promise<StepResult>;
  onProgress?: (message: string) => void;
  onError?: (error: Error) => void;
  required?: boolean;
}
```

#### 3. **Enhanced LangGraph State**

```typescript
interface EnhancedLangGraphState extends LangGraphChatState {
  multiStepContext?: {
    currentStep: number;
    totalSteps: number;
    stepResults: StepResult[];
    progressMessages: string[];
    shouldContinue: boolean;
  };
}
```

## 📋 Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 **Enhanced LangGraph System**

- [ ] Modify `LangGraphChatState` to support multi-step context
- [ ] Create `MultiStepOrchestrator` class
- [ ] Add step execution pipeline
- [ ] Implement progress message handling

#### 1.2 **Streaming Protocol Enhancement**

- [ ] Define new control tokens for multi-step messages
- [ ] Implement `[[PERIN_STEP:start]]` and `[[PERIN_STEP:end]]`
- [ ] Add `[[PERIN_PROGRESS:message]]` for intermediate updates
- [ ] Create `[[PERIN_STEP_RESULT:success|failure]]` for step outcomes

#### 1.3 **Backend API Changes**

- [ ] Modify `/api/ai/chat` to support multi-step execution
- [ ] Update `/api/delegation/chat` for multi-step delegation
- [ ] Add step result aggregation
- [ ] Implement error recovery mechanisms

### Phase 2: Frontend Integration (Week 2)

#### 2.1 **Enhanced Chat Components**

- [ ] Update `PerinChat.tsx` for multi-step message display
- [ ] Modify `MobilePerinChat.tsx` for mobile multi-step support
- [ ] Update `DelegationChat.tsx` for delegation multi-step
- [ ] Add progress indicators and step visualization

#### 2.2 **Message Rendering System**

- [ ] Create `MultiStepMessage` component
- [ ] Implement step-by-step message display
- [ ] Add progress bars and status indicators
- [ ] Handle step failures gracefully

#### 2.3 **State Management**

- [ ] Add multi-step state to chat contexts
- [ ] Implement step progress tracking
- [ ] Add pause/resume functionality
- [ ] Handle user interruptions

### Phase 3: Tool Integration (Week 3)

#### 3.1 **Enhanced Tool System**

- [ ] Modify tool execution to support step-by-step feedback
- [ ] Add progress callbacks to tool handlers
- [ ] Implement tool result streaming
- [ ] Add tool-specific progress messages

#### 3.2 **Delegation Tool Enhancement**

- [ ] Split `delegation_check_availability` into separate steps
- [ ] Add intermediate feedback for availability checking
- [ ] Implement step-by-step scheduling
- [ ] Add error recovery for each step

#### 3.3 **Integration Tools**

- [ ] Add progress feedback to calendar operations
- [ ] Implement step-by-step email processing
- [ ] Add network operation progress
- [ ] Create notification step feedback

### Phase 4: Advanced Features (Week 4)

#### 4.1 **User Control**

- [ ] Add "Skip Step" functionality
- [ ] Implement "Retry Step" capability
- [ ] Add step-by-step confirmation
- [ ] Create step preview mode

#### 4.2 **Analytics & Monitoring**

- [ ] Track step completion rates
- [ ] Monitor step failure patterns
- [ ] Add performance metrics
- [ ] Implement step optimization

#### 4.3 **Advanced Orchestration**

- [ ] Add conditional step execution
- [ ] Implement parallel step execution
- [ ] Add step dependencies
- [ ] Create step templates

## 🔧 Technical Requirements

### Backend Requirements

#### 1. **Enhanced Streaming Protocol**

```typescript
// New control tokens
const CONTROL_TOKENS = {
  STEP_START: "[[PERIN_STEP:start:${stepId}:${stepName}]]",
  STEP_PROGRESS: "[[PERIN_PROGRESS:${message}]]",
  STEP_RESULT: "[[PERIN_STEP_RESULT:${stepId}:${status}:${result}]]",
  STEP_END: "[[PERIN_STEP:end:${stepId}]]",
  MULTI_STEP_COMPLETE: "[[PERIN_MULTI_STEP:complete]]",
};
```

#### 2. **Multi-Step State Management**

```typescript
interface MultiStepContext {
  sessionId: string;
  currentStep: number;
  totalSteps: number;
  steps: StepDefinition[];
  results: StepResult[];
  progressMessages: ProgressMessage[];
  status: "running" | "paused" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. **Enhanced LangGraph Integration**

```typescript
// Modified LangGraph workflow
const enhancedLangGraphWorkflow = {
  planner: async (state) => {
    // Analyze intent and create step plan
    return { steps: generateStepPlan(state) };
  },
  executor: async (state) => {
    // Execute steps with progress feedback
    return { results: await executeSteps(state.steps) };
  },
  responder: async (state) => {
    // Generate final response with step summary
    return { response: generateStepSummary(state.results) };
  },
};
```

### Frontend Requirements

#### 1. **Enhanced Message Types**

```typescript
interface MultiStepMessage extends ChatMessage {
  type: "multi-step";
  steps: StepMessage[];
  currentStep: number;
  totalSteps: number;
  status: "running" | "completed" | "failed";
}

interface StepMessage {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: string;
  result?: any;
  error?: string;
}
```

#### 2. **Multi-Step UI Components**

```typescript
// New components needed
-MultiStepMessage.tsx -
  StepProgress.tsx -
  StepIndicator.tsx -
  ProgressBar.tsx -
  StepControls.tsx;
```

#### 3. **Enhanced State Management**

```typescript
interface ChatState {
  messages: ChatMessage[];
  multiStepContext?: {
    activeSession?: string;
    currentStep?: number;
    totalSteps?: number;
    canSkip?: boolean;
    canRetry?: boolean;
  };
}
```

## 🔄 Migration Strategy

### Phase 1: Backward Compatibility

- [ ] Keep existing single-response API working
- [ ] Add multi-step as opt-in feature
- [ ] Implement feature flags for gradual rollout
- [ ] Maintain existing control tokens

### Phase 2: Gradual Migration

- [ ] Migrate delegation feature first (smaller scope)
- [ ] Add multi-step to main chat interface
- [ ] Update mobile interface
- [ ] Migrate existing tools to support steps

### Phase 3: Full Implementation

- [ ] Enable multi-step by default
- [ ] Deprecate single-response mode
- [ ] Optimize performance
- [ ] Add advanced features

## 🎯 Benefits & Use Cases

### Primary Use Cases

#### 1. **Delegation Scheduling**

```
Step 1: "Let me check Aviad's availability for tomorrow at 13:00..."
Step 2: "Great! The time is available. Let me schedule the meeting..."
Step 3: "Perfect! I've scheduled your 30-minute meeting with Aviad."
```

#### 2. **Complex Calendar Operations**

```
Step 1: "I'll check your calendar for conflicts..."
Step 2: "Found 2 potential conflicts. Let me find alternative times..."
Step 3: "Here are 3 available slots. Let me propose the best one..."
Step 4: "Meeting scheduled! I've sent invitations to all attendees."
```

#### 3. **Email Processing**

```
Step 1: "I'll analyze your recent emails for important messages..."
Step 2: "Found 3 urgent emails. Let me summarize them..."
Step 3: "Here's what needs your attention..."
```

#### 4. **Network Negotiations**

```
Step 1: "I'll check both parties' availability..."
Step 2: "Found overlapping free time. Let me propose options..."
Step 3: "Sending meeting proposal to all participants..."
Step 4: "Meeting confirmed! All parties have accepted."
```

### Secondary Benefits

- **Better Error Handling**: Users see exactly where things fail
- **Improved Trust**: Transparency builds user confidence
- **Reduced Anxiety**: Users know something is happening
- **Better Debugging**: Easier to identify issues
- **Enhanced Analytics**: Detailed step completion data

## 🚀 Implementation Priority

### High Priority (Week 1-2)

1. **Delegation Feature**: Fix current scheduling issues
2. **Core Infrastructure**: Multi-step orchestrator
3. **Basic UI**: Step-by-step message display

### Medium Priority (Week 3-4)

1. **Main Chat Integration**: Apply to primary chat interface
2. **Tool Enhancement**: Add progress to all tools
3. **Error Recovery**: Robust failure handling

### Low Priority (Future)

1. **Advanced Features**: Conditional steps, parallel execution
2. **Analytics**: Step performance optimization
3. **Templates**: Reusable step workflows

## 📊 Success Metrics

### Technical Metrics

- **Step Completion Rate**: >95% of steps complete successfully
- **User Satisfaction**: Improved chat experience ratings
- **Error Reduction**: Fewer failed operations
- **Performance**: <2s average step execution time

### User Experience Metrics

- **Engagement**: Increased message interaction
- **Completion**: Higher task completion rates
- **Feedback**: Positive user feedback on transparency
- **Retention**: Improved user retention

---

**This document serves as the implementation guide for the multi-step messaging system. The system will transform Perin from a single-response AI to a conversational, step-by-step assistant that provides transparency and better user experience across all interactions.**
