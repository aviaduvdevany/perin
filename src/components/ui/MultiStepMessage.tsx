"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  CheckCircle,
  Circle,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  Sparkles,
  Play,
  Pause,
  Loader2,
} from "lucide-react";
import { Glass } from "./Glass";
import { cn } from "@/lib/utils";

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

interface MultiStepMessageProps {
  steps: Step[];
  currentStepIndex: number;
  status: "running" | "paused" | "completed" | "failed";
  progressMessages: string[];
  className?: string;
  onStepClick?: (stepIndex: number) => void;
  showTimings?: boolean;
}

interface CinematicStep extends Step {
  cinematicStatus:
    | "hidden"
    | "revealing"
    | "processing"
    | "completing"
    | "completed"
    | "failed"
    | "pending"
    | "running";
  cinematicProgress: number; // 0-100
  emotionalDelay: number; // ms to wait before showing
}

export function MultiStepMessage({
  steps,
  currentStepIndex: _currentStepIndex,
  status: _status,
  progressMessages: _progressMessages,
  className = "",
  onStepClick,
  showTimings: _showTimings = false,
}: MultiStepMessageProps) {
  const [cinematicSteps, setCinematicSteps] = useState<CinematicStep[]>([]);
  const [cinematicIndex, setCinematicIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [userCanControl, setUserCanControl] = useState(false);
  const [celebrationMode, setCelebrationMode] = useState(false);
  const [currentProgressMessage, setCurrentProgressMessage] = useState("");

  const cinematicTimeouts = useRef<NodeJS.Timeout[]>([]);
  const controls = useAnimation();
  const progressRef = useRef<HTMLDivElement>(null);

  // Enhanced timing configuration for emotional pacing
  const CINEMATIC_TIMING = useRef({
    STEP_REVEAL_DELAY: 800, // Time between step reveals
    PROCESSING_DURATION: 2000, // How long to show "processing"
    COMPLETION_PAUSE: 1200, // Pause to celebrate completion
    PROGRESS_UPDATE_INTERVAL: 100, // Progress bar smoothness
    EMOTIONAL_SETTLE_TIME: 500, // Time for user to absorb
  }).current;

  // Initialize cinematic steps from real steps
  useEffect(() => {
    const newCinematicSteps: CinematicStep[] = steps.map((step, index) => ({
      ...step,
      cinematicStatus: "hidden",
      cinematicProgress: 0,
      emotionalDelay: index * CINEMATIC_TIMING.STEP_REVEAL_DELAY,
    }));

    setCinematicSteps(newCinematicSteps);
    setUserCanControl(steps.length > 0);
  }, [steps]);

  // Cinematic orchestration - the heart of the emotional experience
  const startCinematicSequence = useCallback(() => {
    if (!isPlaying || cinematicSteps.length === 0) return;

    // Clear any existing timeouts
    cinematicTimeouts.current.forEach(clearTimeout);
    cinematicTimeouts.current = [];

    const orchestrateStep = (stepIndex: number) => {
      if (stepIndex >= cinematicSteps.length) {
        // All steps revealed, trigger completion sequence
        setTimeout(() => {
          setCelebrationMode(true);
          controls.start({
            scale: [1, 1.02, 1],
            transition: { duration: 0.8, ease: "easeOut" },
          });
        }, CINEMATIC_TIMING.EMOTIONAL_SETTLE_TIME);
        return;
      }

      const realStep = steps[stepIndex];

      // Phase 1: Reveal the step
      setCinematicIndex(stepIndex);
      setCinematicSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex ? { ...s, cinematicStatus: "revealing" } : s
        )
      );

      // Phase 2: Start processing animation
      const processingTimeout = setTimeout(() => {
        setCinematicSteps((prev) =>
          prev.map((s, i) =>
            i === stepIndex
              ? { ...s, cinematicStatus: "processing", cinematicProgress: 0 }
              : s
          )
        );

        // Animate progress bar with realistic feel
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5; // Organic progress increments

          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);

            // Phase 3: Complete the step
            setTimeout(() => {
              const finalStatus =
                realStep.status === "failed" ? "failed" : "completed";

              setCinematicSteps((prev) =>
                prev.map((s, i) =>
                  i === stepIndex
                    ? {
                        ...s,
                        cinematicStatus: finalStatus,
                        cinematicProgress: 100,
                        progressMessage: realStep.progressMessage,
                      }
                    : s
                )
              );

              // Show progress message with typing effect
              if (realStep.progressMessage) {
                let messageIndex = 0;
                const typingInterval = setInterval(() => {
                  setCurrentProgressMessage(
                    realStep.progressMessage!.substring(0, messageIndex)
                  );
                  messageIndex++;

                  if (messageIndex > realStep.progressMessage!.length) {
                    clearInterval(typingInterval);

                    // Move to next step after emotional pause
                    setTimeout(() => {
                      setCurrentProgressMessage("");
                      orchestrateStep(stepIndex + 1);
                    }, CINEMATIC_TIMING.COMPLETION_PAUSE);
                  }
                }, 30); // Typing speed
              } else {
                // No message, continue after pause
                setTimeout(() => {
                  orchestrateStep(stepIndex + 1);
                }, CINEMATIC_TIMING.COMPLETION_PAUSE);
              }
            }, CINEMATIC_TIMING.EMOTIONAL_SETTLE_TIME);
          } else {
            setCinematicSteps((prev) =>
              prev.map((s, i) =>
                i === stepIndex
                  ? { ...s, cinematicProgress: Math.min(progress, 100) }
                  : s
              )
            );
          }
        }, CINEMATIC_TIMING.PROGRESS_UPDATE_INTERVAL);

        cinematicTimeouts.current.push(progressInterval);
      }, CINEMATIC_TIMING.STEP_REVEAL_DELAY);

      cinematicTimeouts.current.push(processingTimeout);
    };

    // Start the sequence
    orchestrateStep(0);
  }, [cinematicSteps, isPlaying, steps, controls]);

  // Auto-start cinematic sequence when steps are loaded
  useEffect(() => {
    if (cinematicSteps.length > 0 && cinematicIndex === -1 && isPlaying) {
      startCinematicSequence();
    }
  }, [cinematicSteps, cinematicIndex, startCinematicSequence, isPlaying]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      cinematicTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      startCinematicSequence();
    } else {
      cinematicTimeouts.current.forEach(clearTimeout);
    }
  };

  const skipToEnd = () => {
    cinematicTimeouts.current.forEach(clearTimeout);
    setCinematicSteps((prev) =>
      prev.map((step, index) => ({
        ...step,
        cinematicStatus:
          steps[index]?.status === "failed" ? "failed" : "completed",
        cinematicProgress: 100,
      }))
    );
    setCinematicIndex(steps.length - 1);
    setCelebrationMode(true);
  };

  const getStepIcon = (step: CinematicStep, index: number) => {
    const iconClass = "w-5 h-5 transition-all duration-500";

    switch (step.cinematicStatus) {
      case "completed":
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="relative"
          >
            <CheckCircle className={cn(iconClass, "text-[var(--success)]")} />
            {celebrationMode && index <= cinematicIndex && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{
                  duration: 1.5,
                  delay: index * 0.2,
                  ease: "easeOut",
                }}
                className="absolute -inset-2"
              >
                <Sparkles className="w-9 h-9 text-[var(--success)]" />
              </motion.div>
            )}
          </motion.div>
        );
      case "failed":
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <AlertCircle className={cn(iconClass, "text-[var(--error)]")} />
          </motion.div>
        );
      case "processing":
        return (
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative"
          >
            <Brain className={cn(iconClass, "text-[var(--accent-primary)]")} />
            <motion.div
              className="absolute -inset-1 rounded-full border-2 border-[var(--accent-primary)]"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.8, 0.2, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        );
      case "revealing":
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Circle className={cn(iconClass, "text-[var(--accent-primary)]")} />
          </motion.div>
        );
      case "pending":
        return (
          <Circle
            className={cn(iconClass, "text-[var(--foreground-muted)]/70")}
          />
        );
      case "running":
        return (
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            }}
          >
            <Loader2
              className={cn(iconClass, "text-[var(--accent-primary)]")}
            />
          </motion.div>
        );
      default:
        return (
          <Circle
            className={cn(
              iconClass,
              "text-[var(--foreground-subtle)] opacity-30"
            )}
          />
        );
    }
  };

  const getOverallProgress = () => {
    if (cinematicSteps.length === 0) return 0;

    const completedSteps = cinematicSteps.filter(
      (s) => s.cinematicStatus === "completed" || s.cinematicStatus === "failed"
    ).length;

    const currentStepProgress =
      cinematicIndex >= 0 && cinematicIndex < cinematicSteps.length
        ? cinematicSteps[cinematicIndex]?.cinematicProgress || 0
        : 0;

    const baseProgress = (completedSteps / cinematicSteps.length) * 100;
    const currentContribution =
      cinematicIndex >= 0 ? currentStepProgress / cinematicSteps.length : 0;

    return Math.min(baseProgress + currentContribution, 100);
  };

  const getStatusConfig = () => {
    if (celebrationMode) {
      return {
        color: "var(--success)",
        icon: Sparkles,
        label: "Completed",
        glow: "success",
      };
    }

    if (cinematicSteps.some((s) => s.cinematicStatus === "failed")) {
      return {
        color: "var(--error)",
        icon: AlertCircle,
        label: "Failed",
        glow: "custom",
      };
    }

    if (cinematicIndex >= 0 && cinematicIndex < cinematicSteps.length) {
      return {
        color: "var(--accent-primary)",
        icon: Zap,
        label: "Processing",
        glow: "primary",
      };
    }

    return {
      color: "var(--foreground-muted)",
      icon: Clock,
      label: "Ready",
      glow: "custom",
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div className={cn("space-y-6", className)} animate={controls}>
      {/* Cinematic Header with Playback Controls */}
      <Glass
        variant="default"
        glow={cinematicIndex >= 0}
        glowColor={
          statusConfig.glow as "primary" | "secondary" | "success" | "custom"
        }
        className="p-4 group"
        hoverEffect={false}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={
                cinematicIndex >= 0
                  ? {
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: cinematicIndex >= 0 ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              <StatusIcon
                className="w-5 h-5"
                style={{ color: statusConfig.color }}
              />
            </motion.div>
            <div>
              <div className="flex items-center space-x-2 mt-1">
                <motion.div
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${statusConfig.color}20`,
                    color: statusConfig.color,
                    border: `1px solid ${statusConfig.color}40`,
                  }}
                  animate={
                    cinematicIndex >= 0
                      ? {
                          boxShadow: [
                            `0 0 0 0 ${statusConfig.color}40`,
                            `0 0 0 8px ${statusConfig.color}10`,
                            `0 0 0 0 ${statusConfig.color}40`,
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {statusConfig.label}
                </motion.div>

                {userCanControl && (
                  <div className="flex items-center space-x-1">
                    <Glass
                      variant="subtle"
                      className="p-1 cursor-pointer"
                      onClick={togglePlayback}
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3 text-[var(--foreground-muted)]" />
                      ) : (
                        <Play className="w-3 h-3 text-[var(--foreground-muted)]" />
                      )}
                    </Glass>
                    <Glass
                      variant="subtle"
                      className="px-2 py-1 cursor-pointer"
                      onClick={skipToEnd}
                    >
                      <span className="text-xs text-[var(--foreground-muted)]">
                        Skip
                      </span>
                    </Glass>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold text-[var(--cta-text)]">
              {Math.round(getOverallProgress())}%
            </div>
            <div className="text-xs text-[var(--foreground-muted)]">
              Step {Math.max(cinematicIndex + 1, 1)} of {cinematicSteps.length}
            </div>
          </div>
        </div>

        {/* Cinematic Progress Bar */}
        <div className="relative h-3 bg-[var(--card-border)] rounded-full overflow-hidden">
          <motion.div
            ref={progressRef}
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background: celebrationMode
                ? `linear-gradient(90deg, var(--success), #00ffc2b0)`
                : cinematicSteps.some((s) => s.cinematicStatus === "failed")
                ? `linear-gradient(90deg, var(--error), #ff4b4bb0)`
                : `linear-gradient(90deg, var(--accent-primary), #4c5bffb0)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${getOverallProgress()}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Animated shimmer effect */}
            {cinematicIndex >= 0 && !celebrationMode && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
        </div>
      </Glass>

      {/* Cinematic Steps Reveal */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {cinematicSteps.map((step, index) => {
            if (step.cinematicStatus === "hidden") return null;

            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  duration: 0.6,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
              >
                <Glass
                  variant={index === cinematicIndex ? "strong" : "default"}
                  glow={
                    index === cinematicIndex &&
                    step.cinematicStatus === "processing"
                  }
                  glowColor="primary"
                  className={cn(
                    "p-4 transition-all duration-500",
                    onStepClick && "cursor-pointer",
                    index === cinematicIndex &&
                      "ring-1 ring-[var(--accent-primary)]/30",
                    step.cinematicStatus === "completed" &&
                      "bg-[var(--success)]/5 border-[var(--success)]/20",
                    step.cinematicStatus === "failed" &&
                      "bg-[var(--error)]/5 border-[var(--error)]/20"
                  )}
                  onClick={() => onStepClick?.(index)}
                  interactive={!!onStepClick}
                >
                  <div className="flex items-start space-x-4">
                    {/* Cinematic Icon with Connection */}
                    <div className="flex flex-col items-center">
                      <div className="relative z-10 p-2 rounded-full bg-[var(--card-background)] border border-[var(--card-border)]">
                        {getStepIcon(step, index)}
                      </div>

                      {/* Animated connection line */}
                      {index < cinematicSteps.length - 1 && (
                        <motion.div
                          className="w-0.5 h-8 mt-2 bg-gradient-to-b from-[var(--card-border)] to-transparent"
                          initial={{ scaleY: 0 }}
                          animate={{
                            scaleY: index <= cinematicIndex ? 1 : 0.3,
                            opacity: index <= cinematicIndex ? 1 : 0.5,
                          }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-[var(--cta-text)]">
                          {step.name}
                        </h4>
                        <span className="text-xs text-[var(--foreground-subtle)] font-mono">
                          {index + 1}/{cinematicSteps.length}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--foreground-muted)] mb-3">
                        {step.description}
                      </p>

                      {/* Cinematic Progress Bar for Current Step */}
                      {step.cinematicStatus === "processing" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mb-3"
                        >
                          <div className="h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[var(--accent-primary)] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${step.cinematicProgress}%` }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Cinematic Result Messages */}
                      <AnimatePresence>
                        {step.progressMessage &&
                          step.cinematicStatus !== "processing" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.4 }}
                              className="mt-3"
                            >
                              <Glass
                                variant="subtle"
                                className={cn(
                                  "p-3 text-sm font-medium",
                                  step.cinematicStatus === "completed" &&
                                    "text-[var(--success)]",
                                  step.cinematicStatus === "failed" &&
                                    "text-[var(--error)]"
                                )}
                              >
                                {step.progressMessage}
                              </Glass>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Glass>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Live Progress Message Ticker */}
      <AnimatePresence>
        {currentProgressMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <Glass variant="subtle" className="p-4">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                </motion.div>
                <span className="text-sm text-[var(--foreground-muted)] font-medium">
                  {currentProgressMessage}
                </span>
              </div>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MultiStepMessage;
