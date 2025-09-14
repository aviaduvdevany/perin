import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { getCalendarAvailability } from "@/lib/integrations/calendar/client";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    if (!startTime || !endTime) {
      return ErrorResponses.badRequest("startTime and endTime are required");
    }

    // Get calendar availability
    const availability = await getCalendarAvailability(
      userId,
      startTime,
      endTime
    );

    return Response.json({
      availability,
      message: "Calendar availability fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching calendar availability:", error);
    return ErrorResponses.internalServerError(
      "Failed to fetch calendar availability"
    );
  }
}
