import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getUserMemory,
  addMemoryEntry,
  getMemoryEntries,
  clearMemoryEntries,
} from "@/lib/ai/memory";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get("keys");

    let memory;
    if (keys) {
      // Get specific memory entries
      const keyArray = keys.split(",").map((k) => k.trim());
      const entries = await getMemoryEntries(userId, keyArray);
      memory = { entries };
    } else {
      // Get all user memory
      memory = await getUserMemory(userId);
    }

    if (!memory) {
      return ErrorResponses.notFound("Memory not found");
    }

    return Response.json({ memory });
  } catch (error) {
    console.error("Error getting memory:", error);
    return ErrorResponses.internalServerError("Failed to retrieve memory");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Parse request body
    const body = await request.json();
    const { key, value, context } = body;

    // Validate required fields
    if (!key || value === undefined) {
      return ErrorResponses.badRequest("Key and value are required");
    }

    // Add memory entry
    const success = await addMemoryEntry(userId, key, value, context);

    if (!success) {
      return ErrorResponses.internalServerError("Failed to add memory entry");
    }

    return Response.json({
      message: "Memory entry added successfully",
      key,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding memory entry:", error);
    return ErrorResponses.internalServerError("Failed to add memory entry");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get("keys");

    if (!keys) {
      return ErrorResponses.badRequest("Keys parameter is required");
    }

    // Clear memory entries
    const keyArray = keys.split(",").map((k) => k.trim());
    const success = await clearMemoryEntries(userId, keyArray);

    if (!success) {
      return ErrorResponses.internalServerError(
        "Failed to clear memory entries"
      );
    }

    return Response.json({
      message: "Memory entries cleared successfully",
      clearedKeys: keyArray,
    });
  } catch (error) {
    console.error("Error clearing memory entries:", error);
    return ErrorResponses.internalServerError("Failed to clear memory entries");
  }
}
