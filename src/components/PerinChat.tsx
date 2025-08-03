"use client";

import { useState, useRef, useEffect } from "react";
import { usePerinAI } from "../hooks/usePerinAI";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import PerinAvatar from "./ui/PerinAvatar";
import { FloatingInput } from "./ui/FloatingInput";
import { PerinLoading } from "./ui/PerinLoading";
import type { ChatMessage } from "../types";

export function PerinChat() {
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
          fullResponse += chunk;
          setStreamingMessage(fullResponse);
        }

        // Add the complete assistant message
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

      // Add error message to chat
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
          <div className="w-16 h-16 bg-[var(--primary)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[var(--primary)]"
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
    <div className="flex flex-col h-[calc(100vh-66px)] overflow-hidden max-w-4xl mx-auto">
      {/* Minimal Header - Only visible when there are messages */}
      {messages.length > 0 && (
        <div className="flex items-center p-4 border-b border-[var(--card-border)] bg-[var(--card-background)]/50 backdrop-blur-sm">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)] text-sm">
              Perin
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              AI Assistant
            </p>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Messages - Full screen area */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
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
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              Ready to help
            </h2>
            <p className="text-sm text-[var(--foreground-muted)]/70">
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
            <motion.div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.role === "user"
                  ? "bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-lg"
                  : "bg-[var(--card-background)]/60 backdrop-blur-sm border border-[var(--card-border)]/30 text-[var(--foreground)] shadow-sm"
              }`}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </motion.div>
          </motion.div>
        ))}

        {/* Immersive Loading State */}
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

        {/* Streaming message with enhanced styling */}
        {streamingMessage && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-[var(--card-background)]/60 backdrop-blur-sm border border-[var(--card-border)]/30 text-[var(--foreground)] shadow-sm"
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {streamingMessage}
                <motion.span
                  className="inline-block w-2 h-4 bg-[var(--primary)] ml-1"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </p>
            </motion.div>
          </motion.div>
        )}

        {chatError && (
          <div className="flex justify-center">
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl status-error">
              <p className="text-sm">Error: {chatError}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Component */}
      <FloatingInput
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
        placeholder="Type your message..."
        disabled={false}
      />
    </div>
  );
}
