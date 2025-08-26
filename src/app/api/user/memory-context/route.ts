import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";
import * as userQueries from "@/lib/queries/users";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get user data with memory
    const user = await userQueries.getUserById(userId);
    if (!user) {
      return ErrorResponses.notFound("User not found");
    }

    // Extract memory data from user
    const memoryContext = {
      semantic: user.memory?.semantic || [],
      preferences: {
        timezone: user.timezone,
        tone: user.tone,
        perin_name: user.perin_name,
        preferred_hours: user.preferred_hours,
        ...(user.memory?.preferences || {}),
      },
      lastUpdated: Date.now(),
    };

    return Response.json({
      success: true,
      data: memoryContext,
    });
  } catch (error) {
    console.error("Error fetching memory context:", error);

    // Return empty context on error
    return Response.json({
      success: true,
      data: {
        semantic: [],
        preferences: {},
        lastUpdated: Date.now(),
      },
    });
  }
}
