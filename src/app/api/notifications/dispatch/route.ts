import { NextRequest, NextResponse } from "next/server";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";
import type { Notification } from "@/types/notifications";

// Internal-only: POST /api/notifications/dispatch
// Body: { userId, type, title, body?, data?, requiresAction?, actionDeadlineAt?, actionRef? }
export const POST = withErrorHandler(async (request: NextRequest) => {
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

  // TODO Phase 2: Policy engine + channel router + OneSignal send + deliveries tracking

  return NextResponse.json({ notification });
});
