import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";
import type { Notification } from "@/types/notifications";

// GET /api/notifications?unread=true|false&unresolved=true|false&requiresAction=true|false
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const { searchParams } = new URL(request.url);
  const onlyUnread = searchParams.get("unread") === "true";
  const unresolved = searchParams.get("unresolved") === "true";
  const requiresAction = searchParams.get("requiresAction") !== "false"; // default true when unresolved

  const notifications = unresolved
    ? await notifQueries.listUnresolvedNotifications(userId, requiresAction)
    : await notifQueries.listNotifications(userId, onlyUnread);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications, unreadCount });
});

// POST /api/notifications - Create notification directly (fallback)
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = await request.json();
  const {
    targetUserId,
    type,
    title,
    body: text,
    data,
    requiresAction,
    actionDeadlineAt,
    actionRef,
  } = body as {
    targetUserId: string;
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
    targetUserId,
    type as Notification["type"],
    title,
    text ?? null,
    data ?? null
  );

  // Optionally set actionable fields if provided
  if (requiresAction || actionDeadlineAt || actionRef) {
    await notifQueries.updateNotificationActionability(
      notification.id,
      targetUserId,
      {
        requires_action: !!requiresAction,
        action_deadline_at: actionDeadlineAt ?? null,
        action_ref: actionRef ?? null,
      }
    );
  }

  return NextResponse.json({ notification });
});
