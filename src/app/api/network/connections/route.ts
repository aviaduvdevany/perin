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
import type { CreateConnectionRequest } from "@/types/network";

// POST /api/network/connections - Create/invite a connection
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const body = (await request.json()) as CreateConnectionRequest;
  const validation = validateRequiredFields(
    body as unknown as Record<string, unknown>,
    ["targetUserId", "scopes"]
  );
  if (!validation.isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${validation.missingFields.join(", ")}`
    );
  }

  const existing = await networkQueries.getConnectionByUsers(
    userId,
    body.targetUserId
  );
  if (existing && existing.status !== "revoked") {
    return ErrorResponses.badRequest("Connection already exists or pending");
  }

  const connection = await networkQueries.createConnection(
    userId,
    body.targetUserId
  );
  await networkQueries.upsertConnectionPermissions(
    connection.id,
    body.scopes,
    body.constraints || {}
  );

  // Notify target user
  await notif.createNotification(
    body.targetUserId,
    "network.connection.invite",
    "New connection invite",
    `User ${userId} invited you to connect Perins`,
    { connectionId: connection.id, requesterUserId: userId }
  );

  // Audit log
  await networkQueries.createAuditLog(
    userId,
    "network.connection.invite",
    "connection",
    connection.id,
    {
      targetUserId: body.targetUserId,
      scopes: body.scopes,
    }
  );

  return NextResponse.json({ connection });
});

// GET /api/network/connections - List connections for current user
export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const connections = await networkQueries.listConnectionsForUser(userId);
  return NextResponse.json({ connections });
});
