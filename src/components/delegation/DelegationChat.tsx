"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/Glass";
import PerinAvatar from "@/components/ui/PerinAvatar";
import { sendDelegationChatService } from "@/app/services/delegation";
import type { DelegationSession, DelegationMessage } from "@/types/delegation";
import {
  Send,
  Clock,
  Calendar,
  Video,
  Phone,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface DelegationChatProps {
  delegationId: string;
  externalUserName?: string;
  session: DelegationSession;
}

interface ChatMessage {
  id: string;
  content: string;
  fromExternal: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

export default function DelegationChat({
  delegationId,
  externalUserName,
  session,
}: DelegationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getMeetingTypeIcon = (type?: string) => {
    switch (type) {
      case "video":
        return Video;
      case "phone":
        return Phone;
      case "in_person":
        return MapPin;
      default:
        return Calendar;
    }
  };

  const MeetingTypeIcon = getMeetingTypeIcon(session.constraints.meetingType);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      fromExternal: true,
      timestamp: new Date(),
    };

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      content: "",
      fromExternal: false,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendDelegationChatService({
        delegationId,
        message: userMessage.content,
        externalUserName,
      });

      // Update AI message with response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessage.id
            ? { ...msg, content: response.response, isLoading: false }
            : msg
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");

      // Update AI message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessage.id
            ? {
                ...msg,
                content:
                  "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background-primary)]">
      {/* Header */}
      <Glass
        variant="default"
        border={true}
        glow={true}
        className="p-4 border-b border-[var(--card-border)]"
      >
        <div className="flex items-center gap-4">
          <PerinAvatar size="md" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-[var(--cta-text)]">
              Talk to Perin
            </h1>
            <p className="text-sm text-[var(--foreground-muted)]">
              AI-powered scheduling assistant
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
            <Clock className="w-3 h-3" />
            <span>Expires {session.ttlExpiresAt.toLocaleString()}</span>
          </div>
        </div>

        {/* Meeting Preferences */}
        <div className="mt-4 p-3 bg-[var(--background-secondary)]/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] mb-2">
            <MeetingTypeIcon className="w-4 h-4" />
            <span>Meeting Preferences</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--foreground-muted)]">Duration: </span>
              <span className="text-[var(--cta-text)]">
                {session.constraints.durationMinutes} minutes
              </span>
            </div>
            <div>
              <span className="text-[var(--foreground-muted)]">Type: </span>
              <span className="text-[var(--cta-text)] capitalize">
                {session.constraints.meetingType?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </Glass>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.fromExternal ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] ${
                  message.fromExternal ? "order-2" : "order-1"
                }`}
              >
                <Glass
                  variant="default"
                  border={true}
                  glow={false}
                  className={`p-3 ${
                    message.fromExternal
                      ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/30"
                      : "bg-[var(--background-secondary)]/50"
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-[var(--foreground-muted)]">
                        Perin is thinking...
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--cta-text)] whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </Glass>
                <p className="text-xs text-[var(--foreground-muted)] mt-1 text-center">
                  {formatTime(message.timestamp)}
                </p>
              </div>

              {!message.fromExternal && (
                <div className="order-2 ml-2">
                  <PerinAvatar size="sm" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 text-[var(--error)]" />
            <p className="text-sm text-[var(--error)]">{error}</p>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <Glass
        variant="default"
        border={true}
        glow={false}
        className="p-4 border-t border-[var(--card-border)]"
      >
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-[var(--background-secondary)]/50 border border-[var(--card-border)] rounded-lg text-[var(--cta-text)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-[var(--foreground-muted)] mt-2 text-center">
          This is an AI assistant. Your conversation will be shared with the
          delegation owner.
        </p>
      </Glass>
    </div>
  );
}
