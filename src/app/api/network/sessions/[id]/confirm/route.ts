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
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/integrations/calendar/client";

// POST /api/network/sessions/:id/confirm
// Body: { start, end, tz, title?, description?, location? }
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
    const validation = validateRequiredFields(body, ["start", "end"]);
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
    const auto = scopes.includes("calendar.events.write.auto");
    const canConfirm = auto || scopes.includes("calendar.events.write.confirm");
    if (!canConfirm) {
      return ErrorResponses.unauthorized(
        "Insufficient scopes to confirm meeting"
      );
    }

    const initiatorId = sess.initiator_user_id;
    const counterpartId = sess.counterpart_user_id;

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

      // Post confirm message and update session
      const confirmMsg = await networkQueries.createAgentMessage({
        session_id: params.id,
        from_user_id: userId,
        to_user_id: userId === initiatorId ? counterpartId : initiatorId,
        type: "confirm",
        payload: {
          selected: { start: body.start, end: body.end, tz: body.tz || "UTC" },
          eventIds: {
            initiatorCalEventId: eventA.id,
            counterpartCalEventId: eventB.id,
          },
        },
      });

      await networkQueries.updateAgentSession(params.id, {
        status: "confirmed",
        outcome: {
          selectedSlot: {
            start: body.start,
            end: body.end,
            tz: body.tz || "UTC",
          },
          eventIds: {
            initiatorCalEventId: eventA.id,
            counterpartCalEventId: eventB.id,
          },
        },
      });

      // Notify both users
      await Promise.all([
        notif.createNotification(
          initiatorId,
          "network.meeting.confirmed",
          "Meeting confirmed",
          `Meeting booked for ${body.start}`,
          { sessionId: params.id, eventId: eventA.id }
        ),
        notif.createNotification(
          counterpartId,
          "network.meeting.confirmed",
          "Meeting confirmed",
          `Meeting booked for ${body.start}`,
          { sessionId: params.id, eventId: eventB.id }
        ),
      ]);

      return NextResponse.json({ message: confirmMsg });
    } catch (error) {
      // Rollback if either failed
      if (eventA?.id) await deleteCalendarEvent(initiatorId, eventA.id);
      if (eventB?.id) await deleteCalendarEvent(counterpartId, eventB.id);

      await networkQueries.updateAgentSession(params.id, {
        status: "error",
        outcome: { reason: (error as Error).message },
      });

      return ErrorResponses.internalServerError("Failed to confirm meeting");
    }
  }
);
