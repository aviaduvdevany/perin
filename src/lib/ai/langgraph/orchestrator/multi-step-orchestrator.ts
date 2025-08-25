import type {
  StepDefinition,
  StepResult,
  MultiStepContext,
  LangGraphChatState,
} from "@/types/ai";
import { v4 as uuidv4 } from "uuid";

// Control tokens for multi-step messaging
export const MULTI_STEP_CONTROL_TOKENS = {
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

export type StepExecutor = (
  state: LangGraphChatState,
  step: StepDefinition,
  context: MultiStepContext,
  onProgress: (message: string) => void
) => Promise<StepResult>;

export interface MultiStepOrchestratorOptions {
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
  allowSkipping?: boolean;
  allowPausing?: boolean;
}

export class MultiStepOrchestrator {
  private options: MultiStepOrchestratorOptions;
  private stepExecutors: Map<string, StepExecutor> = new Map();

  constructor(options: MultiStepOrchestratorOptions = {}) {
    this.options = {
      allowSkipping: true,
      allowPausing: true,
      ...options,
    };
  }

  /**
   * Register a step executor for a specific step type
   */
  registerStepExecutor(stepType: string, executor: StepExecutor): void {
    this.stepExecutors.set(stepType, executor);
  }

  /**
   * Create a new multi-step context
   */
  createMultiStepContext(
    steps: StepDefinition[],
    sessionId?: string
  ): MultiStepContext {
    return {
      sessionId: sessionId || uuidv4(),
      currentStepIndex: 0,
      totalSteps: steps.length,
      steps,
      stepResults: steps.map((step) => ({
        stepId: step.id,
        status: "pending" as const,
      })),
      progressMessages: [],
      status: "running",
      startTime: new Date(),
      lastUpdateTime: new Date(),
      canPause: this.options.allowPausing,
      canSkip: this.options.allowSkipping,
    };
  }

  /**
   * Execute all steps in sequence with streaming progress updates
   */
  async executeSteps(
    state: LangGraphChatState,
    steps: StepDefinition[],
    streamController: ReadableStreamDefaultController<Uint8Array>,
    sessionId?: string
  ): Promise<MultiStepContext> {
    const context = this.createMultiStepContext(steps, sessionId);

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        context.currentStepIndex = i;
        context.lastUpdateTime = new Date();

        // Emit step definition ONLY when it's about to start (real-time)
        this.emitToStream(
          streamController,
          MULTI_STEP_CONTROL_TOKENS.STEP_START(step.id, step.name)
        );

        // Update step status to running
        context.stepResults[i] = {
          ...context.stepResults[i],
          status: "running",
          startTime: new Date(),
        };

        // Call step start callback
        this.options.onStepStart?.(step, context);

        try {
          // Create progress callback for this step
          const onProgress = (message: string) => {
            context.progressMessages.push(message);
            context.lastUpdateTime = new Date();
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.STEP_PROGRESS(message)
            );
            // Don't emit raw progress messages to avoid cluttering the UI
            this.options.onStepProgress?.(step, message, context);
          };

          // Execute the step
          const stepExecutor =
            this.stepExecutors.get(step.id) || this.defaultStepExecutor;
          const result = await stepExecutor(state, step, context, onProgress);

          // Update step result
          context.stepResults[i] = {
            ...result,
            endTime: new Date(),
            status: result.status === "failed" ? "failed" : "completed",
          };

          // Emit step result
          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_RESULT(
              step.id,
              context.stepResults[i].status,
              context.stepResults[i].progressMessage
            )
          );

          // Emit step end
          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_END(step.id)
          );

          // Call step complete callback
          this.options.onStepComplete?.(step, context.stepResults[i], context);

          // Check if step failed and is required - STOP execution here
          if (context.stepResults[i].status === "failed" && step.required) {
            context.status = "failed";

            // Provide user-friendly failure message based on step type
            let failureMessage = "";
            if (step.id === "check_availability") {
              failureMessage =
                "There are conflicts in the time you suggested. Would you like to try a different time for that day?";
            } else {
              failureMessage = `❌ Required step failed: ${step.name}. Process stopped.`;
            }

            // Emit completion token to signal end
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
            );

            // Emit user-friendly message as a separate chat message
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage)
            );

            // Don't throw error to avoid additional error handling messages
            return context;
          }
        } catch (error) {
          // Handle step error
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          context.stepResults[i] = {
            ...context.stepResults[i],
            status: "failed",
            error: errorMessage,
            endTime: new Date(),
          };

          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_RESULT(
              step.id,
              "failed",
              errorMessage
            )
          );
          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_END(step.id)
          );

          this.options.onStepError?.(step, error as Error, context);

          // If step is required, fail the entire process and stop
          if (step.required) {
            context.status = "failed";

            // Provide user-friendly failure message based on step type
            let failureMessage = "";
            if (step.id === "check_availability") {
              failureMessage =
                "There are conflicts in the time you suggested. Would you like to try a different time for that day?";
            } else {
              failureMessage = `❌ Required step failed: ${step.name}. Process stopped.`;
            }

            // Emit completion token to signal end
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
            );

            // Emit user-friendly message as a separate chat message
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage)
            );

            // Don't throw error to avoid additional error handling messages
            return context;
          }

          // For non-required steps, log and continue
          console.warn(`Non-required step failed: ${step.name}`, error);
        }
      }

      // All steps completed successfully
      context.status = "completed";
      context.lastUpdateTime = new Date();

      // Emit completion
      this.emitToStream(
        streamController,
        MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
      );

      this.options.onComplete?.(context);
    } catch (error) {
      context.status = "failed";
      context.lastUpdateTime = new Date();

      // Don't emit debug error messages to the user
      // The user-friendly message was already emitted in the step failure handling

      throw error;
    }

    return context;
  }

  /**
   * Default step executor (fallback)
   */
  private defaultStepExecutor: StepExecutor = async (
    state,
    step,
    context,
    onProgress
  ) => {
    onProgress(`Executing ${step.name}...`);

    // Simulate step execution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      stepId: step.id,
      status: "completed",
      result: `Step ${step.name} completed`,
      progressMessage: `✅ ${step.name} completed successfully`,
    };
  };

  /**
   * Helper to emit content to stream
   */
  private emitToStream(
    controller: ReadableStreamDefaultController<Uint8Array>,
    content: string
  ): void {
    try {
      controller.enqueue(new TextEncoder().encode(content));
    } catch (error) {
      console.error("Error emitting to stream:", error);
    }
  }

  /**
   * Get step progress summary
   */
  getProgressSummary(context: MultiStepContext): string {
    const completed = context.stepResults.filter(
      (r) => r.status === "completed"
    ).length;
    const failed = context.stepResults.filter(
      (r) => r.status === "failed"
    ).length;
    const running = context.stepResults.filter(
      (r) => r.status === "running"
    ).length;

    return `Progress: ${completed}/${context.totalSteps} completed, ${failed} failed, ${running} running`;
  }

  /**
   * Check if execution can continue
   */
  canContinue(context: MultiStepContext): boolean {
    return (
      context.status === "running" &&
      context.currentStepIndex < context.totalSteps
    );
  }

  /**
   * Pause execution (if supported)
   */
  pause(context: MultiStepContext): void {
    if (context.canPause) {
      context.status = "paused";
      context.lastUpdateTime = new Date();
    }
  }

  /**
   * Resume execution (if paused)
   */
  resume(context: MultiStepContext): void {
    if (context.status === "paused") {
      context.status = "running";
      context.lastUpdateTime = new Date();
    }
  }
}

// Export singleton instance
export const multiStepOrchestrator = new MultiStepOrchestrator();
