import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDelegationSession,
  getDelegationMessages,
  getDelegationOutcomes,
  getDelegationAnalytics,
} from "@/lib/queries/delegation";
import { withErrorHandler } from "@/lib/utils/error-handlers";

export const GET = withErrorHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const delegationId = params.id;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get delegation session
    const delegation = await getDelegationSession(delegationId);
    if (!delegation) {
      return NextResponse.json(
        { error: "Delegation not found" },
        { status: 404 }
      );
    }

    // Check if user owns this delegation
    if (delegation.ownerUserId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get messages and outcomes
    const [messages, outcomes, analytics] = await Promise.all([
      getDelegationMessages(delegationId),
      getDelegationOutcomes(delegationId),
      getDelegationAnalytics(delegationId),
    ]);

    return NextResponse.json({
      session: delegation,
      messages,
      outcomes,
      analytics,
    });
  }
);
