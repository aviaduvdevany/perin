# Integration Error Handling Refactor

## 🎯 Problem Solved

Before this refactor, we had repetitive, hard-coded error checking scattered throughout the codebase:

### Before: Repetitive & Hard-Coded

```typescript
// In orchestrator
if (
  toolError instanceof Error &&
  (toolError.message.includes("CALENDAR_REAUTH_REQUIRED") ||
    toolError.message.includes("CALENDAR_NOT_CONNECTED"))
) {
  controller.enqueue(
    new TextEncoder().encode("[[PERIN_ACTION:calendar_reauth_required]]")
  );
}
if (
  toolError instanceof Error &&
  (toolError.message.includes("GMAIL_REAUTH_REQUIRED") ||
    toolError.message.includes("GMAIL_NOT_CONNECTED"))
) {
  controller.enqueue(
    new TextEncoder().encode("[[PERIN_ACTION:gmail_reauth_required]]")
  );
}

// In scheduling
if (
  error instanceof Error &&
  (error.message.includes("CALENDAR_REAUTH_REQUIRED") ||
    error.message.includes("CALENDAR_NOT_CONNECTED"))
) {
  if (currentUserId && failedUserId === currentUserId) {
    throw error; // Bubble up for current user
  } else {
    return { busy: [] }; // Handle gracefully for other users
  }
}

// In tool executor
if (
  error instanceof Error &&
  (error.message.includes("CALENDAR_REAUTH_REQUIRED") ||
    error.message.includes("CALENDAR_NOT_CONNECTED") ||
    error.message.includes("GMAIL_REAUTH_REQUIRED") ||
    error.message.includes("GMAIL_NOT_CONNECTED"))
) {
  throw error;
}
```

### After: Centralized & Scalable

```typescript
// In orchestrator
const actionToken = getErrorActionToken(toolError);
if (actionToken) {
  controller.enqueue(new TextEncoder().encode(actionToken));
}

// In scheduling
const busyA = await withIntegrationErrorHandling(
  () =>
    getCalendarAvailability(
      userAId,
      window.start.toISOString(),
      window.end.toISOString()
    ),
  {
    currentUserId,
    operationUserId: userAId,
    allowGracefulDegradation: true,
    defaultValue: { busy: [] },
  }
);

// In tool executor (can be simplified using the same pattern)
if (isReauthError(error)) {
  throw error;
}
```

## 🏗️ New Architecture

### 1. `IntegrationError` Class

- **Type-safe error handling** with enum-based error types
- **Automatic action token generation** for frontend
- **Context-aware behavior** (reauth vs. graceful degradation)
- **Legacy error conversion** for backward compatibility

### 2. Centralized Error Handler

- **Context-aware decisions** based on current user vs. operation user
- **Configurable graceful degradation** with fallback values
- **Simplified async wrapper** for common patterns
- **Consistent logging** and error reporting

### 3. Integration Types (Future-Ready)

```typescript
enum IntegrationType {
  CALENDAR = "calendar",
  GMAIL = "gmail",
  SLACK = "slack", // ← Easy to add
  NOTION = "notion", // ← Easy to add
  ZOOM = "zoom", // ← Easy to add
  TEAMS = "teams", // ← Easy to add
}
```

## 📈 Benefits

### Maintainability

- ✅ **One place to add new integrations** - just add to enum
- ✅ **No scattered error checking** - centralized logic
- ✅ **Consistent behavior** across all integration types

### Scalability

- ✅ **Auto-generated action tokens** for new integrations
- ✅ **Context-aware error handling** works for any integration
- ✅ **Easy to add new error types** (rate limits, scope issues, etc.)

### Developer Experience

- ✅ **Type safety** with TypeScript enums and classes
- ✅ **Simple API** - one function call instead of complex if/else chains
- ✅ **Better error messages** with structured information

### User Experience

- ✅ **Granular reauth flows** - only current user sees reauth UI
- ✅ **Graceful degradation** - features work even when integrations fail
- ✅ **Consistent UI behavior** across all integration types

## 🔄 Migration Strategy

The new system includes **backward compatibility**:

- `IntegrationError.fromLegacyError()` converts old error formats
- Existing error checking still works during transition
- Can migrate gradually, one component at a time

## 🚀 Next Steps

1. **Migrate remaining components** to use new error handling
2. **Update calendar/gmail clients** to throw `IntegrationError` instead of legacy errors
3. **Add new integration types** (Slack, Notion, etc.) using the new system
4. **Remove legacy error checking** once migration is complete

## 📝 Usage Examples

### Adding a New Integration

```typescript
// 1. Add to enum
enum IntegrationType {
  SLACK = "slack",
}

// 2. Throw structured errors
throw createIntegrationError(
  IntegrationType.SLACK,
  IntegrationErrorType.REAUTH_REQUIRED,
  "Slack token expired"
);

// 3. Use in scheduling/operations
const slackData = await withIntegrationErrorHandling(
  () => getSlackMessages(userId),
  {
    currentUserId,
    operationUserId: userId,
    allowGracefulDegradation: true,
    defaultValue: [],
  }
);
```

### Frontend Action Tokens

The system automatically generates the correct action tokens:

- `[[PERIN_ACTION:calendar_reauth_required]]`
- `[[PERIN_ACTION:gmail_reauth_required]]`
- `[[PERIN_ACTION:slack_reauth_required]]` ← Automatic for new integrations

This refactor eliminates the need to manually maintain error checking code as we add more integrations! 🎉
