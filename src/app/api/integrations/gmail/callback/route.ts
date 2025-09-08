import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { exchangeCodeForTokens } from "@/lib/integrations/gmail/auth";
import * as integrationQueries from "@/lib/queries/integrations";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get authorization code from query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return ErrorResponses.badRequest("Authorization code is required");
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

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
      "gmail",
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      ["https://www.googleapis.com/auth/gmail.readonly"], // Read only
      {
        scope: tokens.scope,
        token_type: tokens.token_type,
      }
    );

    // Redirect to callback page that will close the popup
    return Response.redirect(
      new URL(
        "/integration-callback?status=success&type=gmail&message=" +
          encodeURIComponent("Gmail connected successfully"),
        request.url
      )
    );
  } catch (error) {
    console.error("Error in Gmail callback:", error);
    // Redirect to callback page with error
    return Response.redirect(
      new URL(
        "/integration-callback?status=error&type=gmail&error=" +
          encodeURIComponent("Failed to connect Gmail"),
        request.url
      )
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
    const tokens = await exchangeCodeForTokens(code);

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
      "gmail",
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      ["https://www.googleapis.com/auth/gmail.readonly"], // Read only
      {
        scope: tokens.scope,
        token_type: tokens.token_type,
      }
    );

    return Response.json({
      message: "Gmail connected successfully",
      integration: {
        id: integration.id,
        type: integration.integration_type,
        connected_at: integration.connected_at,
        scopes: integration.scopes,
      },
    });
  } catch (error) {
    console.error("Error in Gmail callback:", error);
    return ErrorResponses.internalServerError("Failed to connect Gmail");
  }
}
