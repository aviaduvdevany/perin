import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";
import type { CreateEventRequest } from "@/types/calendar";

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
    if (params?.maxResults) queryParams.append("maxResults", params.maxResults.toString());

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

export const createCalendarEventService = async (eventData: CreateEventRequest) => {
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
