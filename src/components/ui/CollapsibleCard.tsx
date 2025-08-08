"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleCardProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
  className = "",
}: CollapsibleCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] ${className}`}
      style={{
        boxShadow:
          "0 8px 36px 0 color-mix(in oklab, var(--accent-primary) 12%, transparent)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--cta-text)] rounded-t-2xl"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 14%, transparent), transparent)",
        }}
      >
        <span>{title}</span>
        <span className="text-[var(--foreground-muted)]">
          {open ? "−" : "+"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="px-4 pb-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
