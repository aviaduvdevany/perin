"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassProps extends Omit<HTMLMotionProps<"div">, "transition"> {
  children: React.ReactNode;
  variant?: "default" | "strong" | "subtle" | "frosted" | "colored";
  intensity?: "low" | "medium" | "high";
  border?: boolean;
  glow?: boolean;
  glowColor?: "primary" | "secondary" | "success" | "custom";
  customGlowColor?: string;
  className?: string;
  backdropBlur?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  backgroundOpacity?: number;
  borderOpacity?: number;
  hoverEffect?: boolean;
  interactive?: boolean;
}

export function Glass({
  children,
  variant = "default",
  intensity = "medium",
  border = true,
  glow = false,
  glowColor = "primary",
  customGlowColor,
  className,
  backdropBlur = "md",
  backgroundOpacity,
  borderOpacity,
  hoverEffect = true,
  interactive = false,
  ...props
}: GlassProps) {
  // Variant configurations
  const variants = {
    default: {
      background: "rgba(17, 18, 22, 0.6)",
      border: "rgba(255, 255, 255, 0.1)",
    },
    strong: {
      background: "rgba(17, 18, 22, 0.8)",
      border: "rgba(255, 255, 255, 0.15)",
    },
    subtle: {
      background: "rgba(17, 18, 22, 0.3)",
      border: "rgba(255, 255, 255, 0.05)",
    },
    frosted: {
      background: "rgba(255, 255, 255, 0.1)",
      border: "rgba(255, 255, 255, 0.2)",
    },
    colored: {
      background: "rgba(76, 91, 255, 0.1)",
      border: "rgba(76, 91, 255, 0.2)",
    },
  };

  // Intensity configurations
  const intensities = {
    low: {
      blur: "sm",
      opacity: 0.3,
    },
    medium: {
      blur: "md",
      opacity: 0.6,
    },
    high: {
      blur: "lg",
      opacity: 0.8,
    },
  };

  // Glow color configurations
  const glowColors = {
    primary: "rgba(76, 91, 255, 0.3)",
    secondary: "rgba(255, 115, 0, 0.3)",
    success: "rgba(0, 255, 194, 0.3)",
    custom: customGlowColor || "rgba(76, 91, 255, 0.3)",
  };

  const selectedVariant = variants[variant];
  const selectedIntensity = intensities[intensity];
  const selectedGlowColor = glowColors[glowColor];

  // Dynamic styles
  const glassStyles = {
    background: backgroundOpacity
      ? `rgba(17, 18, 22, ${backgroundOpacity})`
      : selectedVariant.background,
    border: border
      ? `1px solid ${
          borderOpacity
            ? `rgba(255, 255, 255, ${borderOpacity})`
            : selectedVariant.border
        }`
      : "none",
    backdropFilter: `blur(${
      backdropBlur === "sm"
        ? "4px"
        : backdropBlur === "md"
        ? "8px"
        : backdropBlur === "lg"
        ? "12px"
        : backdropBlur === "xl"
        ? "16px"
        : backdropBlur === "2xl"
        ? "24px"
        : backdropBlur === "3xl"
        ? "40px"
        : "8px"
    })`,
    boxShadow: glow
      ? `0 8px 32px ${selectedGlowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
      : "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  };

  // Hover animations
  const hoverAnimations = hoverEffect
    ? {
        scale: 1.02,
        boxShadow: glow
          ? `0 12px 40px ${selectedGlowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`
          : "0 8px 25px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
      }
    : {};

  // Interactive animations
  const interactiveAnimations = interactive
    ? {
        whileHover: hoverAnimations,
        whileTap: { scale: 0.98 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      }
    : {};

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl transition-all duration-300",
        className
      )}
      style={glassStyles}
      {...interactiveAnimations}
      {...props}
    >
      {/* Inner glow effect */}
      {glow && (
        <div
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at center, ${selectedGlowColor}, transparent)`,
            filter: "blur(20px)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Predefined glass components for common use cases
export function GlassCard({ children, ...props }: Omit<GlassProps, "variant">) {
  return (
    <Glass variant="default" border={true} glow={false} {...props}>
      {children}
    </Glass>
  );
}

export function GlassPanel({
  children,
  ...props
}: Omit<GlassProps, "variant">) {
  return (
    <Glass variant="strong" border={true} glow={true} {...props}>
      {children}
    </Glass>
  );
}

export function GlassButton({
  children,
  ...props
}: Omit<GlassProps, "variant" | "interactive">) {
  return (
    <Glass
      variant="subtle"
      border={true}
      glow={false}
      interactive={true}
      className="cursor-pointer"
      {...props}
    >
      {children}
    </Glass>
  );
}

export function GlassInput({
  children,
  ...props
}: Omit<GlassProps, "variant">) {
  return (
    <Glass
      variant="frosted"
      border={true}
      glow={false}
      backdropBlur="lg"
      {...props}
    >
      {children}
    </Glass>
  );
}

export function GlassModal({
  children,
  ...props
}: Omit<GlassProps, "variant">) {
  return (
    <Glass
      variant="strong"
      border={true}
      glow={true}
      glowColor="primary"
      backdropBlur="xl"
      className="p-6"
      {...props}
    >
      {children}
    </Glass>
  );
}
