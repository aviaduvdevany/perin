import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  executePerinChat,
  validateOpenAIConfig,
} from "@/lib/ai/openai";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export interface IntentClassification {
  intent:
    | "schedule"
    | "cancel"
    | "clarify"
    | "negotiate"
    | "coordinate"
    | "memory"
    | "general";
  confidence: number;
  entities: Record<string, unknown>;
  suggestedAction?: string;
}

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
    const { message } = body;

    // Validate required fields
    if (!message || typeof message !== "string") {
      return ErrorResponses.badRequest("Message is required");
    }

    // Classification system prompt
    const classificationPrompt = `You are an intent classification system for Perin, a digital delegate.

Analyze the following user message and classify their intent. Return a JSON response with the following structure:

{
  "intent": "schedule|cancel|clarify|negotiate|coordinate|memory|general",
  "confidence": 0.0-1.0,
  "entities": {
    "time": "extracted time information",
    "people": ["person names"],
    "location": "location if mentioned",
    "action": "specific action requested"
  },
  "suggestedAction": "brief description of what Perin should do"
}

Intent definitions:
- schedule: User wants to schedule a meeting, appointment, or event
- cancel: User wants to cancel or reschedule something
- clarify: User is asking for clarification or more information
- negotiate: User wants Perin to negotiate on their behalf
- coordinate: User wants Perin to coordinate with multiple people/tasks
- memory: User is referencing past interactions or wants to update memory
- general: General conversation, questions, or other intents

User message: "${message}"

Respond with only the JSON classification:`;

    // Execute classification
    const classificationRequest = {
      messages: [
        { role: "system" as const, content: classificationPrompt },
        { role: "user" as const, content: message },
      ],
      tone: "analytical",
      perinName: "Perin",
      memory: {},
      userId: userId,
    };

    const { response } = await executePerinChat(classificationRequest);

    // For now, return the streaming response
    // In a production system, you might want to parse the response to extract the JSON
    return response;
  } catch (error) {
    console.error("Error in intent classification:", error);
    return ErrorResponses.internalServerError("Failed to classify intent");
  }
}
