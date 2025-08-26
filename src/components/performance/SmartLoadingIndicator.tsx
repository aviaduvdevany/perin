"use client";

import React from "react";
import { ProgressiveLoader, type LoadingState } from "./ProgressiveLoader";
import {
  SmartLoadingManager,
  type UserContext,
} from "@/lib/performance/SmartLoadingManager";

interface SmartLoadingIndicatorProps {
  context: UserContext;
  phase: string;
  intent?: string;
  className?: string;
}

export const SmartLoadingIndicator: React.FC<SmartLoadingIndicatorProps> = ({
  context,
  phase,
  intent,
  className = "",
}) => {
  const smartLoadingManager = new SmartLoadingManager();

  // Get context-aware loading state
  const loadingState = smartLoadingManager.getLoadingState(context, phase);

  // Override message with intent-specific message if available
  const finalLoadingState: LoadingState = {
    ...loadingState,
    message: intent
      ? smartLoadingManager.getContextAwareMessage(context, intent)
      : loadingState.message,
  };

  return <ProgressiveLoader state={finalLoadingState} className={className} />;
};

// Optimized loading indicator that skips phases when context is fresh
interface OptimizedLoadingIndicatorProps {
  context: UserContext;
  className?: string;
}

export const OptimizedLoadingIndicator: React.FC<
  OptimizedLoadingIndicatorProps
> = ({ context, className = "" }) => {
  const smartLoadingManager = new SmartLoadingManager();

  // Get optimized loading state based on available context
  const loadingState = smartLoadingManager.getOptimizedLoadingState(context);

  return <ProgressiveLoader state={loadingState} className={className} />;
};
