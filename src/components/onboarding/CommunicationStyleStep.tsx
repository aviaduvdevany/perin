"use client";

import { motion } from "framer-motion";
import { StepCard } from "./StepCard";
import { OnboardingStepProps } from "./types";

const toneOptions = [
  {
    value: "friendly",
    label: "Friendly",
    emoji: "😊",
    description: "Warm, approachable, and conversational",
  },
  {
    value: "professional",
    label: "Professional",
    emoji: "💼",
    description: "Formal, precise, and business-focused",
  },
  {
    value: "casual",
    label: "Casual",
    emoji: "😎",
    description: "Relaxed, informal, and easy-going",
  },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    emoji: "🚀",
    description: "Energetic, positive, and motivating",
  },
];

export function CommunicationStyleStep({
  onboardingData,
  updateData,
}: Pick<OnboardingStepProps, "onboardingData" | "updateData">) {
  return (
    <StepCard
      icon="💬"
      title="How should I talk to you?"
      description="Choose the communication style that feels right for you"
      iconGradient="from-purple-500 to-pink-500"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toneOptions.map((tone) => (
          <motion.button
            key={tone.value}
            onClick={() => updateData("tone", tone.value)}
            className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left group relative ${
              onboardingData.tone === tone.value
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-3">{tone.emoji}</span>
              <h3 className="font-semibold text-foreground">{tone.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{tone.description}</p>
            {onboardingData.tone === tone.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
              >
                <span className="text-xs text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </StepCard>
  );
}
