import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateAndAccessDelegation } from "@/lib/delegation/session-manager";
import {
  createDelegationMessage,
  getDelegationMessages,
} from "@/lib/queries/delegation";
import { executeChatGraph } from "@/lib/ai/langgraph/graphs/base-chat";
import { withErrorHandler } from "@/lib/utils/error-handlers";
import { rateLimit } from "@/lib/utils/rate-limit";

// Validation schema for chat requests
const chatRequestSchema = z.object({
  delegationId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  externalUserName: z.string().max(100).optional(),
  signature: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Parse and validate request body
  const body = await request.json();
  const validation = chatRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { delegationId, message, externalUserName, signature } =
    validation.data;

  // Rate limiting for delegation chat
  const rateLimitAllowed = rateLimit(
    `delegation-${delegationId}`,
    "delegation-chat",
    {
      tokensPerInterval: 10,
      intervalMs: 60000, // 10 requests per minute per delegation
    }
  );

  if (!rateLimitAllowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Validate delegation session
  const { session, error } = await validateAndAccessDelegation(
    delegationId,
    signature
  );

  if (error || !session) {
    return NextResponse.json(
      { error: error || "Invalid delegation" },
      { status: 400 }
    );
  }

  try {
    // Create external user message
    await createDelegationMessage(
      delegationId,
      true, // fromExternal
      message,
      "text"
    );

    // Get conversation history
    const messages = await getDelegationMessages(delegationId, 20);

    // Convert to chat format for AI
    const chatMessages = messages.map((msg) => ({
      role: msg.fromExternal ? ("user" as const) : ("assistant" as const),
      content: msg.content,
    }));

    // Execute AI chat with delegation context
    const aiState = await executeChatGraph({
      messages: chatMessages,
      userId: session.ownerUserId,
      tone: "friendly",
      perinName: "Perin",
      specialization: "scheduling",
      memoryContext: {},
      conversationContext: "",
      systemPrompt: "",
      openaiResponse: "",
      streamChunks: [],
      currentStep: "initialized",
      emailContext: {},
      calendarContext: {},
    });

    // Create AI response message
    await createDelegationMessage(
      delegationId,
      false, // fromExternal
      aiState.openaiResponse,
      "text"
    );

    return NextResponse.json({
      response: aiState.openaiResponse,
      delegationId,
      externalUserName,
    });
  } catch (error) {
    console.error("Error in delegation chat:", error);

    // Create error message
    await createDelegationMessage(
      delegationId,
      false,
      "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      "text"
    );

    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
});
