/**
 * LangGraph integration for Delegation AI
 * Provides single entry point for delegation chat with streaming support
 */

import type { DelegationContext, DelegationResponse } from "./delegation-types";
import { DelegationAI } from "./delegation-ai";
import { loadIntegrationContext } from "@/lib/integrations/service";
import { createDelegationSteps } from "../orchestrator/delegation-executors";
import { delegationOrchestrator } from "../orchestrator/delegation-orchestrator";

/**
 * Create a streaming response from a static text
 */
function createDirectResponseStream(text: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      // Split text into chunks for streaming effect
      const words = text.split(" ");
      let index = 0;

      const pushChunk = () => {
        if (index < words.length) {
          const chunk = words[index] + (index < words.length - 1 ? " " : "");
          controller.enqueue(new TextEncoder().encode(chunk));
          index++;
          setTimeout(pushChunk, 50); // Small delay between words
        } else {
          controller.close();
        }
      };

      pushChunk();
    },
  });
}

/**
 * Execute delegation multi-step flow
 * Uses the new delegation-specific orchestrator
 */
async function executeDelegationMultiStep(
  response: DelegationResponse,
  context: DelegationContext
): Promise<ReadableStream> {
  // Type guard to ensure we have a scheduling response
  if (response.intent !== "scheduling") {
    throw new Error(
      "executeDelegationMultiStep called with non-scheduling response"
    );
  }

  // Load calendar integration before executing steps
  const calendarIntegration = await loadCalendarIntegrationForDelegation(
    context.ownerUserId
  );

  // Create delegation steps with the scheduling analysis
  const steps = createDelegationSteps(
    response.schedulingAnalysis.timeAnalysis,
    response.schedulingAnalysis.meetingContext
  );

  console.log("🎯 Passing contextual messages to orchestrator:", {
    meetingScheduled:
      response.schedulingAnalysis.contextualMessages.meetingScheduled,
    timeConflict: response.schedulingAnalysis.contextualMessages.timeConflict,
  });

  // Execute the multi-step flow with delegation orchestrator
  return delegationOrchestrator.executeSteps(steps, {
    delegationId: context.delegationId,
    ownerUserId: context.ownerUserId,
    externalUserName: context.externalUserName,
    externalUserTimezone: context.externalUserTimezone,
    constraints: context.constraints,
    calendarIntegration,
    contextualMessages: response.schedulingAnalysis.contextualMessages,
  });
}

/**
 * Load calendar integration for delegation
 */
async function loadCalendarIntegrationForDelegation(ownerUserId: string) {
  try {
    console.log(
      "🗓️ Loading calendar integration for delegation, owner:",
      ownerUserId
    );

    // Load calendar integration for the owner
    const calendarContext = await loadIntegrationContext(
      ownerUserId,
      "calendar"
    );

    console.log("✅ Calendar integration loaded for delegation:", {
      isConnected: calendarContext.isConnected,
      dataCount: calendarContext.data?.length || 0,
      hasError: !!calendarContext.error,
    });

    return calendarContext;
  } catch (error) {
    console.error("Failed to load calendar integration for delegation:", error);

    // Return empty calendar context on error
    return {
      isConnected: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : "Calendar loading failed",
    };
  }
}

/**
 * Main entry point for delegation chat
 */
export const executeDelegationChat = async (
  message: string,
  context: DelegationContext
): Promise<ReadableStream> => {
  const delegationAI = new DelegationAI();

  // Single entry point for all delegation chat
  const response = await delegationAI.processMessage(message, context);

  console.log("🎯 Delegation Chat Decision:", {
    intent: response.intent,
    confidence: response.confidence,
    perinResponseLength: response.perinResponse.length,
  });

  if (response.intent === "scheduling") {
    // Multi-step flow for scheduling
    console.log("📅 Using multi-step scheduling flow");
    return await executeDelegationMultiStep(response, context);
  } else {
    // Direct response for non-scheduling interactions
    console.log("💬 Using direct response flow");
    return createDirectResponseStream(response.perinResponse);
  }
};
