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
import type { AcceptConnectionRequest } from "@/types/network";

// POST /api/network/connections/:id/accept - Accept and grant permissions
export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const connectionId = params.id;
    const connection = await networkQueries.getConnectionById(connectionId);
    if (!connection) return ErrorResponses.notFound("Connection not found");

    // Only the target user can accept
    if (connection.target_user_id !== userId) {
      return ErrorResponses.unauthorized(
        "Only the invited user can accept the connection"
      );
    }

    const body = (await request.json()) as AcceptConnectionRequest;
    const validation = validateRequiredFields(
      body as unknown as Record<string, unknown>,
      ["scopes"]
    );
    if (!validation.isValid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

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
  }
);
