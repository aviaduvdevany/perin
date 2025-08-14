import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIntegrations } from "@/lib/integrations/service";

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
