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
 * Get user's timezone from browser
 */
export function getUserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezoneSchema.safeParse(timezone).success ? timezone : "UTC";
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
