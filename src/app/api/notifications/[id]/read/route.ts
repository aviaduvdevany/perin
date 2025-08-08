import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";

// POST /api/notifications/:id/read
export const POST = withErrorHandler(
  async (_req, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const ok = await notifQueries.markNotificationRead(params.id, userId);
    if (!ok) return ErrorResponses.notFound("Notification not found");

    return NextResponse.json({ ok: true });
  }
);
