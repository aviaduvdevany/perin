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
}

const CONTROL_TOKEN_PATTERNS = {
  STEP_START: /\[\[PERIN_STEP:start:([^:]+):([^\]]+)\]\]/g,
  STEP_PROGRESS: /\[\[PERIN_PROGRESS:([^\]]+)\]\]/g,
  STEP_RESULT: /\[\[PERIN_STEP_RESULT:([^:]+):([^:]+)(?::([^\]]+))?\]\]/g,
  STEP_END: /\[\[PERIN_STEP:end:([^\]]+)\]\]/g,
  MULTI_STEP_COMPLETE: /\[\[PERIN_MULTI_STEP:complete\]\]/g,
};

export function useMultiStepParser() {
  const [multiStepState, setMultiStepState] = useState<MultiStepState>({
    isMultiStep: false,
    steps: [],
    currentStepIndex: 0,
    status: "running",
    progressMessages: [],
  });

  const processStartTimeRef = useRef<Date | null>(null);
  const stepTimesRef = useRef<number[]>([]);

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

      // Parse STEP_START tokens with enhanced emotional feedback
      let match;
      while (
        (match = CONTROL_TOKEN_PATTERNS.STEP_START.exec(content)) !== null
      ) {
        hasControlTokens = true;
        const [fullMatch, stepId, stepName] = match;
        emotionalContext.progressDirection = "forward";
        emotionalContext.urgency = "high";

        setMultiStepState((prev) => {
          const existingStepIndex = prev.steps.findIndex(
            (s) => s.id === stepId
          );

          if (existingStepIndex >= 0) {
            // Update existing step with emotional enhancement
            const updatedSteps = [...prev.steps];
            updatedSteps[existingStepIndex] = {
              ...updatedSteps[existingStepIndex],
              status: "running",
              startTime: new Date(),
              description: `🧠 ${stepName}...`,
            };

            return {
              ...prev,
              isMultiStep: true,
              steps: updatedSteps,
              currentStepIndex: existingStepIndex,
              status: "running",
            };
          } else {
            // Add new step with emotional enhancement
            const newStep: Step = {
              id: stepId,
              name: stepName,
              description: `✨ Processing ${stepName.toLowerCase()}...`,
              status: "running",
              startTime: new Date(),
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

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_START.lastIndex = 0;

      // Parse STEP_PROGRESS tokens with sentiment analysis
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

        setMultiStepState((prev) => ({
          ...prev,
          progressMessages: [
            ...prev.progressMessages.slice(-4), // Keep only last 5 messages
            `${new Date().toLocaleTimeString([], {
              hour12: false,
              minute: "2-digit",
              second: "2-digit",
            })} • ${message}`,
          ],
        }));

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_PROGRESS.lastIndex = 0;

      // Parse STEP_RESULT tokens with enhanced status tracking
      while (
        (match = CONTROL_TOKEN_PATTERNS.STEP_RESULT.exec(content)) !== null
      ) {
        hasControlTokens = true;
        const [fullMatch, stepId, status, result] = match;

        // Update emotional context based on result
        if (status === "completed") {
          emotionalContext.sentiment = "positive";
          emotionalContext.urgency = "low";
        } else if (status === "failed") {
          emotionalContext.sentiment = "negative";
          emotionalContext.urgency = "high";
        }

        setMultiStepState((prev) => {
          const stepIndex = prev.steps.findIndex((s) => s.id === stepId);
          if (stepIndex >= 0) {
            const updatedSteps = [...prev.steps];
            const stepEndTime = new Date();
            const stepStartTime = updatedSteps[stepIndex].startTime;

            // Calculate step duration for analytics
            if (stepStartTime) {
              const duration = stepEndTime.getTime() - stepStartTime.getTime();
              stepTimesRef.current.push(duration);
            }

            updatedSteps[stepIndex] = {
              ...updatedSteps[stepIndex],
              status: status as Step["status"],
              endTime: stepEndTime,
              progressMessage:
                result || updatedSteps[stepIndex].progressMessage,
              ...(status === "failed" && result ? { error: result } : {}),
            };

            // Calculate average step time for emotional pacing
            const avgTime =
              stepTimesRef.current.length > 0
                ? stepTimesRef.current.reduce((a, b) => a + b, 0) /
                  stepTimesRef.current.length
                : 0;

            return {
              ...prev,
              steps: updatedSteps,
              averageStepTime: avgTime,
            };
          }
          return prev;
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_RESULT.lastIndex = 0;

      // Parse STEP_END tokens with completion celebrations
      while ((match = CONTROL_TOKEN_PATTERNS.STEP_END.exec(content)) !== null) {
        hasControlTokens = true;
        const [fullMatch, stepId] = match;

        setMultiStepState((prev) => {
          const stepIndex = prev.steps.findIndex((s) => s.id === stepId);
          if (stepIndex >= 0) {
            const updatedSteps = [...prev.steps];
            if (updatedSteps[stepIndex].status === "running") {
              updatedSteps[stepIndex] = {
                ...updatedSteps[stepIndex],
                status: "completed",
                endTime: new Date(),
                progressMessage:
                  updatedSteps[stepIndex].progressMessage ||
                  `✅ ${updatedSteps[stepIndex].name} completed successfully!`,
              };
            }

            return {
              ...prev,
              steps: updatedSteps,
            };
          }
          return prev;
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.STEP_END.lastIndex = 0;

      // Parse MULTI_STEP_COMPLETE tokens with celebration mode
      while (
        (match = CONTROL_TOKEN_PATTERNS.MULTI_STEP_COMPLETE.exec(content)) !==
        null
      ) {
        hasControlTokens = true;
        const [fullMatch] = match;
        emotionalContext.sentiment = "positive";
        emotionalContext.urgency = "low";
        emotionalContext.progressDirection = "forward";

        setMultiStepState((prev) => {
          const totalTime = processStartTimeRef.current
            ? new Date().getTime() - processStartTimeRef.current.getTime()
            : 0;

          return {
            ...prev,
            status: "completed",
            totalProcessingTime: totalTime,
            progressMessages: [
              ...prev.progressMessages,
              `🎉 Process completed in ${Math.round(totalTime / 1000)}s!`,
            ],
          };
        });

        cleanContent = cleanContent.replace(fullMatch, "");
      }
      CONTROL_TOKEN_PATTERNS.MULTI_STEP_COMPLETE.lastIndex = 0;

      return {
        cleanContent: cleanContent.trim(),
        hasControlTokens,
        emotionalContext,
      };
    },
    []
  );

  const resetMultiStepState = useCallback(() => {
    setMultiStepState({
      isMultiStep: false,
      steps: [],
      currentStepIndex: 0,
      status: "running",
      progressMessages: [],
    });
    processStartTimeRef.current = null;
    stepTimesRef.current = [];
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
    };
  }, [multiStepState]);

  return {
    multiStepState,
    parseControlTokens,
    resetMultiStepState,
    pauseProcessing,
    resumeProcessing,
    getProcessingInsights,
  };
}

export default useMultiStepParser;
