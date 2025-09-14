import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandler,
  ErrorResponses,
} from "@/lib/utils/error-handlers";
import * as userQueries from "@/lib/queries/users";

// GET /api/users/[id] - Get a specific user
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    try {
      const user = await userQueries.getUserById(id);

      if (!user) {
        return ErrorResponses.notFound("User not found");
      }

      return NextResponse.json({
        user,
      });
    } catch (error) {
      console.error("Error getting user:", error);
      return ErrorResponses.databaseError("Failed to fetch user");
    }
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

    try {
      // Check if user exists
      const existingUser = await userQueries.getUserById(id);

      if (!existingUser) {
        return ErrorResponses.notFound("User not found");
      }

      // Update user
      const { email, name } = body;
      const updatedUser = await userQueries.updateUser(id, { email, name });

      if (!updatedUser) {
        return ErrorResponses.databaseError("Failed to update user");
      }

      return NextResponse.json({
        message: "User updated successfully",
        user: { id, email, name },
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return ErrorResponses.databaseError("Failed to update user");
    }
  }
);

// DELETE /api/users/[id] - Delete a user
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    try {
      // Check if user exists
      const existingUser = await userQueries.getUserById(id);

      if (!existingUser) {
        return ErrorResponses.notFound("User not found");
      }

      // Delete user
      const deleted = await userQueries.deleteUser(id);

      if (!deleted) {
        return ErrorResponses.databaseError("Failed to delete user");
      }

      return NextResponse.json({
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return ErrorResponses.databaseError("Failed to delete user");
    }
  }
);
