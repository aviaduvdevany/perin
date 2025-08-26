import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";
import { fetchRecentEvents } from "@/lib/integrations/calendar/client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Fetch calendar events
    const events = await fetchRecentEvents(userId, 7, 10);

    // Find next event
    const nextEvent =
      events.find((event) => {
        const eventStart = new Date(event.start);
        return eventStart > new Date();
      }) || null;

    const calendarContext = {
      events,
      nextEvent,
      availability: {},
      lastUpdated: Date.now(),
    };

    return Response.json({
      success: true,
      data: calendarContext,
    });
  } catch (error) {
    console.error("Error fetching calendar context:", error);

    // Return empty context on error
    return Response.json({
      success: true,
      data: {
        events: [],
        nextEvent: null,
        availability: {},
        lastUpdated: Date.now(),
      },
    });
  }
}
