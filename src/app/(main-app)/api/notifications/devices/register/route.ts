import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import * as notifQueries from "@/lib/queries/notifications";

// POST /api/notifications/devices/register
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = await request.json();
  const { isValid, missingFields } = validateRequiredFields(body, [
    "platform",
    "playerId",
  ]);
  if (!isValid)
    return ErrorResponses.badRequest(
      `Missing fields: ${missingFields.join(", ")}`
    );

  const { platform, playerId, deviceInfo } = body as {
    platform: "web" | "ios" | "android";
    playerId: string;
    deviceInfo?: Record<string, unknown> | null;
  };

  const device = await notifQueries.upsertNotificationDevice(
    userId,
    platform,
    playerId,
    deviceInfo ?? null
  );

  return NextResponse.json({ device });
});
