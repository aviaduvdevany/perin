export interface PerformanceMetrics {
  // Response Times
  totalResponseTime: number;
  understandingTime: number;
  contextLoadingTime: number;
  aiProcessingTime: number;

  // Cache Performance
  cacheHitRate: number;
  cacheMissRate: number;
  averageCacheTime: number;

  // User Experience
  firstResponseTime: number;
  timeToInteractive: number;
  perceivedPerformance: number;

  // System Health
  errorRate: number;
  timeoutRate: number;
  concurrentRequests: number;

  // Request Details
  requestId: string;
  timestamp: Date;
  userId: string;
  intent?: string;
  hasClientContext: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 requests

  /**
   * Track a request and return a tracker object
   */
  trackRequest(requestId: string, userId: string, startTime: number) {
    return {
      end: (endTime: number, additionalData?: Partial<PerformanceMetrics>) => {
        const duration = endTime - startTime;
        const metric: PerformanceMetrics = {
          requestId,
          userId,
          timestamp: new Date(),
          totalResponseTime: duration,
          understandingTime: 0,
          contextLoadingTime: 0,
          aiProcessingTime: 0,
          cacheHitRate: 0,
          cacheMissRate: 0,
          averageCacheTime: 0,
          firstResponseTime: 0,
          timeToInteractive: 0,
          perceivedPerformance: 0,
          errorRate: 0,
          timeoutRate: 0,
          concurrentRequests: 0,
          hasClientContext: false,
          ...additionalData,
        };

        this.addMetric(metric);
      },
    };
  }

  /**
   * Add a performance metric
   */
  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Performance Metric:", {
        requestId: metric.requestId,
        totalTime: `${metric.totalResponseTime}ms`,
        hasClientContext: metric.hasClientContext,
        intent: metric.intent,
      });
    }
  }

  /**
   * Get performance analytics
   */
  getAnalytics() {
    if (this.metrics.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        totalRequests: 0,
      };
    }

    const responseTimes = this.metrics
      .map((m) => m.totalResponseTime)
      .sort((a, b) => a - b);
    const cacheHits = this.metrics.filter((m) => m.hasClientContext).length;
    const errors = this.metrics.filter((m) => m.errorRate > 0).length;

    return {
      averageResponseTime: this.calculateAverage(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      cacheHitRate: (cacheHits / this.metrics.length) * 100,
      errorRate: (errors / this.metrics.length) * 100,
      totalRequests: this.metrics.length,
      recentRequests: this.metrics.slice(-10).map((m) => ({
        requestId: m.requestId,
        responseTime: m.totalResponseTime,
        hasClientContext: m.hasClientContext,
        intent: m.intent,
        timestamp: m.timestamp,
      })),
    };
  }

  /**
   * Get analytics for a specific time period
   */
  getAnalyticsForPeriod(hours: number) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        totalRequests: 0,
      };
    }

    const responseTimes = recentMetrics
      .map((m) => m.totalResponseTime)
      .sort((a, b) => a - b);
    const cacheHits = recentMetrics.filter((m) => m.hasClientContext).length;
    const errors = recentMetrics.filter((m) => m.errorRate > 0).length;

    return {
      averageResponseTime: this.calculateAverage(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      cacheHitRate: (cacheHits / recentMetrics.length) * 100,
      errorRate: (errors / recentMetrics.length) * 100,
      totalRequests: recentMetrics.length,
    };
  }

  /**
   * Get cache performance metrics
   */
  getCachePerformance() {
    const withClientContext = this.metrics.filter((m) => m.hasClientContext);
    const withoutClientContext = this.metrics.filter(
      (m) => !m.hasClientContext
    );

    if (this.metrics.length === 0) {
      return {
        cacheHitRate: 0,
        averageTimeWithCache: 0,
        averageTimeWithoutCache: 0,
        improvement: 0,
      };
    }

    const avgWithCache = this.calculateAverage(
      withClientContext.map((m) => m.totalResponseTime)
    );
    const avgWithoutCache = this.calculateAverage(
      withoutClientContext.map((m) => m.totalResponseTime)
    );
    const cacheHitRate = (withClientContext.length / this.metrics.length) * 100;
    const improvement =
      avgWithoutCache > 0
        ? ((avgWithoutCache - avgWithCache) / avgWithoutCache) * 100
        : 0;

    return {
      cacheHitRate,
      averageTimeWithCache: avgWithCache,
      averageTimeWithoutCache: avgWithoutCache,
      improvement,
    };
  }

  /**
   * Get intent-based performance metrics
   */
  getIntentPerformance() {
    const intentGroups = new Map<string, PerformanceMetrics[]>();

    this.metrics.forEach((metric) => {
      if (metric.intent) {
        if (!intentGroups.has(metric.intent)) {
          intentGroups.set(metric.intent, []);
        }
        intentGroups.get(metric.intent)!.push(metric);
      }
    });

    const intentPerformance: Record<
      string,
      {
        averageResponseTime: number;
        totalRequests: number;
        cacheHitRate: number;
      }
    > = {};

    intentGroups.forEach((metrics, intent) => {
      const responseTimes = metrics.map((m) => m.totalResponseTime);
      const cacheHits = metrics.filter((m) => m.hasClientContext).length;

      intentPerformance[intent] = {
        averageResponseTime: this.calculateAverage(responseTimes),
        totalRequests: metrics.length,
        cacheHitRate: (cacheHits / metrics.length) * 100,
      };
    });

    return intentPerformance;
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(hours: number) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = [];
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate percentile of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * numbers.length) - 1;
    return numbers[Math.max(0, index)];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
