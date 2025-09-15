/**
 * Analysis Monitor
 *
 * Tracks performance and accuracy metrics for the unified delegation analyzer
 */

export interface AnalysisMetrics {
  sessionId: string;
  method: "unified" | "fallback";
  latency: number;
  success: boolean;
  confidence: number;
  tokenUsage?: number;
  errorType?: string;
  timestamp: Date;
}

export interface PerformanceReport {
  totalAnalyses: number;
  averageLatency: number;
  successRate: number;
  averageConfidence: number;
  methodBreakdown: {
    unified: number;
    fallback: number;
  };
  errorBreakdown: Record<string, number>;
}

class AnalysisMonitor {
  private metrics: AnalysisMetrics[] = [];
  private readonly maxMetricsHistory = 1000; // Keep last 1000 analyses

  /**
   * Track an analysis operation
   */
  trackAnalysis(metrics: AnalysisMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log performance warnings
    if (metrics.latency > 5000) {
      console.warn("🐌 Slow analysis detected:", {
        sessionId: metrics.sessionId,
        latency: metrics.latency,
        method: metrics.method,
      });
    }

    if (metrics.confidence < 0.3) {
      console.warn("🤔 Low confidence analysis:", {
        sessionId: metrics.sessionId,
        confidence: metrics.confidence,
        method: metrics.method,
      });
    }
  }

  /**
   * Get performance report for the last N analyses
   */
  getPerformanceReport(lastN: number = 100): PerformanceReport {
    const recentMetrics = this.metrics.slice(-lastN);

    if (recentMetrics.length === 0) {
      return {
        totalAnalyses: 0,
        averageLatency: 0,
        successRate: 0,
        averageConfidence: 0,
        methodBreakdown: { unified: 0, fallback: 0 },
        errorBreakdown: {},
      };
    }

    const totalAnalyses = recentMetrics.length;
    const successfulAnalyses = recentMetrics.filter((m) => m.success);
    const averageLatency =
      recentMetrics.reduce((sum, m) => sum + m.latency, 0) / totalAnalyses;
    const successRate = successfulAnalyses.length / totalAnalyses;
    const averageConfidence =
      successfulAnalyses.reduce((sum, m) => sum + m.confidence, 0) /
        successfulAnalyses.length || 0;

    const methodBreakdown = recentMetrics.reduce(
      (acc, m) => {
        acc[m.method]++;
        return acc;
      },
      { unified: 0, fallback: 0 }
    );

    const errorBreakdown = recentMetrics
      .filter((m) => !m.success && m.errorType)
      .reduce((acc, m) => {
        acc[m.errorType!] = (acc[m.errorType!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalAnalyses,
      averageLatency,
      successRate,
      averageConfidence,
      methodBreakdown,
      errorBreakdown,
    };
  }

  /**
   * Get recent performance trends
   */
  getPerformanceTrends(): {
    latencyTrend: "improving" | "degrading" | "stable";
    successRateTrend: "improving" | "degrading" | "stable";
    fallbackUsagePercent: number;
  } {
    const recentCount = Math.min(50, this.metrics.length);
    const olderCount = Math.min(50, this.metrics.length - recentCount);

    if (olderCount === 0) {
      return {
        latencyTrend: "stable",
        successRateTrend: "stable",
        fallbackUsagePercent: 0,
      };
    }

    const recentMetrics = this.metrics.slice(-recentCount);
    const olderMetrics = this.metrics.slice(
      -(recentCount + olderCount),
      -recentCount
    );

    const recentAvgLatency =
      recentMetrics.reduce((sum, m) => sum + m.latency, 0) /
      recentMetrics.length;
    const olderAvgLatency =
      olderMetrics.reduce((sum, m) => sum + m.latency, 0) / olderMetrics.length;

    const recentSuccessRate =
      recentMetrics.filter((m) => m.success).length / recentMetrics.length;
    const olderSuccessRate =
      olderMetrics.filter((m) => m.success).length / olderMetrics.length;

    const fallbackUsagePercent =
      (recentMetrics.filter((m) => m.method === "fallback").length /
        recentMetrics.length) *
      100;

    return {
      latencyTrend:
        recentAvgLatency < olderAvgLatency * 0.95
          ? "improving"
          : recentAvgLatency > olderAvgLatency * 1.05
          ? "degrading"
          : "stable",
      successRateTrend:
        recentSuccessRate > olderSuccessRate + 0.05
          ? "improving"
          : recentSuccessRate < olderSuccessRate - 0.05
          ? "degrading"
          : "stable",
      fallbackUsagePercent,
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const analysisMonitor = new AnalysisMonitor();
