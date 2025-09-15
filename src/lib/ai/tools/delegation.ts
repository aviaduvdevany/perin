/**
 * Delegation Tools
 *
 * Tool handlers for delegation feature actions like scheduling meetings
 * with the owner for external users.
 */

import { z } from "zod";
import {
  ToolSpec,
  ToolHandler,
  ToolContext,
  createToolSuccess,
  createToolError,
  ToolErrorCode,
} from "./types";
import {
  createCalendarEvent,
  checkCalendarAvailability,
} from "@/lib/integrations/calendar/client";
import { isReauthError } from "@/lib/integrations/errors";

/**
 * Format datetime for Google Calendar API (local time without timezone suffix)
 */
function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Check Owner Availability Tool Arguments
 */
export const checkOwnerAvailabilitySchema = z.object({
  startTime: z
    .string()
    .describe("ISO datetime for the proposed meeting start time"),
  durationMins: z
    .number()
    .min(5)
    .max(240)
    .describe("Meeting duration in minutes"),
  timezone: z
    .string()
    .optional()
    .describe("IANA timezone for the external user (e.g., 'America/New_York')"),
});

export type CheckOwnerAvailabilityArgs = z.infer<
  typeof checkOwnerAvailabilitySchema
>;

/**
 * Check Owner Availability Tool Result
 */
export interface CheckOwnerAvailabilityResult {
  isAvailable: boolean;
  proposedStartTime: string;
  proposedEndTime: string;
  timezone: string;
  eventId?: string;
  conflictingEvents?: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
  }>;
  alternativeSlots?: Array<{
    start: string;
    end: string;
  }>;
  message: string;
}

/**
 * OpenAI tool specification for check_owner_availability
 */
export const checkOwnerAvailabilitySpec: ToolSpec = {
  type: "function",
  function: {
    name: "delegation_check_availability",
    description:
      "Check if the owner is available at the proposed time. Use this FIRST before scheduling.",
    parameters: {
      type: "object",
      properties: {
        startTime: {
          type: "string",
          description: "ISO datetime for the proposed meeting start time",
        },
        durationMins: {
          type: "integer",
          minimum: 5,
          maximum: 240,
          description: "Meeting duration in minutes",
        },
        timezone: {
          type: "string",
          description:
            "IANA timezone for the external user (e.g., 'America/New_York')",
        },
      },
      required: ["startTime", "durationMins"],
    },
  },
};

/**
 * Schedule Meeting with Owner Tool Arguments
 */
export const scheduleWithOwnerSchema = z.object({
  startTime: z.string().describe("ISO datetime for the meeting start time"),
  durationMins: z
    .number()
    .min(5)
    .max(240)
    .describe("Meeting duration in minutes"),
  title: z.string().describe("Meeting title or description"),
  timezone: z
    .string()
    .optional()
    .describe("IANA timezone for the external user"),
  externalUserName: z
    .string()
    .optional()
    .describe("Name of the external user requesting the meeting"),
});

export type ScheduleWithOwnerArgs = z.infer<typeof scheduleWithOwnerSchema>;

/**
 * Schedule Meeting with Owner Tool Result
 */
export interface ScheduleWithOwnerResult {
  success: boolean;
  eventId?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  attendees?: Array<{
    email: string;
    name: string;
  }>;
  message: string;
}

/**
 * OpenAI tool specification for schedule_with_owner
 */
export const scheduleWithOwnerSpec: ToolSpec = {
  type: "function",
  function: {
    name: "delegation_schedule_meeting",
    description:
      "Schedule a meeting with the owner (the person who created the delegation link). Use this AFTER checking availability.",
    parameters: {
      type: "object",
      properties: {
        startTime: {
          type: "string",
          description: "ISO datetime for the meeting start time",
        },
        durationMins: {
          type: "integer",
          minimum: 5,
          maximum: 240,
          description: "Meeting duration in minutes",
        },
        title: {
          type: "string",
          description: "Meeting title or description",
        },
        timezone: {
          type: "string",
          description: "IANA timezone for the external user",
        },
        externalUserName: {
          type: "string",
          description: "Name of the external user requesting the meeting",
        },
      },
      required: ["startTime", "durationMins", "title"],
    },
  },
};

/**
 * Check owner availability at the proposed time
 */
export const checkOwnerAvailabilityHandler: ToolHandler<
  CheckOwnerAvailabilityArgs,
  CheckOwnerAvailabilityResult
> = async (context: ToolContext, args: CheckOwnerAvailabilityArgs) => {
  const { userId, delegationContext } = context;

  if (!delegationContext?.isDelegation) {
    return createToolError(
      ToolErrorCode.PERMISSION_DENIED,
      "This tool is only available in delegation mode"
    );
  }

  // Use the external user's timezone if provided, otherwise use the one from args
  const timezone =
    delegationContext.externalUserTimezone || args.timezone || "UTC";

  try {
    // Get owner's calendar availability
    const startTime = new Date(args.startTime);
    const endTime = new Date(startTime.getTime() + args.durationMins * 60000);

    // Check real calendar availability using the calendar integration
    try {
      // Use the real availability checking function
      const availabilityResult = await checkCalendarAvailability(
        userId,
        startTime,
        endTime
      );

      if (availabilityResult.isAvailable) {
        // Detect user's language for response from conversation context
        const isHebrew =
          context.conversationContext &&
          /[\u0590-\u05FF]/.test(context.conversationContext);

        const availableMessage = isHebrew
          ? `בדקתי את היומן על ${startTime.toLocaleString()} (${timezone}) והזמן פנוי.`
          : `I've checked the owner's calendar for ${startTime.toLocaleString()} (${timezone}) and the time slot is available.`;

        return createToolSuccess({
          isAvailable: true,
          proposedStartTime: startTime.toISOString(),
          proposedEndTime: endTime.toISOString(),
          timezone,
          message: availableMessage,
        });
      } else {
        // Time slot has conflicts
        const conflictCount = availabilityResult.conflictingEvents.length;
        const conflictSummary = availabilityResult.conflictingEvents
          .slice(0, 2) // Show at most 2 conflicts
          .map((event) => event.summary)
          .join(", ");

        // Detect user's language for conflict message
        const isHebrew =
          context.conversationContext &&
          /[\u0590-\u05FF]/.test(context.conversationContext);

        const conflictMessage = isHebrew
          ? `הזמן המבוקש מתנגש עם ${conflictCount} ${
              conflictCount > 1 ? "ים" : ""
            } ${conflictCount > 1 ? "ים" : "אירוע"}${
              conflictSummary ? `: ${conflictSummary}` : ""
            }.`
          : `The requested time slot conflicts with ${conflictCount} existing event${
              conflictCount > 1 ? "s" : ""
            }${
              conflictSummary ? `: ${conflictSummary}` : ""
            }. Please suggest alternative times.`;

        return createToolSuccess({
          isAvailable: false,
          proposedStartTime: startTime.toISOString(),
          proposedEndTime: endTime.toISOString(),
          timezone,
          conflictingEvents: availabilityResult.conflictingEvents,
          message: conflictMessage,
        });
      }
    } catch (error) {
      // Handle specific calendar errors
      if (isReauthError(error)) {
        return createToolError(
          ToolErrorCode.UNAUTHORIZED,
          "Calendar authentication expired - please reconnect your calendar to check availability"
        );
      }

      return createToolError(
        ToolErrorCode.INTERNAL_ERROR,
        `Failed to check calendar availability: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  } catch (error) {
    if (isReauthError(error)) {
      throw error;
    }

    return createToolError(
      ToolErrorCode.INTERNAL_ERROR,
      `Failed to check availability: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Schedule a meeting with the owner
 */
export const scheduleWithOwnerHandler: ToolHandler<
  ScheduleWithOwnerArgs,
  ScheduleWithOwnerResult
> = async (context: ToolContext, args: ScheduleWithOwnerArgs) => {
  const { userId, delegationContext } = context;

  if (!delegationContext?.isDelegation) {
    return createToolError(
      ToolErrorCode.PERMISSION_DENIED,
      "This tool is only available in delegation mode"
    );
  }

  // Use the external user's timezone if provided, otherwise use the one from args
  const timezone =
    delegationContext.externalUserTimezone || args.timezone || "UTC";

  try {
    const startTime = new Date(args.startTime);
    const endTime = new Date(startTime.getTime() + args.durationMins * 60000);

    // Prepare event details
    const eventTitle = `${args.title}`;
    const externalUserName =
      args.externalUserName ||
      delegationContext.externalUserName ||
      "External User";
    const externalUserEmail = (
      delegationContext as typeof delegationContext & {
        externalUserEmail?: string;
      }
    ).externalUserEmail;

    // Prepare attendees list
    const attendees = [];
    if (externalUserEmail) {
      attendees.push({
        email: externalUserEmail,
        name: externalUserName,
      });
    }

    // Create comprehensive meeting description
    const description = [
      `Meeting scheduled via Perin delegation with ${externalUserName}`,
      `Duration: ${args.durationMins} minutes`,
      externalUserEmail &&
        `External attendee: ${externalUserName} (${externalUserEmail})`,
      `Scheduled on: ${new Date().toLocaleString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Format datetime for Google Calendar (local time without timezone suffix)
    // Our parser returns a Date in local time, so we need to format it properly

    console.log("🕐 Delegation calendar event formatting:", {
      originalStartTime: startTime.toString(),
      originalEndTime: endTime.toString(),
      timezone,
      startFormatted: formatLocalDateTime(startTime),
      endFormatted: formatLocalDateTime(endTime),
      note: "Formatting local time for Google Calendar API",
    });

    // Create calendar event with proper attendee management
    const event = await createCalendarEvent(userId, {
      summary: eventTitle,
      description,
      start: formatLocalDateTime(startTime),
      end: formatLocalDateTime(endTime),
      timeZone: timezone,
      attendees: attendees.length > 0 ? attendees : undefined,
    });

    const successMessage = externalUserEmail
      ? `I've successfully scheduled "${
          args.title
        }" for ${startTime.toLocaleString()} (${timezone}). The meeting has been added to the owner's calendar and a calendar invitation has been sent to ${externalUserName} at ${externalUserEmail}.`
      : `I've successfully scheduled "${
          args.title
        }" for ${startTime.toLocaleString()} (${timezone}). The meeting has been added to the owner's calendar. Please share the meeting details with ${externalUserName} separately.`;

    return createToolSuccess({
      success: true,
      eventId: event.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone,
      attendees: attendees,
      message: successMessage,
    });
  } catch (error) {
    if (isReauthError(error)) {
      throw error;
    }

    return createToolError(
      ToolErrorCode.INTERNAL_ERROR,
      `Failed to schedule meeting: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
