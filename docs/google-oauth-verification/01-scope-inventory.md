# Google OAuth Scope Inventory

## Overview

This document inventories all Google integrations, OAuth scopes, and data access patterns in the Perin application.

## Google Integrations Found

### 1. Gmail Integration

**Configuration Files:**

- `src/lib/integrations/gmail/auth.ts` - OAuth configuration
- `src/lib/integrations/registry.ts` - Integration registry
- `src/app/api/integrations/gmail/callback/route.ts` - OAuth callback handler

**OAuth Scopes Requested:**

```typescript
// From src/lib/integrations/gmail/auth.ts:4-6
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify", // Read, send, delete emails
];
```

**Scope Details:**

- `gmail.modify` - Full Gmail access (read, send, modify, delete messages and labels)

**OAuth Flow:**

1. User initiates connection via `/api/integrations/gmail/connect`
2. Redirects to Google OAuth consent screen
3. Callback handled by `/api/integrations/gmail/callback`
4. Tokens stored in `user_integrations` table

**Data Access Patterns:**

- **Read**: Messages via `gmail.users.messages.list()` and `gmail.users.messages.get()`
- **Send**: Not currently implemented (scope allows it)
- **Modify**: Not currently implemented (scope allows it)
- **Labels**: Not currently implemented (scope allows it)

**Code References:**

- `src/lib/integrations/gmail/client.ts:108-156` - `fetchRecentEmails()`
- `src/lib/integrations/gmail/client.ts:240-273` - `parseGmailMessage()`

### 2. Google Calendar Integration

**Configuration Files:**

- `src/lib/integrations/calendar/auth.ts` - OAuth configuration
- `src/lib/integrations/registry.ts` - Integration registry
- `src/app/api/integrations/calendar/callback/route.ts` - OAuth callback handler

**OAuth Scopes Requested:**

```typescript
// From src/lib/integrations/calendar/auth.ts:38-41
const scopes = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
```

**Scope Details:**

- `calendar.readonly` - Read calendar metadata and events
- `calendar.events` - Create, update, delete calendar events

**OAuth Flow:**

1. User initiates connection via `/api/integrations/calendar/connect`
2. Redirects to Google OAuth consent screen
3. Callback handled by `/api/integrations/calendar/callback`
4. Tokens stored in `user_integrations` table

**Data Access Patterns:**

- **Read**: Events via `calendar.events.list()`
- **Create**: Events via `calendar.events.insert()`
- **Update**: Not currently implemented (scope allows it)
- **Delete**: Events via `calendar.events.delete()`

**Code References:**

- `src/lib/integrations/calendar/client.ts:226-333` - `checkCalendarAvailability()`
- `src/lib/integrations/calendar/client.ts:338-450` - `createCalendarEvent()`
- `src/lib/integrations/calendar/client.ts:455-489` - `deleteCalendarEvent()`

## OAuth Client Configuration

**Environment Variables:**

- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - Default redirect URI
- `GOOGLE_CALENDAR_REDIRECT_URI` - Calendar-specific redirect URI

**NextAuth Configuration:**

- Uses credentials provider only (no Google provider)
- OAuth handled separately via custom integration system
- Session management via JWT tokens

## Token Storage

**Database Table:** `user_integrations`

```sql
-- Token storage fields
access_token: string        -- OAuth access token
refresh_token: string|null  -- OAuth refresh token
token_expires_at: timestamp -- Token expiration
scopes: string[]           -- Granted scopes
```

**Security Status:** ⚠️ **TOKENS NOT ENCRYPTED AT REST**

## Scope Usage Analysis

### Gmail Scope Assessment

**Current Usage:**

- ✅ Read messages for context
- ❌ Send messages (not implemented)
- ❌ Modify messages (not implemented)
- ❌ Manage labels (not implemented)

**Recommendation:** Consider reducing to `gmail.readonly` + `gmail.send` if only reading and sending is needed.

### Calendar Scope Assessment

**Current Usage:**

- ✅ Read events for availability checking
- ✅ Create events for scheduling
- ✅ Delete events
- ❌ Update events (not implemented)

**Recommendation:** Current scopes are appropriate for functionality.

## Integration Points

### API Endpoints

**Gmail:**

- `GET /api/integrations/gmail/emails` - Fetch recent emails
- `POST /api/integrations/gmail/callback` - OAuth callback

**Calendar:**

- `GET /api/integrations/calendar/events` - Fetch events
- `POST /api/integrations/calendar/events` - Create event
- `GET /api/integrations/calendar/availability` - Check availability

### Service Layer

**Gmail Services:**

- `src/app/services/integrations.ts` - Service layer wrapper
- `src/lib/integrations/gmail/client.ts` - Gmail API client

**Calendar Services:**

- `src/app/services/integrations.ts` - Service layer wrapper
- `src/lib/integrations/calendar/client.ts` - Calendar API client

## Data Minimization

### Gmail Data Stored

- Message ID, thread ID
- From, to, subject, date
- Snippet (first ~1000 chars of body)
- Unread status
- Account email and label

### Calendar Data Stored

- Event ID, summary, description
- Start/end times with timezone
- Location, attendees
- Organizer information
- Event status

### Data Not Stored

- Full email bodies (only snippets)
- Email attachments
- Calendar event descriptions (minimal)
- User profile information beyond email

## Recommendations

1. **Reduce Gmail Scope**: Consider `gmail.readonly` + `gmail.send` instead of `gmail.modify`
2. **Encrypt Tokens**: Implement token encryption at rest
3. **Add Token Revocation**: Implement proper token revocation on disconnect
4. **Audit Logging**: Add comprehensive audit logging for data access
