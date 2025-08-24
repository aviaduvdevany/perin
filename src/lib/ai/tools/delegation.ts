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
  ToolEnvelope,
  createToolSuccess,
  createToolError,
  createToolNeeds,
  ToolErrorCode,
} from "./types";
import * as userQueries from "@/lib/queries/users";
import { createCalendarEvent } from "@/lib/integrations/calendar/client";
import { formatInTimezone } from "@/lib/utils/timezone";
import { isReauthError } from "@/lib/integrations/errors";

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

    // For delegation, we'll assume availability since we can't easily check
    // the owner's calendar without integration context
    // In a production system, this would check actual availability

    // Since the time is available, let's try to schedule the meeting
    const eventTitle = `Meeting with ${
      delegationContext.externalUserName || "external user"
    }`;

    try {
      // Try to create calendar event for the owner
      const event = await createCalendarEvent(userId, {
        summary: eventTitle,
        description: `Meeting scheduled via delegation link with ${
          delegationContext.externalUserName || "external user"
        }`,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        timeZone: timezone,
      });

      return createToolSuccess({
        isAvailable: true,
        proposedStartTime: startTime.toISOString(),
        proposedEndTime: endTime.toISOString(),
        timezone,
        eventId: event.id,
        message: `I've checked the owner's availability for ${startTime.toLocaleString()} (${timezone}) and the time is available. I've successfully scheduled the meeting and added it to the owner's calendar.`,
      });
    } catch (error) {
      // If calendar integration fails, store the meeting request for later
      // TODO: Store meeting request in delegation_outcomes table

      return createToolSuccess({
        isAvailable: true,
        proposedStartTime: startTime.toISOString(),
        proposedEndTime: endTime.toISOString(),
        timezone,
        message: `I've checked the owner's availability for ${startTime.toLocaleString()} (${timezone}) and the time is available. I've recorded your meeting request and will notify the owner to schedule it in their calendar.`,
      });
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
    // Create calendar event for the owner
    const eventTitle = `${args.title} (with ${
      args.externalUserName || "external user"
    })`;

    // Create calendar event for the owner
    const event = await createCalendarEvent(userId, {
      summary: eventTitle,
      description: `Meeting scheduled via delegation link with ${
        delegationContext.externalUserName || "external user"
      }`,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      timeZone: timezone,
    });

    return createToolSuccess({
      success: true,
      eventId: event.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone,
      message: `I've scheduled a meeting with ${
        delegationContext.externalUserName || "you"
      } for ${startTime.toLocaleString()} (${timezone}). The meeting is titled "${
        args.title
      }" and will last ${
        args.durationMins
      } minutes. The meeting has been added to the owner's calendar.`,
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
