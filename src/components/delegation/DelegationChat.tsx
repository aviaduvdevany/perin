"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/Glass";
import { sendDelegationChatStreamingService } from "@/app/(main-app)/services/delegation";
import { useMultiStepParser } from "@/hooks/useMultiStepParser";
import { MultiStepMessage } from "@/components/ui/MultiStepMessage";
import type { DelegationSession } from "@/types/delegation";
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
import { Logo } from "../ui/Logo";
import { Input } from "../ui/input";

// Helper function to detect Hebrew text
const isHebrewText = (text: string): boolean => {
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

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
  isMultiStep?: boolean;
  isSeparateMessage?: boolean;
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
  const [userTimezone, setUserTimezone] = useState<string>("UTC");
  const [isInputRTL, setIsInputRTL] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [
    currentSessionInitiatedMultiStep,
    setCurrentSessionInitiatedMultiStep,
  ] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI now determines multi-step need, no keyword matching required

  // Multi-step parsing hook
  const { multiStepState, parseControlTokens, resetMultiStepState } =
    useMultiStepParser();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Detect user's timezone
  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(timezone);
      console.log("🌍 Delegation Chat - Detected user timezone:", {
        timezone,
        userAgent: navigator.userAgent?.substring(0, 100),
        platform: navigator.platform,
        language: navigator.language,
      });
    } catch (err) {
      console.warn("Could not detect timezone, using UTC", err);
      setUserTimezone("UTC");
    }
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

  const MeetingTypeIcon = getMeetingTypeIcon(session.constraints?.meetingType);

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
    setStreamingMessage("");

    // Always reset multi-step state for new conversations (AI will determine if multi-step is needed)
    resetMultiStepState();
    setCurrentSessionInitiatedMultiStep(false);

    try {
      // Get signature from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const signature = urlParams.get("sig");

      // Build conversation history for context
      const conversationHistory = messages
        .map((msg) => `${msg.fromExternal ? "User" : "Perin"}: ${msg.content}`)
        .join("\n");

      const requestData = {
        delegationId,
        message: userMessage.content,
        conversationHistory,
        externalUserName: externalUserName || undefined,
        signature: signature || undefined,
        timezone: userTimezone,
      };

      console.log("📤 Delegation Chat - Sending request with timezone:", {
        timezone: userTimezone,
        message: userMessage.content,
        delegationId,
      });

      // Use streaming service
      const stream = await sendDelegationChatStreamingService(requestData);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let fullResponse = "";
      let hasMultiStep = false;
      let aiInitiatedMultiStep = false;
      const separateMessages: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Parse control tokens and get clean content with emotional context
        const { cleanContent, hasControlTokens, emotionalContext } =
          parseControlTokens(chunk);

        // Check if this chunk contains the AI initiation token
        if (chunk.includes("[[PERIN_MULTI_STEP:initiated:")) {
          aiInitiatedMultiStep = true;
          setCurrentSessionInitiatedMultiStep(true);
        }

        // Check if this chunk contains a separate message token
        if (chunk.includes("[[PERIN_SEPARATE_MESSAGE:")) {
          const match = chunk.match(/\[\[PERIN_SEPARATE_MESSAGE:([^\]]+)\]\]/);
          if (match) {
            separateMessages.push(match[1]);
          }
        }

        if (hasControlTokens) {
          if (aiInitiatedMultiStep) {
            hasMultiStep = true;

            // Provide haptic feedback for mobile users based on emotional context
            if (
              emotionalContext?.sentiment === "positive" &&
              navigator.vibrate
            ) {
              navigator.vibrate([50, 100, 50]); // Success pattern
            } else if (
              emotionalContext?.sentiment === "negative" &&
              navigator.vibrate
            ) {
              navigator.vibrate([100, 50, 100, 50, 100]); // Error pattern
            }
          }
        }

        if (cleanContent) {
          fullResponse += cleanContent;
          setStreamingMessage(fullResponse);
        }
      }

      // Update AI message with final response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessage.id
            ? {
                ...msg,
                content: fullResponse,
                isLoading: false,
                isMultiStep: hasMultiStep && aiInitiatedMultiStep,
              }
            : msg
        )
      );

      // Add separate messages as individual chat messages
      if (separateMessages.length > 0) {
        setMessages((prev) => [
          ...prev,
          ...separateMessages.map((message, index) => ({
            id: `separate-${Date.now()}-${index}`,
            content: message,
            fromExternal: false,
            timestamp: new Date(),
            isSeparateMessage: true,
          })),
        ]);
      }

      setStreamingMessage("");
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
          <Logo size="md" showText={false} animated={false} />
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

        {/* Meeting Preferences - Only show if constraints are set */}
        {session.constraints && Object.keys(session.constraints).length > 0 && (
          <div className="mt-4 p-3 bg-[var(--background-secondary)]/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] mb-2">
              <MeetingTypeIcon className="w-4 h-4" />
              <span>Meeting Preferences</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {session.constraints?.durationMinutes && (
                <div>
                  <span className="text-[var(--foreground-muted)]">
                    Duration:{" "}
                  </span>
                  <span className="text-[var(--cta-text)]">
                    {session.constraints.durationMinutes} minutes
                  </span>
                </div>
              )}
              {session.constraints.meetingType && (
                <div>
                  <span className="text-[var(--foreground-muted)]">Type: </span>
                  <span className="text-[var(--cta-text)] capitalize">
                    {session.constraints.meetingType.replace("_", " ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Glass>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 ">
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
                <div
                  className={`p-3
                    rounded-2xl
                    shadow-lg
                    glow-primary
                    ${
                      message.fromExternal
                        ? "bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white"
                        : "bg-[var(--background-secondary)]/50 "
                    }`}
                >
                  {message.isLoading ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-[var(--foreground-muted)]">
                          Perin is thinking...
                        </span>
                      </div>

                      {/* Show multi-step progress during loading */}
                      {multiStepState.isMultiStep &&
                        currentSessionInitiatedMultiStep && (
                          <MultiStepMessage
                            steps={multiStepState.steps}
                            currentStepIndex={multiStepState.currentStepIndex}
                            status={multiStepState.status}
                            progressMessages={multiStepState.progressMessages}
                            className="mt-4"
                            showTimings={false}
                          />
                        )}

                      {/* Show streaming content */}
                      {streamingMessage && (
                        <div className="mt-2 p-2 bg-[var(--background-primary)]/50 rounded text-xs">
                          <p
                            className={`text-[var(--foreground-muted)] ${
                              isHebrewText(streamingMessage)
                                ? "text-right"
                                : "text-left"
                            }`}
                            style={{
                              direction: isHebrewText(streamingMessage)
                                ? "rtl"
                                : "ltr",
                            }}
                          >
                            {streamingMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 ">
                      {/* Show final multi-step summary if it was a multi-step message and not a separate message */}
                      {message.isMultiStep &&
                        !message.isSeparateMessage &&
                        multiStepState.isMultiStep &&
                        currentSessionInitiatedMultiStep && (
                          <MultiStepMessage
                            steps={multiStepState.steps}
                            currentStepIndex={multiStepState.currentStepIndex}
                            status={multiStepState.status}
                            progressMessages={multiStepState.progressMessages}
                            showTimings={true}
                            className="mb-4"
                          />
                        )}

                      {/* Regular message content */}
                      {message.content && (
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            isHebrewText(message.content)
                              ? "text-right"
                              : "text-left"
                          }`}
                          style={{
                            direction: isHebrewText(message.content)
                              ? "rtl"
                              : "ltr",
                          }}
                        >
                          {message.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs mt-1 text-center">
                  {formatTime(message.timestamp)}
                </p>
              </div>
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
          <Input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => {
              const value = e.target.value;
              setInputMessage(value);
              setIsInputRTL(isHebrewText(value));
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              isInputRTL ? "הקלד את ההודעה שלך..." : "Type your message..."
            }
            disabled={isLoading}
            className={`flex-1 px-3 py-2 bg-[var(--background-secondary)]/50 border border-[var(--card-border)] rounded-lg text-[var(--cta-text)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50 ${
              isInputRTL ? "text-right" : "text-left"
            }`}
            style={{
              direction: isInputRTL ? "rtl" : "ltr",
            }}
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

export const noLayout = true;
