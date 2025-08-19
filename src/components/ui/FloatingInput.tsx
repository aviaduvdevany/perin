"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Paperclip, Smile, X } from "lucide-react";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

interface FloatingInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showAttachments?: boolean;
  showVoiceInput?: boolean;
  showEmojiPicker?: boolean;
  className?: string;
  onAttachmentClick?: () => void;
  onVoiceInputClick?: () => void;
  onEmojiPickerClick?: () => void;
}

const MAX_ROWS = 4;
const MIN_ROWS = 1;

export function FloatingInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  disabled = false,
  showAttachments = false,
  showVoiceInput = false,
  showEmojiPicker = false,
  className,
  onAttachmentClick,
  onVoiceInputClick,
  onEmojiPickerClick,
}: FloatingInputProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [rows, setRows] = useState(MIN_ROWS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = "auto";

    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const newRows = Math.min(
      Math.max(Math.ceil(scrollHeight / lineHeight), MIN_ROWS),
      MAX_ROWS
    );

    setRows(newRows);
    textarea.style.height = `${newRows * lineHeight}px`;
  }, []);

  // Adjust height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage, adjustTextareaHeight]);

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && !isLoading && !disabled) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
      setRows(MIN_ROWS);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [inputMessage, isLoading, disabled, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputMessage(e.target.value);
    },
    []
  );

  const handleClearMessage = useCallback(() => {
    setInputMessage("");
    setRows(MIN_ROWS);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  }, []);

  const isSendDisabled = !inputMessage.trim() || isLoading || disabled;
  const hasOptionalButtons =
    showAttachments || showVoiceInput || showEmojiPicker;

  return (
    <motion.div
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 transform -translate-x-1/2 w-full max-w-[min(92vw,48rem)] px-4 z-50",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="relative">
        {/* Main Input Container */}
        <motion.div
          className={cn(
            "flex items-end space-x-3 transition-all duration-200",
            isFocused && "scale-[1.02]"
          )}
          layout
        >
          {/* Textarea Container */}

          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              "w-full resize-none text-md transition-all duration-200",
              "bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10",
              "backdrop-blur-lg rounded-2xl p-4",
              "text-[var(--cta-text)] placeholder-[var(--foreground-muted)]",
              "scrollbar-ultra-thin min-h-0 shadow-none",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              rows > 1 && "py-1"
            )}
            rows={rows}
            disabled={isLoading || disabled}
            aria-label="Message input"
          />

          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            {/* Optional Action Buttons */}
            <AnimatePresence>
              {showAttachments && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="p-3 text-[var(--foreground-muted)] hover:text-[var(--cta-text)] transition-colors duration-200"
                  aria-label="Attach file"
                  disabled={disabled}
                  onClick={onAttachmentClick}
                >
                  <Paperclip className="w-5 h-5" />
                </motion.button>
              )}

              {showVoiceInput && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="p-3 text-[var(--foreground-muted)] hover:text-[var(--cta-text)] transition-colors duration-200"
                  aria-label="Voice input"
                  disabled={disabled}
                  onClick={onVoiceInputClick}
                >
                  <Mic className="w-5 h-5" />
                </motion.button>
              )}

              {showEmojiPicker && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="p-3 text-[var(--foreground-muted)] hover:text-[var(--cta-text)] transition-colors duration-200"
                  aria-label="Insert emoji"
                  disabled={disabled}
                  onClick={onEmojiPickerClick}
                >
                  <Smile className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Clear Button */}
            <AnimatePresence>
              {inputMessage.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="p-3 text-[var(--foreground-muted)] hover:text-[var(--error)] transition-colors duration-200"
                  aria-label="Clear message"
                  disabled={disabled}
                  onClick={handleClearMessage}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Send Button */}
            <motion.button
              onClick={handleSendMessage}
              disabled={isSendDisabled}
              className={cn(
                "px-5 py-4 rounded-2xl transition-all duration-200 flex items-center justify-center",
                "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]",
                "text-white shadow-2xl glow-primary",
                "hover:shadow-lg hover:shadow-[var(--accent-primary)]/25",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2",
                "active:scale-95"
              )}
              whileHover={!isSendDisabled ? { scale: 1.05 } : {}}
              whileTap={!isSendDisabled ? { scale: 0.95 } : {}}
              aria-label="Send message"
              aria-describedby={
                isSendDisabled ? "send-disabled-reason" : undefined
              }
            >
              {isLoading ? (
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  aria-label="Loading"
                />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Accessibility Helper */}
        {isSendDisabled && (
          <div id="send-disabled-reason" className="sr-only">
            {!inputMessage.trim() && "Message cannot be empty"}
            {isLoading && "Message is being sent"}
            {disabled && "Input is disabled"}
          </div>
        )}

        {/* Focus Indicator for Screen Readers */}
        <div className="sr-only" aria-live="polite">
          {isFocused && "Message input focused"}
        </div>
      </div>
    </motion.div>
  );
}
