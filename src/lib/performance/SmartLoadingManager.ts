import type { LoadingState } from "@/components/performance/ProgressiveLoader";

export interface UserContext {
  calendar?: {
    events: Record<string, unknown>[];
    nextEvent: Record<string, unknown> | null;
    availability: Record<string, unknown>;
    lastUpdated: number;
  };
  memory?: {
    semantic: Record<string, unknown>[];
    preferences: Record<string, unknown>;
    lastUpdated: number;
  };
  integrations?: {
    contexts: Record<string, Record<string, unknown>>;
    lastUpdated: number;
  };
}

export class SmartLoadingManager {
  /**
   * Get loading state based on context and phase
   */
  getLoadingState(context: UserContext, phase: string): LoadingState {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Check if we have fresh context data
    const hasFreshCalendar =
      context.calendar && now - context.calendar.lastUpdated < fiveMinutes;
    const hasFreshMemory =
      context.memory && now - context.memory.lastUpdated < fiveMinutes;

    switch (phase) {
      case "understanding":
        return {
          phase: "understanding",
          message: "Understanding what you need...",
          progress: 20,
          estimatedTime: 1,
        };

      case "context":
        if (hasFreshCalendar && context.calendar?.events) {
          return {
            phase: "context",
            message: `Loading your ${context.calendar.events.length} calendar events...`,
            progress: 40,
            estimatedTime: 1,
          };
        }

        if (hasFreshMemory && context.memory?.semantic) {
          return {
            phase: "context",
            message: `Using your ${context.memory.semantic.length} saved preferences...`,
            progress: 40,
            estimatedTime: 1,
          };
        }

        return {
          phase: "context",
          message: "Gathering your personal context...",
          progress: 40,
          estimatedTime: 2,
        };

      case "processing":
        if (hasFreshMemory && context.memory?.semantic) {
          return {
            phase: "processing",
            message: `Processing with ${context.memory.semantic.length} relevant memories...`,
            progress: 60,
            estimatedTime: 1,
          };
        }

        return {
          phase: "processing",
          message: "Thinking through your request...",
          progress: 60,
          estimatedTime: 2,
        };

      case "responding":
        return {
          phase: "responding",
          message: "Crafting your personalized response...",
          progress: 80,
          estimatedTime: 1,
        };

      default:
        return {
          phase: "understanding",
          message: "Processing your request...",
          progress: 50,
          estimatedTime: 2,
        };
    }
  }

  /**
   * Get optimized loading state based on available context
   */
  getOptimizedLoadingState(context: UserContext): LoadingState {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Determine if we have fresh context data
    const hasFreshCalendar =
      context.calendar && now - context.calendar.lastUpdated < fiveMinutes;
    const hasFreshMemory =
      context.memory && now - context.memory.lastUpdated < fiveMinutes;

    // If we have fresh context, we can skip some phases
    if (hasFreshCalendar && hasFreshMemory) {
      return {
        phase: "processing",
        message: "Using your cached data for faster response...",
        progress: 70,
        estimatedTime: 1,
      };
    }

    if (hasFreshCalendar && context.calendar) {
      return {
        phase: "context",
        message: `Loading your ${context.calendar.events.length} calendar events...`,
        progress: 40,
        estimatedTime: 1,
      };
    }

    if (hasFreshMemory && context.memory) {
      return {
        phase: "context",
        message: `Using your ${context.memory.semantic.length} saved preferences...`,
        progress: 40,
        estimatedTime: 1,
      };
    }

    // No fresh context, start from understanding
    return {
      phase: "understanding",
      message: "Analyzing your request...",
      progress: 20,
      estimatedTime: 2,
    };
  }

  /**
   * Get context-aware loading message
   */
  getContextAwareMessage(context: UserContext, intent?: string): string {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (intent === "calendar" && context.calendar?.events) {
      const isFresh = now - context.calendar.lastUpdated < fiveMinutes;
      if (isFresh) {
        return `Using your ${context.calendar.events.length} calendar events...`;
      }
      return "Loading your calendar data...";
    }

    if (intent === "email" && context.integrations?.contexts?.gmail) {
      return "Loading your email context...";
    }

    if (context.memory?.semantic && context.memory.semantic.length > 0) {
      const isFresh = now - context.memory.lastUpdated < fiveMinutes;
      if (isFresh) {
        return `Using your ${context.memory.semantic.length} saved preferences...`;
      }
    }

    return "Processing your request...";
  }

  /**
   * Calculate estimated time based on context freshness
   */
  getEstimatedTime(context: UserContext, phase: string): number {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    const hasFreshCalendar =
      context.calendar && now - context.calendar.lastUpdated < fiveMinutes;
    const hasFreshMemory =
      context.memory && now - context.memory.lastUpdated < fiveMinutes;

    // If we have fresh context, reduce estimated time
    if (hasFreshCalendar && hasFreshMemory) {
      return 1;
    }

    if (hasFreshCalendar || hasFreshMemory) {
      return 2;
    }

    // Base times for each phase
    switch (phase) {
      case "understanding":
        return 1;
      case "context":
        return 2;
      case "processing":
        return 2;
      case "responding":
        return 1;
      default:
        return 2;
    }
  }
}
