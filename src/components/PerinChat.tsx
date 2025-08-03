"use client";

import { useState, useRef, useEffect } from "react";
import { usePerinAI } from "../hooks/usePerinAI";
import { useSession } from "next-auth/react";
import type { ChatMessage } from "../types";

export function PerinChat() {
  const { data: session } = useSession();
  const { sendMessage, isChatLoading, chatError } = usePerinAI();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setStreamingMessage("");

    try {
      const stream = await sendMessage({
        messages: [...messages, userMessage],
        specialization: undefined,
      });

      if (stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          setStreamingMessage((prev) => prev + chunk);
        }

        // Add the complete assistant message
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: streamingMessage,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
    <div className="flex flex-col h-[600px] bg-[var(--card-background-light)] rounded-2xl border border-[var(--card-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-[var(--card-border)] bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center mr-3">
          <span className="text-white font-bold text-sm">
            {session.user?.name?.[0] || "P"}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-[var(--foreground)]">Perin</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Your AI Assistant
          </p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <div className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse"></div>
          <span className="text-xs text-[var(--foreground-muted)]">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-[var(--foreground-muted)] py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-[var(--primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold mb-2">
              Start a conversation with Perin!
            </p>
            <p className="text-sm">
              Try asking about scheduling, coordination, or general assistance.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.role === "user"
                  ? "bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white"
                  : "bg-[var(--card-background-light)] border border-[var(--card-border)] text-[var(--foreground)]"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-[var(--card-background-light)] border border-[var(--card-border)] text-[var(--foreground)]">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {streamingMessage}
                <span className="inline-block w-2 h-4 bg-[var(--primary)] ml-1 animate-pulse"></span>
              </p>
            </div>
          </div>
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

      {/* Input */}
      <div className="p-4 border-t border-[var(--card-border)] bg-[var(--card-background-light)]/20">
        <div className="flex space-x-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="input-field flex-1 p-3 resize-none"
            rows={1}
            disabled={isChatLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isChatLoading}
            className="px-6 py-3 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center justify-center min-w-[60px]"
          >
            {isChatLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
