# Limited Use + Data Minimization Compliance Checklist

## Google API Services User Data Policy Compliance

### ✅ PASS - Limited Use Requirements

#### 1. Data Use Restrictions

- **✅ No Advertising**: Google data is not used for advertising purposes
- **✅ No Data Selling**: Google data is not sold to third parties
- **✅ No Unrelated ML Training**: Google data is not used for unrelated machine learning training
- **✅ User-Requested Features Only**: All Google data access is for user-requested functionality

**Code Evidence:**

- Gmail data used only for email context in AI conversations
- Calendar data used only for scheduling and availability checking
- No advertising or analytics code found in integration files

#### 2. Data Minimization

**Gmail Data Stored (Minimal):**

```typescript
// From src/lib/integrations/gmail/client.ts:262-273
return {
  id: message.id,
  threadId: message.threadId,
  from: getHeader("From"),
  to: getHeader("To"),
  subject: getHeader("Subject"),
  date: getHeader("Date"),
  body: body.slice(0, 1000), // Limited to 1000 chars
  snippet: message.snippet,
  unread: message.labelIds?.includes("UNREAD") || false,
};
```

**Calendar Data Stored (Minimal):**

```typescript
// From src/lib/integrations/calendar/client.ts:424-445
return {
  id: event.id!,
  summary: event.summary || "No Title",
  description: event.description || "",
  start: event.start?.dateTime || event.start?.date || "",
  end: event.end?.dateTime || event.end?.date || "",
  location: event.location || "",
  attendees: event.attendees?.map(...) || [],
  organizer: event.organizer ? {...} : null,
  isAllDay: !event.start?.dateTime,
  status: event.status || "confirmed",
};
```

#### 3. Data Sharing Restrictions

- **✅ No Third-Party Sharing**: Google data not shared beyond essential sub-processors
- **✅ Sub-Processor Disclosure**: Listed in Privacy Policy
- **✅ User Consent**: OAuth consent obtained before data access

### ⚠️ PARTIAL - Data Storage Security

#### 1. Token Storage

**Status:** ⚠️ **TOKENS NOT ENCRYPTED AT REST**

**Current Implementation:**

```sql
-- From src/lib/queries/integrations.ts:4-18
export interface UserIntegration {
  access_token: string;        -- Stored in plain text
  refresh_token: string | null; -- Stored in plain text
  token_expires_at: string;
  scopes: string[];
  // ... other fields
}
```

**Required Fix:** Implement token encryption before production deployment.

#### 2. Data Retention

**Status:** ⚠️ **NO EXPLICIT RETENTION POLICY**

**Current State:**

- No automatic data deletion
- No retention period limits
- Data persists until user manually disconnects

**Required Fix:** Implement data retention policies and automatic cleanup.

### ✅ PASS - User Control

#### 1. Disconnect Functionality

**Implementation:** ✅ **FULLY IMPLEMENTED**

```typescript
// From src/app/api/integrations/route.ts:30-89
export async function DELETE(request: Request) {
  // Handles both by ID and by type
  const ok = await disconnectIntegration(session.user.id, { id, type });
  return NextResponse.json({ success: true });
}
```

**Features:**

- Disconnect by integration type (gmail, calendar)
- Disconnect by specific integration ID
- Deactivates integration in database
- UI integration in `IntegrationManagerModal`

#### 2. Data Deletion

**Status:** ⚠️ **PARTIAL IMPLEMENTATION**

**Current Implementation:**

```typescript
// From src/lib/integrations/service.ts:263-286
export const disconnectIntegration = async (
  userId: string,
  typeOrId: IntegrationType | { id: string }
): Promise<boolean> => {
  // Only deactivates, doesn't delete data
  await integrationQueries.deactivateIntegration(userId, typeOrId);
  return true;
};
```

**Missing:** Token revocation with Google and complete data deletion.

### ✅ PASS - Purpose Limitation

#### 1. Gmail Usage

- **Purpose**: Email context for AI conversations
- **Scope**: Read recent emails, extract relevant information
- **Limitation**: No full email storage, only snippets

#### 2. Calendar Usage

- **Purpose**: Scheduling and availability checking
- **Scope**: Read events, create/delete events
- **Limitation**: Only essential event metadata stored

### ❌ FAIL - Security Requirements

#### 1. Token Encryption

**Status:** ❌ **CRITICAL SECURITY GAP**

**Issue:** OAuth tokens stored in plain text in database
**Risk:** High - tokens could be compromised if database is breached
**Required Action:** Implement AES-GCM encryption for token storage

#### 2. Token Revocation

**Status:** ❌ **MISSING IMPLEMENTATION**

**Issue:** No Google token revocation on disconnect
**Risk:** Medium - tokens remain valid even after disconnect
**Required Action:** Implement Google token revocation API calls

## Compliance Score: 6/10

### Critical Issues to Fix:

1. **Encrypt OAuth tokens at rest** (High Priority)
2. **Implement token revocation** (Medium Priority)
3. **Add data retention policies** (Medium Priority)
4. **Complete data deletion on disconnect** (Medium Priority)

### Recommendations:

#### 1. Token Encryption Implementation

```typescript
// Recommended implementation
import { createCipher, createDecipher } from "crypto";

const ENCRYPTION_KEY = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;

export const encryptToken = (token: string): string => {
  const cipher = createCipher("aes-256-gcm", ENCRYPTION_KEY);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

export const decryptToken = (encryptedToken: string): string => {
  const decipher = createDecipher("aes-256-gcm", ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedToken, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
```

#### 2. Token Revocation Implementation

```typescript
// Add to disconnect flow
export const revokeGoogleToken = async (accessToken: string) => {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `token=${accessToken}`,
  });
  return response.ok;
};
```

#### 3. Data Retention Policy

```typescript
// Add automatic cleanup
export const cleanupExpiredIntegrations = async () => {
  // Delete integrations inactive for 90+ days
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await query(
    `DELETE FROM user_integrations WHERE is_active = false AND connected_at < $1`,
    [cutoffDate.toISOString()]
  );
};
```

## Summary

The application demonstrates good data minimization practices and limited use compliance, but has critical security gaps in token storage and management that must be addressed before Google OAuth verification approval.
