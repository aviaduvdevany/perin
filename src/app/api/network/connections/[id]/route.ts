import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";

// DELETE /api/network/connections/:id - Revoke a connection
export const DELETE = withErrorHandler(
  async (_request, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const connectionId = params.id;
    const connection = await networkQueries.getConnectionById(connectionId);
    if (!connection) return ErrorResponses.notFound("Connection not found");

    if (
      connection.requester_user_id !== userId &&
      connection.target_user_id !== userId
    ) {
      return ErrorResponses.unauthorized("Not part of this connection");
    }

    const revoked = await networkQueries.updateConnectionStatus(
      connectionId,
      "revoked"
    );
    return NextResponse.json({ connection: revoked });
  }
);
