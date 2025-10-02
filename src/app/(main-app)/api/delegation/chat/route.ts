import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateAndAccessDelegation } from "@/lib/delegation/session-manager";
import { createDelegationMessage } from "@/lib/queries/delegation";
import { executeDelegationChat } from "@/lib/ai/delegation";
import { getUserById } from "@/lib/queries/users";
import { rateLimit } from "@/lib/utils/rate-limit";

// Validation schema for chat requests
const chatRequestSchema = z.object({
  delegationId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  conversationHistory: z.string().max(10000).optional(),
  externalUserName: z.string().max(100).optional(),
  signature: z.string().optional(),
  timezone: z.string().optional(),
});

export const POST = async (request: NextRequest) => {
  // Parse and validate request body
  const body = await request.json();
  const validation = chatRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: validation.error.errors },
      { status: 400 }
    );
  }

  const {
    delegationId,
    message,
    conversationHistory,
    externalUserName,
    signature,
    timezone,
  } = validation.data;

  // Debug logging for timezone detection
  console.log("🌍 Delegation chat timezone received:", {
    delegationId,
    timezone,
    externalUserName,
    userAgent: request.headers.get("user-agent")?.substring(0, 100),
  });

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

    // Get owner's user data for delegation context
    const ownerData = await getUserById(session.ownerUserId);
    if (!ownerData) {
      throw new Error("Owner user data not found");
    }

    // Build delegation context with owner's personality and preferences
    const delegationContext = {
      delegationId: session.id,
      ownerUserId: session.ownerUserId,
      ownerName: ownerData.name || "Owner",
      ownerTimezone: ownerData.timezone || "UTC",
      externalUserName: externalUserName || session.externalUserName,
      externalUserTimezone: timezone,
      constraints: session.constraints as Record<string, unknown>,
      conversationHistory: conversationHistory || "",
      perinPersonality: {
        name: ownerData.perin_name || "Perin",
        tone: ownerData.tone || "friendly",
        communicationStyle: "warm",
        language: "auto",
      },
    };

    console.log("🎯 Delegation Context:", {
      delegationId: delegationContext.delegationId,
      ownerName: delegationContext.ownerName,
      ownerTimezone: delegationContext.ownerTimezone,
      externalUserName: delegationContext.externalUserName,
      externalUserTimezone: delegationContext.externalUserTimezone,
      perinName: delegationContext.perinPersonality.name,
      tone: delegationContext.perinPersonality.tone,
      conversationHistoryLength: delegationContext.conversationHistory.length,
      conversationHistory:
        delegationContext.conversationHistory.substring(0, 200) + "...", // First 200 chars
    });

    // Execute delegation chat using new Delegation AI system
    const stream = await executeDelegationChat(message, delegationContext);

    // For delegation, we'll collect the response and store it, but also return the stream
    // This allows for multi-step processing while maintaining message persistence
    let fullResponse = "";

    // Create a transform stream to capture the response while passing it through
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);

        // Filter out control tokens for storage but pass everything through to client
        if (!text.includes("[[PERIN_")) {
          fullResponse += text;
        }

        controller.enqueue(chunk);
      },
      flush() {
        // Store the final response when stream is complete
        if (fullResponse.trim()) {
          createDelegationMessage(
            delegationId,
            false, // fromExternal
            fullResponse,
            "text"
          ).catch((error) => {
            console.error("Error storing delegation message:", error);
          });
        }
      },
    });

    // Return the streaming response
    return new Response(stream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-Delegation-Id": delegationId,
        "X-External-User": externalUserName || "",
      },
    });
  } catch (error) {
    console.error("Error in delegation chat:", error);

    // Create error message with owner's Perin personality
    const errorMessage = `I apologize, but I'm having trouble processing your request right now. Please try again in a moment.`;

    await createDelegationMessage(delegationId, false, errorMessage, "text");

    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
};
