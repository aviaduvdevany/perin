import type {
  StepDefinition,
  LangGraphChatState,
  MultiStepContext,
} from "@/types/ai";
import type { StepExecutor } from "./multi-step-orchestrator";
import {
  checkOwnerAvailabilityHandler,
  scheduleWithOwnerHandler,
  type CheckOwnerAvailabilityArgs,
  type ScheduleWithOwnerArgs,
} from "../../tools/delegation";
import type { ToolContext } from "../../tools/types";

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
  onProgress("Analyzing your request...");

  try {
    // Extract step data (should be passed through step metadata)
    const stepWithData =
      step as StepDefinitionWithData<CheckOwnerAvailabilityArgs>;
    const stepData = stepWithData.data;

    if (!stepData) {
      throw new Error("Missing availability check parameters");
    }

    onProgress("Checking owner's calendar availability...");

    // Create tool context with required fields
    const toolContext: ToolContext = {
      userId: state.userId,
      delegationContext: state.delegationContext,
      conversationContext: state.conversationContext,
      memoryContext: state.memoryContext,
      integrations: state.integrations || {},
    };

    // Execute the availability check
    const result = await checkOwnerAvailabilityHandler(toolContext, stepData);

    if (result.ok && result.data) {
      const data = result.data;
      if (data.isAvailable) {
        onProgress("✅ Time slot is available!");

        return {
          stepId: step.id,
          status: "completed",
          result: data,
          progressMessage: `Found available slot: ${new Date(
            data.proposedStartTime
          ).toLocaleString()}`,
        };
      } else {
        onProgress("❌ Time slot is not available, checking alternatives...");

        return {
          stepId: step.id,
          status: "completed",
          result: data,
          progressMessage: "Time slot unavailable, alternatives found",
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
        return {
          stepId: step.id,
          status: "failed",
          error: "Calendar authentication expired",
          progressMessage: `❌ Calendar needs to be reconnected. The owner should refresh their calendar access to enable meeting scheduling.`,
        };
      }

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
  onProgress("Preparing to schedule the meeting...");

  try {
    // Extract step data
    const stepWithData = step as StepDefinitionWithData<ScheduleWithOwnerArgs>;
    const stepData = stepWithData.data;

    if (!stepData) {
      throw new Error("Missing meeting scheduling parameters");
    }

    onProgress("Creating calendar event...");

    // Create tool context with required fields
    const toolContext: ToolContext = {
      userId: state.userId,
      delegationContext: state.delegationContext,
      conversationContext: state.conversationContext,
      memoryContext: state.memoryContext,
      integrations: state.integrations || {},
    };

    // Execute the meeting scheduling
    const result = await scheduleWithOwnerHandler(toolContext, stepData);

    if (result.ok && result.data) {
      const data = result.data;
      onProgress("✅ Meeting scheduled successfully!");

      return {
        stepId: step.id,
        status: "completed",
        result: data,
        progressMessage: `Meeting scheduled for ${new Date(
          data.startTime
        ).toLocaleString()}`,
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
      return {
        stepId: step.id,
        status: "failed",
        error: "Calendar authentication expired",
        progressMessage: `❌ Calendar needs to be reconnected. The owner should refresh their calendar access to enable meeting scheduling.`,
      };
    }

    return {
      stepId: step.id,
      status: "failed",
      error: errorMessage,
      progressMessage: `❌ Failed to schedule meeting: ${errorMessage}`,
    };
  }
};

/**
 * Step executor for analyzing meeting request intent
 */
export const delegationAnalyzeRequestExecutor: StepExecutor = async (
  state: LangGraphChatState,
  step: StepDefinition,
  _context: MultiStepContext,
  onProgress
) => {
  onProgress("Understanding your meeting request...");

  try {
    // Get the last user message
    const lastUserMessage = state.messages.findLast((m) => m.role === "user");
    if (!lastUserMessage) {
      throw new Error("No user message found");
    }

    onProgress("Extracting meeting details...");

    // Simple intent analysis (in production, this could use NLP)
    const content = lastUserMessage.content.toLowerCase();
    const hasTimeReference =
      /tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2} (am|pm)/i.test(
        content
      );
    const hasDurationReference = /\d+\s*(minutes?|mins?|hours?|hrs?)/i.test(
      content
    );

    onProgress("Analyzing meeting constraints...");

    // Check delegation constraints
    const constraints = state.delegationContext?.constraints as
      | Record<string, unknown>
      | undefined;
    const allowedMeetingTypes = (constraints?.meetingType as string[]) || [
      "video",
      "in-person",
    ];
    const defaultDuration = (constraints?.defaultDuration as number) || 30;

    const analysisResult = {
      hasTimeReference,
      hasDurationReference,
      suggestedDuration: defaultDuration,
      allowedMeetingTypes,
      userMessage: lastUserMessage.content,
      timezone: state.delegationContext?.externalUserTimezone || "UTC",
    };

    onProgress("✅ Request analyzed successfully!");

    return {
      stepId: step.id,
      status: "completed",
      result: analysisResult,
      progressMessage: "Meeting request understood and analyzed",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      stepId: step.id,
      status: "failed",
      error: errorMessage,
      progressMessage: `❌ Failed to analyze request: ${errorMessage}`,
    };
  }
};

/**
 * Create delegation step definitions for a typical scheduling flow
 */
export function createDelegationSteps(requestData: {
  startTime: string;
  durationMins: number;
  title: string;
  timezone?: string;
  externalUserName?: string;
}): StepDefinitionWithData[] {
  return [
    {
      id: "check_availability",
      name: "Check Availability",
      description: "Checking the owner's calendar for availability",
      required: true,
      estimatedDuration: 3,
      data: {
        startTime: requestData.startTime,
        durationMins: requestData.durationMins,
        timezone: requestData.timezone,
      } as CheckOwnerAvailabilityArgs,
    },
    {
      id: "schedule_meeting",
      name: "Schedule Meeting",
      description: "Creating the calendar event and finalizing the meeting",
      required: true,
      estimatedDuration: 4,
      data: {
        startTime: requestData.startTime,
        durationMins: requestData.durationMins,
        title: requestData.title,
        timezone: requestData.timezone,
        externalUserName: requestData.externalUserName,
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
    "analyze_request",
    delegationAnalyzeRequestExecutor
  );
  orchestrator.registerStepExecutor(
    "check_availability",
    delegationCheckAvailabilityExecutor
  );
  orchestrator.registerStepExecutor(
    "schedule_meeting",
    delegationScheduleMeetingExecutor
  );
}
