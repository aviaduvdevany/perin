# 📧 Gmail Integration Documentation

> Comprehensive guide to Gmail integration with OAuth2 authentication, smart email context loading, and seamless integration with the LangGraph workflow.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [OAuth2 Flow](#oauth2-flow)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [LangGraph Integration](#langgraph-integration)
- [Smart Context Loading](#smart-context-loading)
- [Service Layer](#service-layer)
- [Environment Configuration](#environment-configuration)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Gmail integration enables Perin to access and analyze user emails for context-aware conversations. It features:

- **OAuth2 Authentication**: Secure Gmail API access with automatic token refresh
- **Smart Context Loading**: Only loads emails when conversationally relevant
- **LangGraph Integration**: Seamless workflow integration with email context
- **Token Management**: Automatic refresh and secure storage in PostgreSQL
- **Type Safety**: Full TypeScript coverage with proper error handling

## 🏗️ Architecture

### Integration Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  Gmail Connect UI, Email Context Display                   │
│  Service Layer: connectGmailService()                      │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  /api/integrations/gmail/connect                           │
│  /api/integrations/gmail/callback                          │
│  /api/integrations/gmail/emails                            │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Gmail OAuth2 Client, Email Parsing, Token Management      │
│  LangGraph gmailNode for context loading                   │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  user_integrations table (OAuth tokens, metadata)          │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── app/
│   ├── api/integrations/gmail/
│   │   ├── connect/route.ts      # OAuth initiation
│   │   ├── callback/route.ts     # OAuth callback handler (GET/POST)
│   │   └── emails/route.ts       # Email fetching
│   └── services/
│       ├── internalApi.ts        # Base API utility
│       └── integrations.ts       # Gmail integration services
├── lib/integrations/gmail/
│   ├── auth.ts                  # OAuth2 authentication
│   └── client.ts                # Gmail API client
├── lib/queries/
│   └── integrations.ts          # Database operations
└── lib/ai/langgraph/nodes/
    └── gmail-node.ts            # LangGraph integration
```

## 🔐 OAuth2 Flow

### 1. Connection Initiation

```typescript
// Frontend initiates connection via service layer
import { connectGmailService } from "../services/integrations";

const connectGmail = async () => {
  try {
    const response = await connectGmailService();
    const { authUrl } = response;

    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Error connecting Gmail:", error);
  }
};
```

### 2. Google OAuth2 Authorization

User is redirected to Google's OAuth2 consent screen where they:

- Grant access to Gmail
- Approve requested scopes:
  - `https://www.googleapis.com/auth/gmail.modify` - Read, compose, and send emails
  - `https://www.googleapis.com/auth/gmail.settings.basic` - Manage email settings
- Receive authorization code

### 3. Token Exchange

```typescript
// Backend exchanges code for tokens
const tokens = await exchangeCodeForTokens(code);

// Store integration in database
const integration = await createUserIntegration(
  userId,
  "gmail",
  tokens.access_token,
  tokens.refresh_token,
  expiresAt,
  scopes,
  metadata
);
```

### 4. Token Refresh

```typescript
// Automatic token refresh when expired
if (now >= expiresAt && integration.refresh_token) {
  const newTokens = await refreshGmailToken(integration.refresh_token);
  await updateIntegrationTokens(
    integration.id,
    newTokens.access_token,
    newTokens.expiry_date
  );
}
```

## 🛣️ API Endpoints

### 1. Connect Gmail - `POST /api/integrations/gmail/connect`

**Purpose**: Initiate Gmail OAuth2 connection

**Authentication**: Required

**Response**:

```typescript
interface GmailConnectResponse {
  authUrl: string;
  message: string;
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/api/integrations/gmail/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### 2. Gmail Callback - `GET /api/integrations/gmail/callback`

**Purpose**: Handle OAuth2 callback and store tokens

**Method**: `GET` (Google redirects with authorization code)

**Query Parameters**:

- `code` - Authorization code from Google
- `scope` - Granted OAuth2 scopes

**Response**: Redirects to chat with success/error status

**Example URL**:

```
http://localhost:3000/api/integrations/gmail/callback?code=4/0AVMBsJjGFkmVkE99j-S88NT0QnJew6MsUYfN1jSKxrNqaLJ2XNKYkRLhCJ9sl_aSvx5FZA&scope=https://www.googleapis.com/auth/gmail.settings.basic%20https://www.googleapis.com/auth/gmail.modify
```

### 3. Fetch Emails - `GET /api/integrations/gmail/emails`

**Purpose**: Retrieve recent emails for context

**Authentication**: Required

**Query Parameters**:

- `limit` (default: 10) - Number of emails to fetch
- `q` (optional) - Gmail search query

**Response**:

```typescript
interface GmailEmailsResponse {
  emails: Array<{
    id: string;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
    unread: boolean;
  }>;
  count: number;
  message: string;
}
```

**Example**:

```bash
curl "http://localhost:3000/api/integrations/gmail/emails?limit=5&q=in:inbox" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## 🗄️ Database Schema

### User Integrations Table

```sql
CREATE TABLE user_integrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP NOT NULL,
  scopes TEXT[] NOT NULL,
  connected_at TIMESTAMP NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, integration_type)
);
```

### Key Fields

| Field              | Type      | Description                   |
| ------------------ | --------- | ----------------------------- |
| `id`               | TEXT      | Unique integration identifier |
| `user_id`          | TEXT      | References users table        |
| `integration_type` | TEXT      | 'gmail', 'calendar', etc.     |
| `access_token`     | TEXT      | OAuth2 access token           |
| `refresh_token`    | TEXT      | OAuth2 refresh token          |
| `token_expires_at` | TIMESTAMP | Token expiration timestamp    |
| `scopes`           | TEXT[]    | Granted OAuth2 scopes         |
| `connected_at`     | TIMESTAMP | Integration connection time   |
| `last_sync_at`     | TIMESTAMP | Last data synchronization     |
| `is_active`        | BOOLEAN   | Integration status flag       |
| `metadata`         | JSONB     | Additional integration data   |

## 🧠 LangGraph Integration

### Gmail Node

The Gmail integration is implemented as a LangGraph node that provides email context to the AI workflow:

```typescript
export const gmailNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  // Check if user has Gmail connected
  const gmailIntegration = await integrationQueries.getUserIntegration(
    state.userId,
    "gmail"
  );

  if (!gmailIntegration || !gmailIntegration.is_active) {
    return {
      emailContext: {},
      currentStep: "gmail_not_connected",
    };
  }

  // Smart context loading - only load emails if contextually relevant
  const conversationText = state.conversationContext.toLowerCase();
  const emailKeywords = ["email", "message", "inbox", "sent", "reply", "mail"];
  const mentionsEmail = emailKeywords.some((keyword) =>
    conversationText.includes(keyword)
  );

  if (
    mentionsEmail ||
    state.messages.some((msg) =>
      ["email", "message", "inbox"].some((keyword) =>
        msg.content.toLowerCase().includes(keyword)
      )
    )
  ) {
    // Fetch recent emails for context
    const recentEmails = await fetchRecentEmails(state.userId, 5);

    return {
      emailContext: {
        recentEmails: recentEmails.map((email) => ({
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          date: email.date,
          unread: email.unread,
        })),
        emailCount: recentEmails.length,
        hasUnread: recentEmails.some((email) => email.unread),
      },
      currentStep: "gmail_context_loaded",
    };
  }

  return {
    emailContext: {},
    currentStep: "gmail_context_loaded",
  };
};
```

### State Integration

The Gmail context is integrated into the LangGraph state:

```typescript
interface LangGraphChatState {
  // ... other fields
  emailContext: {
    recentEmails?: Array<{
      from: string;
      subject: string;
      snippet: string;
      date: string;
      unread: boolean;
    }>;
    emailCount?: number;
    hasUnread?: boolean;
  };
}
```

### Workflow Integration

The Gmail node is integrated into the main chat workflow:

```typescript
export const executeChatGraph = async (
  initialState: LangGraphChatState
): Promise<LangGraphChatState> => {
  try {
    // Step 1: Load memory
    const memoryResult = await memoryNode(initialState);
    const stateWithMemory = { ...initialState, ...memoryResult };

    // Step 2: Load Gmail context (if relevant)
    const gmailResult = await gmailNode(stateWithMemory);
    const stateWithGmail = { ...stateWithMemory, ...gmailResult };

    // Step 3: Call OpenAI with email context
    const openaiResult = await openaiNode(stateWithGmail);
    const finalState = { ...stateWithGmail, ...openaiResult };

    return finalState;
  } catch (error) {
    // Error handling
  }
};
```

## 🧠 Smart Context Loading

### Keyword Detection

The system intelligently detects when email context is needed:

```typescript
const emailKeywords = [
  "email",
  "message",
  "inbox",
  "sent",
  "reply",
  "mail",
  "gmail",
  "outlook",
  "mailbox",
  "correspondence",
];

const mentionsEmail = emailKeywords.some((keyword) =>
  conversationText.toLowerCase().includes(keyword)
);
```

### Contextual Relevance

Emails are only loaded when:

1. **Direct Email Keywords**: User mentions "email", "inbox", "message", etc.
2. **Conversation Context**: Previous messages contain email-related terms
3. **User Intent**: Clear indication of email-related requests

### Performance Optimization

- **Lazy Loading**: Emails fetched only when needed
- **Caching**: Recent emails cached for quick access
- **Limited Results**: Only last 5 emails loaded by default
- **Smart Filtering**: Focus on unread and recent emails

## 🔧 Service Layer

### Gmail Service

```typescript
// src/app/services/integrations.ts
import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";

export const connectGmailService = async () => {
  try {
    const response = await internalApiRequest(
      "integrations/gmail/connect",
      HTTPMethod.POST
    );
    return response;
  } catch (error) {
    console.error("Error connecting Gmail:", error);
    throw error;
  }
};
```

### Frontend Integration

```typescript
// Component usage
import { connectGmailService } from "../services/integrations";

const handleGmailConnect = async () => {
  setConnecting(true);
  try {
    const response = await connectGmailService();
    const { authUrl } = response;

    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Failed to connect Gmail:", error);
  } finally {
    setConnecting(false);
  }
};
```

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Gmail OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/perin

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### Production Configuration

```bash
# Gmail OAuth2 Configuration
GOOGLE_CLIENT_ID=production-google-client-id
GOOGLE_CLIENT_SECRET=production-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/integrations/gmail/callback

# Database Configuration
DATABASE_URL=postgresql://username:password@ep-xxx-xxx-xxx.region.aws.neon.tech/database

# NextAuth Configuration
NEXTAUTH_SECRET=production-secret-key
NEXTAUTH_URL=https://your-app.vercel.app
```

### Google Cloud Console Setup

1. **Create OAuth2 Credentials**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Gmail API
   - Create OAuth2 credentials
   - Add authorized redirect URIs

2. **Configure Scopes**:

   ```typescript
   const GMAIL_SCOPES = [
     "https://www.googleapis.com/auth/gmail.modify",
     "https://www.googleapis.com/auth/gmail.settings.basic",
   ];
   ```

3. **Add Test Users** (for development):
   - Go to OAuth consent screen
   - Add your email as a test user
   - Or make the app internal for your organization

## 💡 Usage Examples

### Frontend Integration

```typescript
import { connectGmailService } from "../services/integrations";

// Connect Gmail
const connectGmail = async () => {
  try {
    const { authUrl } = await connectGmailService();
    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Error connecting Gmail:", error);
  }
};

// Check integration status
const checkGmailStatus = async () => {
  try {
    const { isConnected } = await checkGmailStatusService();
    return isConnected;
  } catch (error) {
    return false;
  }
};
```

### React Component Example

```typescript
import { useState, useEffect } from "react";
import { connectGmailService } from "../services/integrations";

function GmailIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkGmailStatus().then(setIsConnected);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    await connectGmail();
  };

  return (
    <div className="gmail-integration">
      <h3>Gmail Integration</h3>

      {!isConnected ? (
        <button onClick={handleConnect} disabled={loading}>
          {loading ? "Connecting..." : "Connect Gmail"}
        </button>
      ) : (
        <div>
          <p>✅ Gmail Connected</p>
          <p>Perin can now help you with your emails!</p>
        </div>
      )}
    </div>
  );
}
```

### LangGraph Context Usage

```typescript
// The Gmail context is automatically available in AI conversations
const conversationExample = async () => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "1",
          role: "user",
          content: "Can you summarize my recent emails?",
        },
      ],
    }),
  });

  // The AI will automatically have access to recent email context
  // and can provide intelligent responses about email content
};
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Gmail not connected" Error

**Cause**: User hasn't completed OAuth2 flow
**Solution**:

```typescript
// Check integration status
const isConnected = await checkGmailStatus();
if (!isConnected) {
  await connectGmail();
}
```

#### 2. "Invalid credentials" Error

**Cause**: Expired or invalid access token
**Solution**:

```typescript
// Token refresh is automatic, but you can force refresh
const response = await fetch("/api/integrations/gmail/refresh", {
  method: "POST",
});
```

#### 3. "Insufficient permissions" Error

**Cause**: Missing required OAuth2 scopes
**Solution**:

```typescript
// Reconnect with proper scopes
await connectGmail(); // Will request all required scopes
```

#### 4. "Rate limit exceeded" Error

**Cause**: Too many Gmail API requests
**Solution**:

```typescript
// Implement exponential backoff
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await delay(1000); // Wait 1 second before retry
```

#### 5. OAuth2 Callback Issues

**Cause**: Incorrect redirect URI or missing test user
**Solution**:

- Verify `GOOGLE_REDIRECT_URI` matches exactly
- Add your email as a test user in Google Cloud Console
- Check that the app is in "Testing" mode and you're a test user

### Debug Mode

Enable debug logging for Gmail operations:

```typescript
// Add to environment variables
DEBUG_GMAIL = true;

// Debug logging in code
if (process.env.DEBUG_GMAIL) {
  console.log("Gmail API Request:", { userId, endpoint, params });
}
```

### Testing Gmail Integration

1. **Test OAuth2 Flow**:

   ```bash
   curl -X POST http://localhost:3000/api/integrations/gmail/connect \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

2. **Test Email Fetching**:

   ```bash
   curl "http://localhost:3000/api/integrations/gmail/emails?limit=5" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

3. **Test Integration Status**:
   ```bash
   curl http://localhost:3000/api/integrations/gmail/status \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)

## 🔄 Version History

- **v1.0.0**: Initial Gmail integration with OAuth2
- **v1.1.0**: Added LangGraph node integration
- **v1.2.0**: Enhanced error handling and token management
- **v1.3.0**: Added comprehensive documentation
- **v1.4.0**: Integrated with service layer architecture
- **v1.5.0**: Enhanced smart context loading and performance

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
