import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";
import { semanticMemoryManager } from "@/lib/ai/memory/semantic-memory";

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
    const { action, data } = body;

    switch (action) {
      case "store":
        const { key, content, context, importance, relevance } = data;

        if (!key || !content) {
          return ErrorResponses.badRequest(
            "Key and content are required for storing memory"
          );
        }

        const storeResponse = await semanticMemoryManager.storeMemory({
          userId,
          key,
          content,
          context,
          importance,
          relevance,
        });

        return Response.json({
          success: storeResponse.success,
          memoryId: storeResponse.memoryId,
          processingTime: storeResponse.processingTime,
        });

      case "retrieve":
        const { query, limit, minRelevance } = data;

        if (!query) {
          return ErrorResponses.badRequest(
            "Query is required for retrieving memories"
          );
        }

        const retrieveResponse =
          await semanticMemoryManager.retrieveRelevantMemories({
            userId,
            query,
            limit,
            minRelevance,
          });

        return Response.json({
          success: true,
          memories: retrieveResponse.memories,
          totalFound: retrieveResponse.totalFound,
          averageRelevance: retrieveResponse.averageRelevance,
          processingTime: retrieveResponse.processingTime,
        });

      default:
        return ErrorResponses.badRequest(
          "Invalid action. Supported actions: store, retrieve"
        );
    }
  } catch (error) {
    console.error("❌ Error in semantic memory API:", error);
    return ErrorResponses.internalServerError(
      "Failed to process memory request"
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "stats":
        const stats = await semanticMemoryManager.getMemoryStats(userId);
        return Response.json({
          success: true,
          stats,
        });

      case "satisfaction":
        const daysBack = parseInt(url.searchParams.get("days") || "30");
        const satisfaction = await semanticMemoryManager.getUserSatisfaction(
          userId,
          daysBack
        );
        return Response.json({
          success: true,
          satisfaction,
          daysBack,
        });

      default:
        return Response.json({
          success: true,
          system: {
            name: "Perin Semantic Memory System",
            version: "2.0.0",
            capabilities: [
              "semantic_memory_storage",
              "ai_powered_retrieval",
              "relevance_scoring",
              "access_tracking",
              "memory_statistics",
            ],
          },
          endpoints: {
            "POST /api/ai/memory/semantic": "Store or retrieve memories",
            "GET /api/ai/memory/semantic?action=stats": "Get memory statistics",
            "GET /api/ai/memory/semantic?action=satisfaction":
              "Get user satisfaction",
          },
        });
    }
  } catch (error) {
    console.error("❌ Error in semantic memory status API:", error);
    return ErrorResponses.internalServerError("Failed to get memory status");
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

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "cleanup":
        await semanticMemoryManager.cleanupExpiredCache();
        return Response.json({
          success: true,
          message: "Cache cleanup completed",
        });

      default:
        return ErrorResponses.badRequest(
          "Invalid action. Supported actions: cleanup"
        );
    }
  } catch (error) {
    console.error("❌ Error in semantic memory cleanup API:", error);
    return ErrorResponses.internalServerError("Failed to cleanup memory");
  }
}
