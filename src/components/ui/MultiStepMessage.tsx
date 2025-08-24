"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  CheckCircle,
  Circle,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  Brain,
  Sparkles,
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

export function MultiStepMessage({
  steps,
  currentStepIndex,
  status,
  progressMessages,
  className = "",
  onStepClick,
  showTimings = false,
}: MultiStepMessageProps) {
  const [visibleSteps, setVisibleSteps] = useState<number>(1);
  const [heartbeat, setHeartbeat] = useState(false);
  const [celebrationMode, setCelebrationMode] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Emotional state management
  useEffect(() => {
    if (status === "completed") {
      setCelebrationMode(true);
      controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.6, ease: "easeOut" },
      });
      setTimeout(() => setCelebrationMode(false), 2000);
    }
  }, [status, controls]);

  // Heartbeat effect for active steps
  useEffect(() => {
    if (status === "running") {
      setHeartbeat(true);
      const interval = setInterval(() => {
        setHeartbeat((prev) => !prev);
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setHeartbeat(false);
    }
  }, [status]);

  // Gradually reveal steps as they become active
  useEffect(() => {
    if (currentStepIndex >= visibleSteps - 1) {
      setVisibleSteps(Math.min(currentStepIndex + 2, steps.length));
    }
  }, [currentStepIndex, steps.length, visibleSteps]);

  const getStepIcon = (step: Step, index: number) => {
    const isActive = index === currentStepIndex;
    const iconClass = "w-5 h-5 transition-all duration-300";

    switch (step.status) {
      case "completed":
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="relative"
          >
            <CheckCircle className={cn(iconClass, "text-[var(--success)]")} />
            {celebrationMode && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
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
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <AlertCircle className={cn(iconClass, "text-[var(--error)]")} />
          </motion.div>
        );
      case "running":
        return (
          <motion.div
            animate={{
              rotate: 360,
              scale: heartbeat ? 1.1 : 1,
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 0.8, ease: "easeInOut" },
            }}
            className="relative"
          >
            <Brain className={cn(iconClass, "text-[var(--accent-primary)]")} />
            <motion.div
              className="absolute -inset-1 rounded-full border-2 border-[var(--accent-primary)]"
              animate={{
                scale: [1, 1.3, 1],
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
      case "skipped":
        return (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 0.6, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowRight
              className={cn(iconClass, "text-[var(--foreground-subtle)]")}
            />
          </motion.div>
        );
      default:
        return (
          <motion.div
            animate={{
              scale: isActive ? 1.1 : 1,
              opacity: isActive ? 1 : 0.6,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Circle
              className={cn(
                iconClass,
                isActive
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--foreground-subtle)]"
              )}
            />
          </motion.div>
        );
    }
  };

  const getStepVariant = (step: Step, index: number) => {
    const isActive = index === currentStepIndex;

    switch (step.status) {
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "running":
        return "active";
      default:
        return isActive ? "pending" : "inactive";
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start || !end) return null;
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  const getOverallProgress = () => {
    const completed = steps.filter((s) => s.status === "completed").length;
    const failed = steps.filter((s) => s.status === "failed").length;
    const total = steps.length;

    if (status === "completed") return 100;
    if (status === "failed")
      return Math.round(((completed + failed) / total) * 100);
    return Math.round((completed / total) * 100);
  };

  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          color: "var(--success)",
          icon: Sparkles,
          label: "Completed",
          glow: "success",
        };
      case "failed":
        return {
          color: "var(--error)",
          icon: AlertCircle,
          label: "Failed",
          glow: "custom",
        };
      case "running":
        return {
          color: "var(--accent-primary)",
          icon: Zap,
          label: "Processing",
          glow: "primary",
        };
      default:
        return {
          color: "var(--foreground-muted)",
          icon: Clock,
          label: "Paused",
          glow: "custom",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div className={cn("space-y-6", className)} animate={controls}>
      {/* Header with Status and Progress */}
      <Glass
        variant="default"
        glow={status === "running"}
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
                status === "running"
                  ? {
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: status === "running" ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              <StatusIcon
                className="w-5 h-5"
                style={{ color: statusConfig.color }}
              />
            </motion.div>
            <div>
              <div className="text-sm font-medium text-[var(--cta-text)]">
                AI Multi-Step Process
              </div>
              <motion.div
                className="px-3 py-1 rounded-full text-xs font-medium mt-1"
                style={{
                  backgroundColor: `${statusConfig.color}20`,
                  color: statusConfig.color,
                  border: `1px solid ${statusConfig.color}40`,
                }}
                animate={
                  status === "running"
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
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold text-[var(--cta-text)]">
              {getOverallProgress()}%
            </div>
            <div className="text-xs text-[var(--foreground-muted)]">
              {steps.filter((s) => s.status === "completed").length} of{" "}
              {steps.length} steps
            </div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
          <motion.div
            ref={progressRef}
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background:
                status === "completed"
                  ? `linear-gradient(90deg, var(--success), #00ffc2b0)`
                  : status === "failed"
                  ? `linear-gradient(90deg, var(--error), #ff4b4bb0)`
                  : `linear-gradient(90deg, var(--accent-primary), #4c5bffb0)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${getOverallProgress()}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Animated shimmer effect */}
            {status === "running" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
        </div>
      </Glass>

      {/* Steps Container */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {steps.slice(0, visibleSteps).map((step, index) => {
            const variant = getStepVariant(step, index);
            const isActive = index === currentStepIndex;

            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <Glass
                  variant={variant === "active" ? "strong" : "default"}
                  glow={isActive && status === "running"}
                  glowColor="primary"
                  className={cn(
                    "p-4 transition-all duration-300",
                    onStepClick && "cursor-pointer",
                    isActive && "ring-1 ring-[var(--accent-primary)]/30",
                    step.status === "completed" &&
                      "bg-[var(--success)]/5 border-[var(--success)]/20",
                    step.status === "failed" &&
                      "bg-[var(--error)]/5 border-[var(--error)]/20"
                  )}
                  onClick={() => onStepClick?.(index)}
                  interactive={!!onStepClick}
                >
                  <div className="flex items-start space-x-4">
                    {/* Step Icon with Connection Line */}
                    <div className="flex flex-col items-center">
                      <div className="relative z-10 p-2 rounded-full bg-[var(--card-background)] border border-[var(--card-border)]">
                        {getStepIcon(step, index)}
                      </div>

                      {/* Connection line to next step */}
                      {index < steps.length - 1 && (
                        <motion.div
                          className="w-0.5 h-8 mt-2 bg-gradient-to-b from-[var(--card-border)] to-transparent"
                          initial={{ scaleY: 0 }}
                          animate={{
                            scaleY: index <= currentStepIndex ? 1 : 0.3,
                          }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-semibold text-[var(--cta-text)]">
                            {step.name}
                          </h4>
                          {showTimings && step.startTime && step.endTime && (
                            <span className="text-xs text-[var(--foreground-muted)] bg-[var(--card-background)] px-2 py-1 rounded-full">
                              {formatDuration(step.startTime, step.endTime)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--foreground-subtle)] font-mono">
                          {index + 1}/{steps.length}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--foreground-muted)] mb-3">
                        {step.description}
                      </p>

                      {/* Progress/Result Messages */}
                      <AnimatePresence>
                        {step.progressMessage && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-3"
                          >
                            <Glass
                              variant="subtle"
                              className={cn(
                                "p-3 text-sm font-medium",
                                step.status === "completed" &&
                                  "text-[var(--success)]",
                                step.status === "failed" &&
                                  "text-[var(--error)]",
                                step.status === "running" &&
                                  "text-[var(--accent-primary)]"
                              )}
                            >
                              {step.progressMessage}
                            </Glass>
                          </motion.div>
                        )}

                        {step.error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-3"
                          >
                            <Glass
                              variant="subtle"
                              className="p-3 text-sm text-[var(--error)] bg-[var(--error)]/10"
                            >
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{step.error}</span>
                              </div>
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

      {/* Live Updates Ticker */}
      {progressMessages.length > 0 && (
        <Glass variant="subtle" className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
            </motion.div>
            <span className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wide">
              Live Updates
            </span>
          </div>

          <div className="max-h-24 overflow-y-auto scrollbar-thin space-y-2">
            <AnimatePresence>
              {progressMessages.slice(-3).map((message, index) => (
                <motion.div
                  key={`${message}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-[var(--foreground-muted)] bg-[var(--card-background)] rounded-lg px-3 py-2 border border-[var(--card-border)]"
                >
                  {message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Glass>
      )}
    </motion.div>
  );
}

export default MultiStepMessage;
