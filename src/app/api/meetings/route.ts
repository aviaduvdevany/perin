import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeMutation } from "../../../lib/utils/db-helpers";
import {
  withErrorHandler,
  ErrorResponses,
  validateRequiredFields,
} from "../../../lib/utils/error-handlers";
import * as meetingQueries from "../../../lib/queries/meetings";
import type { Meeting } from "../../../lib/db-types";

// GET /api/meetings - Get all meetings with pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const userId = searchParams.get("userId");

  let sql: string;
  let params: unknown[];

  if (userId) {
    sql = meetingQueries.getMeetingsByUser(userId, limit, offset);
    params = [userId, limit, offset];
  } else {
    sql = meetingQueries.getAllMeetings(limit, offset);
    params = [limit, offset];
  }

  const result = await executeQuery<Meeting>(sql, params);

  if (result.error) {
    return ErrorResponses.databaseError(result.error);
  }

  return NextResponse.json({
    meetings: result.data,
    pagination: {
      limit,
      offset,
      count: result.count,
    },
  });
});

// POST /api/meetings - Create a new meeting
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // Validate required fields
  const validation = validateRequiredFields(body, [
    "user_id",
    "title",
    "start_time",
    "end_time",
  ]);
  if (!validation.isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${validation.missingFields.join(", ")}`
    );
  }

  const { user_id, title, description, start_time, end_time } = body;

  // Create new meeting
  const createSql = meetingQueries.createMeeting({
    user_id,
    title,
    description,
    start_time,
    end_time,
  });

  const result = await executeMutation(createSql, [
    user_id,
    title,
    description,
    start_time,
    end_time,
  ]);

  if (!result.success) {
    return ErrorResponses.databaseError(
      result.error || "Failed to create meeting"
    );
  }

  return NextResponse.json(
    {
      message: "Meeting created successfully",
      meeting: { user_id, title, description, start_time, end_time },
    },
    { status: 201 }
  );
});
