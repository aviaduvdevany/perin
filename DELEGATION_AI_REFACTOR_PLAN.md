# Delegation AI Refactor Plan

## Overview

Transform the current unified delegation analyzer into a complete Delegation AI system that acts as Perin on behalf of the owner for external users. This refactor will create a clean separation between regular Perin AI and Delegation AI, making the system more modular, maintainable, and user-friendly.

## Current State Analysis

### Files Currently Handling Delegation:

1. **`src/lib/ai/analysis/unified-delegation-analyzer.ts`** - Core analysis logic
2. **`src/lib/ai/langgraph/index.ts`** - Integration with LangGraph
3. **`src/lib/ai/langgraph/nodes/openai-node.ts`** - System prompts with delegation conditions
4. **`src/lib/ai/langgraph/nodes/tool-executor-node.ts`** - Tool restrictions for delegation
5. **`src/lib/ai/langgraph/orchestrator/delegation-step-executors.ts`** - Multi-step delegation flow
6. **`src/lib/ai/langgraph/orchestrator/multi-step-orchestrator.ts`** - Orchestration logic
7. **`src/app/(main-app)/api/delegation/chat/route.ts`** - API endpoint for delegation
8. **`src/types/ai.ts`** - Type definitions

### Current Issues:

- Delegation logic mixed with regular Perin AI
- System prompts contain delegation conditions
- Tool restrictions hardcoded in executor
- Unified analyzer only handles structured analysis, not conversational responses
- No clear separation of concerns

## Goals

### Primary Objectives:

1. **Create dedicated Delegation AI** that embodies Perin's personality for external users
2. **Clean separation** between regular Perin and Delegation Perin
3. **Single LLM call** handles both analysis and conversational response
4. **Modular architecture** with clear boundaries
5. **Enhanced user experience** with natural, personality-driven responses

### User Experience Vision:

```
Current: "The user clearly expresses intent to schedule..." (robotic analysis)
Target:  "I'd be happy to help you schedule that meeting with David! Let me check his calendar..." (natural Perin response)
```

## Architecture Changes

### New File Structure:

```
src/lib/ai/delegation/
├── core/
│   ├── delegation-ai.ts              # Main Delegation AI class (NEW)
│   ├── delegation-prompts.ts         # Delegation-specific prompts (NEW)
│   └── delegation-types.ts           # Delegation-specific types (NEW)
├── orchestrator/
│   ├── delegation-orchestrator.ts    # Delegation flow orchestrator (MOVED)
│   └── delegation-executors.ts       # Step executors (MOVED)
├── tools/
│   └── delegation-tools.ts           # Delegation-specific tools (MOVED)
└── index.ts                         # Main exports (NEW)
```

### Removed/Modified Files:

- **DELETE**: `src/lib/ai/analysis/unified-delegation-analyzer.ts`
- **MODIFY**: `src/lib/ai/langgraph/index.ts` - Remove delegation logic
- **MODIFY**: `src/lib/ai/langgraph/nodes/openai-node.ts` - Remove delegation conditions
- **MODIFY**: `src/lib/ai/langgraph/nodes/tool-executor-node.ts` - Remove delegation restrictions
- **MOVE**: Delegation orchestrator files to new delegation folder

## Implementation Plan

### Phase 1: Create New Delegation AI Core (2-3 hours)

#### 1.1 Create Delegation AI Class

**File**: `src/lib/ai/delegation/core/delegation-ai.ts`

```typescript
export interface DelegationResponse {
  // Analysis data (for multi-step flow)
  analysis: {
    requiresScheduling: boolean;
    confidence: number;
    reasoning: string;
    timeAnalysis?: TimeAnalysis;
    meetingContext?: MeetingContext;
  };

  // Perin's conversational response
  perinResponse: string;

  // Contextual messages for multi-step flow
  contextualMessages?: ContextualMessages;

  // Metadata
  method: "unified" | "fallback";
  processingTime: number;
}

export class DelegationAI {
  private openaiClient: OpenAI;

  constructor() {
    this.openaiClient = initializeOpenAI();
  }

  async processMessage(
    message: string,
    context: DelegationContext
  ): Promise<DelegationResponse> {
    // Single LLM call that returns both analysis and Perin's response
  }

  private buildDelegationPrompt(
    message: string,
    context: DelegationContext
  ): string {
    // Comprehensive prompt that makes LLM act as Perin
  }
}
```

#### 1.2 Create Delegation-Specific Types

**File**: `src/lib/ai/delegation/core/delegation-types.ts`

```typescript
export interface DelegationContext {
  delegationId: string;
  ownerName: string;
  ownerTimezone: string;
  externalUserName?: string;
  externalUserTimezone?: string;
  constraints?: Record<string, unknown>;
  conversationHistory?: string;
  perinPersonality: {
    name: string;
    tone: string;
    communicationStyle: string;
    language: string;
  };
}

// Other delegation-specific types...
```

#### 1.3 Create Delegation Prompts

**File**: `src/lib/ai/delegation/core/delegation-prompts.ts`

```typescript
export const buildDelegationPrompt = (
  message: string,
  context: DelegationContext
): string => {
  return `You are ${context.perinPersonality.name}, ${
    context.ownerName
  }'s AI assistant.

You are currently helping ${
    context.externalUserName || "a visitor"
  } schedule a meeting with ${context.ownerName}.

CRITICAL INSTRUCTIONS:
1. Act as ${context.ownerName}'s representative - warm, professional, helpful
2. Respond in the SAME language as the user's message
3. Provide both analysis AND a natural conversational response
4. Embody ${context.perinPersonality.name}'s personality fully

RESPONSE FORMAT:
{
  "analysis": {
    "requiresScheduling": boolean,
    "confidence": number,
    "reasoning": "technical analysis",
    "timeAnalysis": { ... },
    "meetingContext": { ... }
  },
  "perinResponse": "Natural, personality-driven response to the user",
  "contextualMessages": {
    "availabilityConfirmed": "...",
    "meetingScheduled": "...",
    // ... other contextual messages
  }
}

USER MESSAGE: "${message}"
`;
};
```

### Phase 2: Update API and Integration Layer (1-2 hours)

#### 2.1 Update Delegation Chat API

**File**: `src/app/(main-app)/api/delegation/chat/route.ts`

```typescript
import { DelegationAI } from "@/lib/ai/delegation";

// Replace unifiedDelegationAnalyzer with DelegationAI
const delegationAI = new DelegationAI();

const response = await delegationAI.processMessage(message, {
  delegationId: session.id,
  ownerName: ownerData.name, // Get from user data
  ownerTimezone: ownerData.timezone,
  externalUserName,
  externalUserTimezone: timezone,
  constraints: session.constraints,
  perinPersonality: {
    name: ownerData.perinName || "Perin",
    tone: ownerData.tone || "friendly",
    communicationStyle: ownerData.communicationStyle || "warm",
    language: "auto",
  },
});

// Handle both multi-step and direct responses
if (response.analysis.requiresScheduling) {
  // Use delegation orchestrator with contextual messages
} else {
  // Stream perinResponse directly
}
```

#### 2.2 Create Delegation-Specific LangGraph Flow

**File**: `src/lib/ai/delegation/core/delegation-langgraph.ts`

```typescript
export const executeDelegationChat = async (
  message: string,
  context: DelegationContext
): Promise<ReadableStream> => {
  const delegationAI = new DelegationAI();

  // Single entry point for all delegation chat
  const response = await delegationAI.processMessage(message, context);

  if (response.analysis.requiresScheduling) {
    // Multi-step flow
    return await executeDelegationMultiStep(response, context);
  } else {
    // Direct response
    return createDirectResponseStream(response.perinResponse);
  }
};
```

### Phase 3: Move and Clean Orchestrator (1 hour)

#### 3.1 Move Delegation Orchestrator

**From**: `src/lib/ai/langgraph/orchestrator/delegation-step-executors.ts`
**To**: `src/lib/ai/delegation/orchestrator/delegation-executors.ts`

#### 3.2 Move Multi-Step Logic

**From**: `src/lib/ai/langgraph/orchestrator/multi-step-orchestrator.ts`
**To**: `src/lib/ai/delegation/orchestrator/delegation-orchestrator.ts`

#### 3.3 Update Orchestrator to Use DelegationAI

```typescript
// Use contextual messages from DelegationAI response
// Remove all delegation-specific logic from main LangGraph
```

### Phase 4: Clean Regular Perin AI (1 hour)

#### 4.1 Remove Delegation Logic from LangGraph

**File**: `src/lib/ai/langgraph/index.ts`

```typescript
// Remove performUnifiedDelegationAnalysis function
// Remove delegation-specific conditions
// Simplify main execution flow
```

#### 4.2 Clean System Prompts

**File**: `src/lib/ai/langgraph/nodes/openai-node.ts`

```typescript
// Remove delegation conditions from buildSystemPrompt
// Clean up delegation-specific restrictions
```

#### 4.3 Clean Tool Executor

**File**: `src/lib/ai/langgraph/nodes/tool-executor-node.ts`

```typescript
// Remove delegation tool restrictions
// Delegation tools will be handled by delegation-specific executor
```

### Phase 5: Update Types and Exports (30 minutes)

#### 5.1 Update Type Definitions

**File**: `src/types/ai.ts`

```typescript
// Remove delegation-specific types
// Keep only regular Perin AI types
```

#### 5.2 Create Delegation Index

**File**: `src/lib/ai/delegation/index.ts`

```typescript
export { DelegationAI } from "./core/delegation-ai";
export { executeDelegationChat } from "./core/delegation-langgraph";
export type {
  DelegationContext,
  DelegationResponse,
} from "./core/delegation-types";
```

#### 5.3 Update Main API Routes

Update import paths to use new delegation module

## Testing Strategy

### Phase 1 Testing:

- [ ] DelegationAI returns proper JSON structure
- [ ] Handles both scheduling and non-scheduling intents
- [ ] Generates natural conversational responses
- [ ] Properly embeds owner personality

### Phase 2 Testing:

- [ ] API correctly routes to DelegationAI
- [ ] Multi-step flow works with new response format
- [ ] Direct responses stream correctly
- [ ] Contextual messages work in Hebrew/English

### Phase 3 Testing:

- [ ] Moved orchestrator functions correctly
- [ ] Multi-step progress messages use DelegationAI responses
- [ ] No regression in multi-step functionality

### Phase 4 Testing:

- [ ] Regular Perin AI works without delegation logic
- [ ] No delegation conditions leak into regular chat
- [ ] Performance maintained or improved

### Integration Testing:

- [ ] Delegation chat works end-to-end
- [ ] Regular chat works end-to-end
- [ ] No cross-contamination between modes

## Migration Checklist

### Pre-Migration:

- [ ] Backup current working delegation flow
- [ ] Document current behavior for regression testing
- [ ] Identify all delegation touchpoints

### During Migration:

- [ ] Phase 1: Create delegation AI core ✓
- [ ] Phase 2: Update API integration ✓
- [ ] Phase 3: Move orchestrator logic ✓
- [ ] Phase 4: Clean regular Perin AI ✓
- [ ] Phase 5: Update types and exports ✓

### Post-Migration:

- [ ] Run full test suite
- [ ] Verify delegation chat works with Hebrew/English
- [ ] Verify regular chat is unaffected
- [ ] Performance testing
- [ ] Clean up old files

## Benefits After Implementation

### For External Users:

- Natural, personality-driven interactions with Perin
- Seamless scheduling experience
- Proper language matching and cultural adaptation

### For Developers:

- Clear separation of concerns
- Modular, testable code
- Easier to maintain and extend
- No more delegation conditions scattered throughout codebase

### For System:

- Single LLM call for delegation (faster, cheaper)
- Cleaner architecture
- Better error handling and fallbacks
- Scalable for future delegation features

## Risk Mitigation

### High-Risk Areas:

1. **LLM Response Format**: New JSON structure might break
   - **Mitigation**: Comprehensive testing, fallback parsing
2. **Multi-Step Integration**: Orchestrator changes might break flow
   - **Mitigation**: Move logic gradually, maintain interfaces
3. **Regular Perin Regression**: Removing delegation logic might break regular chat
   - **Mitigation**: Thorough testing, feature flags for rollback

### Low-Risk Areas:

- Type definitions (easily reversible)
- File moves (git tracks moves)
- Import path updates (IDE will catch these)

## Timeline

**Total Estimated Time: 5-7 hours**

- **Phase 1**: 2-3 hours (Core delegation AI development)
- **Phase 2**: 1-2 hours (API integration updates)
- **Phase 3**: 1 hour (Move orchestrator logic)
- **Phase 4**: 1 hour (Clean regular Perin AI)
- **Phase 5**: 30 minutes (Types and exports)
- **Testing**: 1-2 hours throughout each phase

## Success Criteria

### Functional:

- ✅ Delegation chat provides natural, personality-driven responses
- ✅ Both Hebrew and English work seamlessly
- ✅ Multi-step scheduling flow works with contextual messages
- ✅ Regular Perin AI is unaffected by changes
- ✅ No regression in existing functionality

### Technical:

- ✅ Clean separation between delegation and regular AI
- ✅ Modular, maintainable code structure
- ✅ Single LLM call for delegation analysis + response
- ✅ No delegation logic in regular Perin codebase
- ✅ Clear error handling and fallbacks

### Performance:

- ✅ Faster delegation responses (single LLM call)
- ✅ Reduced token usage
- ✅ No performance regression in regular chat

This refactor will transform the delegation experience from a clinical analysis tool into a warm, natural conversation with Perin acting as the owner's representative - exactly as envisioned.
