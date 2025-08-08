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

// PUT /api/network/connections/:id/permissions - Update connection scopes/constraints
export const PUT = withErrorHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const connectionId = params.id;
    const connection = await networkQueries.getConnectionById(connectionId);
    if (!connection) return ErrorResponses.notFound("Connection not found");

    // Both participants can update their side of the permissions (for now global)
    if (
      connection.requester_user_id !== userId &&
      connection.target_user_id !== userId
    ) {
      return ErrorResponses.unauthorized("Not part of this connection");
    }

    const body = (await request.json()) as UpdateConnectionPermissionsRequest;

    const existing = await networkQueries.getConnectionPermissions(
      connectionId
    );
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
  }
);
