import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  extractSessionIdFromUrl,
  getUserIdFromSession,
} from "@/lib/utils/session-helpers";
import {
  ErrorResponses,
  withErrorHandler,
  validateRequiredFields,
} from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import * as notif from "@/lib/queries/notifications";
import type { PostNetworkMessageRequest } from "@/types/network";
import { rateLimit } from "@/lib/utils/rate-limit";

// POST /api/network/sessions/:id/messages - Post a structured agent message
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  // Rate limit
  if (
    !rateLimit(userId, "network:sessions:messages", {
      tokensPerInterval: 60,
      intervalMs: 60_000,
    })
  ) {
    return ErrorResponses.tooManyRequests("Rate limit exceeded");
  }

  const sessionId = extractSessionIdFromUrl(request.url);
  if (!sessionId) return ErrorResponses.badRequest("Invalid session id");

  const sess = await networkQueries.getAgentSessionById(sessionId);
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

  // No TTL enforcement for messages.

  // Optional idempotency for messages
  const clientKey = (request.headers.get("Idempotency-Key") || "").trim();
  if (clientKey) {
    const ok = await networkQueries.registerIdempotencyKey(
      clientKey,
      "network.message"
    );
    if (!ok) return ErrorResponses.badRequest("Duplicate message request");
  }

  const msg = await networkQueries.createAgentMessage({
    session_id: sessionId,
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
    { sessionId: sessionId, messageId: msg.id }
  );

  return NextResponse.json({ message: msg });
});

// GET /api/network/sessions/:id/messages - Get transcript
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  const sessionId = extractSessionIdFromUrl(request.url);
  if (!sessionId) return ErrorResponses.badRequest("Invalid session id");

  const sess = await networkQueries.getAgentSessionById(sessionId);
  if (!sess) return ErrorResponses.notFound("Session not found");
  if (
    sess.initiator_user_id !== userId &&
    sess.counterpart_user_id !== userId
  ) {
    return ErrorResponses.unauthorized("Not part of this session");
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const offset = (page - 1) * limit;

  const messages = await networkQueries.listAgentMessagesPaginated(
    sessionId,
    limit,
    offset
  );
  return NextResponse.json({ messages, page, limit });
});
