import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { validateOpenAIConfig } from "@/lib/ai/openai";
import { executePerinChatWithLangGraph } from "@/lib/ai/langgraph";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { getRelevantMemoryContext } from "@/lib/ai/memory";
import * as userQueries from "@/lib/queries/users";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    // Validate OpenAI configuration
    if (!validateOpenAIConfig()) {
      return ErrorResponses.internalServerError("AI service not configured");
    }

    // Parse request body
    const body = await request.json();
    const { messages, tone, perinName, specialization } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return ErrorResponses.badRequest("Messages array is required");
    }

    // Get user data with preferences
    const user = await userQueries.getUserById(userId);
    if (!user) {
      return ErrorResponses.notFound("User not found");
    }

    // Get relevant memory context
    const conversationContext = messages
      .map((msg) => msg.content)
      .join(" ")
      .slice(-500); // Last 500 characters for context

    const memoryContext = await getRelevantMemoryContext(
      userId,
      conversationContext
    );

    // Note: System prompt building is now handled within the LangGraph workflow

    // Note: chatRequest is no longer used with LangGraph implementation

    // Heuristic specialization inference: default to scheduling when user asks to meet/schedule
    const text = messages
      .map((m: { content: string }) => m?.content || "")
      .join(" ")
      .toLowerCase();
    const mentionsScheduling =
      /\b(meet|meeting|schedule|set up|book|find time|calendar)\b/.test(text);
    const inferredSpecialization =
      specialization || (mentionsScheduling ? "scheduling" : undefined);


    // Execute AI chat with LangGraph
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
      }
    );

    // Log the interaction for debugging and audits
    console.log("AI Chat Interaction:", {
      userId: userId,
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      specialization,
      hasMemoryContext: Object.keys(memoryContext).length > 0,
    });

    return response;
  } catch (error) {
    console.error("Error in AI chat route:", error);
    return ErrorResponses.internalServerError("Failed to process chat request");
  }
}
