"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PerinStatusProps {
  status:
    | "idle"
    | "thinking"
    | "typing"
    | "listening"
    | "busy"
    | "scheduling"
    | "negotiating";
  currentTask?: string;
  recentActions?: Array<{
    id: string;
    action: string;
    timestamp: Date;
    status: "completed" | "pending" | "failed";
  }>;
  mood?: "happy" | "focused" | "thoughtful" | "excited" | "calm";
  className?: string;
}

export default function PerinStatus({
  status,
  currentTask,
  recentActions = [],
  mood = "focused",
  className = "",
}: PerinStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    idle: {
      icon: "💭",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      message: "Ready to assist you",
    },
    thinking: {
      icon: "🧠",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      message: "Processing your request",
    },
    typing: {
      icon: "✍️",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      message: "Crafting a response",
    },
    listening: {
      icon: "👂",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      message: "Listening carefully",
    },
    busy: {
      icon: "⚡",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      message: "Working on tasks",
    },
    scheduling: {
      icon: "📅",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      message: "Managing your calendar",
    },
    negotiating: {
      icon: "🤝",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      message: "Coordinating with others",
    },
  };

  const moodConfig = {
    happy: { emoji: "😊", description: "Feeling helpful and cheerful" },
    focused: { emoji: "🎯", description: "Deeply focused on your needs" },
    thoughtful: { emoji: "🤔", description: "Thinking through solutions" },
    excited: { emoji: "🚀", description: "Excited to help you succeed" },
    calm: { emoji: "😌", description: "Calm and collected" },
  };

  const config = statusConfig[status];
  const moodInfo = moodConfig[mood];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status */}
      <motion.div
        className={`p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] ${config.bgColor}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            className={`text-2xl ${config.color}`}
            animate={{ rotate: status === "thinking" ? [0, 10, -10, 0] : 0 }}
            transition={{
              duration: 2,
              repeat: status === "thinking" ? Infinity : 0,
            }}
          >
            {config.icon}
          </motion.div>

          <div className="flex-1">
            <h3 className="font-semibold text-[var(--foreground)] text-sm">
              {config.message}
            </h3>
            {currentTask && (
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                {currentTask}
              </p>
            )}
          </div>

          <motion.div
            className={`w-3 h-3 rounded-full ${config.color.replace(
              "text-",
              "bg-"
            )}`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Mood Indicator */}
      <motion.div
        className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            className="text-xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {moodInfo.emoji}
          </motion.div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Current Mood
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">
              {moodInfo.description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Recent Actions
            </h4>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {recentActions
                .slice(0, isExpanded ? recentActions.length : 3)
                .map((action, index) => (
                  <motion.div
                    key={action.id}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-[var(--card-background-light)] border border-[var(--card-border)]"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        action.status === "completed"
                          ? "bg-green-500"
                          : action.status === "pending"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--foreground)] truncate">
                        {action.action}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {action.timestamp.toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="text-xs text-[var(--foreground-muted)]">
                      {action.status === "completed" && "✓"}
                      {action.status === "pending" && "⏳"}
                      {action.status === "failed" && "✗"}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)] text-center">
          <div className="text-lg font-bold text-[var(--primary)]">
            {recentActions.filter((a) => a.status === "completed").length}
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">
            Tasks Completed
          </div>
        </div>

        <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)] text-center">
          <div className="text-lg font-bold text-[var(--accent)]">
            {recentActions.filter((a) => a.status === "pending").length}
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">
            In Progress
          </div>
        </div>
      </motion.div>
    </div>
  );
}
