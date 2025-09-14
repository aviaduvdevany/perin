import { z } from "zod";

// IANA timezone validation schema
export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid IANA timezone identifier" }
);

// Common timezone options with proper labels
export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
  { value: "Europe/Zurich", label: "Zurich (CET/CEST)" },
  { value: "Europe/Vienna", label: "Vienna (CET/CEST)" },
  { value: "Europe/Prague", label: "Prague (CET/CEST)" },
  { value: "Europe/Budapest", label: "Budapest (CET/CEST)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET/CEST)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)" },
  { value: "Europe/Athens", label: "Athens (EET/EEST)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Tel_Aviv", label: "Tel Aviv (IST)" },
  { value: "Asia/Jerusalem", label: "Jerusalem (IST)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST)" },
  { value: "Asia/Dhaka", label: "Dhaka (BST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Manila", label: "Manila (PHT)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { value: "Pacific/Fiji", label: "Fiji (FJT)" },
] as const;

export type TimezoneOption = (typeof TIMEZONE_OPTIONS)[number];

/**
 * Get user's timezone from browser with robust detection
 */
export function getUserTimezone(): string {
  try {
    // Primary method: Intl.DateTimeFormat
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone && timezoneSchema.safeParse(timezone).success) {
        return timezone;
      }
    }

    // Fallback method: Check if timezone is supported
    const testDate = new Date();
    const testTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      // Test if the timezone is actually supported
      new Intl.DateTimeFormat("en-US", { timeZone: testTimezone }).format(
        testDate
      );
      return testTimezone;
    } catch {
      // If not supported, try to detect from offset
      return detectTimezoneFromOffset();
    }
  } catch {
    return detectTimezoneFromOffset();
  }
}

/**
 * Fallback timezone detection from offset
 */
function detectTimezoneFromOffset(): string {
  try {
    const offset = new Date().getTimezoneOffset();
    const offsetHours = -offset / 60;

    // Common timezone mappings based on offset
    const timezoneMap: Record<number, string> = {
      "-12": "Pacific/Kwajalein",
      "-11": "Pacific/Midway",
      "-10": "Pacific/Honolulu",
      "-9": "America/Anchorage",
      "-8": "America/Los_Angeles",
      "-7": "America/Denver",
      "-6": "America/Chicago",
      "-5": "America/New_York",
      "-4": "America/Caracas",
      "-3": "America/Argentina/Buenos_Aires",
      "-2": "Atlantic/South_Georgia",
      "-1": "Atlantic/Azores",
      "0": "UTC",
      "1": "Europe/London",
      "2": "Europe/Paris",
      "3": "Europe/Moscow",
      "4": "Asia/Dubai",
      "5": "Asia/Karachi",
      "6": "Asia/Dhaka",
      "7": "Asia/Bangkok",
      "8": "Asia/Shanghai",
      "9": "Asia/Tokyo",
      "10": "Australia/Sydney",
      "11": "Pacific/Norfolk",
      "12": "Pacific/Auckland",
    };

    return timezoneMap[offsetHours as keyof typeof timezoneMap] || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  return timezoneSchema.safeParse(timezone).success;
}

/**
 * Get timezone offset in minutes for a specific date
 */
export function getTimezoneOffset(
  timezone: string,
  date: Date = new Date()
): number {
  try {
    const utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const target = new Date(
      utc.toLocaleString("en-US", { timeZone: timezone })
    );
    return (utc.getTime() - target.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/**
 * Convert UTC date to user's timezone
 */
export function utcToUserTimezone(
  utcDate: Date | string,
  userTimezone: string
): Date {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;

  if (!isValidTimezone(userTimezone)) {
    return date;
  }

  try {
    // Create a new date in the user's timezone
    const userTime = new Date(
      date.toLocaleString("en-US", { timeZone: userTimezone })
    );
    return userTime;
  } catch {
    return date;
  }
}

/**
 * Convert user's timezone date to UTC
 */
export function userTimezoneToUtc(
  userDate: Date | string,
  userTimezone: string
): Date {
  const date = typeof userDate === "string" ? new Date(userDate) : userDate;

  if (!isValidTimezone(userTimezone)) {
    return date;
  }

  try {
    // Get the timezone offset
    const offset = getTimezoneOffset(userTimezone, date);
    // Adjust the date by the offset to get UTC
    return new Date(date.getTime() - offset * 60000);
  } catch {
    return date;
  }
}

/**
 * Format date in user's timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (!isValidTimezone(timezone)) {
    return dateObj.toLocaleString();
  }

  try {
    return dateObj.toLocaleString("en-US", {
      timeZone: timezone,
      ...options,
    });
  } catch {
    return dateObj.toLocaleString();
  }
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    return new Date();
  }

  try {
    return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  } catch {
    return new Date();
  }
}

/**
 * Check if a time is within business hours for a timezone
 */
export function isBusinessHours(
  date: Date,
  timezone: string,
  startHour: number = 9,
  endHour: number = 17
): boolean {
  const localTime = utcToUserTimezone(date, timezone);
  const hour = localTime.getHours();
  return hour >= startHour && hour < endHour;
}

/**
 * Get next business day in user's timezone
 */
export function getNextBusinessDay(
  timezone: string,
  date: Date = new Date()
): Date {
  const localTime = utcToUserTimezone(date, timezone);
  const nextDay = new Date(localTime);
  nextDay.setDate(nextDay.getDate() + 1);

  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return userTimezoneToUtc(nextDay, timezone);
}

/**
 * Calculate time difference between two timezones for a specific date
 */
export function getTimezoneDifference(
  timezone1: string,
  timezone2: string,
  date: Date = new Date()
): number {
  const offset1 = getTimezoneOffset(timezone1, date);
  const offset2 = getTimezoneOffset(timezone2, date);
  return offset1 - offset2;
}

/**
 * Find common business hours between two timezones
 */
export function findCommonBusinessHours(
  timezone1: string,
  timezone2: string,
  startHour1: number = 9,
  endHour1: number = 17,
  startHour2: number = 9,
  endHour2: number = 17
): { start: number; end: number } | null {
  const diff = getTimezoneDifference(timezone1, timezone2);

  // Adjust hours based on timezone difference
  const adjustedStart1 = startHour1 - diff;
  const adjustedEnd1 = endHour1 - diff;

  const commonStart = Math.max(adjustedStart1, startHour2);
  const commonEnd = Math.min(adjustedEnd1, endHour2);

  if (commonStart < commonEnd) {
    return { start: commonStart, end: commonEnd };
  }

  return null;
}

/**
 * Format timezone for display
 */
export function formatTimezone(timezone: string): string {
  const option = TIMEZONE_OPTIONS.find((tz) => tz.value === timezone);
  return option ? option.label : timezone;
}

/**
 * Get timezone abbreviation for a specific date
 */
export function getTimezoneAbbreviation(
  timezone: string,
  date: Date = new Date()
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find((part) => part.type === "timeZoneName");
    return timeZonePart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Check if a date is in daylight saving time for a timezone
 */
export function isDST(timezone: string, date: Date = new Date()): boolean {
  try {
    const jan = new Date(date.getFullYear(), 0, 1);
    const currentOffset = getTimezoneOffset(timezone, date);
    const janOffset = getTimezoneOffset(timezone, jan);

    // If current offset is different from January, it's likely DST
    return currentOffset !== janOffset;
  } catch {
    return false;
  }
}

/**
 * Get timezone info for display
 */
export function getTimezoneInfo(timezone: string, date: Date = new Date()) {
  return {
    timezone,
    abbreviation: getTimezoneAbbreviation(timezone, date),
    offset: getTimezoneOffset(timezone, date),
    isDST: isDST(timezone, date),
    currentTime: getCurrentTimeInTimezone(timezone),
  };
}

/**
 * Parse user input time and return it as-is in the user's timezone
 * This is the key function for the new approach - no conversion, just parsing
 */
export function parseUserTimeInput(
  timeInput: string,
  userTimezone: string
): {
  dateTime: Date;
  timezone: string;
  isValid: boolean;
  error?: string;
} {
  console.log("🔍 DEBUG: parseUserTimeInput called with:", {
    timeInput,
    userTimezone,
    currentTime: new Date().toISOString(),
  });

  try {
    // Validate timezone first
    if (!isValidTimezone(userTimezone)) {
      console.log("🔍 DEBUG: Invalid timezone detected:", userTimezone);
      return {
        dateTime: new Date(),
        timezone: "UTC",
        isValid: false,
        error: "Invalid timezone",
      };
    }

    // Parse the time input (this is where we'd add more sophisticated parsing)
    const parsedDate = parseTimeString(timeInput, userTimezone);

    if (!parsedDate) {
      console.log("🔍 DEBUG: Could not parse time string:", timeInput);
      return {
        dateTime: new Date(),
        timezone: userTimezone,
        isValid: false,
        error: "Could not parse time input",
      };
    }

    console.log("🔍 DEBUG: Successfully parsed time:", {
      originalInput: timeInput,
      userTimezone,
      parsedDate: parsedDate.toISOString(),
      parsedDateLocal: parsedDate.toLocaleString(),
    });

    return {
      dateTime: parsedDate,
      timezone: userTimezone,
      isValid: true,
    };
  } catch (error) {
    console.log("🔍 DEBUG: Error in parseUserTimeInput:", error);
    return {
      dateTime: new Date(),
      timezone: userTimezone,
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse time string in user's timezone context
 */
function parseTimeString(timeInput: string, userTimezone: string): Date | null {
  const lowerInput = timeInput.toLowerCase();

  // Get current time in user's timezone for context
  const now = new Date();
  const userNow = new Date(
    now.toLocaleString("en-US", { timeZone: userTimezone })
  );

  // Parse relative times (tomorrow, next week, etc.)
  if (lowerInput.includes("tomorrow")) {
    const tomorrow = new Date(userNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return parseTimeFromDate(tomorrow, lowerInput, userTimezone);
  }

  if (lowerInput.includes("today")) {
    return parseTimeFromDate(userNow, lowerInput, userTimezone);
  }

  // Parse day of week
  const dayPatterns = [
    { pattern: /monday|mon/i, dayOffset: 1 },
    { pattern: /tuesday|tue/i, dayOffset: 2 },
    { pattern: /wednesday|wed/i, dayOffset: 3 },
    { pattern: /thursday|thu/i, dayOffset: 4 },
    { pattern: /friday|fri/i, dayOffset: 5 },
    { pattern: /saturday|sat/i, dayOffset: 6 },
    { pattern: /sunday|sun/i, dayOffset: 0 },
  ];

  for (const { pattern, dayOffset } of dayPatterns) {
    if (pattern.test(lowerInput)) {
      const targetDate = getNextDayOfWeek(userNow, dayOffset);
      return parseTimeFromDate(targetDate, lowerInput, userTimezone);
    }
  }

  // Default to tomorrow if no specific day mentioned
  const tomorrow = new Date(userNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return parseTimeFromDate(tomorrow, lowerInput, userTimezone);
}

/**
 * Parse time from a given date
 */
function parseTimeFromDate(
  baseDate: Date,
  timeInput: string,
  _userTimezone: string
): Date {
  const lowerInput = timeInput.toLowerCase();

  // Default time
  let hour = 14; // 2 PM
  let minute = 0;

  // Parse time patterns
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /(\d{1,2})\s*(am|pm)/i,
  ];

  for (const pattern of timePatterns) {
    const match = lowerInput.match(pattern);
    if (match) {
      hour = parseInt(match[1]);
      minute = match[2] ? parseInt(match[2]) : 0;

      if (match[3]) {
        const ampm = match[3].toLowerCase();
        if (ampm === "pm" && hour !== 12) {
          hour += 12;
        } else if (ampm === "am" && hour === 12) {
          hour = 0;
        }
      }
      break;
    }
  }

  // Create the date in user's timezone
  const resultDate = new Date(baseDate);
  resultDate.setHours(hour, minute, 0, 0);

  return resultDate;
}

/**
 * Get next occurrence of a day of week
 */
function getNextDayOfWeek(fromDate: Date, targetDay: number): Date {
  const currentDay = fromDate.getDay();
  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  if (daysUntilTarget === 0) daysUntilTarget = 7; // Next week

  const targetDate = new Date(fromDate);
  targetDate.setDate(fromDate.getDate() + daysUntilTarget);
  return targetDate;
}
