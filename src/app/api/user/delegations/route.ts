import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUserDelegations } from "@/lib/queries/delegation";
import { withErrorHandler } from "@/lib/utils/error-handlers";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || undefined;

  // Validate parameters
  if (page < 1 || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: "Invalid pagination parameters" },
      { status: 400 }
    );
  }

  // Get user's delegations
  const { delegations, total } = await listUserDelegations(
    session.user.id,
    page,
    limit,
    status
  );

  const hasMore = page * limit < total;

  return NextResponse.json({
    delegations,
    pagination: {
      total,
      page,
      limit,
      hasMore,
    },
  });
});
