import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/queries/notifications";

// GET /api/notifications/preferences
export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const prefs = await getNotificationPreferences(userId);
  return NextResponse.json({ preferences: prefs });
});

// PUT /api/notifications/preferences
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = await request.json();
  const saved = await upsertNotificationPreferences(userId, body);
  return NextResponse.json({ preferences: saved });
});
