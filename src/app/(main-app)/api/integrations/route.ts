import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserIntegrations,
  disconnectIntegrationWithRevocation,
} from "@/lib/integrations/service";
import { IntegrationType } from "@/types/integrations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const integrations = await getUserIntegrations(session.user.id);
    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("Error listing user integrations:", error);
    return NextResponse.json(
      { error: "Failed to list integrations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id && !type) {
      return NextResponse.json(
        { error: "id or type is required" },
        { status: 400 }
      );
    }

    // Use enhanced disconnection with token revocation
    const result = await disconnectIntegrationWithRevocation(
      session.user.id,
      id ? { id } : (type as IntegrationType)
    );

    if (!result.success) {
      // Return 207 Multi-Status if revocation failed but DB cleanup succeeded
      if (result.revocationResult && !result.revocationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Integration disconnected but token revocation failed",
            details: {
              revocationError: result.revocationResult.error,
              revocationStatusCode: result.revocationResult.statusCode,
            },
          },
          { status: 207 }
        );
      }

      // Return 404 if integration not found
      if (result.error === "Integration not found") {
        return NextResponse.json(
          { error: "Integration not found" },
          { status: 404 }
        );
      }

      // Return 500 for other errors
      return NextResponse.json(
        { error: result.error || "Failed to disconnect integration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Integration disconnected and tokens revoked successfully",
    });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
