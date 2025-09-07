import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { exchangeCodeForCalendarTokens } from "@/lib/integrations/calendar/auth";
import * as integrationQueries from "@/lib/queries/integrations";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function GET(request: NextRequest) {
  try {
    console.log("Calendar callback received:", request.url);

    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      console.error("No user ID found in session");
      return ErrorResponses.unauthorized("Authentication required");
    }

    console.log("User ID:", userId);

    // Get authorization code from query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    console.log("Authorization code received:", code ? "Yes" : "No");

    if (!code) {
      return ErrorResponses.badRequest("Authorization code is required");
    }

    // Exchange code for tokens
    console.log("Exchanging code for tokens...");
    const tokens = await exchangeCodeForCalendarTokens(code);
    console.log("Tokens received:", tokens.access_token ? "Yes" : "No");

    if (!tokens.access_token) {
      return ErrorResponses.internalServerError(
        "Failed to obtain access token"
      );
    }

    // Calculate expiration date
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour fallback

    // Clean up any duplicate integrations first
    await integrationQueries.cleanupDuplicateIntegrations(userId, "calendar");

    // Store/update integration in database
    console.log("About to store/update integration:", {
      userId,
      tokenLength: tokens.access_token.length,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: expiresAt.toISOString(),
    });

    const integration = await integrationQueries.createUserIntegration(
      userId,
      "calendar",
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      {
        scope: tokens.scope,
        token_type: tokens.token_type,
      }
    );

    console.log("Integration stored successfully:", {
      id: integration.id,
      expiresAt: integration.token_expires_at,
      connectedAt: integration.connected_at,
      isActive: integration.is_active,
    });

    // Redirect back to chat instead of onboarding for reauth flow
    return Response.redirect(
      new URL("/", request.url)
    );
  } catch (error) {
    console.error("Error in calendar callback:", error);
    // Redirect back to onboarding with error
    return Response.redirect(
      new URL("/", request.url)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Parse request body
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return ErrorResponses.badRequest("Authorization code is required");
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForCalendarTokens(code);

    if (!tokens.access_token) {
      return ErrorResponses.internalServerError(
        "Failed to obtain access token"
      );
    }

    // Calculate expiration date
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour fallback

    // Store integration in database
    const integration = await integrationQueries.createUserIntegration(
      userId,
      "calendar",
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      {
        scope: tokens.scope,
        token_type: tokens.token_type,
      }
    );

    return Response.json({
      message: "Calendar connected successfully",
      integration: {
        id: integration.id,
        type: integration.integration_type,
        connected_at: integration.connected_at,
        scopes: integration.scopes,
      },
    });
  } catch (error) {
    console.error("Error in calendar callback:", error);
    return ErrorResponses.internalServerError("Failed to connect calendar");
  }
}
