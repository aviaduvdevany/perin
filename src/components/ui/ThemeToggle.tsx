"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon, Sparkles } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme, resetToSystem } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSystemTheme, setIsSystemTheme] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if we're following system theme
    const savedTheme = localStorage.getItem("theme");
    setIsSystemTheme(!savedTheme);
  }, []);

  // Ensure we have a valid theme
  const currentTheme = theme || "dark";

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();

    // Add haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 600);
  };

  if (!mounted) {
    return (
      <div className="relative h-10 w-10 rounded-full bg-[var(--card-background)] border border-[var(--card-border)] animate-pulse" />
    );
  }

  return (
    <button
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`
        group relative h-10 w-10 rounded-full 
        bg-gradient-to-br from-[var(--card-background)] to-[var(--card-background)]/80
        border border-[var(--card-border)] 
        shadow-lg shadow-[var(--accent-primary)]/5
        hover:shadow-xl hover:shadow-[var(--accent-primary)]/10
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background-primary)]
        transition-all duration-300 ease-out
        overflow-hidden
        ${isAnimating ? "theme-toggle-pulse" : ""}
        hover:theme-toggle-glow
      `}
      aria-label={`Switch to ${
        currentTheme === "light" ? "dark" : "light"
      } mode`}
      role="switch"
      aria-checked={currentTheme === "dark"}
    >
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/20 via-transparent to-[var(--accent-secondary)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Sparkle effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles
          className={`
            h-4 w-4 text-[var(--accent-primary)]
            transition-all duration-500 ease-out
            ${
              isAnimating
                ? "animate-spin scale-150 opacity-100"
                : "scale-0 opacity-0"
            }
          `}
        />
      </div>

      {/* Sun icon */}
      <div
        className={`
        absolute inset-0 flex items-center justify-center
        transition-all duration-500 ease-out
        ${
          currentTheme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }
      `}
      >
        <Sun className="h-5 w-5 text-[var(--accent-secondary)] drop-shadow-sm" />
      </div>

      {/* Moon icon */}
      <div
        className={`
        absolute inset-0 flex items-center justify-center
        transition-all duration-500 ease-out
        ${
          currentTheme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }
      `}
      >
        <Moon className="h-5 w-5 text-[var(--accent-primary)] drop-shadow-sm" />
      </div>

      {/* Ripple effect on click */}
      <div
        className={`
        absolute inset-0 rounded-full
        bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30
        scale-0 opacity-0
        transition-all duration-300 ease-out
        ${isAnimating ? "scale-150 opacity-100" : ""}
      `}
      />

      {/* Glow effect */}
      <div
        className={`
          absolute -inset-1 rounded-full
          bg-gradient-to-br from-[var(--accent-primary)]/20 via-transparent to-[var(--accent-secondary)]/20
          opacity-0 blur-sm
          group-hover:opacity-100
          transition-opacity duration-300
          -z-10
        `}
      />

      {/* System theme indicator */}
      {isSystemTheme && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--background-primary)] opacity-80" />
      )}
    </button>
  );
}
