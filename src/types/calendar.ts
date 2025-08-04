// Calendar integration types
export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  attendees: CalendarAttendee[];
  organizer: CalendarOrganizer | null;
  isAllDay: boolean;
  status: string;
}

export interface CalendarAttendee {
  email: string;
  name: string;
  responseStatus: string;
}

export interface CalendarOrganizer {
  email: string;
  name: string;
}

export interface CreateEventRequest {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timeZone?: string;
  attendees?: Array<{
    email: string;
    name: string;
  }>;
}

export interface CalendarAvailability {
  busy: Array<{
    start: string;
    end: string;
  }>;
}

// API response types
export interface CalendarConnectResponse {
  authUrl: string;
  message: string;
}

export interface CalendarCallbackRequest {
  code: string;
}

export interface CalendarCallbackResponse {
  message: string;
  integration: {
    id: string;
    type: string;
    connected_at: string;
    scopes: string[];
  };
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  count: number;
  message: string;
}

export interface CreateEventResponse {
  event: CalendarEvent;
  message: string;
}

export interface CalendarAvailabilityResponse {
  availability: CalendarAvailability;
  message: string;
}
