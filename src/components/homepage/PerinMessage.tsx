import React, { useState, useEffect } from "react";
import { MessageCircle, Sparkles } from "lucide-react";

export default function PerinMessage() {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const fullText = "Hey! How can I help you?";

  useEffect(() => {
    if (displayedText.length < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1));
      }, 50); // Adjust speed here (lower = faster)

      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [displayedText, fullText]);

  return (
    <div className="relative group w-full max-w-2xl mx-auto pt-12">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse"></div>

      {/* Main message container - fixed size */}
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02] min-h-[180px] flex flex-col">
        {/* Header with Perin branding */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white">Perin</span>
            <span className="text-sm text-white/60">AI Assistant</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-white/60">
              {isTyping ? "typing..." : "online"}
            </span>
          </div>
        </div>

        {/* Message content - takes remaining space */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-start gap-4">
            <MessageCircle className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white/90 text-xl leading-relaxed min-h-[2.5rem] flex items-center">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-0.5 h-6 bg-blue-400 ml-1 animate-pulse"></span>
                )}
              </p>
            </div>
          </div>

          {/* Typing indicator - only show while typing */}
          {isTyping && (
            <div className="flex items-center gap-1 ml-10 mt-4">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 rounded-3xl pointer-events-none"></div>
      </div>
    </div>
  );
}
