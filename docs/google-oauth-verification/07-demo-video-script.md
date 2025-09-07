# Demo Video Script for Google OAuth Verification

## Overview

This script demonstrates Perin's Google OAuth integration (Gmail + Calendar) for Google's verification process. The demo should be 90-120 seconds and show all key functionality.

## Demo Script (90-120 seconds)

### Scene 1: Sign In & Google OAuth Consent (15-20 seconds)

**Narrator:** "Let me show you how Perin integrates with Google services to help users manage their email and calendar."

**Actions:**

1. Navigate to Perin application
2. Sign in with existing account
3. Go to Settings → Integrations
4. Click "Connect Gmail"
5. Show Google OAuth consent screen
6. Point out the scopes being requested:
   - `gmail.modify` - Read, send, and modify Gmail messages
   - `calendar.readonly` - Read calendar events
   - `calendar.events` - Create and manage calendar events

**Script:** "When users connect their Google account, they see a clear consent screen explaining exactly what permissions Perin needs and why."

### Scene 2: Reading Calendar Availability (20-25 seconds)

**Narrator:** "Once connected, Perin can read the user's calendar to understand their availability."

**Actions:**

1. After Gmail connection, connect Google Calendar
2. Show calendar consent screen
3. Return to main chat interface
4. Type: "What's my availability tomorrow?"
5. Show Perin reading calendar and displaying availability
6. Highlight that only essential event metadata is accessed (title, time, attendees)

**Script:** "Perin uses calendar.readonly to check availability and show upcoming events, helping users understand their schedule at a glance."

### Scene 3: Creating Calendar Event (20-25 seconds)

**Narrator:** "When users need to schedule something, Perin can create calendar events with their explicit approval."

**Actions:**

1. Type: "Schedule a meeting with Sarah for Tuesday 2:00-3:00 PM"
2. Show Perin creating the event
3. Display the event creation confirmation
4. Show the event appearing in Google Calendar
5. Highlight that this only happens when the user explicitly requests it

**Script:** "Perin creates calendar events only when users explicitly request it, using the calendar.events scope to add meetings to their schedule."

### Scene 4: Reading Gmail & Drafting Reply (25-30 seconds)

**Narrator:** "For email management, Perin can read recent messages to provide context and help draft replies."

**Actions:**

1. Type: "What emails do I have from John?"
2. Show Perin reading Gmail messages
3. Display email metadata (sender, subject, date, snippet)
4. Type: "Draft a reply to the latest email from John"
5. Show Perin drafting a reply based on the email content
6. Highlight that only message metadata and snippets are accessed, not full email bodies

**Script:** "Perin reads Gmail to understand context and help draft responses, accessing only the metadata and snippets needed to provide assistance."

### Scene 5: User Approval & Sending (15-20 seconds)

**Narrator:** "Before sending any email, Perin requires explicit user approval."

**Actions:**

1. Show the drafted reply
2. Display "Send" button with user approval required
3. Click "Send" to approve
4. Show email being sent successfully
5. Highlight the user approval step

**Script:** "All email sending requires explicit user approval, ensuring users maintain full control over their communications."

### Scene 6: Disconnect & Token Revocation (10-15 seconds)

**Narrator:** "Users can disconnect their Google integration at any time, which revokes all tokens and deletes stored data."

**Actions:**

1. Go to Settings → Integrations
2. Click "Disconnect" for Gmail
3. Show confirmation dialog
4. Confirm disconnection
5. Show integration removed from list
6. Demonstrate that Gmail features are no longer available

**Script:** "When users disconnect, all Google tokens are revoked and stored data is deleted, ensuring complete user control over their data."

## Key Points to Emphasize

### 1. Limited Data Access

- **Gmail:** Only metadata (sender, subject, date, snippets)
- **Calendar:** Only essential event details (title, time, attendees)
- **No full email bodies stored**
- **No personal information beyond what's necessary**

### 2. User Control

- **Explicit consent** for all Google connections
- **User approval required** for all email sending
- **Easy disconnect** with complete data deletion
- **Clear scope explanations** in OAuth consent

### 3. Security

- **HTTPS/TLS** for all communications
- **Encrypted token storage** (to be implemented)
- **Rate limiting** on API endpoints
- **Secure OAuth flow** with proper redirects

### 4. Limited Use Compliance

- **No advertising** use of Google data
- **No data selling** to third parties
- **No unrelated ML training**
- **User-requested features only**

## Technical Demonstration Points

### OAuth Flow

1. User initiates connection
2. Redirect to Google OAuth consent screen
3. User grants specific scopes
4. Callback with authorization code
5. Exchange code for tokens
6. Store encrypted tokens
7. Begin API access

### Data Minimization

1. **Gmail API calls:**

   - `gmail.users.messages.list()` - Get message IDs
   - `gmail.users.messages.get()` - Get metadata only
   - `gmail.users.messages.send()` - Send user-approved emails

2. **Calendar API calls:**
   - `calendar.events.list()` - Get event metadata
   - `calendar.events.insert()` - Create user-requested events
   - `calendar.events.delete()` - Remove events when requested

### Security Features

1. **Token encryption** at rest
2. **Token revocation** on disconnect
3. **Rate limiting** on all endpoints
4. **HTTPS enforcement** in production
5. **Security headers** (CSP, HSTS, etc.)

## Demo Environment Setup

### Test Account Requirements

- Google account with Gmail and Calendar access
- Sample emails in inbox
- Sample calendar events
- Test email address for sending

### Demo Data Preparation

1. **Gmail:**

   - 3-5 recent emails from different senders
   - Mix of read/unread messages
   - Various subjects and dates

2. **Calendar:**
   - 2-3 events for today/tomorrow
   - Mix of meetings and free time
   - Different attendees and locations

### Technical Setup

1. **Environment:**

   - Production or staging environment
   - All integrations properly configured
   - OAuth consent screen configured
   - SSL certificates valid

2. **Browser:**
   - Clear cache and cookies
   - Fresh browser session
   - Developer tools available for debugging

## Post-Demo Verification

### Token Revocation Test

1. Disconnect integration
2. Verify tokens are revoked with Google
3. Confirm stored data is deleted
4. Test that API calls fail after disconnect

### Data Deletion Verification

1. Check database for deleted integration records
2. Verify no cached Google data remains
3. Confirm audit logs show deletion action

## Script Timing Breakdown

- **Scene 1 (OAuth):** 15-20 seconds
- **Scene 2 (Calendar Read):** 20-25 seconds
- **Scene 3 (Calendar Create):** 20-25 seconds
- **Scene 4 (Gmail Read):** 25-30 seconds
- **Scene 5 (Email Send):** 15-20 seconds
- **Scene 6 (Disconnect):** 10-15 seconds
- **Total:** 105-135 seconds (within 90-120 second target)

## Success Criteria

The demo successfully demonstrates:

1. ✅ Clear OAuth consent with scope explanations
2. ✅ Limited data access (metadata only)
3. ✅ User control and approval for all actions
4. ✅ Proper disconnect with token revocation
5. ✅ Security best practices implementation
6. ✅ Limited Use compliance (no ads, no selling, no unrelated ML)

This demo provides Google with clear evidence that Perin's Google integration meets all OAuth verification requirements and follows best practices for user data protection.
