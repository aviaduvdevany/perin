"use client";

import { motion } from "framer-motion";
import { PerinChat } from "../../components/PerinChat";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Minimal Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card-background)]/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <motion.div
                className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-white font-bold text-sm">P</span>
              </motion.div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--foreground)]">
                  Perin Demo
                </h1>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Minimalist AI Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-[var(--foreground-muted)]">
                Demo Mode
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Screen Chat */}
      <main className="flex-1">
        <motion.div
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <PerinChat />
        </motion.div>
      </main>
    </div>
  );
}
