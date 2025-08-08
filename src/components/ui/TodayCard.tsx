"use client";

import { motion } from "framer-motion";

interface TodayCardProps {
  className?: string;
}

export default function TodayCard({ className = "" }: TodayCardProps) {
  // Placeholder content; in a later edit we can fetch calendar data via services
  const nextEvent = {
    title: "Standup with team",
    time: "09:30 – 09:45",
    location: "Zoom",
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <motion.div
        className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs text-[var(--foreground-muted)] mb-2">
          Next event
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 flex items-center justify-center text-[var(--accent-primary)]">
            📅
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--cta-text)] truncate">
              {nextEvent.title}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] truncate">
              {nextEvent.time} · {nextEvent.location}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <p className="text-xs text-[var(--foreground-muted)]">
            You have a 2‑hour focus window this afternoon
          </p>
        </div>
      </motion.div>
    </div>
  );
}
