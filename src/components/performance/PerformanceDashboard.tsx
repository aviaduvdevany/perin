"use client";

import React from "react";
import { usePerformance } from "@/hooks/usePerformance";
import { Glass } from "../ui/Glass";

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = "",
}) => {
  const { analytics, cachePerformance, intentPerformance } = usePerformance();

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className={`performance-dashboard ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-[var(--cta-text)]">
        Performance Analytics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Response Time Metrics */}
        <Glass variant="default" border={true} glow={false} className="p-4">
          <h4 className="font-medium text-sm text-[var(--foreground-muted)] mb-2">
            Response Times
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs">Average:</span>
              <span className="text-xs font-medium">
                {formatTime(analytics.averageResponseTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">P95:</span>
              <span className="text-xs font-medium">
                {formatTime(analytics.p95ResponseTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Total Requests:</span>
              <span className="text-xs font-medium">
                {analytics.totalRequests}
              </span>
            </div>
          </div>
        </Glass>

        {/* Cache Performance */}
        <Glass variant="default" border={true} glow={false} className="p-4">
          <h4 className="font-medium text-sm text-[var(--foreground-muted)] mb-2">
            Cache Performance
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs">Hit Rate:</span>
              <span className="text-xs font-medium">
                {formatPercentage(cachePerformance.cacheHitRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">With Cache:</span>
              <span className="text-xs font-medium">
                {formatTime(cachePerformance.averageTimeWithCache)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Without Cache:</span>
              <span className="text-xs font-medium">
                {formatTime(cachePerformance.averageTimeWithoutCache)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Improvement:</span>
              <span className="text-xs font-medium text-green-500">
                {formatPercentage(cachePerformance.improvement)}
              </span>
            </div>
          </div>
        </Glass>

        {/* Error Rate */}
        <Glass variant="default" border={true} glow={false} className="p-4">
          <h4 className="font-medium text-sm text-[var(--foreground-muted)] mb-2">
            System Health
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs">Error Rate:</span>
              <span className="text-xs font-medium">
                {formatPercentage(analytics.errorRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs">Cache Hit Rate:</span>
              <span className="text-xs font-medium">
                {formatPercentage(analytics.cacheHitRate)}
              </span>
            </div>
          </div>
        </Glass>
      </div>

      {/* Intent Performance */}
      {Object.keys(intentPerformance).length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-sm text-[var(--foreground-muted)] mb-3">
            Intent Performance
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(intentPerformance).map(([intent, metrics]) => (
              <Glass
                key={intent}
                variant="default"
                border={true}
                glow={false}
                className="p-3"
              >
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium capitalize">
                      {intent}
                    </span>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {metrics.totalRequests} req
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Avg Time:</span>
                    <span className="text-xs font-medium">
                      {formatTime(metrics.averageResponseTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Cache Hit:</span>
                    <span className="text-xs font-medium">
                      {formatPercentage(metrics.cacheHitRate)}
                    </span>
                  </div>
                </div>
              </Glass>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .performance-dashboard {
          padding: 1rem;
          border-radius: 0.75rem;
          background: var(--card-background);
          border: 1px solid var(--card-border);
        }
      `}</style>
    </div>
  );
};
