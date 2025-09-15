/**
 * Calendar Tools
 *
 * Tool handlers for direct calendar operations (not network meetings)
 */

import { z } from "zod";
import {
  ToolSpec,
  ToolHandler,
  ToolContext,
  ToolEnvelope,
  createToolSuccess,
  createToolError,
  createToolNeeds,
  ToolErrorCode,
} from "./types";
import { createCalendarEvent } from "@/lib/integrations/calendar/client";
import { isReauthError } from "@/lib/integrations/errors";
import { getUserById } from "@/lib/queries/users";

/**
 * Create Solo Calendar Event Tool Arguments
 */
export const createSoloEventSchema = z.object({
  title: z.string().describe("Title or summary of the calendar event"),
  startTime: z.string().describe("ISO datetime for the event start time"),
  durationMins: z
    .number()
    .min(5)
    .max(480)
    .describe("Event duration in minutes"),
  description: z
    .string()
    .optional()
    .describe("Optional description for the event"),
  location: z.string().optional().describe("Optional location for the event"),
  timezone: z.string().optional().describe("IANA timezone for the event"),
});

export type CreateSoloEventArgs = z.infer<typeof createSoloEventSchema>;

/**
 * Create Solo Calendar Event Tool Result
 */
export interface CreateSoloEventResult {
  success: boolean;
  eventId?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  message: string;
}

/**
 * OpenAI tool specification for create_solo_event
 */
export const createSoloEventSpec: ToolSpec = {
  type: "function",
  function: {
    name: "calendar_create_solo_event",
    description:
      "Create a solo calendar event for the user (not a meeting with others).",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title or summary of the calendar event",
        },
        startTime: {
          type: "string",
          description: "ISO datetime for the event start time",
        },
        durationMins: {
          type: "integer",
          minimum: 5,
          maximum: 480,
          description: "Event duration in minutes",
        },
        description: {
          type: "string",
          description: "Optional description for the event",
        },
        location: {
          type: "string",
          description: "Optional location for the event",
        },
        timezone: {
          type: "string",
          description: "IANA timezone for the event",
        },
      },
      required: ["title", "startTime", "durationMins"],
    },
  },
};

/**
 * Create a solo calendar event
 */
export const createSoloEventHandler: ToolHandler<
  CreateSoloEventArgs,
  CreateSoloEventResult
> = async (context: ToolContext, args: CreateSoloEventArgs) => {
  const { userId } = context;

  try {
    // Get user's timezone from database
    const user = await getUserById(userId)
    const userTimezone = user?.timezone || "UTC";

    const startTime = new Date(args.startTime);
    const endTime = new Date(startTime.getTime() + args.durationMins * 60000);
    const timezone = args.timezone || userTimezone;

    // Create calendar event
    const event = await createCalendarEvent(userId, {
      summary: args.title,
      description: args.description || "",
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      timeZone: timezone,
      location: args.location,
    });

    return createToolSuccess({
      success: true,
      eventId: event.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone,
      message: `I've created a calendar event titled "${
        args.title
      }" for ${startTime.toLocaleString()} (${timezone}). The event will last ${
        args.durationMins
      } minutes.`,
    });
  } catch (error) {
    if (isReauthError(error)) {
      throw error;
    }

    return createToolError(
      ToolErrorCode.INTERNAL_ERROR,
      `Failed to create calendar event: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
