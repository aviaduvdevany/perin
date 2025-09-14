import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import type {
  ConnectionConstraints,
  UpdateConnectionPermissionsRequest,
} from "@/types/network";
import {
  UpdateConnectionPermissionsSchema,
  safeParse,
} from "@/app/(main-app)/api/network/schemas";

function extractConnectionIdFromUrl(url: string): string | null {
  const { pathname } = new URL(url);
  // Expect: /api/network/connections/:id/permissions
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "connections");
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

// GET /api/network/connections/:id/permissions - Get current connection permissions
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const connectionId = extractConnectionIdFromUrl(request.url);
  if (!connectionId) return ErrorResponses.badRequest("Invalid connection id");

  const connection = await networkQueries.getConnectionById(connectionId);
  if (!connection) return ErrorResponses.notFound("Connection not found");

  if (
    connection.requester_user_id !== userId &&
    connection.target_user_id !== userId
  ) {
    return ErrorResponses.unauthorized("Not part of this connection");
  }

  const permissions = await networkQueries.getConnectionPermissions(
    connectionId
  );
  return NextResponse.json({ permissions });
});

// PUT /api/network/connections/:id/permissions - Update connection scopes/constraints
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const connectionId = extractConnectionIdFromUrl(request.url);
  if (!connectionId) return ErrorResponses.badRequest("Invalid connection id");

  const connection = await networkQueries.getConnectionById(connectionId);
  if (!connection) return ErrorResponses.notFound("Connection not found");

  // Both participants can update their side of the permissions (for now global)
  if (
    connection.requester_user_id !== userId &&
    connection.target_user_id !== userId
  ) {
    return ErrorResponses.unauthorized("Not part of this connection");
  }

  const json = await request.json();
  const parsed = safeParse(UpdateConnectionPermissionsSchema, json);
  if (!parsed.success) return ErrorResponses.badRequest(parsed.error);
  const body = parsed.data as UpdateConnectionPermissionsRequest;

  const existing = await networkQueries.getConnectionPermissions(connectionId);
  const scopes = body.scopes ?? existing?.scopes ?? [];
  const constraints = {
    ...(existing?.constraints ?? {}),
    ...(body.constraints ?? {}),
  } as ConnectionConstraints;

  const updated = await networkQueries.upsertConnectionPermissions(
    connectionId,
    scopes,
    constraints
  );
  return NextResponse.json({ permissions: updated });
});
