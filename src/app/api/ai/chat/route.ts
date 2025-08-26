import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { validateOpenAIConfig } from "@/lib/ai/openai";
import { executePerinChatWithLangGraph } from "@/lib/ai/langgraph";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";
import * as userQueries from "@/lib/queries/users";
import { understandingOrchestrator } from "@/lib/ai/understanding";
import { integrationOrchestrator } from "@/lib/ai/integration";
import { withRetry } from "@/lib/ai/resilience/error-handler";
import { performanceMonitor } from "@/lib/performance/PerformanceMonitor";
import type { ChatMessage } from "@/types/ai";
import type { IntentAnalysis } from "@/types/understanding";

export async function POST(request: NextRequest) {
  const requestId = `chat-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  const startTime = Date.now();

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Start performance tracking
    const performanceTracker = performanceMonitor.trackRequest(
      requestId,
      userId,
      startTime
    );

    // Validate OpenAI configuration
    if (!validateOpenAIConfig()) {
      return ErrorResponses.internalServerError("AI service not configured");
    }

    // Parse request body
    const body = await request.json();
    const {
      messages,
      tone,
      perinName,
      specialization,
      clientIntegrations,
      clientContext,
    } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return ErrorResponses.badRequest("Messages array is required");
    }

    // Get user data with preferences
    const user = await userQueries.getUserById(userId);
    if (!user) {
      return ErrorResponses.notFound("User not found");
    }

    // Check if we have fresh client context (within 5 minutes)
    const useClientContext =
      clientContext && Date.now() - clientContext.lastUpdated < 5 * 60 * 1000;

    if (useClientContext) {
      console.log("🚀 Using pre-fetched client context");
    } else {
      console.log("🔄 Fetching fresh data from server");
    }

    // Extract conversation context for AI understanding
    const conversationText = messages
      .map((msg: ChatMessage) => msg.content)
      .join(" ")
      .slice(-1000); // Last 1000 characters for context

    // Phase 1: AI-Powered Understanding
    console.log("🧠 Starting AI understanding analysis...");

    const understandingStartTime = Date.now();
    const understandingResponse = await withRetry(
      async () => {
        return await understandingOrchestrator.understand({
          input: conversationText,
          userId,
          conversationHistory: messages
            .filter(
              (msg: ChatMessage) =>
                msg.role === "user" || msg.role === "assistant"
            )
            .map((msg: ChatMessage) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(),
            })),
          userPreferences: {
            language: "en", // Default to English for now
            timezone: user.timezone,
            communicationStyle: "neutral",
            responseLength: "balanced",
          },
          // Pass pre-loaded context for faster processing
          context: useClientContext
            ? {
                calendar: clientContext.calendar,
                memory: clientContext.memory,
                integrations: clientContext.integrations,
              }
            : undefined,
        });
      },
      "ai-understanding",
      { maxRetries: 3, baseDelayMs: 1000, circuitBreaker: true }
    );
    const understandingTime = Date.now() - understandingStartTime;

    console.log("✅ AI understanding completed:", {
      intent: understandingResponse.intent.type,
      confidence: understandingResponse.confidence,
      language: understandingResponse.language,
      entities: understandingResponse.entities.length,
    });

    // Phase 2: Smart Integration Orchestration
    console.log("🔗 Starting smart integration orchestration...");

    const integrationStartTime = Date.now();
    const integrationResponse = await withRetry(
      async () => {
        return await integrationOrchestrator.orchestrateIntegrations({
          userIntent: understandingResponse.intent,
          conversationContext: understandingResponse.context,
          userInput: conversationText,
          userId,
          availableIntegrations: Array.isArray(clientIntegrations)
            ? clientIntegrations
            : ["gmail", "calendar"], // Default integrations
          // TODO: Add preloadedContexts support to IntegrationOrchestrationRequest
        });
      },
      "integration-orchestration",
      { maxRetries: 2, baseDelayMs: 500, circuitBreaker: false }
    );
    const integrationTime = Date.now() - integrationStartTime;

    console.log("✅ Integration orchestration completed:", {
      primaryIntegration: integrationResponse.primaryIntegration,
      relevantIntegrations: integrationResponse.relevantIntegrations.length,
      suggestedWorkflow: integrationResponse.suggestedWorkflow,
    });

    // Determine specialization based on AI understanding
    const inferredSpecialization =
      specialization ||
      (understandingResponse.intent.type === "scheduling"
        ? "scheduling"
        : undefined);

    // Execute AI chat with LangGraph using enhanced context
    const langGraphStartTime = Date.now();
    const { response } = await executePerinChatWithLangGraph(
      messages,
      userId,
      tone || user.tone || "friendly",
      perinName || user.perin_name || "Perin",
      inferredSpecialization,
      {
        perin_name: user.perin_name || undefined,
        tone: user.tone || undefined,
        timezone: user.timezone,
        preferred_hours: user.preferred_hours || undefined,
        memory: user.memory || undefined,
      },
      {
        connectedIntegrationTypes: Array.isArray(clientIntegrations)
          ? clientIntegrations
          : undefined,
      }
    );
    const langGraphTime = Date.now() - langGraphStartTime;

    // Log comprehensive interaction data for analytics
    const totalTime = Date.now() - startTime;

    console.log("🎯 AI Chat Interaction Complete:", {
      userId,
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      performance: {
        totalTime: `${totalTime}ms`,
        understandingTime: `${understandingTime}ms`,
        integrationTime: `${integrationTime}ms`,
        langGraphTime: `${langGraphTime}ms`,
        hasClientContext: useClientContext,
      },
      aiUnderstanding: {
        intent: understandingResponse.intent.type,
        confidence: understandingResponse.confidence,
        language: understandingResponse.language,
        entities: understandingResponse.entities.length,
        requiresAction: understandingResponse.requiresAction,
      },
      integrationOrchestration: {
        primaryIntegration: integrationResponse.primaryIntegration,
        relevantIntegrations: integrationResponse.relevantIntegrations.length,
        workflowSteps: integrationResponse.suggestedWorkflow.length,
      },
      specialization: inferredSpecialization,
      hasIntegrations: Array.isArray(clientIntegrations)
        ? clientIntegrations.length > 0
        : false,
    });

    // Track performance metrics
    performanceTracker.end(Date.now(), {
      totalResponseTime: totalTime,
      understandingTime,
      contextLoadingTime: integrationTime,
      aiProcessingTime: langGraphTime,
      hasClientContext: useClientContext,
      intent: understandingResponse.intent.type,
    });

    return response;
  } catch (error) {
    console.error("❌ Error in AI chat route:", error);

    // Enhanced error handling with fallback
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return ErrorResponses.internalServerError("Failed to process chat request");
  }
}
