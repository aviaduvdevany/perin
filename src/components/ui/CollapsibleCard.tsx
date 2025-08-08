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
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--cta-text)]"
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
