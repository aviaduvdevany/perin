# Google OAuth Scopes Audit

## Executive Summary

**Current Status**: ❌ **OVER-PERMISSIVE SCOPES DETECTED**

The codebase currently requests broader Google OAuth scopes than necessary for the actual functionality implemented. This violates the principle of least privilege and may cause issues with Google OAuth verification.

## Current Scope Usage

### 1. Gmail Integration

**Current Scopes Requested:**

```typescript
// Multiple locations requesting gmail.modify
"https://www.googleapis.com/auth/gmail.modify";
```

**Files Using This Scope:**

- `src/lib/integrations/gmail/auth.ts:5`
- `src/lib/integrations/oauth2-manager.ts:146`
- `src/lib/integrations/registry.ts:129,157`
- `src/app/api/integrations/gmail/callback/route.ts:47,103`

**What `gmail.modify` Allows:**

- ✅ Read messages (`gmail.users.messages.list`, `gmail.users.messages.get`)
- ✅ Send messages (`gmail.users.messages.send`)
- ❌ **Modify messages** (delete, mark as read/unread, add/remove labels)
- ❌ **Delete messages**
- ❌ **Modify labels**

**Actual Operations Performed:**

- ✅ `gmail.users.messages.list()` - List messages
- ✅ `gmail.users.messages.get()` - Get message content
- ❌ **NO SEND OPERATIONS IMPLEMENTED**
- ❌ **NO MODIFY OPERATIONS IMPLEMENTED**
- ❌ **NO DELETE OPERATIONS IMPLEMENTED**

### 2. Google Calendar Integration

**Current Scopes Requested:**

```typescript
"https://www.googleapis.com/auth/calendar.readonly";
"https://www.googleapis.com/auth/calendar.events";
```

**Files Using These Scopes:**

- `src/lib/integrations/calendar/auth.ts:39-40`
- `src/lib/integrations/oauth2-manager.ts:155-156`
- `src/lib/integrations/registry.ts:193-194,227-228`

**What These Scopes Allow:**

- ✅ `calendar.readonly` - Read calendar metadata and events
- ✅ `calendar.events` - Create, update, delete calendar events

**Actual Operations Performed:**

- ✅ Read calendar events (via `calendar.events.list()`)
- ✅ Create calendar events (when user requests scheduling)
- ✅ Update/delete events (when user requests changes)

**Status**: ✅ **APPROPRIATE** - Calendar scopes match actual usage

## Issues Identified

### 1. Gmail Scope Too Broad

**Problem**: Using `gmail.modify` when only read operations are implemented.

**Evidence**:

- No `gmail.users.messages.send()` calls found in codebase
- No message modification operations found
- No label operations found
- Only read operations: `list()` and `get()`

**Risk**:

- Google OAuth verification may reject the application
- Violates principle of least privilege
- Users may be hesitant to grant broad permissions

### 2. Inconsistent Scope Documentation

**Problem**: Documentation mentions send functionality that isn't implemented.

**Evidence**:

- `docs/google-oauth-verification/` mentions send operations
- Code comments say "Read, send, delete emails"
- No actual send implementation found

### 3. No Google Sign-In Integration

**Status**: ✅ **GOOD** - No Google OAuth provider in NextAuth configuration.

**Evidence**:

- Only credentials provider in `src/lib/auth.ts`
- No Google provider found in authentication flow
- Separate "Connect Google" flow for integrations

## Recommended Changes

### 1. Reduce Gmail Scope

**Current**: `gmail.modify`
**Recommended**: `gmail.readonly`

**Justification**:

- Only read operations are currently implemented
- No send, modify, or delete operations found
- `gmail.readonly` provides sufficient permissions for current functionality

**If Send Functionality is Planned**:

- Use `gmail.readonly` + `gmail.send` (two separate scopes)
- Implement actual send functionality before requesting send scope

### 2. Update All Scope References

**Files to Update**:

1. `src/lib/integrations/gmail/auth.ts`
2. `src/lib/integrations/oauth2-manager.ts`
3. `src/lib/integrations/registry.ts`
4. `src/app/api/integrations/gmail/callback/route.ts`

**Change**:

```typescript
// FROM:
"https://www.googleapis.com/auth/gmail.modify";

// TO:
"https://www.googleapis.com/auth/gmail.readonly";
```

### 3. Update Documentation

**Files to Update**:

- `docs/google-oauth-verification/01-scope-inventory.md`
- `docs/google-oauth-verification/08-form-text-final.md`
- `docs/google-oauth-verification/README.md`

**Remove References To**:

- Send functionality (not implemented)
- Delete functionality (not implemented)
- Modify functionality (not implemented)

## Implementation Plan

### Phase 1: Scope Reduction (Immediate)

1. **Update Gmail scopes** to `gmail.readonly` in all files
2. **Test existing functionality** to ensure read operations still work
3. **Update documentation** to reflect actual capabilities

### Phase 2: Future Send Functionality (If Needed)

1. **Implement actual send operations** in codebase
2. **Add `gmail.send` scope** alongside `gmail.readonly`
3. **Update OAuth flow** to request both scopes
4. **Test send functionality** thoroughly

### Phase 3: Verification Preparation

1. **Update Google OAuth verification forms** with accurate scope descriptions
2. **Prepare demo videos** showing only implemented functionality
3. **Submit for Google OAuth verification** with minimal scopes

## Code Changes Required

### 1. Gmail Auth Configuration

```typescript
// src/lib/integrations/gmail/auth.ts
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly", // Read emails only
];
```

### 2. OAuth2 Manager

```typescript
// src/lib/integrations/oauth2-manager.ts
export const createGmailOAuth2Manager = (): GoogleOAuth2Manager => {
  return createOAuth2Manager("gmail", undefined, [
    "https://www.googleapis.com/auth/gmail.readonly",
  ]);
};
```

### 3. Integration Registry

```typescript
// src/lib/integrations/registry.ts
gmail: {
  // ... other config
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  oauth2Config: {
    // ... other config
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  },
}
```

### 4. Callback Handler

```typescript
// src/app/api/integrations/gmail/callback/route.ts
const integration = await integrationQueries.createUserIntegration(
  userId,
  "gmail",
  tokens.access_token,
  tokens.refresh_token || null,
  expiresAt,
  ["https://www.googleapis.com/auth/gmail.readonly"], // Read only
  {
    scope: tokens.scope,
    token_type: tokens.token_type,
  }
);
```

## Verification Impact

### Benefits of Scope Reduction

1. **Easier Google OAuth Verification**

   - Minimal scopes are easier to justify
   - Less scrutiny from Google reviewers
   - Faster approval process

2. **Better User Trust**

   - Users more likely to grant limited permissions
   - Clear understanding of what data is accessed
   - Reduced privacy concerns

3. **Compliance Benefits**
   - Principle of least privilege
   - Reduced data exposure risk
   - Better audit trail

### Verification Form Updates

**Current Description** (Incorrect):

> "Perin uses Gmail to read, send, and modify messages..."

**Recommended Description**:

> "Perin uses Gmail to read recent messages and provide email context for AI conversations. We only access message content to understand conversation context and do not send, modify, or delete any messages."

## Testing Checklist

### Before Deployment

- [ ] Update all scope references to `gmail.readonly`
- [ ] Test Gmail integration still works (read operations)
- [ ] Verify no send/modify operations are attempted
- [ ] Update documentation to reflect actual capabilities
- [ ] Test OAuth flow with new scopes

### After Deployment

- [ ] Monitor for any scope-related errors
- [ ] Verify existing integrations continue to work
- [ ] Test new Gmail connections with reduced scopes
- [ ] Update Google OAuth verification application

## Conclusion

**Immediate Action Required**: Reduce Gmail scope from `gmail.modify` to `gmail.readonly` to align with actual functionality and improve Google OAuth verification chances.

**Calendar Integration**: ✅ No changes needed - scopes are appropriate for functionality.

**Authentication Flow**: ✅ No changes needed - separate Google connection flow is properly implemented.

This scope reduction will significantly improve the application's security posture and Google OAuth verification prospects while maintaining all current functionality.
