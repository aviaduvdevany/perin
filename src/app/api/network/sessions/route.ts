import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import * as notif from "@/lib/queries/notifications";
import type { StartNetworkSessionRequest } from "@/types/network";

// POST /api/network/sessions - Start a negotiation/scheduling session
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = (await request.json()) as StartNetworkSessionRequest;
  const validation = validateRequiredFields(
    body as unknown as Record<string, unknown>,
    ["type", "counterpartUserId", "connectionId"]
  );
  if (!validation.isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${validation.missingFields.join(", ")}`
    );
  }

  // Validate membership
  const connection = await networkQueries.getConnectionById(body.connectionId);
  if (!connection) return ErrorResponses.notFound("Connection not found");
  if (
    connection.requester_user_id !== userId &&
    connection.target_user_id !== userId
  ) {
    return ErrorResponses.unauthorized("Not part of this connection");
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

  // Notify counterpart
  await notif.createNotification(
    body.counterpartUserId,
    "network.session.started",
    "New scheduling session",
    `User ${userId} started a scheduling session with you`,
    { sessionId: created.id, connectionId: body.connectionId }
  );

  return NextResponse.json({ session: created });
});
