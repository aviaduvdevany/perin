"use client";

import { AnimatePresence, motion } from "framer-motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 bg-[var(--background-primary)] border-t border-[var(--card-border)] rounded-t-2xl p-4 max-h-[78vh] overflow-y-auto"
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-1.5 w-10 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 -top-2" />
              <h3 className="text-sm font-semibold text-[var(--cta-text)]">
                {title}
              </h3>
              <button
                className="text-xs text-[var(--foreground-muted)]"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
