import { useCallback, useEffect, useState } from "react";
import {
  performanceMonitor,
  type PerformanceMetrics,
} from "@/lib/performance/PerformanceMonitor";
import {
  SmartLoadingManager,
  type UserContext,
} from "@/lib/performance/SmartLoadingManager";
import type { LoadingState } from "@/components/performance/ProgressiveLoader";

export interface UsePerformanceReturn {
  // Performance tracking
  trackRequest: (
    requestId: string,
    userId: string
  ) => {
    end: (additionalData?: Partial<PerformanceMetrics>) => void;
  };

  // Loading state management
  getLoadingState: (context: UserContext, phase: string) => LoadingState;
  getOptimizedLoadingState: (context: UserContext) => LoadingState;
  getContextAwareMessage: (context: UserContext, intent?: string) => string;

  // Analytics
  analytics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    totalRequests: number;
  };

  // Cache performance
  cachePerformance: {
    cacheHitRate: number;
    averageTimeWithCache: number;
    averageTimeWithoutCache: number;
    improvement: number;
  };

  // Intent performance
  intentPerformance: Record<
    string,
    {
      averageResponseTime: number;
      totalRequests: number;
      cacheHitRate: number;
    }
  >;

  // Utilities
  clearOldMetrics: (hours: number) => void;
  reset: () => void;
}

export function usePerformance(): UsePerformanceReturn {
  const [analytics, setAnalytics] = useState(() =>
    performanceMonitor.getAnalytics()
  );
  const [cachePerformance, setCachePerformance] = useState(() =>
    performanceMonitor.getCachePerformance()
  );
  const [intentPerformance, setIntentPerformance] = useState(() =>
    performanceMonitor.getIntentPerformance()
  );

  const smartLoadingManager = new SmartLoadingManager();

  // Update analytics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalytics(performanceMonitor.getAnalytics());
      setCachePerformance(performanceMonitor.getCachePerformance());
      setIntentPerformance(performanceMonitor.getIntentPerformance());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const trackRequest = useCallback((requestId: string, userId: string) => {
    const startTime = Date.now();
    const tracker = performanceMonitor.trackRequest(
      requestId,
      userId,
      startTime
    );
    return {
      end: (additionalData?: Partial<PerformanceMetrics>) => {
        tracker.end(Date.now(), additionalData);
      },
    };
  }, []);

  const getLoadingState = useCallback((context: UserContext, phase: string) => {
    return smartLoadingManager.getLoadingState(context, phase);
  }, []);

  const getOptimizedLoadingState = useCallback((context: UserContext) => {
    return smartLoadingManager.getOptimizedLoadingState(context);
  }, []);

  const getContextAwareMessage = useCallback(
    (context: UserContext, intent?: string) => {
      return smartLoadingManager.getContextAwareMessage(context, intent);
    },
    []
  );

  const clearOldMetrics = useCallback((hours: number) => {
    performanceMonitor.clearOldMetrics(hours);
    setAnalytics(performanceMonitor.getAnalytics());
    setCachePerformance(performanceMonitor.getCachePerformance());
    setIntentPerformance(performanceMonitor.getIntentPerformance());
  }, []);

  const reset = useCallback(() => {
    performanceMonitor.reset();
    setAnalytics(performanceMonitor.getAnalytics());
    setCachePerformance(performanceMonitor.getCachePerformance());
    setIntentPerformance(performanceMonitor.getIntentPerformance());
  }, []);

  return {
    trackRequest,
    getLoadingState,
    getOptimizedLoadingState,
    getContextAwareMessage,
    analytics,
    cachePerformance,
    intentPerformance,
    clearOldMetrics,
    reset,
  };
}

// Hook for tracking individual requests
export function useRequestTracker() {
  const [activeRequests, setActiveRequests] = useState<Map<string, number>>(
    new Map()
  );

  const startRequest = useCallback((requestId: string) => {
    setActiveRequests((prev) => new Map(prev.set(requestId, Date.now())));
  }, []);

  const endRequest = useCallback(
    (requestId: string, additionalData?: Partial<PerformanceMetrics>) => {
      const startTime = activeRequests.get(requestId);
      if (startTime) {
        const tracker = performanceMonitor.trackRequest(
          requestId,
          "unknown",
          startTime
        );
        tracker.end(Date.now(), additionalData);
        setActiveRequests((prev) => {
          const newMap = new Map(prev);
          newMap.delete(requestId);
          return newMap;
        });
      }
    },
    [activeRequests]
  );

  const getActiveRequestCount = useCallback(() => {
    return activeRequests.size;
  }, [activeRequests]);

  return {
    startRequest,
    endRequest,
    getActiveRequestCount,
    activeRequests: Array.from(activeRequests.keys()),
  };
}
