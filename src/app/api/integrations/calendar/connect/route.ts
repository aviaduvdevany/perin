import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { generateCalendarAuthUrl } from "@/lib/integrations/calendar/auth";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Debug environment variables
    console.log("Calendar Connect Debug:", {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
        ? "Set"
        : "Missing",
      GOOGLE_CALENDAR_REDIRECT_URI:
        process.env.GOOGLE_CALENDAR_REDIRECT_URI || "Using fallback",
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "Not set",
    });

    // Generate authorization URL
    const authUrl = generateCalendarAuthUrl();

    console.log("Generated auth URL:", authUrl);

    return Response.json({
      authUrl,
      message: "Calendar authorization URL generated successfully",
    });
  } catch (error) {
    console.error("Error generating calendar auth URL:", error);
    return ErrorResponses.internalServerError(
      "Failed to generate authorization URL"
    );
  }
}
