"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassInput } from "./Glass";

interface FloatingInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function FloatingInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  disabled = false,
}: FloatingInputProps) {
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading && !disabled) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 transform -translate-x-1/2 w-full max-w-[min(92vw,48rem)] px-4 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex space-x-3">
        <GlassInput className="flex-1 p-4">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full bg-transparent border-none resize-none text-sm focus:outline-none text-[var(--cta-text)] placeholder-[var(--foreground-muted)] scrollbar-ultra-thin"
            rows={1}
            disabled={isLoading || disabled}
          />
        </GlassInput>

        <motion.button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading || disabled}
          className="px-5 py-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-2xl hover:shadow-lg hover:shadow-[var(--accent-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-2xl glow-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {isLoading ? (
            <motion.div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <svg
              className="w-4 h-4"
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
        </motion.button>
      </div>
    </motion.div>
  );
}
