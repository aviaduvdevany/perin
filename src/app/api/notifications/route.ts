import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";

// GET /api/notifications?unread=true
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const { searchParams } = new URL(request.url);
  const onlyUnread = searchParams.get("unread") === "true";
  const unresolvedOnly = searchParams.get("unresolved") === "true";
  const requiresActionOnly = searchParams.get("requiresAction") !== "false"; // default true

  let notifications;
  if (unresolvedOnly) {
    notifications = await notifQueries.listUnresolvedNotifications(
      userId,
      requiresActionOnly
    );
  } else {
    notifications = await notifQueries.listNotifications(userId, onlyUnread);
  }

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return NextResponse.json({ notifications, unreadCount });
});
