import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";
import { understandingOrchestrator } from "@/lib/ai/understanding";
import { withRetry } from "@/lib/ai/resilience/error-handler";
import type { ChatMessage } from "@/types/ai";

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
    const { input, conversationHistory, userPreferences } = body;

    // Validate required fields
    if (!input || typeof input !== "string") {
      return ErrorResponses.badRequest("Input text is required");
    }

    // Use AI-powered understanding
    const understandingResponse = await withRetry(
      async () => {
        return await understandingOrchestrator.understand({
          input,
          userId,
          conversationHistory: conversationHistory || [],
          userPreferences: userPreferences || {
            language: "en",
            timezone: "UTC",
            communicationStyle: "neutral",
            responseLength: "balanced",
          },
        });
      },
      "ai-understanding-api",
      { maxRetries: 3, baseDelayMs: 1000, circuitBreaker: true }
    );

    // Log the understanding request for analytics
    console.log("🎯 AI Understanding API Request:", {
      userId,
      timestamp: new Date().toISOString(),
      inputLength: input.length,
      intent: understandingResponse.intent.type,
      confidence: understandingResponse.confidence,
      language: understandingResponse.language,
      entities: understandingResponse.entities.length,
    });

    return Response.json({
      success: true,
      understanding: understandingResponse,
      processingTime: Date.now() - Date.now(), // Will be calculated in the orchestrator
    });
  } catch (error) {
    console.error("❌ Error in AI understanding API:", error);

    // Enhanced error handling
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return ErrorResponses.internalServerError(
      "Failed to process understanding request"
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

    // Return system status and capabilities
    return Response.json({
      success: true,
      system: {
        name: "Perin AI Understanding System",
        version: "2.0.0",
        capabilities: [
          "intent_analysis",
          "entity_extraction",
          "language_processing",
          "context_understanding",
          "multi_language_support",
        ],
        supportedLanguages: [
          "en",
          "es",
          "fr",
          "de",
          "it",
          "pt",
          "ru",
          "ja",
          "ko",
          "zh",
          "ar",
          "hi",
          "nl",
          "sv",
          "no",
          "da",
          "fi",
          "pl",
          "tr",
          "he",
        ],
        supportedIntents: [
          "scheduling",
          "information",
          "coordination",
          "delegation",
          "preference",
          "general",
        ],
      },
      status: "operational",
    });
  } catch (error) {
    console.error("❌ Error in AI understanding status API:", error);
    return ErrorResponses.internalServerError("Failed to get system status");
  }
}
