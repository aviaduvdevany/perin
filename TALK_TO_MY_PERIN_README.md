# 🤖 Talk to My Perin Feature

> A secure, time-limited delegation system that allows users to share their Perin AI assistant with others for scheduling and coordination purposes.

## 📋 Table of Contents

- [Overview](#overview)
- [User Experience Flow](#user-experience-flow)
- [Architecture](#architecture)
- [Security & Privacy](#security--privacy)
- [Data Model](#data-model)
- [API Design](#api-design)
- [UI/UX Design](#uiux-design)
- [Implementation Plan](#implementation-plan)
- [Technical Considerations](#technical-considerations)
- [Testing Strategy](#testing-strategy)

## 🎯 Overview

The "Talk to My Perin" feature enables users to generate secure, time-limited links that allow others to interact directly with their Perin AI assistant for scheduling purposes. This creates a seamless delegation experience where Perin can handle meeting coordination on behalf of the user.

### Key Benefits

- **Effortless Delegation**: Users can delegate scheduling tasks without being directly involved
- **Professional Image**: Perin maintains the user's professional tone and preferences
- **Time Efficiency**: Reduces back-and-forth communication for meeting scheduling
- **Contextual Intelligence**: Perin has access to the user's calendar, preferences, and constraints
- **Secure & Controlled**: Time-limited access with full audit trails

## 🔄 User Experience Flow

### For the Perin Owner (User)

1. **Generate Link**

   - Navigate to "Talk to My Perin" section
   - Set TTL (1 hour, 24 hours, 1 week, custom)
   - Optionally set meeting constraints (duration, timezone, location preferences)
   - Generate secure link with QR code

2. **Share Link**

   - Copy link or share QR code
   - Send via email, messaging, or any preferred method
   - Track active links and their usage

3. **Monitor & Manage**
   - View all active delegation sessions
   - See meeting requests and confirmations
   - Revoke access if needed
   - Review audit logs

### For the External Person

1. **Access Link**

   - Click shared link or scan QR code
   - Land on public chat interface (no auth required)
   - See Perin's introduction and context

2. **Chat with Perin**

   - Natural conversation about scheduling
   - Perin represents the user's preferences
   - Real-time availability checking
   - Meeting proposal generation

3. **Confirm Meeting**
   - Review proposed time slots
   - Confirm preferred option
   - Receive confirmation and calendar invite

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Public Chat Interface                    │
│  (No Auth Required) - Clean, branded experience           │
├─────────────────────────────────────────────────────────────┤
│                    Delegation Layer                        │
│  Link validation, TTL checking, session management        │
├─────────────────────────────────────────────────────────────┤
│                    AI Processing Layer                     │
│  LangGraph with delegation context, user preferences      │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                       │
│  Calendar access, availability checking, event creation   │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                          │
│  Delegation sessions, audit logs, user preferences        │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── app/
│   ├── talk-to-perin/
│   │   ├── [delegationId]/
│   │   │   └── page.tsx              # Public chat interface
│   │   └── generate/
│   │       └── page.tsx              # Link generation (protected)
│   ├── api/
│   │   ├── delegation/
│   │   │   ├── create/route.ts       # Create delegation session
│   │   │   ├── [id]/route.ts         # Get delegation details
│   │   │   ├── [id]/revoke/route.ts  # Revoke delegation
│   │   │   └── chat/route.ts         # Public chat API
│   │   └── user/
│   │       └── delegations/route.ts  # List user's delegations
├── components/
│   ├── delegation/
│   │   ├── DelegationChat.tsx        # Public chat component
│   │   ├── LinkGenerator.tsx         # Link generation form
│   │   ├── DelegationManager.tsx     # Manage active delegations
│   │   └── QRCodeGenerator.tsx       # QR code for sharing
│   └── ui/
│       └── DelegationCard.tsx        # Delegation status card
├── lib/
│   ├── delegation/
│   │   ├── session-manager.ts        # Delegation session logic
│   │   ├── link-generator.ts         # Secure link generation
│   │   └── constraints.ts            # Meeting constraints
│   └── ai/
│       └── langgraph/
│           └── nodes/
│               └── delegation-node.ts # Delegation-aware AI node
└── types/
    └── delegation.ts                 # TypeScript definitions
```

## 🔒 Security & Privacy

### Security Measures

1. **Cryptographically Secure Links**

   - UUID v4 + random entropy for delegation IDs
   - HMAC signatures for link integrity
   - Rate limiting on link generation and access

2. **Access Control**

   - TTL enforcement with server-side validation
   - Owner-only revocation capability
   - Session isolation between delegations

3. **Data Protection**
   - No sensitive user data in public URLs
   - Encrypted session storage
   - Audit logging for all interactions

### Privacy Considerations

1. **Minimal Data Exposure**

   - External users only see necessary scheduling info
   - No access to user's full calendar or personal data
   - Perin maintains user's privacy preferences

2. **Transparency**
   - Clear indication that Perin is an AI assistant
   - User is notified of all delegation activities
   - Full audit trail for accountability

## 📊 Data Model

### New Tables

```sql
-- Delegation sessions
CREATE TABLE delegation_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_user_name TEXT, -- Optional, for personalization
  external_user_email TEXT, -- Optional, for calendar invites
  ttl_expires_at TIMESTAMPTZ NOT NULL,
  constraints JSONB DEFAULT '{}', -- Meeting constraints
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Delegation messages (for audit and context)
CREATE TABLE delegation_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id TEXT NOT NULL REFERENCES delegation_sessions(id) ON DELETE CASCADE,
  from_external BOOLEAN NOT NULL, -- true if from external user
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'proposal', 'confirmation')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Delegation outcomes (meetings scheduled, etc.)
CREATE TABLE delegation_outcomes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id TEXT NOT NULL REFERENCES delegation_sessions(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('meeting_scheduled', 'meeting_declined', 'no_availability')),
  meeting_details JSONB, -- Calendar event details if scheduled
  external_user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_delegation_sessions_owner ON delegation_sessions(owner_user_id);
CREATE INDEX idx_delegation_sessions_ttl ON delegation_sessions(ttl_expires_at) WHERE status = 'active';
CREATE INDEX idx_delegation_messages_session ON delegation_messages(delegation_id, created_at);
```

### TypeScript Types

```typescript
interface DelegationSession {
  id: string;
  ownerUserId: string;
  externalUserName?: string;
  externalUserEmail?: string;
  ttlExpiresAt: Date;
  constraints: MeetingConstraints;
  status: "active" | "expired" | "revoked";
  createdAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  metadata: Record<string, unknown>;
}

interface MeetingConstraints {
  durationMinutes?: number;
  timezone?: string;
  location?: string;
  meetingType?: "video" | "phone" | "in_person";
  preferredTimes?: string[];
  maxNoticeHours?: number;
  minNoticeHours?: number;
}

interface DelegationMessage {
  id: string;
  delegationId: string;
  fromExternal: boolean;
  content: string;
  messageType: "text" | "proposal" | "confirmation";
  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

## 🔌 API Design

### Public Endpoints (No Auth Required)

#### `GET /talk-to-perin/[delegationId]`

- **Purpose**: Public chat interface
- **Response**: React page with chat UI
- **Security**: Validates delegation exists and is active

#### `POST /api/delegation/chat`

- **Purpose**: Handle chat messages from external users
- **Body**: `{ delegationId, message, externalUserName? }`
- **Response**: Streaming AI response
- **Security**: Rate limiting, delegation validation

### Protected Endpoints (Requires Auth)

#### `POST /api/delegation/create`

- **Purpose**: Generate new delegation link
- **Body**: `{ ttlHours, constraints?, externalUserName? }`
- **Response**: `{ delegationId, shareableUrl, qrCodeData, expiresAt }`

#### `GET /api/user/delegations`

- **Purpose**: List user's active delegations
- **Query**: `{ status?, limit?, offset? }`
- **Response**: `{ delegations: DelegationSession[], pagination }`

#### `POST /api/delegation/[id]/revoke`

- **Purpose**: Revoke active delegation
- **Response**: `{ success: boolean, message: string }`

#### `GET /api/delegation/[id]/details`

- **Purpose**: Get delegation details and activity
- **Response**: `{ session, messages, outcomes, analytics }`

## 🎨 UI/UX Design

### Link Generation Page (`/talk-to-perin/generate`)

```typescript
// Clean, intuitive interface for generating delegation links
interface LinkGeneratorProps {
  onGenerate: (
    constraints: MeetingConstraints,
    ttlHours: number
  ) => Promise<DelegationSession>;
}

// Features:
// - TTL selector (1h, 24h, 1w, custom)
// - Meeting constraints form
// - Preview of what external users will see
// - One-click generation with copy/share
```

### Public Chat Interface (`/talk-to-perin/[id]`)

```typescript
// Branded, professional chat experience
interface DelegationChatProps {
  delegationId: string;
  externalUserName?: string;
}

// Features:
// - Clean, mobile-responsive design
// - Perin avatar and introduction
// - Real-time chat with streaming responses
// - Meeting proposal cards
// - Calendar integration for confirmation
```

### Delegation Management Dashboard

```typescript
// Overview of all active delegations
interface DelegationManagerProps {
  delegations: DelegationSession[];
  onRevoke: (id: string) => Promise<void>;
}

// Features:
// - Active delegation cards with status
// - Usage analytics and insights
// - Quick actions (revoke, extend, view details)
// - Audit trail and outcomes
```

## 📋 Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Database Schema**

   - Create delegation tables
   - Add indexes and constraints
   - Set up audit logging

2. **API Foundation**

   - Implement delegation CRUD operations
   - Add link generation and validation
   - Set up rate limiting and security

3. **Basic UI Components**
   - Link generator form
   - Public chat interface
   - Delegation management dashboard

### Phase 2: AI Integration (Week 2)

1. **LangGraph Enhancement**

   - Add delegation-aware node
   - Implement context switching
   - Handle external user interactions

2. **Calendar Integration**

   - Availability checking for external users
   - Meeting proposal generation
   - Event creation and confirmation

3. **Security Hardening**
   - HMAC link signatures
   - Session isolation
   - Audit trail implementation

### Phase 3: Enhanced UX (Week 3)

1. **Advanced Features**

   - QR code generation
   - Email integration for sharing
   - Analytics and insights

2. **Mobile Optimization**

   - Responsive design improvements
   - Touch-friendly interactions
   - Progressive Web App features

3. **Testing & Polish**
   - End-to-end testing
   - Performance optimization
   - Security audit

## 🔧 Technical Considerations

### Performance

1. **Caching Strategy**

   - Redis for delegation session caching
   - CDN for static assets
   - Database query optimization

2. **Scalability**
   - Horizontal scaling for chat endpoints
   - Database connection pooling
   - Rate limiting per delegation

### Reliability

1. **Error Handling**

   - Graceful degradation for expired links
   - Fallback responses for AI failures
   - Comprehensive error logging

2. **Monitoring**
   - Delegation usage metrics
   - Error rate tracking
   - Performance monitoring

### Integration Points

1. **Calendar Systems**

   - Google Calendar availability checking
   - Event creation and management
   - Timezone handling

2. **Notification System**
   - Owner notifications for delegation activity
   - External user confirmations
   - Meeting reminders

## 🧪 Testing Strategy

### Unit Tests

1. **Link Generation**

   - TTL validation
   - Constraint processing
   - Security token generation

2. **AI Integration**
   - Context switching
   - Delegation awareness
   - Response formatting

### Integration Tests

1. **End-to-End Flows**

   - Complete delegation lifecycle
   - Meeting scheduling process
   - Error scenarios

2. **Security Tests**
   - Link tampering prevention
   - Access control validation
   - Rate limiting effectiveness

### User Acceptance Testing

1. **Usability Testing**

   - Link generation ease of use
   - External user experience
   - Mobile responsiveness

2. **Performance Testing**
   - Load testing for chat endpoints
   - Database performance under load
   - Memory usage optimization

## 🚀 Future Enhancements

### Phase 4+ Features

1. **Advanced Delegation**

   - Recurring delegation links
   - Team delegation (multiple Perins)
   - Custom branding options

2. **Integration Expansion**

   - Slack integration for notifications
   - CRM integration for lead scheduling
   - Video conferencing auto-setup

3. **Analytics & Insights**

   - Delegation effectiveness metrics
   - Meeting success rates
   - User behavior analytics

4. **Enterprise Features**
   - Admin controls and oversight
   - Compliance and audit requirements
   - SSO integration

---

**This document serves as the single source of truth for the "Talk to My Perin" feature. All implementation should follow these specifications and be updated as the feature evolves.**
