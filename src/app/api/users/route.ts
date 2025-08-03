import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandler,
  ErrorResponses,
  validateRequiredFields,
} from "../../../lib/utils/error-handlers";
import * as userQueries from "../../../lib/queries/users";

// GET /api/users - Get all users with pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const result = await userQueries.getAllUsers(limit, offset);

    return NextResponse.json({
      users: result.users,
      pagination: {
        limit,
        offset,
        count: result.count,
      },
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return ErrorResponses.databaseError("Failed to fetch users");
  }
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

  try {
    // Check if user already exists
    const existingUser = await userQueries.getUserByEmail(email);

    if (existingUser) {
      return ErrorResponses.badRequest("User with this email already exists");
    }

    // Create new user
    const newUser = await userQueries.createUser({ email, name });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: { id: newUser.id, email: newUser.email, name: newUser.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return ErrorResponses.databaseError("Failed to create user");
  }
});
