import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { cleanupDuplicateIntegrations } from "@/lib/queries/integrations";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Clean up calendar integrations
    const calendarCleanup = await cleanupDuplicateIntegrations(
      userId,
      "calendar"
    );

    // Clean up gmail integrations
    const gmailCleanup = await cleanupDuplicateIntegrations(userId, "gmail");

    return Response.json({
      message: "Integration cleanup completed",
      results: {
        calendar: calendarCleanup,
        gmail: gmailCleanup,
      },
      userId,
    });
  } catch (error) {
    console.error("Error in integration cleanup:", error);
    return Response.json(
      { error: "Integration cleanup failed" },
      { status: 500 }
    );
  }
}
