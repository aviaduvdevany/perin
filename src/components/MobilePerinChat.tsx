"use client";

import { useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PerinAvatar from "./ui/PerinAvatar";
import UnifiedIntegrationManager from "./ui/UnifiedIntegrationManager";
import { PerinLoading } from "./ui/PerinLoading";
import { Glass } from "./ui/Glass";
import { Menu } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { Navbar } from "./ui/Navbar";

interface MobilePerinChatProps {
  onOpenMenu?: () => void;
  className?: string;
}

export const MobilePerinChat = forwardRef<
  { handleSendMessage: (message: string) => void; isChatLoading: boolean },
  MobilePerinChatProps
>(({ onOpenMenu, className = "" }, ref) => {
  const {
    session,
    messages,
    streamingMessage,
    perinStatus,
    isChatLoading,
    chatError,
    messagesEndRef,
    handleSendMessage,
  } = useChat();

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handleSendMessage,
    isChatLoading,
  }));

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--accent-primary)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-primary">
            <svg
              className="w-8 h-8 text-[var(--accent-primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="text-[var(--foreground-muted)]">
            Please sign in to chat with Perin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-[var(--background-primary)] relative ${className}`}
    >

      {/* Messages Container */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + 120px)",
        }}
      >
        <AnimatePresence>
          {messages.length === 0 && !isChatLoading && (
            <motion.div
              className="flex flex-col items-center justify-center text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <PerinAvatar size="lg" />
              </motion.div>
              <h2 className="text-xl font-semibold text-[var(--cta-text)] mb-3">
                Ready to help
              </h2>
              <p className="text-sm text-[var(--foreground-muted)]/80 max-w-sm">
                Ask me anything about scheduling, coordination, or assistance
              </p>
            </motion.div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={`${message.id}-${message.role}-${index}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {message.role === "user" ? (
                <motion.div
                  className="max-w-[85%] px-4 py-3 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </motion.div>
              ) : (
                <Glass
                  variant="default"
                  border={true}
                  glow={false}
                  className="max-w-[85%] px-4 py-3 text-[var(--cta-text)] shadow-sm"
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </Glass>
              )}
            </motion.div>
          ))}

          {/* Inline reconnect UI when Perin asks for Gmail reauth */}
          {messages.some((m) =>
            m.content.includes("needs a quick reconnect")
          ) && (
            <div className="flex justify-start">
              <Glass
                variant="default"
                border={true}
                glow={false}
                className="max-w-[85%] px-4 py-3 text-[var(--cta-text)] shadow-sm w-full"
              >
                <UnifiedIntegrationManager
                  className="mt-2"
                  showOnlyConnectable={true}
                />
              </Glass>
            </div>
          )}

          {isChatLoading && !streamingMessage && (
            <motion.div
              className="flex justify-center w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PerinLoading status={perinStatus} className="max-w-md" />
            </motion.div>
          )}

          {streamingMessage && (
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Glass
                variant="default"
                border={true}
                glow={false}
                className="max-w-[85%] px-4 py-3 text-[var(--cta-text)] shadow-sm"
              >
                <motion.div
                  animate={{ scale: [1, 1.01, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {streamingMessage}
                    <motion.span
                      className="inline-block w-2 h-4 bg-[var(--accent-primary)] ml-1"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </p>
                </motion.div>
              </Glass>
            </motion.div>
          )}

          {chatError && (
            <div className="flex justify-center">
              <div className="max-w-[85%] px-4 py-3 rounded-2xl status-error">
                <p className="text-sm">Error: {chatError}</p>
              </div>
            </div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

MobilePerinChat.displayName = "MobilePerinChat";
