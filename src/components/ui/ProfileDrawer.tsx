"use client";

import { AnimatePresence, motion } from "framer-motion";
import ProfileSummary from "./ProfileSummary";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close profile"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            className="absolute top-0 left-0 h-full w-[320px] bg-[var(--background-primary)] border-r border-[var(--card-border)] p-4 overflow-y-auto"
            initial={{ x: -340 }}
            animate={{ x: 0 }}
            exit={{ x: -340 }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--cta-text)]">
                Profile
              </h3>
              <button
                onClick={onClose}
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--cta-text)]"
              >
                Close
              </button>
            </div>
            <ProfileSummary />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
