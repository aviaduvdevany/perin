/**
 * Delegation-specific orchestrator for multi-step scheduling flows
 * Simplified from the main LangGraph orchestrator for delegation use cases
 */

import type {
  StepDefinition,
  StepResult,
  MultiStepContext,
  LangGraphChatState,
} from "@/types/ai";
import type { IntegrationContext } from "@/types/integrations";
import { v4 as uuidv4 } from "uuid";
import {
  delegationCheckAvailabilityExecutor,
  delegationScheduleMeetingExecutor,
} from "./delegation-executors";

// Control tokens for multi-step messaging
export const DELEGATION_CONTROL_TOKENS = {
  STEP_START: (stepId: string, stepName: string) =>
    `[[PERIN_STEP:start:${stepId}:${stepName}]]`,
  STEP_PROGRESS: (message: string) => `[[PERIN_PROGRESS:${message}]]`,
  STEP_RESULT: (stepId: string, status: string, result?: string) =>
    `[[PERIN_STEP_RESULT:${stepId}:${status}${result ? `:${result}` : ""}]]`,
  STEP_END: (stepId: string) => `[[PERIN_STEP:end:${stepId}]]`,
  MULTI_STEP_COMPLETE: () => `[[PERIN_MULTI_STEP:complete]]`,
  MULTI_STEP_INITIATED: (reasoning: string, confidence: number) =>
    `[[PERIN_MULTI_STEP:initiated:${reasoning}:${confidence}]]`,
  SEPARATE_MESSAGE: (message: string) =>
    `[[PERIN_SEPARATE_MESSAGE:${message}]]`,
} as const;

export type DelegationStepExecutor = (
  step: StepDefinition,
  context: DelegationExecutionContext,
  onProgress: (message: string) => void
) => Promise<StepResult>;

export interface DelegationExecutionContext {
  delegationId: string;
  ownerUserId: string;
  externalUserName?: string;
  externalUserTimezone?: string;
  constraints?: Record<string, unknown>;
  calendarIntegration?: IntegrationContext; // Calendar integration context
  contextualMessages?: {
    availabilityConfirmed?: string;
    meetingScheduled?: string;
    timeConflict?: string;
    unavailable?: string;
    needsMoreInfo?: string;
    clarifyTime?: string;
    clarifyDate?: string;
    checkingAvailability?: string;
    schedulingMeeting?: string;
    calendarError?: string;
    generalError?: string;
  };
}

export interface DelegationOrchestratorOptions {
  onStepStart?: (step: StepDefinition, context: MultiStepContext) => void;
  onStepProgress?: (
    step: StepDefinition,
    message: string,
    context: MultiStepContext
  ) => void;
  onStepComplete?: (
    step: StepDefinition,
    result: StepResult,
    context: MultiStepContext
  ) => void;
  onStepError?: (
    step: StepDefinition,
    error: Error,
    context: MultiStepContext
  ) => void;
  onComplete?: (context: MultiStepContext) => void;
}

class DelegationOrchestrator {
  private stepExecutors: Map<string, DelegationStepExecutor> = new Map();

  constructor(private options?: DelegationOrchestratorOptions) {
    // Register built-in delegation step executors
    this.registerStepExecutor(
      "check_availability",
      this.adaptStepExecutor(delegationCheckAvailabilityExecutor)
    );
    this.registerStepExecutor(
      "schedule_meeting",
      this.adaptStepExecutor(delegationScheduleMeetingExecutor)
    );
  }

  /**
   * Adapt the LangGraph step executor to work with delegation context
   */
  private adaptStepExecutor(
    langGraphExecutor: (
      state: LangGraphChatState,
      step: StepDefinition,
      context: MultiStepContext,
      onProgress: (message: string) => void
    ) => Promise<StepResult>
  ): DelegationStepExecutor {
    return async (
      step: StepDefinition,
      context: DelegationExecutionContext,
      onProgress: (message: string) => void
    ) => {
      // Create a minimal LangGraph state for compatibility
      const mockState: LangGraphChatState = {
        userId: context.ownerUserId, // Use actual owner user ID
        messages: [],
        tone: "friendly",
        perinName: "Perin",
        specialization: "scheduling",
        memoryContext: {},
        conversationContext: "",
        systemPrompt: "",
        openaiResponse: "",
        streamChunks: [],
        currentStep: "delegation",
        contextualMessages: context.contextualMessages || {}, // Use actual contextual messages from DelegationAI
        delegationContext: {
          delegationId: context.delegationId,
          externalUserName: context.externalUserName,
          externalUserTimezone: context.externalUserTimezone,
          constraints: context.constraints,
          isDelegation: true,
        },
        integrations: {
          calendar: context.calendarIntegration || {
            isConnected: false,
            data: [],
            count: 0,
          },
        },
      };

      const mockMultiStepContext: MultiStepContext = {
        sessionId: context.delegationId,
        currentStepIndex: 0,
        totalSteps: 1,
        steps: [step],
        stepResults: [],
        progressMessages: [],
        status: "running",
        startTime: new Date(),
        lastUpdateTime: new Date(),
      };

      return await langGraphExecutor(
        mockState,
        step,
        mockMultiStepContext,
        onProgress
      );
    };
  }

  registerStepExecutor(id: string, executor: DelegationStepExecutor) {
    this.stepExecutors.set(id, executor);
  }

  /**
   * Execute a sequence of steps and return a streaming response
   */
  async executeSteps(
    steps: StepDefinition[],
    context: DelegationExecutionContext
  ): Promise<ReadableStream> {
    const sessionId = uuidv4();
    const multiStepContext: MultiStepContext = {
      sessionId,
      currentStepIndex: 0,
      totalSteps: steps.length,
      steps,
      stepResults: [],
      progressMessages: [],
      status: "running",
      startTime: new Date(),
      lastUpdateTime: new Date(),
    };

    // Capture this context for use inside ReadableStream
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const orchestrator = this;

    return new ReadableStream({
      async start(controller) {
        try {
          // Send initial multi-step initiated token
          controller.enqueue(
            new TextEncoder().encode(
              DELEGATION_CONTROL_TOKENS.MULTI_STEP_INITIATED(
                "Starting delegation scheduling process",
                0.9
              )
            )
          );

          // Execute each step
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            multiStepContext.currentStepIndex = i;
            multiStepContext.lastUpdateTime = new Date();

            // Send step start token
            controller.enqueue(
              new TextEncoder().encode(
                DELEGATION_CONTROL_TOKENS.STEP_START(step.id, step.name)
              )
            );

            orchestrator.options?.onStepStart?.(step, multiStepContext);

            try {
              const executor = orchestrator.stepExecutors.get(step.id);
              if (!executor) {
                throw new Error(`No executor found for step: ${step.id}`);
              }

              // Execute step with progress callback
              const result = await executor(
                step,
                context,
                (message: string) => {
                  controller.enqueue(
                    new TextEncoder().encode(
                      DELEGATION_CONTROL_TOKENS.STEP_PROGRESS(message)
                    )
                  );
                  multiStepContext.progressMessages.push(message);
                  orchestrator.options?.onStepProgress?.(
                    step,
                    message,
                    multiStepContext
                  );
                }
              );

              // Add result to context
              multiStepContext.stepResults.push(result);

              // Send step result token
              controller.enqueue(
                new TextEncoder().encode(
                  DELEGATION_CONTROL_TOKENS.STEP_RESULT(
                    step.id,
                    result.status,
                    result.progressMessage
                  )
                )
              );

              // Send step end token
              controller.enqueue(
                new TextEncoder().encode(
                  DELEGATION_CONTROL_TOKENS.STEP_END(step.id)
                )
              );

              orchestrator.options?.onStepComplete?.(
                step,
                result,
                multiStepContext
              );

              // If step failed and it's required, stop execution
              if (result.status === "failed" && step.required) {
                multiStepContext.status = "failed";
                break;
              }
            } catch (error) {
              const errorResult: StepResult = {
                stepId: step.id,
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
                progressMessage: `❌ Step failed: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              };

              multiStepContext.stepResults.push(errorResult);
              multiStepContext.status = "failed";

              controller.enqueue(
                new TextEncoder().encode(
                  DELEGATION_CONTROL_TOKENS.STEP_RESULT(
                    step.id,
                    "failed",
                    errorResult.progressMessage
                  )
                )
              );

              orchestrator.options?.onStepError?.(
                step,
                error as Error,
                multiStepContext
              );
              break;
            }
          }

          // Mark as completed if all steps succeeded
          if (multiStepContext.status === "running") {
            multiStepContext.status = "completed";
          }

          // Send completion token
          controller.enqueue(
            new TextEncoder().encode(
              DELEGATION_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
            )
          );

          // Send final conclusion message based on success/failure
          const finalMessage =
            multiStepContext.status === "completed"
              ? context.contextualMessages?.meetingScheduled ||
                (context.contextualMessages?.availabilityConfirmed?.includes(
                  "עברית"
                ) || context.contextualMessages?.timeConflict?.includes("עברית")
                  ? "הפגישה נקבעה בהצלחה! 🎉"
                  : "Meeting scheduled successfully! 🎉")
              : context.contextualMessages?.calendarError ||
                (context.contextualMessages?.timeConflict?.includes("עברית")
                  ? "אני מתנצל, אבל לא הצלחתי לקבוע את הפגישה כרגע."
                  : "I apologize, but I couldn't schedule the meeting at this time.");

          // Send the final message as a separate message
          controller.enqueue(
            new TextEncoder().encode(
              DELEGATION_CONTROL_TOKENS.SEPARATE_MESSAGE(finalMessage)
            )
          );

          orchestrator.options?.onComplete?.(multiStepContext);
          controller.close();
        } catch (error) {
          console.error("Delegation orchestrator error:", error);
          controller.error(error);
        }
      },
    });
  }
}

// Export singleton instance
export const delegationOrchestrator = new DelegationOrchestrator();
