import { NextRequest, NextResponse } from "next/server";
import {
  executeSingleQuery,
  executeMutation,
} from "../../../../lib/utils/db-helpers";
import {
  withErrorHandler,
  ErrorResponses,
} from "../../../../lib/utils/error-handlers";
import * as userQueries from "../../../../lib/queries/users";
import type { User } from "../../../../lib/db-types";

// GET /api/users/[id] - Get a specific user
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    const sql = userQueries.getUserById(id);
    const result = await executeSingleQuery<User>(sql, [id]);

    if (result.error) {
      return ErrorResponses.databaseError(result.error);
    }

    if (!result.data) {
      return ErrorResponses.notFound("User not found");
    }

    return NextResponse.json({
      user: result.data[0],
    });
  }
);

// PUT /api/users/[id] - Update a user
export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();

    // Check if user exists
    const existingSql = userQueries.getUserById(id);
    const existingResult = await executeSingleQuery<User>(existingSql, [id]);

    if (!existingResult.data) {
      return ErrorResponses.notFound("User not found");
    }

    // Update user
    const { email, name } = body;
    const updateSql = userQueries.updateUser(id, { email, name });
    const result = await executeMutation(updateSql, [id, email, name]);

    if (!result.success) {
      return ErrorResponses.databaseError(
        result.error || "Failed to update user"
      );
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: { id, email, name },
    });
  }
);

// DELETE /api/users/[id] - Delete a user
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    // Check if user exists
    const existingSql = userQueries.getUserById(id);
    const existingResult = await executeSingleQuery<User>(existingSql, [id]);

    if (!existingResult.data) {
      return ErrorResponses.notFound("User not found");
    }

    // Delete user
    const deleteSql = userQueries.deleteUser(id);
    const result = await executeMutation(deleteSql, [id]);

    if (!result.success) {
      return ErrorResponses.databaseError(
        result.error || "Failed to delete user"
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
    });
  }
);
