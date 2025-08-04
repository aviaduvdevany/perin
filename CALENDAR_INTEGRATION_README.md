# 📅 Calendar Integration Documentation

> Comprehensive guide to Google Calendar integration with OAuth2 authentication, smart event context loading, and seamless integration with the LangGraph workflow.

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

The Calendar integration enables Perin to access and manage user's Google Calendar for intelligent scheduling and event management. It features:

- **OAuth2 Authentication**: Secure Google Calendar API access with automatic token refresh
- **Smart Context Loading**: Only loads calendar data when conversationally relevant
- **LangGraph Integration**: Seamless workflow integration with calendar context
- **Event Management**: Read events, create appointments, and check availability
- **Token Management**: Automatic refresh and secure storage in PostgreSQL
- **Type Safety**: Full TypeScript coverage with proper error handling

## 🏗️ Architecture

### Integration Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  Calendar Connect UI, Event Management Display             │
│  Service Layer: connectCalendarService()                   │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  /api/integrations/calendar/connect                        │
│  /api/integrations/calendar/callback                       │
│  /api/integrations/calendar/events                         │
│  /api/integrations/calendar/availability                   │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Google Calendar OAuth2 Client, Event Management           │
│  LangGraph calendarNode for context loading                │
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
│   ├── api/integrations/calendar/
│   │   ├── connect/route.ts      # OAuth initiation
│   │   ├── callback/route.ts     # OAuth callback handler (GET/POST)
│   │   ├── events/route.ts       # Event fetching and creation
│   │   └── availability/route.ts # Availability checking
│   └── services/
│       ├── internalApi.ts        # Base API utility
│       └── integrations.ts       # Calendar integration services
├── lib/integrations/calendar/
│   ├── auth.ts                  # OAuth2 authentication
│   └── client.ts                # Google Calendar API client
├── lib/queries/
│   └── integrations.ts          # Database operations
├── lib/ai/langgraph/nodes/
│   └── calendar-node.ts         # LangGraph integration
└── types/
    └── calendar.ts              # Calendar type definitions
```

## 🔐 OAuth2 Flow

### 1. Connection Initiation

```typescript
// Frontend initiates connection via service layer
import { connectCalendarService } from "../services/integrations";

const connectCalendar = async () => {
  try {
    const response = await connectCalendarService();
    const { authUrl } = response;

    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Error connecting Calendar:", error);
  }
};
```

### 2. Google OAuth2 Authorization

User is redirected to Google's OAuth2 consent screen where they:

- Grant access to Google Calendar
- Approve requested scopes:
  - `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
  - `https://www.googleapis.com/auth/calendar.events` - Create and manage events
- Receive authorization code

### 3. Token Exchange

```typescript
// Backend exchanges code for tokens
const tokens = await exchangeCodeForCalendarTokens(code);

// Store integration in database
const integration = await createUserIntegration(
  userId,
  "calendar",
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
  const newTokens = await refreshCalendarToken(integration.refresh_token);
  await updateIntegrationTokens(
    integration.id,
    newTokens.access_token,
    newTokens.expiry_date
  );
}
```

## 🛣️ API Endpoints

### 1. Connect Calendar - `POST /api/integrations/calendar/connect`

**Purpose**: Initiate Google Calendar OAuth2 connection

**Authentication**: Required

**Response**:

```typescript
interface CalendarConnectResponse {
  authUrl: string;
  message: string;
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/api/integrations/calendar/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### 2. Calendar Callback - `GET /api/integrations/calendar/callback`

**Purpose**: Handle OAuth2 callback and store tokens

**Method**: `GET` (Google redirects with authorization code)

**Query Parameters**:

- `code` - Authorization code from Google
- `scope` - Granted OAuth2 scopes

**Response**: Redirects to dashboard with success/error status

**Example URL**:

```
http://localhost:3000/api/integrations/calendar/callback?code=4/0AVMBsJjGFkmVkE99j-S88NT0QnJew6MsUYfN1jSKxrNqaLJ2XNKYkRLhCJ9sl_aSvx5FZA&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events
```

### 3. Fetch Events - `GET /api/integrations/calendar/events`

**Purpose**: Retrieve recent calendar events

**Authentication**: Required

**Query Parameters**:

- `days` (default: 7) - Number of days to look ahead
- `maxResults` (default: 10) - Maximum number of events to return

**Response**:

```typescript
interface CalendarEventsResponse {
  events: CalendarEvent[];
  count: number;
  message: string;
}
```

**Example**:

```bash
curl "http://localhost:3000/api/integrations/calendar/events?days=7&maxResults=5" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### 4. Create Event - `POST /api/integrations/calendar/events`

**Purpose**: Create a new calendar event

**Authentication**: Required

**Request Body**:

```typescript
interface CreateEventRequest {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timeZone?: string;
  attendees?: Array<{
    email: string;
    name: string;
  }>;
}
```

**Response**:

```typescript
interface CreateEventResponse {
  event: CalendarEvent;
  message: string;
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/api/integrations/calendar/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "summary": "Team Meeting",
    "description": "Weekly team sync",
    "start": "2024-01-15T10:00:00Z",
    "end": "2024-01-15T11:00:00Z",
    "timeZone": "UTC"
  }'
```

### 5. Check Availability - `GET /api/integrations/calendar/availability`

**Purpose**: Check user's availability for a time range

**Authentication**: Required

**Query Parameters**:

- `startTime` - Start time in ISO format
- `endTime` - End time in ISO format

**Response**:

```typescript
interface CalendarAvailabilityResponse {
  availability: {
    busy: Array<{
      start: string;
      end: string;
    }>;
  };
  message: string;
}
```

**Example**:

```bash
curl "http://localhost:3000/api/integrations/calendar/availability?startTime=2024-01-15T00:00:00Z&endTime=2024-01-15T23:59:59Z" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## 🗄️ Database Schema

### User Integrations Table

The calendar integration uses the existing `user_integrations` table:

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

### Key Fields for Calendar

| Field              | Type   | Description                |
| ------------------ | ------ | -------------------------- |
| `integration_type` | TEXT   | 'calendar'                 |
| `scopes`           | TEXT[] | Calendar OAuth2 scopes     |
| `metadata`         | JSONB  | Calendar-specific metadata |

## 🧠 LangGraph Integration

### Calendar Node

The Calendar integration is implemented as a LangGraph node that provides calendar context to the AI workflow:

```typescript
export const calendarNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  // Check if user has Calendar connected
  const calendarIntegration = await integrationQueries.getUserIntegration(
    state.userId,
    "calendar"
  );

  if (!calendarIntegration || !calendarIntegration.is_active) {
    return {
      calendarContext: {},
      currentStep: "calendar_not_connected",
    };
  }

  // Smart context loading - only load calendar data if contextually relevant
  const conversationText = state.conversationContext.toLowerCase();
  const calendarKeywords = [
    "calendar",
    "schedule",
    "meeting",
    "appointment",
    "event",
    "book",
    "reserve",
    "available",
    "busy",
    "free time",
    "tomorrow",
    "next week",
    "today",
    "when",
    "time",
  ];

  const mentionsCalendar = calendarKeywords.some((keyword) =>
    conversationText.includes(keyword)
  );

  if (
    mentionsCalendar ||
    state.messages.some((msg) =>
      calendarKeywords.some((keyword) =>
        msg.content.toLowerCase().includes(keyword)
      )
    )
  ) {
    // Fetch recent events for context
    const recentEvents = await fetchRecentEvents(state.userId, 7, 5);

    // Get availability for next 7 days
    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const availability = await getCalendarAvailability(
      state.userId,
      startTime,
      endTime
    );

    return {
      calendarContext: {
        recentEvents: recentEvents.map((event) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          isAllDay: event.isAllDay,
          attendees: event.attendees.length,
        })),
        eventCount: recentEvents.length,
        availability: availability.busy,
        nextEvent: recentEvents.length > 0 ? recentEvents[0] : null,
        hasUpcomingEvents: recentEvents.length > 0,
      },
      currentStep: "calendar_context_loaded",
    };
  }

  return {
    calendarContext: {},
    currentStep: "calendar_context_loaded",
  };
};
```

### State Integration

The Calendar context is integrated into the LangGraph state:

```typescript
interface LangGraphChatState {
  // ... other fields
  calendarContext: {
    recentEvents?: Array<{
      id: string;
      summary: string;
      description: string;
      start: string;
      end: string;
      location: string;
      isAllDay: boolean;
      attendees: number;
    }>;
    eventCount?: number;
    availability?: Array<{
      start: string;
      end: string;
    }>;
    nextEvent?: {
      id: string;
      summary: string;
      start: string;
      end: string;
    } | null;
    hasUpcomingEvents?: boolean;
  };
}
```

### Workflow Integration

The Calendar node is integrated into the main chat workflow:

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

    // Step 3: Load Calendar context (if relevant)
    const calendarResult = await calendarNode(stateWithGmail);
    const stateWithCalendar = { ...stateWithGmail, ...calendarResult };

    // Step 4: Call OpenAI with enhanced context
    const openaiResult = await openaiNode(stateWithCalendar);
    const finalState = { ...stateWithCalendar, ...openaiResult };

    return finalState;
  } catch (error) {
    // Error handling
  }
};
```

## 🧠 Smart Context Loading

### Keyword Detection

The system intelligently detects when calendar context is needed:

```typescript
const calendarKeywords = [
  "calendar",
  "schedule",
  "meeting",
  "appointment",
  "event",
  "book",
  "reserve",
  "available",
  "busy",
  "free time",
  "tomorrow",
  "next week",
  "today",
  "when",
  "time",
];

const mentionsCalendar = calendarKeywords.some((keyword) =>
  conversationText.toLowerCase().includes(keyword)
);
```

### Contextual Relevance

Calendar data is only loaded when:

1. **Direct Calendar Keywords**: User mentions "calendar", "schedule", "meeting", etc.
2. **Conversation Context**: Previous messages contain calendar-related terms
3. **User Intent**: Clear indication of scheduling or time-related requests

### Performance Optimization

- **Lazy Loading**: Calendar data fetched only when needed
- **Caching**: Recent events cached for quick access
- **Limited Results**: Only last 5 events loaded by default
- **Smart Filtering**: Focus on upcoming events and availability

## 🔧 Service Layer

### Calendar Service

```typescript
// src/app/services/integrations.ts
import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";
import type { CreateEventRequest } from "@/types/calendar";

export const connectCalendarService = async () => {
  try {
    const response = await internalApiRequest(
      "integrations/calendar/connect",
      HTTPMethod.POST
    );
    return response;
  } catch (error) {
    console.error("Error connecting Calendar:", error);
    throw error;
  }
};

export const fetchCalendarEventsService = async (params?: {
  days?: number;
  maxResults?: number;
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.days) queryParams.append("days", params.days.toString());
    if (params?.maxResults)
      queryParams.append("maxResults", params.maxResults.toString());

    const response = await internalApiRequest(
      `integrations/calendar/events?${queryParams.toString()}`,
      HTTPMethod.GET
    );
    return response;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw error;
  }
};

export const createCalendarEventService = async (
  eventData: CreateEventRequest
) => {
  try {
    const response = await internalApiRequest(
      "integrations/calendar/events",
      HTTPMethod.POST,
      eventData
    );
    return response;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
};

export const getCalendarAvailabilityService = async (params: {
  startTime: string;
  endTime: string;
}) => {
  try {
    const queryParams = new URLSearchParams({
      startTime: params.startTime,
      endTime: params.endTime,
    });

    const response = await internalApiRequest(
      `integrations/calendar/availability?${queryParams.toString()}`,
      HTTPMethod.GET
    );
    return response;
  } catch (error) {
    console.error("Error getting calendar availability:", error);
    throw error;
  }
};
```

### Frontend Integration

```typescript
// Component usage
import {
  connectCalendarService,
  createCalendarEventService,
} from "../services/integrations";

const handleCalendarConnect = async () => {
  setConnecting(true);
  try {
    const response = await connectCalendarService();
    const { authUrl } = response;

    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Failed to connect Calendar:", error);
  } finally {
    setConnecting(false);
  }
};

const handleCreateEvent = async () => {
  try {
    const eventData = {
      summary: "Team Meeting",
      description: "Weekly team sync",
      start: "2024-01-15T10:00:00Z",
      end: "2024-01-15T11:00:00Z",
      timeZone: "UTC",
    };

    const response = await createCalendarEventService(eventData);
    console.log("Event created:", response.event);
  } catch (error) {
    console.error("Failed to create event:", error);
  }
};
```

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Google Calendar OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/integrations/calendar/callback

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/perin

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### Production Configuration

```bash
# Google Calendar OAuth2 Configuration
GOOGLE_CLIENT_ID=production-google-client-id
GOOGLE_CLIENT_SECRET=production-google-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=https://your-app.vercel.app/api/integrations/calendar/callback

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
   - Enable Google Calendar API
   - Create OAuth2 credentials
   - Add authorized redirect URIs

2. **Configure Scopes**:

   ```typescript
   const CALENDAR_SCOPES = [
     "https://www.googleapis.com/auth/calendar.readonly",
     "https://www.googleapis.com/auth/calendar.events",
   ];
   ```

3. **Add Test Users** (for development):
   - Go to OAuth consent screen
   - Add your email as a test user
   - Or make the app internal for your organization

## 💡 Usage Examples

### Frontend Integration

```typescript
import {
  connectCalendarService,
  fetchCalendarEventsService,
} from "../services/integrations";

// Connect Calendar
const connectCalendar = async () => {
  try {
    const { authUrl } = await connectCalendarService();
    if (authUrl) {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error("Error connecting Calendar:", error);
  }
};

// Fetch recent events
const fetchEvents = async () => {
  try {
    const { events } = await fetchCalendarEventsService({
      days: 7,
      maxResults: 5,
    });
    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

// Create new event
const createEvent = async () => {
  try {
    const eventData = {
      summary: "Meeting with Client",
      description: "Discuss project requirements",
      start: "2024-01-20T14:00:00Z",
      end: "2024-01-20T15:00:00Z",
      timeZone: "UTC",
      attendees: [{ email: "client@example.com", name: "John Client" }],
    };

    const { event } = await createCalendarEventService(eventData);
    console.log("Event created:", event);
  } catch (error) {
    console.error("Error creating event:", error);
  }
};
```

### React Component Example

```typescript
import { useState, useEffect } from "react";
import {
  connectCalendarService,
  fetchCalendarEventsService,
} from "../services/integrations";

function CalendarIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCalendarStatus().then(setIsConnected);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    await connectCalendar();
  };

  const handleFetchEvents = async () => {
    setLoading(true);
    const recentEvents = await fetchCalendarEventsService({
      days: 7,
      maxResults: 5,
    });
    setEvents(recentEvents);
    setLoading(false);
  };

  return (
    <div className="calendar-integration">
      <h3>Calendar Integration</h3>

      {!isConnected ? (
        <button onClick={handleConnect} disabled={loading}>
          {loading ? "Connecting..." : "Connect Google Calendar"}
        </button>
      ) : (
        <div>
          <p>✅ Calendar Connected</p>
          <button onClick={handleFetchEvents} disabled={loading}>
            {loading ? "Loading..." : "Fetch Recent Events"}
          </button>

          {events.length > 0 && (
            <div className="events-list">
              <h4>Recent Events</h4>
              {events.map((event) => (
                <div key={event.id} className="event-item">
                  <strong>{event.summary}</strong>
                  <p>{event.description}</p>
                  <small>
                    {event.start} - {event.end}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### LangGraph Context Usage

```typescript
// The Calendar context is automatically available in AI conversations
const conversationExample = async () => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "1",
          role: "user",
          content: "What meetings do I have tomorrow?",
        },
      ],
    }),
  });

  // The AI will automatically have access to recent calendar context
  // and can provide intelligent responses about upcoming events
};
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Calendar not connected" Error

**Cause**: User hasn't completed OAuth2 flow
**Solution**:

```typescript
// Check integration status
const isConnected = await checkCalendarStatus();
if (!isConnected) {
  await connectCalendar();
}
```

#### 2. "Invalid credentials" Error

**Cause**: Expired or invalid access token
**Solution**:

```typescript
// Token refresh is automatic, but you can force refresh
const response = await fetch("/api/integrations/calendar/refresh", {
  method: "POST",
});
```

#### 3. "Insufficient permissions" Error

**Cause**: Missing required OAuth2 scopes
**Solution**:

```typescript
// Reconnect with proper scopes
await connectCalendar(); // Will request all required scopes
```

#### 4. "Rate limit exceeded" Error

**Cause**: Too many Google Calendar API requests
**Solution**:

```typescript
// Implement exponential backoff
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await delay(1000); // Wait 1 second before retry
```

#### 5. OAuth2 Callback Issues

**Cause**: Incorrect redirect URI or missing test user
**Solution**:

- Verify `GOOGLE_CALENDAR_REDIRECT_URI` matches exactly
- Add your email as a test user in Google Cloud Console
- Check that the app is in "Testing" mode and you're a test user

### Debug Mode

Enable debug logging for Calendar operations:

```typescript
// Add to environment variables
DEBUG_CALENDAR = true;

// Debug logging in code
if (process.env.DEBUG_CALENDAR) {
  console.log("Calendar API Request:", { userId, endpoint, params });
}
```

### Testing Calendar Integration

1. **Test OAuth2 Flow**:

   ```bash
   curl -X POST http://localhost:3000/api/integrations/calendar/connect \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

2. **Test Event Fetching**:

   ```bash
   curl "http://localhost:3000/api/integrations/calendar/events?days=7&maxResults=5" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

3. **Test Event Creation**:

   ```bash
   curl -X POST http://localhost:3000/api/integrations/calendar/events \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     -d '{
       "summary": "Test Meeting",
       "start": "2024-01-15T10:00:00Z",
       "end": "2024-01-15T11:00:00Z"
     }'
   ```

4. **Test Availability Check**:
   ```bash
   curl "http://localhost:3000/api/integrations/calendar/availability?startTime=2024-01-15T00:00:00Z&endTime=2024-01-15T23:59:59Z" \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

## 📚 Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Calendar API Scopes](https://developers.google.com/calendar/api/auth/scopes)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)

## 🔄 Version History

- **v1.0.0**: Initial Calendar integration with OAuth2
- **v1.1.0**: Added LangGraph node integration
- **v1.2.0**: Enhanced error handling and token management
- **v1.3.0**: Added comprehensive documentation
- **v1.4.0**: Integrated with service layer architecture
- **v1.5.0**: Enhanced smart context loading and performance

---

**Last Updated**: January 2024  
**Maintainer**: Perin Development Team
