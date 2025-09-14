import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import { dispatchNotification } from "@/lib/queries/notifications";

// POST /api/notifications/test - Test notification dispatch
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = await request.json();
  const { targetUserId, message } = body as {
    targetUserId?: string;
    message?: string;
  };

  const notification = await dispatchNotification(
    targetUserId || userId,
    "network.message.received",
    "Test Notification",
    message || "This is a test notification",
    { test: true, timestamp: new Date().toISOString() },
    true, // requiresAction
    null, // actionDeadlineAt
    {
      // actionRef
      kind: "test",
      testId: Date.now().toString(),
    }
  );

  return NextResponse.json({
    success: true,
    notification,
    message: "Test notification dispatched successfully",
  });
});
