import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";

// POST /api/notifications/:id/read
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  // id comes via route param; body supports id for consistency
  const body: unknown = await request.json().catch(() => ({}));
  const fallbackId =
    body && typeof body === "object" && body !== null && "id" in body
      ? (Reflect.get(body, "id") as string | undefined)
      : undefined;
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const pathId = pathParts[pathParts.length - 2];
  const notificationId = pathId || fallbackId;
  if (!notificationId) return ErrorResponses.badRequest("Missing id");

  const ok = await notifQueries.markNotificationRead(notificationId, userId);
  if (!ok) return ErrorResponses.notFound("Notification not found");

  return NextResponse.json({ ok: true });
});
