"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the actual theme to display (system resolves to light/dark)
  const displayTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = displayTheme === "dark";

  const handleToggle = () => {
    // If current theme is system, switch to the opposite of resolved theme
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      // If current theme is light/dark, switch to the opposite
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const sizeClasses = {
    sm: "w-12 h-6",
    md: "w-14 h-7",
    lg: "w-16 h-8",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const thumbSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
  };

  return (
    <button
      key={mounted ? "mounted" : "hydrating"}
      onClick={handleToggle}
      className={cn(
        "relative inline-flex items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--background-primary)]",
        sizeClasses[size],
        isDark
          ? "bg-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/25"
          : "bg-[var(--card-border)] hover:bg-[var(--card-border)]/80",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Background gradient for dark mode */}
      {isDark && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Thumb with icon */}
      <motion.div
        className={cn(
          "relative flex items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300",
          thumbSizes[size]
        )}
        animate={{
          x: isDark ? "100%" : "0%",
          translateX: isDark ? "-100%" : "0%",
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        <motion.div
          initial={false}
          animate={{
            rotate: isDark ? 180 : 0,
            scale: isDark ? 1.1 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {isDark ? (
            <Moon
              className={cn("text-[var(--accent-primary)]", iconSizes[size])}
            />
          ) : (
            <Sun
              className={cn("text-[var(--accent-secondary)]", iconSizes[size])}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Background icons (subtle) */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        <Sun
          className={cn(
            "text-[var(--foreground-subtle)] transition-colors duration-300",
            iconSizes[size],
            !isDark && "text-[var(--accent-secondary)]"
          )}
        />
        <Moon
          className={cn(
            "text-[var(--foreground-subtle)] transition-colors duration-300",
            iconSizes[size],
            isDark && "text-[var(--accent-primary)]"
          )}
        />
      </div>
    </button>
  );
}
