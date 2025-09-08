import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
    <div className={cn("flex items-center gap-1", className)}>
      {/* Logo Icon */}

        <Image
          src="/perin-logo.png"
          alt="Perin Logo"
          width={40}
          height={40}
          className={`${sizeClasses[size]}`}
        />

        {/* Animated glow effect */}
        {animated && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-50" />
        )}

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
