import { createCalendarClient, refreshCalendarToken } from "./auth";
import type { CalendarEvent, CreateEventRequest } from "@/types/calendar";
import { calendar_v3 } from "googleapis";
import {
  getUserIntegration,
  updateIntegrationTokens,
  getUserIntegrations,
} from "@/lib/queries/integrations";
import { isReauthError } from "@/lib/integrations/errors";
import {
  createIntegrationError,
  IntegrationType,
  IntegrationErrorType,
} from "../errors";
import { isValidTimezone } from "@/lib/utils/timezone";

/**
 * Fetch recent calendar events for a user
 */
export const fetchRecentEvents = async (
  userId: string,
  days: number = 7,
  maxResults: number = 10
): Promise<CalendarEvent[]> => {
  try {
    // Get user's calendar integration
    const integration = await getUserIntegration(userId, "calendar");

    if (!integration || !integration.is_active) {
      throw createIntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.NOT_CONNECTED,
        "Calendar integration not found or inactive"
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);

    let accessToken = integration.access_token;

    if (now >= expiresAt && integration.refresh_token) {
      try {
        const newTokens = await refreshCalendarToken(integration.refresh_token);
        accessToken = newTokens.access_token;

        // Update tokens in database
        await updateIntegrationTokens(
          integration.id,
          newTokens.access_token,
          newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
        );
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === "INVALID_GRANT") {
          throw createIntegrationError(
            IntegrationType.CALENDAR,
            IntegrationErrorType.REAUTH_REQUIRED,
            "Calendar token refresh failed - reauth required"
          );
        }
        throw error;
      }
    }

    // Create calendar client
    const calendar = createCalendarClient(accessToken);

    // Calculate date range
    const now_ = new Date();
    const timeMin = now_.toISOString();
    const timeMax = new Date(
      now_.getTime() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    // Fetch events
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id!,
      summary: event.summary || "No Title",
      description: event.description || "",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      location: event.location || "",
      attendees:
        event.attendees?.map((attendee) => ({
          email: attendee.email!,
          name: attendee.displayName || "",
          responseStatus: attendee.responseStatus || "needsAction",
        })) || [],
      organizer: event.organizer
        ? {
            email: event.organizer.email!,
            name: event.organizer.displayName || "",
          }
        : null,
      isAllDay: !event.start?.dateTime,
      status: event.status || "confirmed",
    }));
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw error;
  }
};

// Fetch recent events across all active calendar integrations for a user
export const fetchRecentEventsFromAll = async (
  userId: string,
  days: number = 7,
  maxResultsPerAccount: number = 5
): Promise<
  (CalendarEvent & { __accountId: string; __accountEmail?: string })[]
> => {
  const all = await getUserIntegrations(userId);
  const calIntegrations = all.filter(
    (i) => i.integration_type === "calendar" && i.is_active
  );

  const results: Array<
    CalendarEvent & { __accountId: string; __accountEmail?: string }
  > = [];
  let reauthErrorCount = 0;

  for (const integ of calIntegrations) {
    try {
      // Token handling similar to single-account path
      let accessToken = integ.access_token;
      const now = new Date();
      const expiresAt = new Date(integ.token_expires_at);
      if (now >= expiresAt && integ.refresh_token) {
        const newTokens = await refreshCalendarToken(integ.refresh_token);
        accessToken = newTokens.access_token;
        await updateIntegrationTokens(
          integ.id,
          newTokens.access_token,
          newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
        );
      }

      const calendar = createCalendarClient(accessToken);
      const now_ = new Date();
      const timeMin = now_.toISOString();
      const timeMax = new Date(
        now_.getTime() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        maxResults: maxResultsPerAccount,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      const accountEmail =
        (integ.metadata?.["accountEmail"] as string) || undefined;
      events.forEach((event) => {
        results.push({
          id: event.id!,
          summary: event.summary || "No Title",
          description: event.description || "",
          start: event.start?.dateTime || event.start?.date || "",
          end: event.end?.dateTime || event.end?.date || "",
          location: event.location || "",
          attendees:
            event.attendees?.map((attendee) => ({
              email: attendee.email!,
              name: attendee.displayName || "",
              responseStatus: attendee.responseStatus || "needsAction",
            })) || [],
          organizer: event.organizer
            ? {
                email: event.organizer.email!,
                name: event.organizer.displayName || "",
              }
            : null,
          isAllDay: !event.start?.dateTime,
          status: event.status || "confirmed",
          __accountId: integ.id,
          __accountEmail: accountEmail,
        });
      });
    } catch (err) {
      console.error("Calendar account fetch failed:", err);
      const code = (err as { code?: string })?.code;
      if (code === "INVALID_GRANT") {
        reauthErrorCount++;
        continue;
      }
      continue;
    }
  }

  // If all calendar accounts need reauth, throw an appropriate error
  if (
    reauthErrorCount > 0 &&
    results.length === 0 &&
    calIntegrations.length > 0
  ) {
    throw createIntegrationError(
      IntegrationType.CALENDAR,
      IntegrationErrorType.REAUTH_REQUIRED,
      "Calendar token refresh failed - reauth required"
    );
  }

  return results;
};

/**
 * Check availability for a specific time range
 */
export const checkCalendarAvailability = async (
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<{
  isAvailable: boolean;
  conflictingEvents: CalendarEvent[];
}> => {
  try {
    // Get user's calendar integration
    const integration = await getUserIntegration(userId, "calendar");

    if (!integration || !integration.is_active) {
      throw createIntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.NOT_CONNECTED,
        "Calendar integration not found or inactive"
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);

    let accessToken = integration.access_token;

    if (now >= expiresAt && integration.refresh_token) {
      try {
        const newTokens = await refreshCalendarToken(integration.refresh_token);
        accessToken = newTokens.access_token;

        // Update tokens in database
        await updateIntegrationTokens(
          integration.id,
          newTokens.access_token,
          newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
        );
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === "INVALID_GRANT") {
          throw createIntegrationError(
            IntegrationType.CALENDAR,
            IntegrationErrorType.REAUTH_REQUIRED,
            "Calendar token refresh failed - reauth required"
          );
        }
        throw error;
      }
    }

    // Create calendar client
    const calendar = createCalendarClient(accessToken);

    // Query events in the specified time range
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    // Filter out cancelled events and convert to our format
    const conflictingEvents: CalendarEvent[] = events
      .filter((event) => event.status !== "cancelled")
      .map((event) => ({
        id: event.id!,
        summary: event.summary || "No Title",
        description: event.description || "",
        start: event.start?.dateTime || event.start?.date || "",
        end: event.end?.dateTime || event.end?.date || "",
        location: event.location || "",
        attendees:
          event.attendees?.map((attendee) => ({
            email: attendee.email!,
            name: attendee.displayName || "",
            responseStatus: attendee.responseStatus || "needsAction",
          })) || [],
        organizer: event.organizer
          ? {
              email: event.organizer.email!,
              name: event.organizer.displayName || "",
            }
          : null,
        isAllDay: !event.start?.dateTime,
        status: event.status || "confirmed",
      }));

    // Check if the time slot is available (no conflicting events)
    const isAvailable = conflictingEvents.length === 0;

    return {
      isAvailable,
      conflictingEvents,
    };
  } catch (error) {
    if (isReauthError(error)) {
      throw error;
    }
    throw new Error(
      `Failed to check calendar availability: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (
  userId: string,
  eventData: CreateEventRequest
): Promise<CalendarEvent> => {
  try {
    // Get user's calendar integration
    const integration = await getUserIntegration(userId, "calendar");

    if (!integration || !integration.is_active) {
      throw createIntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.NOT_CONNECTED,
        "Calendar integration not found or inactive"
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);

    let accessToken = integration.access_token;

    if (now >= expiresAt && integration.refresh_token) {
      try {
        const newTokens = await refreshCalendarToken(integration.refresh_token);
        accessToken = newTokens.access_token;

        // Update tokens in database
        await updateIntegrationTokens(
          integration.id,
          newTokens.access_token,
          newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
        );
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === "INVALID_GRANT") {
          throw createIntegrationError(
            IntegrationType.CALENDAR,
            IntegrationErrorType.REAUTH_REQUIRED,
            "Calendar token refresh failed - reauth required"
          );
        }
        throw error;
      }
    }

    // Create calendar client
    const calendar = createCalendarClient(accessToken);

    // Prepare event data for Google Calendar API (typed)
    // FIXED: The datetime is already in local time, just format it properly
    const timezone = isValidTimezone(eventData.timeZone || "")
      ? eventData.timeZone
      : "UTC";

    // The datetime is already in local time, just format it for Google Calendar
    const startDate = new Date(eventData.start);
    const endDate = new Date(eventData.end);

    // Format as local datetime (without timezone suffix) - no conversion needed
    const startLocal = startDate.toISOString().slice(0, 19); // Remove timezone suffix
    const endLocal = endDate.toISOString().slice(0, 19); // Remove timezone suffix

    console.log("Calendar event timezone handling:", {
      originalStart: eventData.start,
      originalEnd: eventData.end,
      timezone,
      startLocal,
      endLocal,
      note: "Using local datetime directly for Google Calendar",
    });

    const googleEvent: calendar_v3.Schema$Event = {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: startLocal,
        timeZone: timezone,
      },
      end: {
        dateTime: endLocal,
        timeZone: timezone,
      },
      attendees: eventData.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    // Create event
    const { data: event } = await calendar.events.insert({
      calendarId: "primary",
      requestBody: googleEvent,
      sendUpdates: "all", // Send invitations to attendees
    });

    return {
      id: event.id!,
      summary: event.summary || "No Title",
      description: event.description || "",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      location: event.location || "",
      attendees:
        event.attendees?.map((attendee) => ({
          email: attendee.email!,
          name: attendee.displayName || "",
          responseStatus: attendee.responseStatus || "needsAction",
        })) || [],
      organizer: event.organizer
        ? {
            email: event.organizer.email!,
            name: event.organizer.displayName || "",
          }
        : null,
      isAllDay: !event.start?.dateTime,
      status: event.status || "confirmed",
    };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (
  userId: string,
  eventId: string
): Promise<boolean> => {
  try {
    const integration = await getUserIntegration(userId, "calendar");
    if (!integration || !integration.is_active) {
      throw createIntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.NOT_CONNECTED,
        "Calendar integration not found or inactive"
      );
    }

    let accessToken = integration.access_token;
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);
    if (now >= expiresAt && integration.refresh_token) {
      const newTokens = await refreshCalendarToken(integration.refresh_token);
      accessToken = newTokens.access_token;
      await updateIntegrationTokens(
        integration.id,
        newTokens.access_token,
        newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
      );
    }

    const calendar = createCalendarClient(accessToken);
    await calendar.events.delete({ calendarId: "primary", eventId });
    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return false;
  }
};

/**
 * Get user's calendar availability for a time range
 */
export const getCalendarAvailability = async (
  userId: string,
  startTime: string,
  endTime: string
): Promise<{ busy: Array<{ start: string; end: string }> }> => {
  try {
    // Get user's calendar integration
    const integration = await getUserIntegration(userId, "calendar");

    if (!integration || !integration.is_active) {
      throw createIntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.NOT_CONNECTED,
        "Calendar integration not found or inactive"
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);

    let accessToken = integration.access_token;

    console.log("Calendar token check:", {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      isExpired: now >= expiresAt,
      hasRefreshToken: !!integration.refresh_token,
      minutesSinceExpiry: Math.round(
        (now.getTime() - expiresAt.getTime()) / (1000 * 60)
      ),
    });

    if (now >= expiresAt && integration.refresh_token) {
      try {
        console.log("Attempting to refresh expired calendar token");
        const newTokens = await refreshCalendarToken(integration.refresh_token);
        accessToken = newTokens.access_token;

        // Update tokens in database
        await updateIntegrationTokens(
          integration.id,
          newTokens.access_token,
          newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
        );

        console.log("Calendar token refreshed successfully", {
          newExpiryDate: newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : "No expiry",
        });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === "INVALID_GRANT") {
          console.log("Calendar refresh token invalid - requires reauth");
          throw createIntegrationError(
            IntegrationType.CALENDAR,
            IntegrationErrorType.REAUTH_REQUIRED,
            "Calendar token refresh failed - reauth required"
          );
        }
        throw error;
      }
    } else if (now >= expiresAt && !integration.refresh_token) {
      console.log("Calendar token expired but no refresh token available");
      throw createIntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.REAUTH_REQUIRED,
        "Calendar token expired and no refresh token available"
      );
    }

    // Create calendar client
    const calendar = createCalendarClient(accessToken);

    // Get free/busy information
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime,
        timeMax: endTime,
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars?.primary?.busy || [];

    return {
      busy: busy.map((period) => ({
        start: period.start!,
        end: period.end!,
      })),
    };
  } catch (error) {
    console.error("Error getting calendar availability:", error);

    // Check for authentication-related errors from the API call
    if (error && typeof error === "object" && "code" in error) {
      const statusCode = (error as { code?: number }).code;
      if (statusCode === 401 || statusCode === 403) {
        throw createIntegrationError(
          IntegrationType.CALENDAR,
          IntegrationErrorType.REAUTH_REQUIRED,
          `Calendar API authentication failed (${statusCode})`
        );
      }
    }

    // For other errors, just re-throw them
    throw error;
  }
};
