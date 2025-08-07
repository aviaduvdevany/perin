import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";
import type { CreateEventRequest } from "@/types/calendar";
import type { IntegrationType } from "@/types/integrations";

/**
 * Unified integration connection service
 */
export const connectIntegrationService = async (type: IntegrationType) => {
  try {
    const response = await internalApiRequest(
      "integrations/connect",
      HTTPMethod.POST,
      { type }
    );
    return response;
  } catch (error) {
    console.error(`Error connecting ${type}:`, error);
    throw error;
  }
};

/**
 * Get available integrations
 */
export const getAvailableIntegrationsService = async () => {
  try {
    const response = await internalApiRequest(
      "integrations/connect",
      HTTPMethod.GET
    );
    return response;
  } catch (error) {
    console.error("Error getting available integrations:", error);
    throw error;
  }
};

/**
 * Legacy service functions for backward compatibility
 */
export const connectGmailService = async () => {
  return connectIntegrationService('gmail');
};

export const connectCalendarService = async () => {
  return connectIntegrationService('calendar');
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
