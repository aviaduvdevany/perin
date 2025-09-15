/**
 * Delegation-specific step executors for multi-step scheduling flows
 * Moved from LangGraph orchestrator and adapted for Delegation AI
 */

import type {
  StepDefinition,
  LangGraphChatState,
  MultiStepContext,
} from "@/types/ai";
import type { StepExecutor } from "../../langgraph/orchestrator/multi-step-orchestrator";
import {
  checkOwnerAvailabilityHandler,
  scheduleWithOwnerHandler,
  type CheckOwnerAvailabilityArgs,
  type ScheduleWithOwnerArgs,
} from "../../tools/delegation";
import type { ToolContext } from "../../tools/types";
import type { TimeAnalysis, MeetingContext } from "../core/delegation-types";

// Extended step definition with data
interface StepDefinitionWithData<T = unknown> extends StepDefinition {
  data?: T;
}

/**
 * Step executor for checking owner availability
 */
export const delegationCheckAvailabilityExecutor: StepExecutor = async (
  state: LangGraphChatState,
  step: StepDefinition,
  _context: MultiStepContext,
  onProgress
) => {
  // Use contextual messages if available, otherwise fall back to defaults
  const checkingMessage =
    state.contextualMessages?.checkingAvailability ||
    "Analyzing your request...";

  console.log("📋 Delegation Step Executor - Using checking message:", {
    contextualMessage: state.contextualMessages?.checkingAvailability,
    fallbackMessage: "Analyzing your request...",
    finalMessage: checkingMessage,
  });

  onProgress(checkingMessage);

  try {
    // Extract step data (should be passed through step metadata)
    const stepWithData =
      step as StepDefinitionWithData<CheckOwnerAvailabilityArgs>;
    const stepData = stepWithData.data;

    if (!stepData) {
      throw new Error("Missing availability check parameters");
    }

    onProgress("Connecting to calendar service...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate connection time

    onProgress("Checking owner's calendar availability...");

    // Create tool context with required fields
    const toolContext: ToolContext = {
      userId: state.userId,
      delegationContext: state.delegationContext,
      conversationContext: state.conversationContext,
      memoryContext: state.memoryContext,
      integrations: state.integrations || {},
    };

    onProgress("Searching for available time slots...");
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate search time

    // Execute the availability check
    const result = await checkOwnerAvailabilityHandler(toolContext, stepData);

    if (result.ok && result.data) {
      const data = result.data;

      if (data.isAvailable) {
        const availableMessage =
          state.contextualMessages?.availabilityConfirmed ||
          "✅ Time slot is available!";
        onProgress(availableMessage);

        return {
          stepId: step.id,
          status: "completed",
          result: data,
          progressMessage: availableMessage,
        };
      } else {
        // Use contextual message if available and not empty, otherwise use language-aware fallback
        let conflictMessage = state.contextualMessages?.timeConflict;

        if (!conflictMessage || conflictMessage.trim() === "") {
          // Detect user's language from conversation for fallback
          const isHebrew =
            state.conversationContext &&
            /[\u0590-\u05FF]/.test(state.conversationContext);
          conflictMessage = isHebrew
            ? "❌ יש התנגשות בזמן המבוקש, בודק חלופות..."
            : "❌ Time slot is not available, checking alternatives...";
        }

        console.log("📋 Delegation Step Executor - Using conflict message:", {
          contextualMessage: state.contextualMessages?.timeConflict,
          fallbackMessage: conflictMessage,
          isHebrew:
            state.conversationContext &&
            /[\u0590-\u05FF]/.test(state.conversationContext),
        });

        onProgress(conflictMessage);

        return {
          stepId: step.id,
          status: "failed",
          result: data,
          progressMessage: conflictMessage,
        };
      }
    } else {
      const errorMessage = result.error || "Availability check failed";
      const errorString =
        typeof errorMessage === "string"
          ? errorMessage
          : (errorMessage as { message: string }).message;

      // Check for calendar reauth errors in the tool result
      if (
        errorString.includes("Calendar authentication expired") ||
        errorString.includes("please reconnect") ||
        errorString.includes("reauth required")
      ) {
        onProgress("❌ Calendar authentication expired");
        return {
          stepId: step.id,
          status: "failed",
          error: "Calendar authentication expired",
          progressMessage: `❌ Calendar needs to be reconnected. The owner should refresh their calendar access to enable meeting scheduling.`,
        };
      }

      onProgress("❌ Failed to check availability");
      return {
        stepId: step.id,
        status: "failed",
        error: errorString,
        progressMessage: `❌ Failed to check availability: ${errorString}`,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    onProgress("❌ Unexpected error occurred");
    return {
      stepId: step.id,
      status: "failed",
      error: errorMessage,
      progressMessage: `❌ Unexpected error while checking availability: ${errorMessage}`,
    };
  }
};

/**
 * Step executor for scheduling meeting with owner
 */
export const delegationScheduleMeetingExecutor: StepExecutor = async (
  state: LangGraphChatState,
  step: StepDefinition,
  _context: MultiStepContext,
  onProgress
) => {
  // Use contextual messages for scheduling progress
  const schedulingMessage =
    state.contextualMessages?.schedulingMeeting ||
    "Preparing to schedule the meeting...";
  onProgress(schedulingMessage);

  try {
    // Extract step data
    const stepWithData = step as StepDefinitionWithData<ScheduleWithOwnerArgs>;
    const stepData = stepWithData.data;

    if (!stepData) {
      throw new Error("Missing meeting scheduling parameters");
    }

    onProgress("Creating calendar event...");
    await new Promise((resolve) => setTimeout(resolve, 400)); // Simulate event creation time

    onProgress("Setting up meeting details...");
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate setup time

    // Create tool context with required fields
    const toolContext: ToolContext = {
      userId: state.userId,
      delegationContext: state.delegationContext,
      conversationContext: state.conversationContext,
      memoryContext: state.memoryContext,
      integrations: state.integrations || {},
    };

    onProgress("Sending calendar invitation...");

    // Execute the meeting scheduling
    const result = await scheduleWithOwnerHandler(toolContext, stepData);

    if (result.ok && result.data) {
      const data = result.data;
      const successMessage =
        state.contextualMessages?.meetingScheduled ||
        "✅ Meeting scheduled successfully!";
      onProgress(successMessage);

      return {
        stepId: step.id,
        status: "completed",
        result: data,
        progressMessage: successMessage,
      };
    } else {
      const errorMessage = result.error || "Meeting scheduling failed";
      throw new Error(
        typeof errorMessage === "string"
          ? errorMessage
          : (errorMessage as { message: string }).message
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for calendar reauth errors
    if (
      errorMessage.includes("reauth required") ||
      errorMessage.includes("invalid_grant")
    ) {
      onProgress("❌ Calendar authentication expired");
      return {
        stepId: step.id,
        status: "failed",
        error: "Calendar authentication expired",
        progressMessage: `❌ Calendar needs to be reconnected. The owner should refresh their calendar access to enable meeting scheduling.`,
      };
    }

    onProgress("❌ Failed to schedule meeting");
    return {
      stepId: step.id,
      status: "failed",
      error: errorMessage,
      progressMessage: `❌ Failed to schedule meeting: ${errorMessage}`,
    };
  }
};

/**
 * Create delegation step definitions with Delegation AI analysis results
 */
export function createDelegationSteps(
  timeAnalysis: TimeAnalysis,
  meetingContext: MeetingContext
): StepDefinitionWithData[] {
  if (!timeAnalysis.parsedDateTime) {
    throw new Error("No valid date/time found in analysis");
  }

  const startTime = timeAnalysis.parsedDateTime.toISOString();
  const durationMins = meetingContext.duration || 30;
  const title = meetingContext.title || "Meeting";

  return [
    {
      id: "check_availability",
      name: "Check Availability",
      description: "Checking the owner's calendar for availability",
      required: true,
      estimatedDuration: 3,
      data: {
        startTime,
        durationMins,
        timezone: timeAnalysis.extractedComponents.timezone,
      } as CheckOwnerAvailabilityArgs,
    },
    {
      id: "schedule_meeting",
      name: "Schedule Meeting",
      description: "Creating the calendar event and finalizing the meeting",
      required: true,
      estimatedDuration: 4,
      data: {
        startTime,
        durationMins,
        title,
        timezone: timeAnalysis.extractedComponents.timezone,
        externalUserName: "External User", // Will be replaced with actual name in context
      } as ScheduleWithOwnerArgs,
    },
  ];
}

/**
 * Register all delegation step executors
 */
export function registerDelegationStepExecutors(orchestrator: {
  registerStepExecutor: (id: string, executor: StepExecutor) => void;
}) {
  orchestrator.registerStepExecutor(
    "check_availability",
    delegationCheckAvailabilityExecutor
  );
  orchestrator.registerStepExecutor(
    "schedule_meeting",
    delegationScheduleMeetingExecutor
  );
}
