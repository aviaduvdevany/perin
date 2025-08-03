import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import {
  executePerinChat,
  validateOpenAIConfig,
  getUserIdFromSession,
} from "../../../../lib/ai/openai";
import { getRelevantMemoryContext } from "../../../../lib/ai/memory";
import {
  buildPerinSystemPrompt,
  buildSpecializedPrompt,
} from "../../../../lib/ai/prompts/system";
import * as userQueries from "../../../../lib/queries/users";
import { ErrorResponses } from "../../../../lib/utils/error-handlers";

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

    // Build system prompt
    const systemPromptContext = {
      user,
      conversationHistory: conversationContext,
      currentTime: new Date().toISOString(),
      timezone: user.timezone,
    };

    const systemPrompt = specialization
      ? buildSpecializedPrompt(
          systemPromptContext,
          specialization as
            | "negotiation"
            | "scheduling"
            | "memory"
            | "coordination"
        )
      : buildPerinSystemPrompt(systemPromptContext);

    // Prepare chat request
    const chatRequest = {
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...messages,
      ],
      tone: tone || user.tone || "friendly",
      perinName: perinName || user.perin_name || "Perin",
      memory: memoryContext,
      userId: userId,
    };

    // Execute AI chat
    const { response } = await executePerinChat(chatRequest);

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
