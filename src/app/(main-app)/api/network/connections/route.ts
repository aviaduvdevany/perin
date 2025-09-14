import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import * as notif from "@/lib/queries/notifications";
import type { CreateConnectionRequest } from "@/types/network";
import { CreateConnectionSchema, safeParse } from "../schemas";
import { rateLimit } from "@/lib/utils/rate-limit";

// POST /api/network/connections - Create/invite a connection
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  // Rate limit
  if (
    !rateLimit(userId, "network:connections:create", {
      tokensPerInterval: 5,
      intervalMs: 60_000,
    })
  ) {
    return ErrorResponses.tooManyRequests("Rate limit exceeded");
  }

  const json = await request.json();
  const parsed = safeParse(CreateConnectionSchema, json);
  if (!parsed.success) return ErrorResponses.badRequest(parsed.error);
  const body = parsed.data as CreateConnectionRequest;

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

// GET /api/network/connections - List connections for current user (paginated)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const offset = (page - 1) * limit;

  const connections = await networkQueries.listConnectionsWithUserInfo(
    userId,
    limit,
    offset
  );
  return NextResponse.json({ connections, page, limit });
});
