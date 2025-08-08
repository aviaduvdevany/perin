import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import * as notif from "@/lib/queries/notifications";
import type { AcceptConnectionRequest } from "@/types/network";
import { AcceptConnectionSchema, safeParse } from "@/app/api/network/schemas";
import { rateLimit } from "@/lib/utils/rate-limit";

function extractConnectionIdFromUrl(url: string): string | null {
  const { pathname } = new URL(url);
  // Expect: /api/network/connections/:id/accept
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "connections");
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

// POST /api/network/connections/:id/accept - Accept and grant permissions
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const connectionId = extractConnectionIdFromUrl(request.url);
  if (!connectionId) return ErrorResponses.badRequest("Invalid connection id");

  // Rate limit
  if (
    !rateLimit(userId, "network:connections:accept", {
      tokensPerInterval: 10,
      intervalMs: 60_000,
    })
  ) {
    return ErrorResponses.tooManyRequests("Rate limit exceeded");
  }

  const connection = await networkQueries.getConnectionById(connectionId);
  if (!connection) return ErrorResponses.notFound("Connection not found");

  // Only the target user can accept
  if (connection.target_user_id !== userId) {
    return ErrorResponses.unauthorized(
      "Only the invited user can accept the connection"
    );
  }

  const json = await request.json();
  const parsed = safeParse(AcceptConnectionSchema, json);
  if (!parsed.success) return ErrorResponses.badRequest(parsed.error);
  const body = parsed.data as AcceptConnectionRequest;

  await networkQueries.upsertConnectionPermissions(
    connectionId,
    body.scopes,
    body.constraints || {}
  );
  const activated = await networkQueries.updateConnectionStatus(
    connectionId,
    "active"
  );

  // Notify requester
  await notif.createNotification(
    activated.requester_user_id,
    "network.connection.accepted",
    "Connection accepted",
    `User ${userId} accepted your Perin connection invite`,
    { connectionId: activated.id, targetUserId: userId }
  );

  return NextResponse.json({ connection: activated });
});
