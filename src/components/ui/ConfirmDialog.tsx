"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={onCancel}
          />
          <motion.div
            className="relative w-[min(420px,92vw)] rounded-2xl border border-[var(--card-border)] bg-[var(--background-primary)] p-5 shadow-2xl"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: "tween", duration: 0.22 }}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold mb-2">{title}</h3>
            {description && (
              <p className="text-sm text-[var(--foreground-muted)] mb-4">
                {description}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-md border border-[var(--card-border)] text-sm"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Removing..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
