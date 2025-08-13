"use client";

import { useState, useRef, useEffect } from "react";
import { usePerinAI } from "../hooks/usePerinAI";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import PerinAvatar from "./ui/PerinAvatar";
import { FloatingInput } from "./ui/FloatingInput";
import UnifiedIntegrationManager from "./ui/UnifiedIntegrationManager";
import { PerinLoading } from "./ui/PerinLoading";
import { Glass } from "./ui/Glass";
import type { ChatMessage } from "../types";
import { useChatUI } from "@/components/providers/ChatUIProvider";

export function PerinChat() {
  const { data: session } = useSession();
  const { sendMessage, isChatLoading, chatError } = usePerinAI();
  const { collapseTodayAfterFirstMessage } = useChatUI();

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

    const isFirstUserMessage = messages.length === 0;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreamingMessage("");
    setPerinStatus("thinking");

    if (isFirstUserMessage) {
      collapseTodayAfterFirstMessage();
    }

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
            // Show a one-tap reconnect inline message instead of a vague error
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
                    "Your Gmail session needs a quick reconnect to continue. Click Reconnect to proceed.",
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
                    "Your calendar session needs a quick reconnect to continue. Click Reconnect to proceed.",
                },
              ];
            });
          } else {
            fullResponse += chunk;
            setStreamingMessage(fullResponse);
          }
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          role: "assistant",
          content: fullResponse,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage("");
        setPerinStatus("idle");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setPerinStatus("idle");

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

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
    <div className="relative flex flex-col h-[calc(100vh-66px)] overflow-hidden max-w-4xl mx-auto px-0">
      {messages.length > 0 && (
        <div
          className="flex items-center p-4 border-b border-[var(--card-border)] rounded-2xl mb-2"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--accent-secondary) 12%, transparent), transparent)",
          }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center mr-3 glow-primary">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--cta-text)] text-sm">
              Perin
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              AI Assistant
            </p>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 status-online rounded-full animate-pulse-subtle" />
          </div>
        </div>
      )}

      {/* Scroll only inside messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32 space-y-4 scrollbar-ultra-thin">
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
                className="max-w-[85%] lg:max-w-md px-4 py-3 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg glow-primary"
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
                className="max-w-[85%] lg:max-w-md px-4 py-3 text-[var(--cta-text)] shadow-sm"
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
              className="max-w-[85%] lg:max-w-md px-4 py-3 text-[var(--cta-text)] shadow-sm w-full"
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
