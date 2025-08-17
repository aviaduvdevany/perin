"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  closeButtonText?: string;
  className?: string;
}

export default function BaseModal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeButtonText = "Close",
  className = "",
}: BaseModalProps) {
  const sizeClasses = {
    sm: "w-[min(420px,92vw)]",
    md: "w-[min(640px,92vw)]",
    lg: "w-[min(960px,92vw)]",
    xl: "w-[min(1200px,92vw)]",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close modal"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className={`relative ${sizeClasses[size]} max-h-[86vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--background-primary)] p-6 shadow-2xl ${className}`}
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: "tween", duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? "modal-description" : undefined}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2
                  id="modal-title"
                  className="text-xl font-semibold text-[var(--foreground-primary)]"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id="modal-description"
                    className="text-sm text-[var(--foreground-muted)] mt-2"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  className="ml-4 text-sm text-[var(--foreground-muted)] hover:text-[var(--cta-text)] transition-colors px-2 py-1 rounded-md hover:bg-white/5"
                  onClick={onClose}
                >
                  {closeButtonText}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="space-y-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
