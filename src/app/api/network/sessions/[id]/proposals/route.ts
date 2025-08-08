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
import { generateMutualProposals } from "@/lib/network/scheduling";

// POST /api/network/sessions/:id/proposals - Generate and send proposals from initiator to counterpart
export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const sess = await networkQueries.getAgentSessionById(params.id);
    if (!sess) return ErrorResponses.notFound("Session not found");
    if (
      sess.initiator_user_id !== userId &&
      sess.counterpart_user_id !== userId
    ) {
      return ErrorResponses.unauthorized("Not part of this session");
    }

    const body = await request.json();
    const validation = validateRequiredFields(body, ["durationMins"]);
    if (!validation.isValid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    const connection = await networkQueries.getConnectionById(
      sess.connection_id
    );
    if (!connection || connection.status !== "active") {
      return ErrorResponses.badRequest("Connection not active");
    }

    const permissions = await networkQueries.getConnectionPermissions(
      connection.id
    );
    const scopes = permissions?.scopes || [];
    if (
      !scopes.includes("calendar.availability.read") ||
      !scopes.includes("calendar.events.propose")
    ) {
      return ErrorResponses.unauthorized(
        "Insufficient scopes to propose times"
      );
    }

    const constraints = permissions?.constraints || {};

    const counterpartId =
      userId === sess.initiator_user_id
        ? sess.counterpart_user_id
        : sess.initiator_user_id;

    const proposals = await generateMutualProposals({
      userAId: userId,
      userBId: counterpartId,
      durationMins: body.durationMins,
      earliest: body.earliest,
      latest: body.latest,
      tz: body.tz,
      constraintsA: constraints,
      constraintsB: constraints,
      limit: body.limit || 5,
    });

    // Post a proposal message in the session and notify recipient
    const message = await networkQueries.createAgentMessage({
      session_id: params.id,
      from_user_id: userId,
      to_user_id: counterpartId,
      type: "proposal",
      payload: { proposals, durationMins: body.durationMins },
    });

    await notif.createNotification(
      counterpartId,
      "network.message.received",
      "New time proposals",
      `You received ${proposals.length} time proposals`,
      { sessionId: params.id, messageId: message.id }
    );

    // Update session status to negotiating
    const updated = await networkQueries.updateAgentSession(params.id, {
      status: "negotiating",
    });

    return NextResponse.json({ proposals, message, session: updated });
  }
);
