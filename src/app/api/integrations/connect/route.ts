import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectIntegration } from "@/lib/integrations/service";
import { isIntegrationSupported } from "@/lib/integrations/registry";
import type { IntegrationType } from "@/types/integrations";

/**
 * Unified integration connection endpoint
 * Handles connection requests for any supported integration type
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { type } = await request.json();

    // Validate integration type
    if (!type || !isIntegrationSupported(type)) {
      return NextResponse.json(
        { error: `Unsupported integration type: ${type}` },
        { status: 400 }
      );
    }

    // Connect integration
    const result = await connectIntegration({
      type: type as IntegrationType,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error connecting integration:", error);
    return NextResponse.json(
      { error: "Failed to connect integration" },
      { status: 500 }
    );
  }
}

/**
 * Get available integration types
 */
export async function GET() {
  try {
    const { getAvailableIntegrationTypes, INTEGRATION_REGISTRY } = await import(
      "@/lib/integrations/registry"
    );

    const availableTypes = getAvailableIntegrationTypes();
    const integrations = availableTypes.map((type) => ({
      type,
      name: INTEGRATION_REGISTRY[type].name,
      description: INTEGRATION_REGISTRY[type].description,
      icon: INTEGRATION_REGISTRY[type].icon,
    }));

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("Error getting available integrations:", error);
    return NextResponse.json(
      { error: "Failed to get available integrations" },
      { status: 500 }
    );
  }
}
