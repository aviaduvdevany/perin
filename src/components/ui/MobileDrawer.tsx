"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { X } from "lucide-react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "left" | "right" | "bottom";
  size?: "sm" | "md" | "lg" | "full";
}

export default function MobileDrawer({
  open,
  onClose,
  title,
  children,
  position = "bottom",
  size = "md",
}: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const getPositionClasses = () => {
    switch (position) {
      case "left":
        return "left-0 top-0 h-full";
      case "right":
        return "right-0 top-0 h-full";
      case "bottom":
      default:
        return "left-0 right-0 bottom-0";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return position === "bottom" ? "h-1/3" : "w-80";
      case "md":
        return position === "bottom" ? "h-2/3" : "w-96";
      case "lg":
        return position === "bottom" ? "h-4/5" : "w-[28rem]";
      case "full":
        return position === "bottom" ? "h-full" : "w-full";
      default:
        return position === "bottom" ? "h-2/3" : "w-96";
    }
  };

  const getInitialPosition = () => {
    switch (position) {
      case "left":
        return { x: -400, opacity: 0 };
      case "right":
        return { x: 400, opacity: 0 };
      case "bottom":
      default:
        return { y: 400, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (position) {
      case "left":
      case "right":
        return { x: 0, opacity: 1 };
      case "bottom":
      default:
        return { y: 0, opacity: 1 };
    }
  };

  const getExitPosition = () => {
    switch (position) {
      case "left":
        return { x: -400, opacity: 0 };
      case "right":
        return { x: 400, opacity: 0 };
      case "bottom":
      default:
        return { y: 400, opacity: 0 };
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Drawer */}
          <motion.div
            className={`absolute ${getPositionClasses()} ${getSizeClasses()} bg-[var(--background-primary)] border border-[var(--card-border)] shadow-2xl`}
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 5%, transparent), color-mix(in oklab, var(--accent-secondary) 5%, transparent))",
            }}
            initial={getInitialPosition()}
            animate={getAnimatePosition()}
            exit={getExitPosition()}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
                <h3 className="text-lg font-semibold text-[var(--cta-text)]">
                  {title}
                </h3>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 border border-[var(--card-border)] text-[var(--foreground-muted)] hover:text-[var(--cta-text)] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {/* Content */}
            <div className="h-full overflow-y-auto">{children}</div>

            {/* Handle for bottom drawer */}
            {position === "bottom" && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
