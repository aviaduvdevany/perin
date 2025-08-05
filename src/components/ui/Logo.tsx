import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  animated?: boolean;
}

export function Logo({
  className,
  size = "md",
  showText = true,
  animated = true,
}: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-sm",
    md: "w-8 h-8 text-lg",
    lg: "w-12 h-12 text-2xl",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Icon */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-lg glow-primary",
          sizeClasses[size],
          animated &&
            "transition-all duration-300 hover:scale-110 hover:shadow-xl"
        )}
      >
        <span className="font-bold text-white">P</span>

        {/* Animated glow effect */}
        {animated && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-50" />
        )}
      </div>

      {/* Logo Text */}
      {showText && (
        <span
          className={cn(
            "font-bold gradient-text-primary",
            textSizeClasses[size],
            animated && "transition-all duration-300"
          )}
        >
          Perin
        </span>
      )}
    </div>
  );
}
