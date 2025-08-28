"use client";

import { useState, useRef, useEffect } from "react";
import { usePerinAI } from "./usePerinAI";
import { useSession } from "next-auth/react";
import type { ChatMessage } from "../types";

export function useChat() {
  const { data: session } = useSession();
  const { sendMessage, isChatLoading, chatError } = usePerinAI();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [perinStatus, setPerinStatus] = useState<
    "idle" | "thinking" | "typing" | "listening"
  >("idle");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  };

  useEffect(() => {
    // Only scroll if there are messages, and use instant scroll on initial load
    if (messages.length > 0 || streamingMessage) {
      scrollToBottom(messages.length > 0);
    }
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

  return {
    session,
    messages,
    streamingMessage,
    perinStatus,
    isChatLoading,
    chatError,
    messagesEndRef,
    handleSendMessage,
  };
}
