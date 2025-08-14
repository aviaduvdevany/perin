import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserIntegrations,
  disconnectIntegration,
} from "@/lib/integrations/service";

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

    let ok = false;
    if (id) {
      ok = await disconnectIntegration(session.user.id, { id });
    } else if (type) {
      if (
        type === "gmail" ||
        type === "calendar" ||
        type === "slack" ||
        type === "notion" ||
        type === "github" ||
        type === "discord" ||
        type === "zoom" ||
        type === "teams"
      ) {
        ok = await disconnectIntegration(session.user.id, type);
      } else {
        return NextResponse.json(
          { error: "Invalid integration type" },
          { status: 400 }
        );
      }
    }

    if (!ok) {
      return NextResponse.json(
        { error: "Not found or already inactive" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
