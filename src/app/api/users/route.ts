import { NextRequest, NextResponse } from "next/server";
import {
  executeQuery,
  executeSingleQuery,
  executeMutation,
} from "../../../lib/utils/db-helpers";
import {
  withErrorHandler,
  ErrorResponses,
  validateRequiredFields,
} from "../../../lib/utils/error-handlers";
import * as userQueries from "../../../lib/queries/users";
import type { User } from "../../../lib/db-types";

// GET /api/users - Get all users with pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const sql = userQueries.getAllUsers(limit, offset);
  const result = await executeQuery<User>(sql, [limit, offset]);

  if (result.error) {
    return ErrorResponses.databaseError(result.error);
  }

  return NextResponse.json({
    users: result.data,
    pagination: {
      limit,
      offset,
      count: result.count,
    },
  });
});

// POST /api/users - Create a new user
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // Validate required fields
  const validation = validateRequiredFields(body, ["email", "name"]);
  if (!validation.isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${validation.missingFields.join(", ")}`
    );
  }

  const { email, name } = body;

  // Check if user already exists
  const existingUserSql = userQueries.getUserByEmail(email);
  const existingResult = await executeSingleQuery<User>(existingUserSql, [
    email,
  ]);

  if (existingResult.data) {
    return ErrorResponses.badRequest("User with this email already exists");
  }

  // Create new user
  const createSql = userQueries.createUser({ email, name });
  const result = await executeMutation(createSql, [email, name]);

  if (!result.success) {
    return ErrorResponses.databaseError(
      result.error || "Failed to create user"
    );
  }

  return NextResponse.json(
    {
      message: "User created successfully",
      user: { email, name },
    },
    { status: 201 }
  );
});
