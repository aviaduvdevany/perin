import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import type { StartNetworkSessionRequest } from "@/types/network";
import {
  StartNetworkSessionSchema,
  safeParse,
} from "@/app/(main-app)/api/network/schemas";
import { rateLimit } from "@/lib/utils/rate-limit";

// POST /api/network/sessions - Start a negotiation/scheduling session
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  // Rate limit
  if (
    !rateLimit(userId, "network:sessions:start", {
      tokensPerInterval: 10,
      intervalMs: 60_000,
    })
  ) {
    return ErrorResponses.tooManyRequests("Rate limit exceeded");
  }

  const json = await request.json();
  const parsed = safeParse(StartNetworkSessionSchema, json);
  if (!parsed.success) return ErrorResponses.badRequest(parsed.error);
  const body = parsed.data as StartNetworkSessionRequest;

  // Validate membership
  const connection = await networkQueries.getConnectionById(body.connectionId);
  if (!connection) return ErrorResponses.notFound("Connection not found");
  if (
    connection.requester_user_id !== userId &&
    connection.target_user_id !== userId
  ) {
    return ErrorResponses.unauthorized("Not part of this connection");
  }
  if (connection.status !== "active") {
    return ErrorResponses.badRequest("Connection not active");
  }

  const now = Date.now();
  const ttl = new Date(now + 1000 * 60 * 30).toISOString(); // 30m TTL

  const created = await networkQueries.createAgentSession({
    type: body.type,
    initiator_user_id: userId,
    counterpart_user_id: body.counterpartUserId,
    connection_id: body.connectionId,
    status: "initiated",
    ttl_expires_at: ttl,
  });

  return NextResponse.json({ session: created });
});
