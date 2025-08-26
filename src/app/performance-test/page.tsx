"use client";

import React, { useState } from "react";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { SmartLoadingIndicator } from "@/components/performance/SmartLoadingIndicator";
import { useUserData } from "@/components/providers/UserDataProvider";
import { usePerformance } from "@/hooks/usePerformance";
import { Glass } from "@/components/ui/Glass";

export default function PerformanceTestPage() {
  const { state, actions } = useUserData();
  const { clearOldMetrics, reset } = usePerformance();
  const [testPhase, setTestPhase] = useState<string>("understanding");

  const handleRefreshCalendar = async () => {
    await actions.refreshCalendarContext();
  };

  const handleRefreshMemory = async () => {
    await actions.refreshMemoryContext();
  };

  const handleInvalidateCalendar = () => {
    actions.invalidateCalendarCache();
  };

  const handleInvalidateMemory = () => {
    actions.invalidateMemoryCache();
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--background)]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--cta-text)] mb-2">
            Performance Optimization Test
          </h1>
          <p className="text-[var(--foreground-muted)]">
            Test and monitor the performance optimization features
          </p>
        </div>

        {/* Performance Dashboard */}
        <PerformanceDashboard />

        {/* Test Controls */}
        <Glass variant="default" border={true} glow={false} className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--cta-text)]">
            Test Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Cache Management</h3>
              <div className="space-y-2">
                <button
                  onClick={handleRefreshCalendar}
                  className="w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Refresh Calendar Context
                </button>
                <button
                  onClick={handleRefreshMemory}
                  className="w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Refresh Memory Context
                </button>
                <button
                  onClick={handleInvalidateCalendar}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Invalidate Calendar Cache
                </button>
                <button
                  onClick={handleInvalidateMemory}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Invalidate Memory Cache
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Performance Management</h3>
              <div className="space-y-2">
                <button
                  onClick={() => clearOldMetrics(24)}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Clear Old Metrics (24h)
                </button>
                <button
                  onClick={reset}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Reset All Metrics
                </button>
              </div>
            </div>
          </div>
        </Glass>

        {/* Loading State Test */}
        <Glass variant="default" border={true} glow={false} className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--cta-text)]">
            Loading State Test
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Phase:
              </label>
              <select
                value={testPhase}
                onChange={(e) => setTestPhase(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg bg-[var(--card-background)] text-[var(--foreground)]"
              >
                <option value="understanding">Understanding</option>
                <option value="context">Context Loading</option>
                <option value="processing">Processing</option>
                <option value="responding">Responding</option>
              </select>
            </div>

            <div className="max-w-md">
              <SmartLoadingIndicator
                context={{
                  calendar: state.calendar,
                  memory: state.memory,
                  integrations: state.integrationContexts,
                }}
                phase={testPhase}
              />
            </div>
          </div>
        </Glass>

        {/* Context Status */}
        <Glass variant="default" border={true} glow={false} className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--cta-text)]">
            Context Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-2">Calendar Context</h3>
              <div className="text-sm space-y-1">
                <div>Events: {state.calendar.events.length}</div>
                <div>Next Event: {state.calendar.nextEvent ? "Yes" : "No"}</div>
                <div>
                  Last Updated:{" "}
                  {new Date(state.calendar.lastUpdated).toLocaleTimeString()}
                </div>
                <div>Loading: {state.loading.calendar ? "Yes" : "No"}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Memory Context</h3>
              <div className="text-sm space-y-1">
                <div>Semantic Memories: {state.memory.semantic.length}</div>
                <div>
                  Preferences: {Object.keys(state.memory.preferences).length}
                </div>
                <div>
                  Last Updated:{" "}
                  {new Date(state.memory.lastUpdated).toLocaleTimeString()}
                </div>
                <div>Loading: {state.loading.memory ? "Yes" : "No"}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Integration Contexts</h3>
              <div className="text-sm space-y-1">
                <div>
                  Contexts:{" "}
                  {Object.keys(state.integrationContexts.contexts).length}
                </div>
                <div>
                  Last Updated:{" "}
                  {new Date(
                    state.integrationContexts.lastUpdated
                  ).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}
