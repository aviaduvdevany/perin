# Timezone Handling in Perin

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Design](#database-design)
4. [Core Utilities](#core-utilities)
5. [UI Components](#ui-components)
6. [Integration Points](#integration-points)
7. [Best Practices](#best-practices)
8. [Migration Guide](#migration-guide)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Overview

Perin implements a robust, user-friendly timezone handling system that ensures consistent time representation across all application layers. The system follows the principle of **"UTC storage, local display"** - all timestamps are stored in UTC in the database, then converted to the user's preferred timezone for display and interaction.

### Key Principles

- **Zero timezone bugs** - Consistent handling across all components
- **Minimum user friction** - Auto-detection and intuitive selection
- **Cross-timezone collaboration** - Support for users in different timezones
- **Data integrity** - Validation and constraints prevent invalid timezone data

## Architecture

### Data Flow

```
User Input (Local Time) → UTC Conversion → Database Storage (UTC)
Database Retrieval (UTC) → User Timezone Conversion → Display (Local Time)
```

### Component Layers

1. **Database Layer** - UTC storage with `timestamptz` columns
2. **API Layer** - UTC conversion utilities
3. **Service Layer** - Business logic with timezone awareness
4. **UI Layer** - User-friendly timezone selection and display
5. **Integration Layer** - Third-party services (Calendar, Email)

## Database Design

### Schema Changes

All timestamp columns use PostgreSQL's `timestamptz` type for timezone-aware storage:

```sql
-- Example table structure
CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL,
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Timezone validation constraints
ALTER TABLE users
ADD CONSTRAINT users_timezone_valid
CHECK (timezone IS NULL OR is_valid_iana_timezone(timezone));
```

### Key Tables with Timezone Support

- `users` - User timezone preferences
- `notification_preferences` - Notification timing preferences
- `notifications` - Notification timestamps
- `agent_sessions` - Meeting scheduling
- `user_integrations` - Integration timestamps

### Validation Function

```sql
CREATE OR REPLACE FUNCTION is_valid_iana_timezone(tz text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = tz
  );
$$ LANGUAGE sql STABLE;
```

## Core Utilities

### Primary Timezone Utilities (`src/lib/utils/timezone.ts`)

#### Timezone Validation

```typescript
import { timezoneSchema, isValidTimezone } from "@/lib/utils/timezone";

// Validate IANA timezone string
const isValid = isValidTimezone("America/New_York"); // true
const isValid = isValidTimezone("EST"); // false (not IANA)
```

#### User Timezone Detection

```typescript
import { getUserTimezone } from "@/lib/utils/timezone";

// Auto-detect user's browser timezone
const userTimezone = getUserTimezone(); // "America/New_York"
```

#### Timezone Conversion

```typescript
import { utcToUserTimezone, userTimezoneToUtc } from "@/lib/utils/timezone";

// Convert UTC to user's timezone
const utcDate = new Date("2024-01-15T10:00:00Z");
const userTime = utcToUserTimezone(utcDate, "America/New_York");

// Convert user's time to UTC
const userDate = new Date("2024-01-15T10:00:00");
const utcTime = userTimezoneToUtc(userDate, "America/New_York");
```

#### Timezone Formatting

```typescript
import { formatInTimezone, getTimezoneInfo } from "@/lib/utils/timezone";

// Format date in specific timezone
const formatted = formatInTimezone(new Date(), "America/New_York", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Get comprehensive timezone information
const info = getTimezoneInfo("America/New_York");
// Returns: { timezone, abbreviation, offset, isDST, currentTime }
```

#### Business Logic Utilities

```typescript
import {
  isBusinessHours,
  findCommonBusinessHours,
  getNextBusinessDay,
} from "@/lib/utils/timezone";

// Check if time is within business hours
const isOpen = isBusinessHours(new Date(), "America/New_York", 9, 17);

// Find common business hours between timezones
const common = findCommonBusinessHours("America/New_York", "Europe/London");

// Get next business day
const nextBusinessDay = getNextBusinessDay("America/New_York");
```

### Database Utilities (`src/lib/utils/db-timezone.ts`)

#### Database Operations

```typescript
import {
  toUtcForDb,
  fromDbUtcToTimezone,
  getCurrentUtcTimestamp,
} from "@/lib/utils/db-timezone";

// Convert date to UTC for database storage
const utcString = toUtcForDb(new Date());

// Convert database UTC to user timezone
const userTime = fromDbUtcToTimezone(dbTimestamp, "America/New_York");

// Get current UTC timestamp
const now = getCurrentUtcTimestamp();
```

## UI Components

### TimezoneSelector Component

The `TimezoneSelector` component provides a modern, user-friendly interface for timezone selection.

#### Features

- **Auto-detection** - Automatically detects user's browser timezone
- **Search functionality** - Real-time filtering of timezone options
- **Regional grouping** - Organized by Popular, Americas, Europe, Asia, etc.
- **Visual feedback** - Smooth animations and state indicators
- **Accessibility** - Keyboard navigation and screen reader support

#### Usage

```typescript
import { TimezoneSelector } from "@/components/ui/TimezoneSelector";

function UserPreferences() {
  const [timezone, setTimezone] = useState("");

  return (
    <TimezoneSelector
      value={timezone}
      onChange={setTimezone}
      placeholder="Select your timezone"
      autoDetect={true}
      disabled={false}
    />
  );
}
```

#### Props

- `value: string` - Current selected timezone
- `onChange: (timezone: string) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `className?: string` - Additional CSS classes
- `disabled?: boolean` - Disable the selector
- `autoDetect?: boolean` - Enable auto-detection

### Timezone Options

The component includes 42+ common IANA timezones organized by region:

```typescript
export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  // ... 38+ more options
];
```

## Integration Points

### Notification System

The notification system respects user timezone preferences for delivery timing:

```typescript
// src/lib/notifications/policy-engine.ts
import {
  getCurrentTimeInTimezone,
  isValidTimezone,
} from "@/lib/utils/timezone";

export function checkDndAndTiming(userTimezone: string, dndSettings: any) {
  if (!isValidTimezone(userTimezone)) {
    return { canSend: true, reason: "Invalid timezone, allowing delivery" };
  }

  const currentTime = getCurrentTimeInTimezone(userTimezone);
  const hour = currentTime.getHours();

  // Check Do Not Disturb hours
  if (hour >= dndSettings.startHour && hour < dndSettings.endHour) {
    return { canSend: false, reason: "Within DND hours" };
  }

  return { canSend: true, reason: "Outside DND hours" };
}
```

### AI Tools

AI tools use timezone-aware formatting for user communications:

```typescript
// src/lib/ai/tools/network.ts
import { formatInTimezone } from "@/lib/utils/timezone";

export async function confirmMeetingHandler(meetingData: any) {
  const formattedTime = formatInTimezone(
    meetingData.startTime,
    meetingData.recipientTimezone,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const message = `Meeting confirmed for ${formattedTime} in your timezone.`;
  // Send notification...
}
```

### Calendar Integration

Calendar events are created with proper timezone information:

```typescript
// src/lib/integrations/calendar/client.ts
import { isValidTimezone } from "@/lib/utils/timezone";

export async function createCalendarEvent(eventData: any) {
  // Validate timezone before sending to Google Calendar
  if (!isValidTimezone(eventData.timeZone)) {
    eventData.timeZone = "UTC"; // Fallback to UTC
  }

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventData,
  });

  return event;
}
```

### Onboarding Flow

The onboarding process includes timezone setup:

```typescript
// src/app/onboarding/page.tsx
import { getUserTimezone } from "@/lib/utils/timezone";
import { TimezoneSelector } from "@/components/ui/TimezoneSelector";

export default function OnboardingPage() {
  const [timezone, setTimezone] = useState(getUserTimezone());

  return (
    <div>
      <TimezoneSelector
        value={timezone}
        onChange={setTimezone}
        autoDetect={true}
      />
    </div>
  );
}
```

## Best Practices

### 1. Always Store in UTC

```typescript
// ✅ Correct - Store in UTC
const utcTimestamp = toUtcForDb(userInputTime);

// ❌ Wrong - Don't store local time
const localTimestamp = userInputTime.toISOString();
```

### 2. Convert for Display

```typescript
// ✅ Correct - Convert UTC to user timezone for display
const displayTime = formatInTimezone(dbTimestamp, userTimezone);

// ❌ Wrong - Don't display UTC directly
const displayTime = dbTimestamp.toLocaleString();
```

### 3. Validate Timezones

```typescript
// ✅ Correct - Always validate timezone strings
if (!isValidTimezone(userTimezone)) {
  userTimezone = "UTC"; // Fallback
}

// ❌ Wrong - Don't trust user input
const timezone = userInput; // Could be invalid
```

### 4. Handle Edge Cases

```typescript
// ✅ Correct - Handle DST transitions
const timezoneInfo = getTimezoneInfo(timezone, date);
if (timezoneInfo.isDST) {
  // Adjust for daylight saving time
}

// ✅ Correct - Handle invalid dates
try {
  const converted = utcToUserTimezone(date, timezone);
} catch (error) {
  // Fallback to original date
}
```

### 5. Use Consistent Formatting

```typescript
// ✅ Correct - Use consistent formatting options
const formatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

const formatted = formatInTimezone(date, timezone, formatOptions);
```

## Migration Guide

### Database Migration

1. **Convert timestamp columns to timestamptz:**

```sql
ALTER TABLE table_name
ALTER COLUMN column_name TYPE timestamptz
USING column_name AT TIME ZONE 'UTC';
```

2. **Add timezone validation constraints:**

```sql
ALTER TABLE users
ADD CONSTRAINT users_timezone_valid
CHECK (timezone IS NULL OR is_valid_iana_timezone(timezone));
```

3. **Create validation function:**

```sql
CREATE OR REPLACE FUNCTION is_valid_iana_timezone(tz text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = tz
  );
$$ LANGUAGE sql STABLE;
```

### Code Migration

1. **Replace direct Date usage:**

```typescript
// Before
const now = new Date();

// After
const now = getCurrentUtcTimestamp();
```

2. **Update display logic:**

```typescript
// Before
const displayTime = timestamp.toLocaleString();

// After
const displayTime = formatInTimezone(timestamp, userTimezone);
```

3. **Add timezone validation:**

```typescript
// Before
const timezone = userInput;

// After
const timezone = isValidTimezone(userInput) ? userInput : "UTC";
```

## Troubleshooting

### Common Issues

#### 1. Timezone Not Detected

```typescript
// Problem: getUserTimezone() returns "UTC"
// Solution: Check browser support
if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
} else {
  // Fallback to UTC
}
```

#### 2. DST Issues

```typescript
// Problem: Times are off by 1 hour during DST transitions
// Solution: Use timezone-aware utilities
const timezoneInfo = getTimezoneInfo(timezone, date);
if (timezoneInfo.isDST) {
  // Handle DST logic
}
```

#### 3. Invalid Timezone Strings

```typescript
// Problem: Database constraint violations
// Solution: Validate before storage
if (!isValidTimezone(timezone)) {
  timezone = "UTC";
}
```

#### 4. Display Formatting Issues

```typescript
// Problem: Inconsistent date formatting
// Solution: Use consistent format options
const formatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};
```

### Debug Utilities

```typescript
// Debug timezone conversion
function debugTimezoneConversion(utcDate: Date, timezone: string) {
  console.log("UTC Date:", utcDate.toISOString());
  console.log("Target Timezone:", timezone);
  console.log("Converted:", utcToUserTimezone(utcDate, timezone));
  console.log("Timezone Info:", getTimezoneInfo(timezone, utcDate));
}

// Debug database operations
function debugDatabaseTimezone(timestamp: string) {
  console.log("Database Timestamp:", timestamp);
  console.log("As Date Object:", new Date(timestamp));
  console.log("UTC String:", toUtcForDb(new Date(timestamp)));
}
```

## Future Enhancements

### Planned Features

1. **Timezone Maps Integration**

   - Visual timezone selection with world map
   - Click-to-select timezone regions
   - Interactive timezone comparison

2. **Advanced Scheduling**

   - Multi-timezone meeting scheduling
   - Automatic timezone conflict detection
   - Smart meeting time suggestions

3. **Timezone Analytics**

   - User timezone distribution
   - Peak activity time analysis
   - Cross-timezone collaboration metrics

4. **Enhanced Validation**
   - Real-time timezone validation
   - Custom timezone rules
   - Historical timezone data

### Performance Optimizations

1. **Caching**

   - Cache timezone calculations
   - Memoize frequently used conversions
   - Optimize timezone lookups

2. **Bundle Optimization**

   - Lazy load timezone data
   - Tree-shake unused timezone utilities
   - Optimize timezone selector bundle size

3. **Database Optimization**
   - Index timezone columns
   - Optimize timezone queries
   - Cache validation results

### Integration Opportunities

1. **Calendar Services**

   - Google Calendar timezone sync
   - Outlook timezone integration
   - iCal timezone support

2. **Communication Platforms**

   - Slack timezone integration
   - Teams timezone awareness
   - Email timezone headers

3. **Travel Services**
   - Flight booking timezone sync
   - Hotel booking timezone awareness
   - Travel itinerary timezone management

---

## Summary

The Perin timezone system provides a comprehensive, user-friendly solution for handling timezones across all application layers. By following the "UTC storage, local display" principle and implementing robust validation and conversion utilities, the system ensures consistent, bug-free timezone handling while providing an excellent user experience.

The modular design allows for easy extension and maintenance, while the comprehensive documentation ensures that both human developers and AI assistants can understand and work with the system effectively.
