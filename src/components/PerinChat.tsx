"use client";

import { motion } from "framer-motion";
import PerinAvatar from "./ui/PerinAvatar";
import { FloatingInput } from "./ui/FloatingInput";
import { PerinLoading } from "./ui/PerinLoading";
import { Glass } from "./ui/Glass";
import { IntegrationReauthHandler } from "./integrations/IntegrationReauthHandler";
import { useChat } from "../hooks/useChat";

export function PerinChat() {
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
    <div className="relative flex flex-col h-full overflow-hidden chat-container">
      {/* Scroll only inside messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32 space-y-4 scrollbar-ultra-thin ">
        {messages.length === 0 && (
          <div className="text-center text-[var(--foreground-muted)] py-20">
            <div className="mb-8">
              <PerinAvatar
                name="Perin"
                status={perinStatus}
                personality="friendly"
                size="lg"
                className="mx-auto"
              />
            </div>
            <h2 className="heading-sm text-[var(--cta-text)] mb-3">
              Ready to help
            </h2>
            <p className="body-sm text-[var(--foreground-muted)]/80">
              Ask me anything about scheduling, coordination, or assistance
            </p>
          </div>
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
                className="max-w-[85%] lg:max-w-lg px-4 py-3 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg glow-primary"
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
                className="max-w-[85%] lg:max-w-lg px-4 py-3 text-[var(--cta-text)] shadow-sm"
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </Glass>
            )}
          </motion.div>
        ))}

        {/* Beautiful reauth prompts for integration issues */}
        <IntegrationReauthHandler
          messages={messages.map((msg) => ({
            content: msg.content,
            role: msg.role,
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          }))}
        />

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
              className="max-w-[85%] lg:max-w-md px-4 py-3 text-[var(--cta-text)] shadow-sm"
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
            <div className="max-w-[85%] lg:max-w-md px-4 py-3 rounded-2xl status-error">
              <p className="text-sm">Error: {chatError}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <FloatingInput
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
        placeholder="Type your message..."
        disabled={false}
      />
    </div>
  );
}
