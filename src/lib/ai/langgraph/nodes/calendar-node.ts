import type { LangGraphChatState } from "../../../../types";
import {
  fetchRecentEvents,
  getCalendarAvailability,
} from "../../../../lib/integrations/calendar/client";
import * as integrationQueries from "../../../../lib/queries/integrations";

export const calendarNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
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

    // Check if conversation mentions calendar-related keywords
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

    // Smart context loading - only load calendar data if contextually relevant
    let calendarContext = {};

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

      calendarContext = {
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
      };
    }

    return {
      calendarContext,
      currentStep: "calendar_context_loaded",
    };
  } catch (error) {
    console.error("Error in Calendar node:", error);
    return {
      calendarContext: {},
      currentStep: "calendar_error",
      error:
        error instanceof Error ? error.message : "Calendar integration error",
    };
  }
};
