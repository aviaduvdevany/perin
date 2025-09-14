import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  extractSessionIdFromUrl,
  getUserIdFromSession,
} from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";
import * as notif from "@/lib/queries/notifications";
import { generateMutualProposals } from "@/lib/network/scheduling";
import {
  ProposalsSchema,
  safeParse,
} from "@/app/(main-app)/api/network/schemas";
import { rateLimit } from "@/lib/utils/rate-limit";

// POST /api/network/sessions/:id/proposals - Generate and send proposals from initiator to counterpart
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  // Rate limit
  if (
    !rateLimit(userId, "network:sessions:proposals", {
      tokensPerInterval: 20,
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

  // No TTL enforcement; sessions remain confirmable later. Per-action checks apply below.

  const json = await request.json();
  const parsed = safeParse(ProposalsSchema, json);
  if (!parsed.success) return ErrorResponses.badRequest(parsed.error);
  const body = parsed.data;

  const connection = await networkQueries.getConnectionById(sess.connection_id);
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
    return ErrorResponses.unauthorized("Insufficient scopes to propose times");
  }

  // Idempotency guard
  const clientKey = (request.headers.get("Idempotency-Key") || "").trim();
  const idemKey =
    clientKey ||
    `proposals:${sessionId}:${body.durationMins}:${body.earliest || ""}:${
      body.latest || ""
    }`;
  const registered = await networkQueries.registerIdempotencyKey(
    idemKey,
    "network.proposals"
  );
  if (!registered) {
    return ErrorResponses.conflict("Duplicate proposals request");
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

  const proposalsWithTz = proposals.map((p) => ({
    ...p,
    tz: body.tz || "UTC",
  }));

  // Post a proposal message in the session and notify recipient
  const message = await networkQueries.createAgentMessage({
    session_id: sessionId,
    from_user_id: userId,
    to_user_id: counterpartId,
    type: "proposal",
    payload: { proposals: proposalsWithTz, durationMins: body.durationMins },
  });

  const createdNotif = await notif.dispatchNotification(
    counterpartId,
    "network.message.received",
    "New time proposals",
    `You received ${proposals.length} time proposals`,
    { sessionId: sessionId, messageId: message.id },
    true, // requiresAction
    null, // actionDeadlineAt
    {
      // actionRef
      kind: "network.proposals",
      sessionId,
      messageId: message.id,
    }
  );

  // Mark this proposals notification as actionable so Perin can surface it in chat
  try {
    await notif.updateNotificationActionability(
      createdNotif.id,
      counterpartId,
      {
        requires_action: true,
        action_deadline_at: null,
        action_ref: {
          kind: "network.proposals",
          sessionId,
          messageId: message.id,
        },
      }
    );
  } catch {
    // best-effort; non-fatal
    console.warn("Failed to mark proposals notification actionable");
  }

  // Update session status to negotiating
  const updated = await networkQueries.updateAgentSession(sessionId, {
    status: "negotiating",
  });

  return NextResponse.json({ proposals, message, session: updated });
});
