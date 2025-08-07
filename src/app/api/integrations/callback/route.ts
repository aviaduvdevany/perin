import { NextRequest, NextResponse } from "next/server";
import { handleIntegrationCallback } from "@/lib/integrations/service";
import { isIntegrationSupported } from "@/lib/integrations/registry";
import type { IntegrationType } from "@/types/integrations";

/**
 * Unified OAuth2 callback handler
 * Handles callbacks for any supported integration type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const type = searchParams.get("type") as IntegrationType;

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/chat?error=missing_authorization_code`
      );
    }

    if (!type || !isIntegrationSupported(type)) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/chat?error=unsupported_integration_type`
      );
    }

    // Handle the callback
    const result = await handleIntegrationCallback(type, {
      code,
      state: state || undefined,
    });

    if (result.success) {
      return NextResponse.redirect(
        `${
          process.env.NEXTAUTH_URL
        }/chat?${type}=connected&message=${encodeURIComponent(result.message)}`
      );
    } else {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/chat?error=${encodeURIComponent(
          result.message
        )}`
      );
    }
  } catch (error) {
    console.error("Error handling integration callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/chat?error=callback_failed`
    );
  }
}

/**
 * POST method for handling callbacks with additional data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, type } = body;

    if (!code || !type || !isIntegrationSupported(type)) {
      return NextResponse.json(
        { error: "Invalid callback parameters" },
        { status: 400 }
      );
    }

    // Handle the callback
    const result = await handleIntegrationCallback(type as IntegrationType, {
      code,
      state,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error handling integration callback:", error);
    return NextResponse.json(
      { error: "Failed to handle callback" },
      { status: 500 }
    );
  }
}
