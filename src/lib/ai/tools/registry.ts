/**
 * Tool Registry
 *
 * Central registry that maps tool names to OpenAI specifications and server handlers.
 * This enables the LLM to make structured tool calls while maintaining type safety.
 */

import { ToolSpec } from "./types";
import {
  scheduleMeetingSpec,
  scheduleMeetingHandler,
  scheduleMeetingSchema,
  confirmMeetingSpec,
  confirmMeetingHandler,
  confirmMeetingSchema,
} from "./network";
import {
  resolveNotificationSpec,
  resolveNotificationHandler,
  resolveNotificationSchema,
} from "./notifications";
import {
  checkOwnerAvailabilitySpec,
  checkOwnerAvailabilityHandler,
  checkOwnerAvailabilitySchema,
  scheduleWithOwnerSpec,
  scheduleWithOwnerHandler,
  scheduleWithOwnerSchema,
} from "./delegation";

/**
 * OpenAI tool specifications for the LLM planner phase
 */
export const TOOL_SPECS: ToolSpec[] = [
  scheduleMeetingSpec,
  confirmMeetingSpec,
  resolveNotificationSpec,
  // More tools will be added here...
];

/**
 * Get tool specifications filtered by context
 */
export function getToolSpecsForContext(
  isDelegation: boolean = false
): ToolSpec[] {
  if (isDelegation) {
    return [checkOwnerAvailabilitySpec, scheduleWithOwnerSpec];
  }
  return TOOL_SPECS;
}

/**
 * Server-side tool handlers for execution phase
 */
export const TOOL_HANDLERS = {
  network_schedule_meeting: {
    spec: scheduleMeetingSpec,
    handler: scheduleMeetingHandler,
    schema: scheduleMeetingSchema,
  },
  network_confirm_meeting: {
    spec: confirmMeetingSpec,
    handler: confirmMeetingHandler,
    schema: confirmMeetingSchema,
  },
  notifications_resolve: {
    spec: resolveNotificationSpec,
    handler: resolveNotificationHandler,
    schema: resolveNotificationSchema,
  },
  delegation_check_availability: {
    spec: checkOwnerAvailabilitySpec,
    handler: checkOwnerAvailabilityHandler,
    schema: checkOwnerAvailabilitySchema,
  },
  delegation_schedule_meeting: {
    spec: scheduleWithOwnerSpec,
    handler: scheduleWithOwnerHandler,
    schema: scheduleWithOwnerSchema,
  },
  // More handlers will be added here...
} as const;

/**
 * Get tool handler by name
 */
export function getToolHandler(toolName: string) {
  return TOOL_HANDLERS[toolName as keyof typeof TOOL_HANDLERS];
}

/**
 * Check if tool exists
 */
export function isValidTool(toolName: string): boolean {
  return toolName in TOOL_HANDLERS;
}

/**
 * Get all available tool names
 */
export function getAvailableToolNames(): string[] {
  return Object.keys(TOOL_HANDLERS);
}
