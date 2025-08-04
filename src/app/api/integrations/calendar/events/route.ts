import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import {
  fetchRecentEvents,
  createCalendarEvent,
} from "@/lib/integrations/calendar/client";
import { ErrorResponses } from "@/lib/utils/error-handlers";
import type { CreateEventRequest } from "@/types/calendar";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");
    const maxResults = parseInt(searchParams.get("maxResults") || "10");

    // Fetch recent events
    const events = await fetchRecentEvents(userId, days, maxResults);

    return Response.json({
      events,
      count: events.length,
      message: "Calendar events fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return ErrorResponses.internalServerError(
      "Failed to fetch calendar events"
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Parse request body
    const body = await request.json();
    const eventData: CreateEventRequest = body;

    // Validate required fields
    if (!eventData.summary || !eventData.start || !eventData.end) {
      return ErrorResponses.badRequest("Summary, start, and end are required");
    }

    // Create calendar event
    const event = await createCalendarEvent(userId, eventData);

    return Response.json({
      event,
      message: "Calendar event created successfully",
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return ErrorResponses.internalServerError(
      "Failed to create calendar event"
    );
  }
}
