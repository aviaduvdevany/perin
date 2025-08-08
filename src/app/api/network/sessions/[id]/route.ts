import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses, withErrorHandler } from "@/lib/utils/error-handlers";
import * as networkQueries from "@/lib/queries/network";

// GET /api/network/sessions/:id - Get session details
export const GET = withErrorHandler(
  async (_request, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) return ErrorResponses.unauthorized("Authentication required");

    const sess = await networkQueries.getAgentSessionById(params.id);
    if (!sess) return ErrorResponses.notFound("Session not found");

    // Check membership
    if (
      sess.initiator_user_id !== userId &&
      sess.counterpart_user_id !== userId
    ) {
      return ErrorResponses.unauthorized("Not part of this session");
    }

    return NextResponse.json({ session: sess });
  }
);
