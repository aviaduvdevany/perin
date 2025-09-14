import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, ErrorResponses } from "@/lib/utils/error-handlers";
import {
  expireAgentSessions,
  purgeOldIdempotencyKeys,
} from "@/lib/queries/network";

// POST /api/network/cleanup - Run background cleanup tasks (protected by secret)
export const POST = withErrorHandler(async (request: NextRequest) => {
  const secret = process.env.NETWORK_CLEANUP_SECRET;
  const provided = request.headers.get("x-network-cleanup-secret");
  if (!secret || !provided || provided !== secret) {
    return ErrorResponses.unauthorized("Invalid cleanup secret");
  }

  const expired = await expireAgentSessions();
  const purged = await purgeOldIdempotencyKeys(7);

  return NextResponse.json({
    ok: true,
    expiredSessions: expired,
    purgedIdempotencyKeys: purged,
  });
});
