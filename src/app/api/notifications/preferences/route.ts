import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";

// GET /api/notifications/preferences
export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const prefs = await notifQueries.getNotificationPreferences(userId);
  return NextResponse.json({ preferences: prefs });
});

// PUT /api/notifications/preferences
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = await request.json();
  const { timezone, dnd, channels, digest } = body as {
    timezone?: string | null;
    dnd?: Record<string, unknown> | null;
    channels?: Record<string, unknown> | null;
    digest?: Record<string, unknown> | null;
  };

  const prefs = await notifQueries.upsertNotificationPreferences(userId, {
    timezone: timezone ?? null,
    dnd: dnd ?? null,
    channels: channels ?? null,
    digest: digest ?? null,
  });

  return NextResponse.json({ preferences: prefs });
});
