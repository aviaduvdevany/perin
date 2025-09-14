import { NextRequest, NextResponse } from "next/server";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";
import type { Notification } from "@/types/notifications";
import { sendWebPushToSubscriptionIds } from "@/lib/notifications/onesignal";

// Internal-only: POST /api/notifications/dispatch
// Body: { userId, type, title, body?, data?, requiresAction?, actionDeadlineAt?, actionRef? }
export const POST = withErrorHandler(async (request: NextRequest) => {
  const internalKey = request.headers.get("x-internal-key");
  if (!internalKey || internalKey !== process.env.NOTIFICATIONS_INTERNAL_KEY) {
    return ErrorResponses.unauthorized("Invalid internal key");
  }

  const body = await request.json();
  const { isValid, missingFields } = validateRequiredFields(body, [
    "userId",
    "type",
    "title",
  ]);
  if (!isValid)
    return ErrorResponses.badRequest(
      `Missing fields: ${missingFields.join(", ")}`
    );

  const {
    userId,
    type,
    title,
    body: text,
    data,
    requiresAction,
    actionDeadlineAt,
    actionRef,
  } = body as {
    userId: string;
    type: string;
    title: string;
    body?: string | null;
    data?: Record<string, unknown> | null;
    requiresAction?: boolean;
    actionDeadlineAt?: string | null;
    actionRef?: Record<string, unknown> | null;
  };

  // Create the notification
  const notification = await notifQueries.createNotification(
    userId,
    type as Notification["type"],
    title,
    text ?? null,
    data ?? null
  );

  // Optionally set actionable fields if provided
  if (requiresAction || actionDeadlineAt || actionRef) {
    await notifQueries.updateNotificationActionability(
      notification.id,
      userId,
      {
        requires_action: !!requiresAction,
        action_deadline_at: actionDeadlineAt ?? null,
        action_ref: actionRef ?? null,
      }
    );
  }

  // Minimal Phase 1: try web push via OneSignal and track delivery
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (appId && apiKey) {
    const devices = await notifQueries.getActiveDevicesForUser(userId);
    const webSubs = devices
      .filter((d) => d.platform === "web" && d.onesignal_player_id)
      .map((d) => d.onesignal_player_id);
    if (webSubs.length) {
      const result = await sendWebPushToSubscriptionIds({
        appId,
        restApiKey: apiKey,
        subscriptionIds: webSubs,
        title,
        body: text ?? undefined,
        url:
          data && typeof data === "object" && data !== null && "url" in data
            ? (Reflect.get(data as object, "url") as string)
            : undefined,
      });
      await notifQueries.insertNotificationDelivery(
        notification.id,
        "web_push",
        result.ok ? "sent" : "failed",
        result.id ?? null,
        result.error ?? null
      );
    }
  }

  return NextResponse.json({ notification });
});
