import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { getUserIdFromSession } from "../../../../../lib/utils/session-helpers";
import { getGmailAuthUrl } from "../../../../../lib/integrations/gmail/auth";
import { ErrorResponses } from "../../../../../lib/utils/error-handlers";

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Generate OAuth URL
    const authUrl = getGmailAuthUrl();

    return Response.json({
      authUrl,
      message: "Gmail authorization URL generated"
    });
  } catch (error) {
    console.error("Error generating Gmail auth URL:", error);
    return ErrorResponses.internalServerError("Failed to generate auth URL");
  }
}