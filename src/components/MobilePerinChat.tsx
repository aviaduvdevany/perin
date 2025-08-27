"use client";

import { useState, useRef, useEffect } from "react";
import { usePerinAI } from "../hooks/usePerinAI";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import PerinAvatar from "./ui/PerinAvatar";
import { FloatingInput } from "./ui/FloatingInput";
import UnifiedIntegrationManager from "./ui/UnifiedIntegrationManager";
import { PerinLoading } from "./ui/PerinLoading";
import { Glass } from "./ui/Glass";
import { Menu } from "lucide-react";
import type { ChatMessage } from "../types";

interface MobilePerinChatProps {
  onOpenMenu?: () => void;
  className?: string;
}

export function MobilePerinChat({
  onOpenMenu,
  className = "",
}: MobilePerinChatProps) {
  const { data: session } = useSession();
  const { sendMessage, isChatLoading, chatError } = usePerinAI();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [perinStatus, setPerinStatus] = useState<
    "idle" | "thinking" | "typing" | "listening"
  >("idle");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreamingMessage("");
    setPerinStatus("thinking");

    try {
      const currentMessages = [...messages, userMessage];
      const stream = await sendMessage({
        messages: currentMessages,
        specialization: undefined,
      });

      if (stream) {
        setPerinStatus("typing");
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let fullResponse = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          // Detect control tokens for seamless UI actions
          if (chunk.includes("[[PERIN_ACTION:gmail_reauth_required]]")) {
            setMessages((prev) => {
              const already = prev.some((m) =>
                m.content.includes("needs a quick reconnect")
              );
              if (already) return prev;
              return [
                ...prev,
                {
                  id: `system-${Date.now()}`,
                  role: "assistant",
                  content:
                    "Your Gmail session needs a quick reconnect to continue. Tap Reconnect to proceed.",
                },
              ];
            });
          } else if (
            chunk.includes("[[PERIN_ACTION:calendar_reauth_required]]")
          ) {
            setMessages((prev) => {
              const already = prev.some((m) =>
                m.content.includes("calendar session needs a quick reconnect")
              );
              if (already) return prev;
              return [
                ...prev,
                {
                  id: `system-${Date.now()}`,
                  role: "assistant",
                  content:
                    "Your calendar session needs a quick reconnect to continue. Tap Reconnect to proceed.",
                },
              ];
            });
          } else {
            fullResponse += chunk;
            setStreamingMessage(fullResponse);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            role: "assistant",
            content: fullResponse,
          },
        ]);
        setStreamingMessage("");
        setPerinStatus("idle");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setPerinStatus("idle");
    }
  };

  return (
    <div
      className={`h-full flex flex-col bg-[var(--background-primary)] relative ${className}`}
    >
      {/* Mobile Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--background-primary)]/80 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <PerinAvatar size="sm" />
            <div>
              <h1 className="text-lg font-semibold text-[var(--cta-text)]">
                Perin
              </h1>
              <p className="text-xs text-[var(--foreground-muted)]">
                {perinStatus === "idle" && "Ready to help"}
                {perinStatus === "thinking" && "Thinking..."}
                {perinStatus === "typing" && "Typing..."}
                {perinStatus === "listening" && "Listening..."}
              </p>
            </div>
          </div>
        </div>

        {onOpenMenu && (
          <motion.button
            onClick={onOpenMenu}
            className="p-2 rounded-xl bg-white/5 border border-[var(--card-border)] text-[var(--cta-text)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}
      </motion.div>

      {/* Messages Container */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          paddingBottom: "calc(8rem + env(safe-area-inset-bottom) + 80px)",
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
}
