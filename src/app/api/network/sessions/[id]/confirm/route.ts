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
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/integrations/calendar/client";
import { ConfirmSchema, safeParse } from "@/app/api/network/schemas";
import { rateLimit } from "@/lib/utils/rate-limit";

// POST /api/network/sessions/:id/confirm
// Body: { start, end, tz, title?, description?, location? }
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);
  if (!userId) return ErrorResponses.unauthorized("Authentication required");

  // Rate limit
  if (
    !rateLimit(userId, "network:sessions:confirm", {
      tokensPerInterval: 10,
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

  // No TTL enforcement; confirmation allowed if other checks succeed.

  const json = await request.json();
  const parsed = safeParse(ConfirmSchema, json);
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
  const auto = scopes.includes("calendar.events.write.auto");
  const canConfirm = auto || scopes.includes("calendar.events.write.confirm");
  if (!canConfirm) {
    return ErrorResponses.unauthorized(
      "Insufficient scopes to confirm meeting"
    );
  }

  const initiatorId = sess.initiator_user_id;
  const counterpartId = sess.counterpart_user_id;

  // Idempotency guard
  const clientKey = (request.headers.get("Idempotency-Key") || "").trim();
  const idemKey = clientKey || `confirm:${sessionId}:${body.start}:${body.end}`;
  const registered = await networkQueries.registerIdempotencyKey(
    idemKey,
    "network.confirm"
  );
  if (!registered) {
    return ErrorResponses.conflict("Duplicate confirm request");
  }

  // Create tentative on both calendars
  let eventA: { id: string } | null = null;
  let eventB: { id: string } | null = null;

  try {
    eventA = await createCalendarEvent(initiatorId, {
      summary: body.title || "Meeting",
      description: body.description,
      location: body.location,
      start: body.start,
      end: body.end,
      timeZone: body.tz || "UTC",
      attendees: [],
    });

    eventB = await createCalendarEvent(counterpartId, {
      summary: body.title || "Meeting",
      description: body.description,
      location: body.location,
      start: body.start,
      end: body.end,
      timeZone: body.tz || "UTC",
      attendees: [],
    });

    const outcome = {
      selectedSlot: {
        start: body.start,
        end: body.end,
        tz: body.tz || "UTC",
      },
      eventIds: {
        initiatorCalEventId: eventA.id,
        counterpartCalEventId: eventB.id,
      },
    } as const;

    // Concurrency-safe confirm update
    const updated = await networkQueries.setSessionConfirmedIfUnconfirmed(
      sessionId,
      outcome
    );
    if (!updated) {
      // Another confirm won the race; rollback created events here
      if (eventA?.id) await deleteCalendarEvent(initiatorId, eventA.id);
      if (eventB?.id) await deleteCalendarEvent(counterpartId, eventB.id);
      return ErrorResponses.conflict("Session already confirmed");
    }

    // Post confirm message
    const confirmMsg = await networkQueries.createAgentMessage({
      session_id: sessionId,
      from_user_id: userId,
      to_user_id: userId === initiatorId ? counterpartId : initiatorId,
      type: "confirm",
      payload: outcome,
    });

    // Audit log
    await Promise.all([
      networkQueries.createAuditLog(
        userId,
        "network.meeting.confirm",
        "session",
        sessionId,
        {
          start: body.start,
          end: body.end,
          eventId: eventA.id,
        }
      ),
      networkQueries.createAuditLog(
        userId === initiatorId ? counterpartId : initiatorId,
        "network.meeting.confirm",
        "session",
        sessionId,
        {
          start: body.start,
          end: body.end,
          eventId: eventB.id,
        }
      ),
    ]);

    // Notify both users
    await Promise.all([
      notif.createNotification(
        initiatorId,
        "network.meeting.confirmed",
        "Meeting confirmed",
        `Meeting booked for ${body.start}`,
        { sessionId: sessionId, eventId: eventA.id }
      ),
      notif.createNotification(
        counterpartId,
        "network.meeting.confirmed",
        "Meeting confirmed",
        `Meeting booked for ${body.start}`,
        { sessionId: sessionId, eventId: eventB.id }
      ),
    ]);

    return NextResponse.json({ message: confirmMsg });
  } catch (error) {
    // Rollback if either failed
    if (eventA?.id) await deleteCalendarEvent(initiatorId, eventA.id);
    if (eventB?.id) await deleteCalendarEvent(counterpartId, eventB.id);

    await networkQueries.updateAgentSession(sessionId, {
      status: "error",
      outcome: { reason: (error as Error).message },
    });

    return ErrorResponses.internalServerError("Failed to confirm meeting");
  }
});
