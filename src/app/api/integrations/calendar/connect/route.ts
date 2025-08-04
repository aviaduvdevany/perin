import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { generateCalendarAuthUrl } from "@/lib/integrations/calendar/auth";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Generate OAuth2 authorization URL
    const authUrl = generateCalendarAuthUrl();

    return Response.json({
      authUrl,
      message: "Calendar OAuth2 URL generated successfully",
    });
  } catch (error) {
    console.error("Error generating calendar auth URL:", error);
    return ErrorResponses.internalServerError(
      "Failed to generate calendar auth URL"
    );
  }
}
