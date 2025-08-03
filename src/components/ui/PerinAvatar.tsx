"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PerinAvatarProps {
  name?: string;
  tone?: string;
  status?: "idle" | "thinking" | "typing" | "listening" | "busy";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onAvatarClick?: () => void;
  isOnline?: boolean;
  personality?: "friendly" | "professional" | "creative" | "analytical";
}

export default function PerinAvatar({
  name = "Perin",
  tone = "friendly",
  status = "idle",
  size = "lg",
  className = "",
  onAvatarClick,
  isOnline = true,
  personality = "friendly",
}: PerinAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBreathing, setIsBreathing] = useState(true);

  // Personality-based color schemes
  const personalityColors = {
    friendly: {
      primary: "from-[var(--primary)] to-[var(--accent)]",
      secondary: "from-[var(--accent)]/20 to-[var(--primary)]/20",
      glow: "rgba(132, 0, 255, 0.3)",
    },
    professional: {
      primary: "from-slate-600 to-slate-800",
      secondary: "from-slate-200/20 to-slate-400/20",
      glow: "rgba(71, 85, 105, 0.3)",
    },
    creative: {
      primary: "from-purple-500 to-pink-500",
      secondary: "from-purple-200/20 to-pink-200/20",
      glow: "rgba(168, 85, 247, 0.3)",
    },
    analytical: {
      primary: "from-blue-600 to-cyan-500",
      secondary: "from-blue-200/20 to-cyan-200/20",
      glow: "rgba(37, 99, 235, 0.3)",
    },
  };

  const sizeClasses = {
    sm: "w-12 h-12 text-lg",
    md: "w-16 h-16 text-xl",
    lg: "w-20 h-20 text-2xl",
    xl: "w-32 h-32 text-4xl",
  };

  const statusAnimations = {
    idle: {
      scale: [1, 1.02, 1],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
    },
    thinking: {
      scale: [1, 1.05, 1],
      rotate: [0, 5, -5, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
    },
    typing: {
      scale: [1, 1.03, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
    listening: {
      scale: [1, 1.04, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
    busy: {
      scale: [1, 1.01, 1],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
    },
  };

  const statusMessages = {
    idle: "Ready to help",
    thinking: "Processing...",
    typing: "Responding...",
    listening: "Listening...",
    busy: "Working on tasks...",
  };

  const colors = personalityColors[personality];

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Avatar Container */}
      <motion.div
        className="relative"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={onAvatarClick}
        style={{ cursor: onAvatarClick ? "pointer" : "default" }}
      >
        {/* Subtle Glow Effect */}
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.primary} opacity-10 blur-lg`}
          animate={isBreathing ? statusAnimations[status] : undefined}
        />

        {/* Main Avatar */}
        <motion.div
          className={`relative ${sizeClasses[size]} bg-gradient-to-br ${colors.primary} rounded-full flex items-center justify-center text-white font-bold shadow-sm border border-white/10`}
          animate={isBreathing ? statusAnimations[status] : undefined}
          whileHover={onAvatarClick ? { scale: 1.02 } : undefined}
          whileTap={onAvatarClick ? { scale: 0.98 } : undefined}
        >
          {/* Status Indicator */}
          <AnimatePresence>
            {isOnline && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>

          {/* Avatar Content */}
          <span className="relative z-10">{name.charAt(0).toUpperCase()}</span>

          {/* Thinking Dots */}
          <AnimatePresence>
            {status === "thinking" && (
              <motion.div
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white/60 rounded-full"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Status Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-semibold text-[var(--foreground)] text-sm">
          {name}
        </h3>
        <p className="text-xs text-[var(--foreground-muted)]">
          {statusMessages[status]}
        </p>
      </motion.div>
    </div>
  );
}
