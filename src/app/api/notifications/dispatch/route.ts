import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import {
  createNotification,
  createNotificationDelivery,
} from "@/lib/queries/notifications";
import type {
  Notification,
  NotificationDeliveryChannel,
} from "@/types/notifications";

// POST /api/notifications/dispatch (internal-ish)
// Body: { userId, type, title, body?, data?, channels?: NotificationDeliveryChannel[] }
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const callerUserId = getUserIdFromSession(session);
  if (!callerUserId)
    return ErrorResponses.unauthorized("Authentication required");

  // In the future add role-based guard or a shared secret check

  const body = await request.json();
  const { isValid, missingFields } = validateRequiredFields(body, [
    "userId",
    "type",
    "title",
  ]);
  if (!isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }

  const { userId, type, title } = body as {
    userId: string;
    type: string;
    title: string;
  };
  const notification = await createNotification(
    userId,
    type as Notification["type"],
    title,
    body.body ?? null,
    body.data ?? null
  );

  const channels = (body.channels || [
    "in_app",
  ]) as NotificationDeliveryChannel[];
  // Track initial deliveries (queued); actual provider send would happen here or in a queue in Phase 2
  const deliveries = await Promise.all(
    channels.map((channel) =>
      createNotificationDelivery(notification.id, channel, "queued")
    )
  );

  return NextResponse.json({ notification, deliveries });
});
