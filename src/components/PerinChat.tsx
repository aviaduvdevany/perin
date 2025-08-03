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
        <p className="text-gray-500">Please sign in to chat with Perin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
          <span className="text-blue-600 font-bold text-sm">
            {session.user?.name?.[0] || "P"}
          </span>
        </div>
        <div>
          <h3 className="font-semibold">Perin</h3>
          <p className="text-sm opacity-90">Your AI Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation with Perin!</p>
            <p className="text-sm mt-2">
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
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
              <p className="text-sm whitespace-pre-wrap">
                {streamingMessage}
                <span className="animate-pulse">▋</span>
              </p>
            </div>
          </div>
        )}

        {chatError && (
          <div className="flex justify-center">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-red-100 text-red-800">
              <p className="text-sm">Error: {chatError}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            disabled={isChatLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isChatLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isChatLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
