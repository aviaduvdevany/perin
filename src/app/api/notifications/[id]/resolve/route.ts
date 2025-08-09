import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import { markNotificationResolved } from "@/lib/queries/notifications";

// POST /api/notifications/:id/resolve
export const POST = withErrorHandler(
  async (request: NextRequest, context: { params: { id?: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    let notificationId = context?.params?.id;
    if (!notificationId) {
      try {
        const body = await request.json();
        notificationId = body?.id;
      } catch {}
    }
    if (!notificationId)
      return ErrorResponses.badRequest("Missing notification id");

    const ok = await markNotificationResolved(notificationId, userId);
    if (!ok) return ErrorResponses.notFound("Notification not found");

    return NextResponse.json({ ok: true });
  }
);
