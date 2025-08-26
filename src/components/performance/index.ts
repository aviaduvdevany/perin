// Performance Components
export { ProgressiveLoader } from "./ProgressiveLoader";
export {
  SmartLoadingIndicator,
  OptimizedLoadingIndicator,
} from "./SmartLoadingIndicator";
export { PerformanceDashboard } from "./PerformanceDashboard";

// Performance Types
export type { LoadingState } from "./ProgressiveLoader";

// Performance Utilities
export { SmartLoadingManager } from "@/lib/performance/SmartLoadingManager";
export {
  PerformanceMonitor,
  performanceMonitor,
} from "@/lib/performance/PerformanceMonitor";
export type { PerformanceMetrics } from "@/lib/performance/PerformanceMonitor";

// Performance Hooks
export { usePerformance, useRequestTracker } from "@/hooks/usePerformance";
