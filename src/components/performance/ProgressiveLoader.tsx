"use client";

import React from "react";
import { motion } from "framer-motion";

export interface LoadingState {
  phase: "understanding" | "context" | "processing" | "responding";
  progress: number;
  estimatedTime: number;
  message: string;
}

interface ProgressiveLoaderProps {
  state: LoadingState;
  className?: string;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  state,
  className = "",
}) => {
  const phases = {
    understanding: { icon: "🧠", color: "blue", label: "Understanding" },
    context: { icon: "🔗", color: "green", label: "Loading Context" },
    processing: { icon: "⚡", color: "yellow", label: "Processing" },
    responding: { icon: "💬", color: "purple", label: "Responding" },
  };

  const currentPhase = phases[state.phase];

  return (
    <div className={`progressive-loader ${className}`}>
      <div className="phase-indicator">
        <div className="phase-header">
          <motion.span
            className={`phase-icon ${currentPhase.color}`}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {currentPhase.icon}
          </motion.span>
          <span className="phase-label">{currentPhase.label}</span>
        </div>

        <div className="progress-container">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                background: `linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))`,
              }}
            />
            <motion.div
              className="progress-shimmer"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div className="progress-details">
            <span className="progress-text">{state.message}</span>
            {state.estimatedTime > 0 && (
              <span className="eta">~{state.estimatedTime}s remaining</span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .progressive-loader {
          padding: 1rem;
          border-radius: 0.75rem;
          background: var(--card-background);
          border: 1px solid var(--card-border);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .phase-indicator {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .phase-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .phase-icon {
          font-size: 1.25rem;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          background: var(--accent-primary);
          color: white;
        }

        .phase-icon.blue {
          background: #3b82f6;
        }

        .phase-icon.green {
          background: #10b981;
        }

        .phase-icon.yellow {
          background: #f59e0b;
        }

        .phase-icon.purple {
          background: #8b5cf6;
        }

        .phase-label {
          font-weight: 600;
          color: var(--cta-text);
          font-size: 0.875rem;
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .progress-bar {
          width: 100%;
          height: 0.5rem;
          background: var(--card-border);
          border-radius: 0.25rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 0.25rem;
          transition: width 0.3s ease;
        }

        .progress-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .progress-text {
          color: var(--foreground-muted);
          flex: 1;
        }

        .eta {
          color: var(--accent-primary);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
