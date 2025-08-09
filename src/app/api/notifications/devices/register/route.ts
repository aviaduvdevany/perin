import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import { upsertNotificationDevice } from "@/lib/queries/notifications";
import type { NotificationDevicePlatform } from "@/types/notifications";

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
  if (!isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }

  const platform = body.platform as NotificationDevicePlatform;
  const playerId = String(body.playerId);
  const deviceInfo = (body.deviceInfo || null) as Record<
    string,
    unknown
  > | null;

  const device = await upsertNotificationDevice(
    userId,
    platform,
    playerId,
    deviceInfo
  );

  return NextResponse.json({ device });
});
