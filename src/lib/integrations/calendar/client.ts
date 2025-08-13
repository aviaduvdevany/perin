import { createCalendarClient, refreshCalendarToken } from "./auth";
import type { CalendarEvent, CreateEventRequest } from "@/types/calendar";
import { calendar_v3 } from "googleapis";
import {
  getUserIntegration,
  updateIntegrationTokens,
} from "@/lib/queries/integrations";

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
      const e = new Error("CALENDAR_NOT_CONNECTED");
      // @ts-expect-error annotate
      e.code = "CALENDAR_NOT_CONNECTED";
      throw e;
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
          const e = new Error("CALENDAR_REAUTH_REQUIRED");
          // @ts-expect-error augment for upstream
          e.code = "CALENDAR_REAUTH_REQUIRED";
          throw e;
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
      const e = new Error("CALENDAR_NOT_CONNECTED");
      // @ts-expect-error annotate
      e.code = "CALENDAR_NOT_CONNECTED";
      throw e;
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
          const e = new Error("CALENDAR_REAUTH_REQUIRED");
          // @ts-expect-error augment for upstream
          e.code = "CALENDAR_REAUTH_REQUIRED";
          throw e;
        }
        throw error;
      }
    }

    // Create calendar client
    const calendar = createCalendarClient(accessToken);

    // Prepare event data for Google Calendar API (typed)
    const googleEvent: calendar_v3.Schema$Event = {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.start,
        timeZone: eventData.timeZone || "UTC",
      },
      end: {
        dateTime: eventData.end,
        timeZone: eventData.timeZone || "UTC",
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
      const e = new Error("CALENDAR_NOT_CONNECTED");
      // @ts-expect-error annotate
      e.code = "CALENDAR_NOT_CONNECTED";
      throw e;
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
      throw new Error("Calendar integration not found or inactive");
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
          const e = new Error("CALENDAR_REAUTH_REQUIRED");
          // @ts-expect-error augment for upstream
          e.code = "CALENDAR_REAUTH_REQUIRED";
          throw e;
        }
        throw error;
      }
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
    throw error;
  }
};
