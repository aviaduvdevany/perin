import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { getUserIdFromSession } from "../../../../lib/utils/session-helpers";
import * as userQueries from "../../../../lib/queries/users";
import { ErrorResponses } from "../../../../lib/utils/error-handlers";

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Parse request body
    const body = await request.json();
    const { name, perin_name, tone, timezone, preferred_hours, avatar_url } =
      body;

    // Validate required fields
    if (!name || !perin_name) {
      return ErrorResponses.badRequest("Name and assistant name are required");
    }

    // Update user profile
    const updatedUser = await userQueries.updateUser(userId, {
      name,
      perin_name,
      tone,
      timezone,
      preferred_hours,
      avatar_url,
    });

    if (!updatedUser) {
      return ErrorResponses.notFound("User not found");
    }

    return Response.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        perin_name: updatedUser.perin_name,
        tone: updatedUser.tone,
        timezone: updatedUser.timezone,
        preferred_hours: updatedUser.preferred_hours,
        avatar_url: updatedUser.avatar_url,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return ErrorResponses.internalServerError("Failed to update profile");
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get user profile
    const user = await userQueries.getUserById(userId);
    if (!user) {
      return ErrorResponses.notFound("User not found");
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        perin_name: user.perin_name,
        tone: user.tone,
        timezone: user.timezone,
        preferred_hours: user.preferred_hours,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return ErrorResponses.internalServerError("Failed to fetch profile");
  }
}
