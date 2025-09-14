import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revokeDelegationSession } from "@/lib/queries/delegation";
import { withErrorHandler } from "@/lib/utils/error-handlers";

export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id: delegationId } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Revoke delegation session
    const success = await revokeDelegationSession(
      delegationId,
      session.user.id
    );

    if (!success) {
      return NextResponse.json(
        { error: "Delegation not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Delegation revoked successfully",
    });
  }
);
