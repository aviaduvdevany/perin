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
import type { PostNetworkMessageRequest } from "@/types/network";

// POST /api/network/sessions/:id/messages - Post a structured agent message
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

    const body = (await request.json()) as PostNetworkMessageRequest;
    const validation = validateRequiredFields(
      body as unknown as Record<string, unknown>,
      ["type", "toUserId", "payload"]
    );
    if (!validation.isValid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    const msg = await networkQueries.createAgentMessage({
      session_id: params.id,
      from_user_id: userId,
      to_user_id: body.toUserId,
      type: body.type,
      payload: body.payload,
    });

    // Notify recipient
    await notif.createNotification(
      body.toUserId,
      "network.message.received",
      "New scheduling update",
      `You have a new ${body.type} in a scheduling session`,
      { sessionId: params.id, messageId: msg.id }
    );

    return NextResponse.json({ message: msg });
  }
);

// GET /api/network/sessions/:id/messages - Get transcript
export const GET = withErrorHandler(
  async (_request, { params }: { params: { id: string } }) => {
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

    const messages = await networkQueries.listAgentMessages(params.id);
    return NextResponse.json({ messages });
  }
);
