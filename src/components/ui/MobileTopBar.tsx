"use client";

import { motion } from "framer-motion";

interface MobileTopBarProps {
  onOpenProfile: () => void;
  className?: string;
}

export default function MobileTopBar({
  onOpenProfile,
  className = "",
}: MobileTopBarProps) {
  return (
    <motion.div
      className={`xl:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-[var(--background-primary)]/70 border-b border-[var(--card-border)] ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="px-4 py-2 flex items-center justify-between">
        <button
          onClick={onOpenProfile}
          className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-[var(--card-border)] text-[var(--cta-text)]"
        >
          👤 Profile
        </button>
        <div className="text-xs text-[var(--foreground-muted)]">Perin</div>
      </div>
    </motion.div>
  );
}
