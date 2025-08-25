import { useState, useCallback, useRef } from "react";

interface Step {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  progressMessage?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface MultiStepState {
  isMultiStep: boolean;
  steps: Step[];
  currentStepIndex: number;
  status: "running" | "paused" | "completed" | "failed";
  progressMessages: string[];
  sessionId?: string;
  totalProcessingTime?: number;
  averageStepTime?: number;

  // Cinematic buffering
  cinematicMode: boolean;
  bufferedSteps: Step[];
  realTimeComplete: boolean;
}

interface ParsedUpdate {
  type:
    | "step_start"
    | "step_progress"
    | "step_result"
    | "step_end"
    | "complete"
    | "initiated";
  stepId?: string;
  stepName?: string;
  status?: string;
  message?: string;
  result?: string;
  timestamp: Date;
}

const CONTROL_TOKEN_PATTERNS = {
  STEP_START: /\[\[PERIN_STEP:start:([^:]+):([^\]]+)\]\]/g,
  STEP_PROGRESS: /\[\[PERIN_PROGRESS:([^\]]+)\]\]/g,
  STEP_RESULT: /\[\[PERIN_STEP_RESULT:([^:]+):([^:]+)(?::([^\]]*))?\]\]/g,
  STEP_END: /\[\[PERIN_STEP:end:([^\]]+)\]\]/g,
  MULTI_STEP_COMPLETE: /\[\[PERIN_MULTI_STEP:complete\]\]/g,
  MULTI_STEP_INITIATED: /\[\[PERIN_MULTI_STEP:initiated:([^:]+):([^\]]+)\]\]/g,
};

export function useMultiStepParser() {
  const [multiStepState, setMultiStepState] = useState<MultiStepState>({
    isMultiStep: false,
    steps: [],
    currentStepIndex: 0,
    status: "running",
    progressMessages: [],
    cinematicMode: true, // Enable cinematic mode by default
    bufferedSteps: [],
    realTimeComplete: false,
  });

  const [aiInitiated, setAiInitiated] = useState(false);

  const processStartTimeRef = useRef<Date | null>(null);
  const stepTimesRef = useRef<number[]>([]);
  const updateBufferRef = useRef<ParsedUpdate[]>([]);

  const parseControlTokens = useCallback(
    (
      content: string
    ): {
      cleanContent: string;
      hasControlTokens: boolean;
      emotionalContext?: {
        urgency: "low" | "medium" | "high";
        sentiment: "positive" | "neutral" | "negative";
        progressDirection: "forward" | "backward" | "stable";
      };
    } => {
      let cleanContent = content;
      let hasControlTokens = false;
      const emotionalContext: {
        urgency: "low" | "medium" | "high";
        sentiment: "positive" | "neutral" | "negative";
        progressDirection: "forward" | "backward" | "stable";
      } = {
        urgency: "medium",
        sentiment: "neutral",
        progressDirection: "stable",
      };

      // Initialize process timing
      if (!processStartTimeRef.current) {
        processStartTimeRef.current = new Date();
      }

      // Parse all control tokens and buffer them for cinematic playback
      const updates: ParsedUpdate[] = [];

      // Parse STEP_START tokens
      let match;
      while (
        (match = CONTROL_TOKEN_PATTERNS.STEP_START.exec(content)) !== null
      ) {
        hasControlTokens = true;
        const [fullMatch, stepId, stepName] = match;
        emotionalContext.progressDirection = "forward";
        emotionalContext.urgency = "high";

        updates.push({
          type: "step_start",
          stepId,
          stepName,
          timestamp: new Date(),
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_START.lastIndex = 0;

      // Parse STEP_PROGRESS tokens
      while (
        (match = CONTROL_TOKEN_PATTERNS.STEP_PROGRESS.exec(content)) !== null
      ) {
        hasControlTokens = true;
        const [fullMatch, message] = match;

        // Simple sentiment analysis
        const positiveWords = [
          "success",
          "completed",
          "found",
          "available",
          "✅",
          "🎉",
        ];
        const negativeWords = [
          "failed",
          "error",
          "unavailable",
          "❌",
          "problem",
        ];

        if (
          positiveWords.some((word) => message.toLowerCase().includes(word))
        ) {
          emotionalContext.sentiment = "positive";
        } else if (
          negativeWords.some((word) => message.toLowerCase().includes(word))
        ) {
          emotionalContext.sentiment = "negative";
        }

        updates.push({
          type: "step_progress",
          message,
          timestamp: new Date(),
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_PROGRESS.lastIndex = 0;

      // Parse STEP_RESULT tokens
      while (
        (match = CONTROL_TOKEN_PATTERNS.STEP_RESULT.exec(content)) !== null
      ) {
        hasControlTokens = true;
        const [fullMatch, stepId, status, result] = match;

        if (status === "completed") {
          emotionalContext.sentiment = "positive";
          emotionalContext.urgency = "low";
        } else if (status === "failed") {
          emotionalContext.sentiment = "negative";
          emotionalContext.urgency = "high";
        }

        updates.push({
          type: "step_result",
          stepId,
          status,
          result,
          timestamp: new Date(),
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_RESULT.lastIndex = 0;

      // Parse STEP_END tokens
      while ((match = CONTROL_TOKEN_PATTERNS.STEP_END.exec(content)) !== null) {
        hasControlTokens = true;
        const [fullMatch, stepId] = match;

        updates.push({
          type: "step_end",
          stepId,
          timestamp: new Date(),
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_END.lastIndex = 0;

      // Parse MULTI_STEP_COMPLETE tokens
      while (
        (match = CONTROL_TOKEN_PATTERNS.MULTI_STEP_COMPLETE.exec(content)) !==
        null
      ) {
        hasControlTokens = true;
        const [fullMatch] = match;
        emotionalContext.sentiment = "positive";
        emotionalContext.urgency = "low";
        emotionalContext.progressDirection = "forward";

        updates.push({
          type: "complete",
          timestamp: new Date(),
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.MULTI_STEP_COMPLETE.lastIndex = 0;

      // Parse MULTI_STEP_INITIATED tokens
      while (
        (match = CONTROL_TOKEN_PATTERNS.MULTI_STEP_INITIATED.exec(content)) !==
        null
      ) {
        hasControlTokens = true;
        const [fullMatch, reasoning, confidence] = match;
        emotionalContext.sentiment = "positive";
        emotionalContext.urgency = "medium";
        emotionalContext.progressDirection = "forward";

        updates.push({
          type: "initiated",
          message: reasoning,
          result: confidence,
          timestamp: new Date(),
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.MULTI_STEP_INITIATED.lastIndex = 0;

      // Process updates if we have any
      if (updates.length > 0) {
        const hasInitiation = updates.some(
          (update) => update.type === "initiated"
        );

        // Check if chunk contains step results or progress that should always be processed
        const hasStepUpdates = updates.some(
          (u) =>
            u.type === "step_result" ||
            u.type === "step_progress" ||
            u.type === "step_end" ||
            u.type === "complete"
        );

        // If this chunk has initiation OR we already initiated OR has step updates, process them
        if (hasInitiation || aiInitiated || hasStepUpdates) {
          // Separate updates: buffer step definitions, but process results immediately
          const stepDefinitionUpdates = updates.filter(
            (u) => u.type === "step_start" || u.type === "initiated"
          );
          const realTimeUpdates = updates.filter(
            (u) =>
              u.type === "step_result" ||
              u.type === "step_progress" ||
              u.type === "step_end" ||
              u.type === "complete"
          );

          if (
            multiStepState.cinematicMode &&
            stepDefinitionUpdates.length > 0
          ) {
            updateBufferRef.current.push(...stepDefinitionUpdates);
            processBufferedUpdates();
          }

          // Always process status updates immediately for real-time feedback
          if (realTimeUpdates.length > 0) {
            processUpdatesImmediately(realTimeUpdates);
          }

          // If not in cinematic mode, process everything immediately
          if (!multiStepState.cinematicMode) {
            processUpdatesImmediately(updates);
          }
        }
      }

      return {
        cleanContent: cleanContent.trim(),
        hasControlTokens,
        emotionalContext,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [multiStepState.cinematicMode]
  );

  const processBufferedUpdates = useCallback(() => {
    const updates = updateBufferRef.current;
    if (updates.length === 0) {
      return;
    }

    // Check if we have an initiation update locally (don't rely on React state)
    const hasInitiationUpdate = updates.some(
      (update) => update.type === "initiated"
    );
    const localAiInitiated = aiInitiated || hasInitiationUpdate;

    if (!localAiInitiated) {
      return;
    }

    // Build complete step structure from buffered updates
    const stepsMap = new Map<string, Step>();
    let isComplete = false;
    const messages: string[] = [];

    updates.forEach((update) => {
      switch (update.type) {
        case "step_start":
          if (update.stepId && update.stepName) {
            stepsMap.set(update.stepId, {
              id: update.stepId,
              name: update.stepName,
              description: `Processing ${update.stepName.toLowerCase()}...`,
              status: "pending",
              startTime: update.timestamp,
            });
          }
          break;

        case "step_progress":
          if (update.message) {
            messages.push(
              `${update.timestamp.toLocaleTimeString([], {
                hour12: false,
                minute: "2-digit",
                second: "2-digit",
              })} • ${update.message}`
            );
          }
          break;

        case "step_result":
          if (update.stepId && update.status) {
            const step = stepsMap.get(update.stepId);
            if (step) {
              step.status = update.status as Step["status"];
              step.progressMessage = update.result || step.progressMessage;
              if (update.status === "failed" && update.result) {
                step.error = update.result;
              }
            }
          }
          break;

        case "step_end":
          if (update.stepId) {
            const step = stepsMap.get(update.stepId);
            if (step) {
              step.endTime = update.timestamp;
              // Don't override status - it should be set by step_result
            }
          }
          break;

        case "complete":
          isComplete = true;
          break;

        case "initiated":
          // AI has determined multi-step is needed
          setAiInitiated(true);
          if (update.message && update.result) {
            messages.push(
              `AI Analysis: ${update.message} (Confidence: ${Math.round(
                parseFloat(update.result) * 100
              )}%)`
            );
          }
          break;
      }
    });

    // Update state with buffered data - only set isMultiStep if AI initiated it
    const newSteps = Array.from(stepsMap.values());
    const shouldBeMultiStep = localAiInitiated && newSteps.length > 0;

    setMultiStepState((prev) => ({
      ...prev,
      isMultiStep: shouldBeMultiStep,
      bufferedSteps: newSteps,
      steps: newSteps, // For cinematic component to use
      progressMessages: messages,
      realTimeComplete: isComplete,
      status: isComplete ? "completed" : "running",
    }));
  }, [aiInitiated]);

  const processUpdatesImmediately = useCallback((updates: ParsedUpdate[]) => {
    updates.forEach((update) => {
      switch (update.type) {
        case "step_start":
          if (update.stepId && update.stepName) {
            setMultiStepState((prev) => {
              const existingStepIndex = prev.steps.findIndex(
                (s) => s.id === update.stepId
              );

              if (existingStepIndex >= 0) {
                const updatedSteps = [...prev.steps];
                updatedSteps[existingStepIndex] = {
                  ...updatedSteps[existingStepIndex],
                  status: "running",
                  startTime: update.timestamp,
                };

                return {
                  ...prev,
                  isMultiStep: true,
                  steps: updatedSteps,
                  currentStepIndex: existingStepIndex,
                  status: "running",
                };
              } else {
                const newStep: Step = {
                  id: update.stepId!,
                  name: update.stepName!,
                  description: `Processing ${update.stepName!.toLowerCase()}...`,
                  status: "running",
                  startTime: update.timestamp,
                };

                return {
                  ...prev,
                  isMultiStep: true,
                  steps: [...prev.steps, newStep],
                  currentStepIndex: prev.steps.length,
                  status: "running",
                };
              }
            });
          }
          break;

        case "step_progress":
          if (update.message) {
            setMultiStepState((prev) => ({
              ...prev,
              progressMessages: [
                ...prev.progressMessages.slice(-4),
                `${update.timestamp.toLocaleTimeString([], {
                  hour12: false,
                  minute: "2-digit",
                  second: "2-digit",
                })} • ${update.message}`,
              ],
            }));
          }
          break;

        case "step_result":
          if (update.stepId && update.status) {
            console.log(
              "🔄 IMMEDIATE STEP_RESULT:",
              update.stepId,
              update.status,
              update.result
            );
            setMultiStepState((prev) => {
              const stepIndex = prev.steps.findIndex(
                (s) => s.id === update.stepId
              );
              if (stepIndex >= 0) {
                const updatedSteps = [...prev.steps];
                updatedSteps[stepIndex] = {
                  ...updatedSteps[stepIndex],
                  status: update.status as Step["status"],
                  endTime: update.timestamp,
                  progressMessage:
                    update.result || updatedSteps[stepIndex].progressMessage,
                  ...(update.status === "failed" && update.result
                    ? { error: update.result }
                    : {}),
                };

                console.log(
                  "✅ STEP STATE UPDATED:",
                  updatedSteps[stepIndex].id,
                  updatedSteps[stepIndex].status
                );

                return {
                  ...prev,
                  steps: updatedSteps,
                };
              }
              return prev;
            });
          }
          break;

        case "step_end":
          if (update.stepId) {
            setMultiStepState((prev) => {
              const stepIndex = prev.steps.findIndex(
                (s) => s.id === update.stepId
              );
              if (stepIndex >= 0) {
                const updatedSteps = [...prev.steps];
                updatedSteps[stepIndex] = {
                  ...updatedSteps[stepIndex],
                  endTime: update.timestamp,
                  // Don't override status - it should be set by step_result
                };

                return {
                  ...prev,
                  steps: updatedSteps,
                };
              }
              return prev;
            });
          }
          break;

        case "complete":
          setMultiStepState((prev) => ({
            ...prev,
            status: "completed",
          }));
          break;

        case "initiated":
          // AI has determined multi-step is needed - set initial state
          if (update.message && update.result) {
            setMultiStepState((prev) => ({
              ...prev,
              isMultiStep: true,
              progressMessages: [
                ...prev.progressMessages.slice(-4),
                `AI Analysis: ${update.message} (Confidence: ${Math.round(
                  parseFloat(update.result || "0") * 100
                )}%)`,
              ],
            }));
          }
          break;
      }
    });
  }, []);

  const resetMultiStepState = useCallback(() => {
    setMultiStepState({
      isMultiStep: false,
      steps: [],
      currentStepIndex: 0,
      status: "running",
      progressMessages: [],
      cinematicMode: true,
      bufferedSteps: [],
      realTimeComplete: false,
    });
    setAiInitiated(false); // Reset AI initiation flag
    processStartTimeRef.current = null;
    stepTimesRef.current = [];
    updateBufferRef.current = []; // Clear the buffer completely
  }, []);

  const toggleCinematicMode = useCallback(() => {
    setMultiStepState((prev) => ({
      ...prev,
      cinematicMode: !prev.cinematicMode,
    }));
  }, []);

  const pauseProcessing = useCallback(() => {
    setMultiStepState((prev) => ({
      ...prev,
      status: "paused",
    }));
  }, []);

  const resumeProcessing = useCallback(() => {
    setMultiStepState((prev) => ({
      ...prev,
      status: "running",
    }));
  }, []);

  const getProcessingInsights = useCallback(() => {
    const { steps, totalProcessingTime, averageStepTime } = multiStepState;
    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const failedSteps = steps.filter((s) => s.status === "failed").length;

    return {
      completionRate:
        steps.length > 0 ? (completedSteps / steps.length) * 100 : 0,
      failureRate: steps.length > 0 ? (failedSteps / steps.length) * 100 : 0,
      averageStepDuration: averageStepTime
        ? Math.round(averageStepTime / 1000)
        : 0,
      totalDuration: totalProcessingTime
        ? Math.round(totalProcessingTime / 1000)
        : 0,
      efficiency:
        averageStepTime && totalProcessingTime
          ? Math.round(
              ((steps.length * averageStepTime) / totalProcessingTime) * 100
            )
          : 0,
      realTimeComplete: multiStepState.realTimeComplete,
    };
  }, [multiStepState]);

  return {
    multiStepState,
    parseControlTokens,
    resetMultiStepState,
    toggleCinematicMode,
    pauseProcessing,
    resumeProcessing,
    getProcessingInsights,
  };
}

export default useMultiStepParser;
