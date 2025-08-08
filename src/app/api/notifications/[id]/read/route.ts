import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";

// POST /api/notifications/:id/read
export const POST = withErrorHandler(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const params = await request.json();
    const notificationId = params.id as string;
    const ok = await notifQueries.markNotificationRead(notificationId, userId);
    if (!ok) return ErrorResponses.notFound("Notification not found");

    return NextResponse.json({ ok: true });
  }
);
