import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateAndAccessDelegation } from "@/lib/delegation/session-manager";
import { createDelegationMessage } from "@/lib/queries/delegation";
import { executePerinChatWithLangGraph } from "@/lib/ai/langgraph";
import { rateLimit } from "@/lib/utils/rate-limit";

// Validation schema for chat requests
const chatRequestSchema = z.object({
  delegationId: z.string().uuid(),
  message: z.string().min(1).max(2000),
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

  const { delegationId, message, externalUserName, signature, timezone } =
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

    // For delegation, we only need the current message - no conversation history
    // This prevents context pollution and maintains privacy/security
    const chatMessages = [
      {
        role: "user" as const,
        content: message,
      },
    ];

    // Execute AI chat with delegation context using full LangGraph system
    const { stream } = await executePerinChatWithLangGraph(
      chatMessages,
      session.ownerUserId,
      "friendly",
      "Perin",
      "scheduling",
      undefined, // user data
      {
        // Add delegation context
        connectedIntegrationTypes: ["calendar"], // Only calendar for external users
        delegationContext: {
          delegationId: session.id,
          externalUserName: externalUserName || session.externalUserName,
          ...(session.externalUserEmail && {
            externalUserEmail: session.externalUserEmail,
          }),
          constraints: session.constraints as Record<string, unknown>,
          isDelegation: true,
          externalUserTimezone: timezone,
        },
      }
    );

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
};
