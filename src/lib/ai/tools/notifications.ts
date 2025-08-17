/**
 * Notifications Tools
 *
 * Tool handlers for managing notifications, including resolving actionable items.
 */

import { z } from "zod";
import {
  ToolSpec,
  ToolHandler,
  ToolContext,
  ToolEnvelope,
  createToolSuccess,
  createToolError,
  ToolErrorCode,
} from "./types";
import * as notif from "@/lib/queries/notifications";

/**
 * Resolve Notification Tool Arguments
 */
export const resolveNotificationSchema = z.object({
  notificationId: z.string().describe("The ID of the notification to resolve"),
  resolution: z
    .string()
    .optional()
    .describe("Optional resolution reason or note"),
});

export type ResolveNotificationArgs = z.infer<typeof resolveNotificationSchema>;

/**
 * Resolve Notification Tool Result
 */
export interface ResolveNotificationResult {
  notificationId: string;
  resolved: boolean;
  resolvedAt: string;
  resolution?: string;
}

/**
 * OpenAI tool specification for resolve_notification
 */
export const resolveNotificationSpec: ToolSpec = {
  type: "function",
  function: {
    name: "notifications_resolve",
    description:
      "Resolve an actionable notification after completing the required action.",
    parameters: {
      type: "object",
      properties: {
        notificationId: {
          type: "string",
          description: "The ID of the notification to resolve",
        },
        resolution: {
          type: "string",
          description: "Optional resolution reason or note",
        },
      },
      required: ["notificationId"],
    },
  },
};

/**
 * Resolve Notification Tool Handler
 */
export const resolveNotificationHandler: ToolHandler<
  ResolveNotificationArgs,
  ResolveNotificationResult
> = async (
  context: ToolContext,
  args: ResolveNotificationArgs
): Promise<ToolEnvelope<ResolveNotificationResult>> => {
  try {
    // Get the notification to verify ownership
    const notifications = await notif.listUnresolvedNotifications(
      context.userId,
      false
    );
    const notification = notifications.find(
      (n) => n.id === args.notificationId
    );

    if (!notification) {
      return createToolError(
        ToolErrorCode.NOT_FOUND,
        "Notification not found or not accessible"
      );
    }

    // Check if notification is already resolved
    if (notification.is_resolved) {
      return createToolError(
        ToolErrorCode.CONFLICT,
        "Notification is already resolved"
      );
    }

    // Resolve the notification
    const resolvedAt = new Date().toISOString();
    const success = await notif.markNotificationResolved(
      args.notificationId,
      context.userId
    );

    if (!success) {
      return createToolError(
        ToolErrorCode.INTERNAL_ERROR,
        "Failed to resolve notification"
      );
    }

    return createToolSuccess({
      notificationId: args.notificationId,
      resolved: true,
      resolvedAt,
      resolution: args.resolution,
    });
  } catch (error) {
    console.error("resolveNotificationHandler error:", error);
    return createToolError(
      ToolErrorCode.INTERNAL_ERROR,
      "Failed to resolve notification. Please try again."
    );
  }
};
