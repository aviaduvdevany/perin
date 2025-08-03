import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { getUserIdFromSession } from "../../../../../lib/utils/session-helpers";
import { fetchRecentEmails } from "../../../../../lib/integrations/gmail/client";
import { ErrorResponses } from "../../../../../lib/utils/error-handlers";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('limit') || '10');
    const query = searchParams.get('q') || undefined;

    // Fetch emails
    const emails = await fetchRecentEmails(userId, maxResults, query);

    return Response.json({
      emails,
      count: emails.length,
      message: "Emails fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching emails:", error);
    
    if (error instanceof Error && error.message === 'Gmail not connected') {
      return ErrorResponses.badRequest("Gmail integration not found. Please connect Gmail first.");
    }
    
    return ErrorResponses.internalServerError("Failed to fetch emails");
  }
}