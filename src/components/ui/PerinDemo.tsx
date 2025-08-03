"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PerinAvatar from "./PerinAvatar";
import PerinStatus from "./PerinStatus";
import QuickActions from "./QuickActions";
import SpotlightCard from "./SpotlightCard";

export default function PerinDemo() {
  const [perinStatus, setPerinStatus] = useState<
    "idle" | "thinking" | "typing" | "listening" | "busy"
  >("idle");
  const [perinMood, setPerinMood] = useState<
    "happy" | "focused" | "thoughtful" | "excited" | "calm"
  >("focused");
  const [selectedPersonality, setSelectedPersonality] = useState<
    "friendly" | "professional" | "creative" | "analytical"
  >("friendly");

  const demoActions = [
    {
      id: "1",
      action: "Scheduled team meeting for tomorrow",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: "completed" as const,
    },
    {
      id: "2",
      action: "Drafted follow-up email to client",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      status: "completed" as const,
    },
    {
      id: "3",
      action: "Coordinating with Sarah's assistant",
      timestamp: new Date(Date.now() - 1000 * 60 * 90),
      status: "pending" as const,
    },
  ];

  const handleStatusChange = (status: typeof perinStatus) => {
    setPerinStatus(status);
    // Update mood based on status
    if (status === "thinking") setPerinMood("focused");
    else if (status === "typing") setPerinMood("excited");
    else if (status === "idle") setPerinMood("happy");
    else setPerinMood("calm");
  };

  const handleActionTrigger = (actionId: string) => {
    setPerinStatus("busy");
    setPerinMood("focused");

    setTimeout(() => {
      setPerinStatus("idle");
      setPerinMood("happy");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            Perin - Emotional AI Assistant
          </h1>
          <p className="text-[var(--foreground-muted)] text-lg">
            Experience the future of AI interaction with personality, emotion,
            and living presence
          </p>
        </motion.div>

        {/* Personality Selector */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="card p-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Choose Perin&apos;s Personality
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  id: "friendly",
                  label: "Friendly",
                  icon: "😊",
                  desc: "Warm and approachable",
                },
                {
                  id: "professional",
                  label: "Professional",
                  icon: "👔",
                  desc: "Formal and efficient",
                },
                {
                  id: "creative",
                  label: "Creative",
                  icon: "🎨",
                  desc: "Imaginative and expressive",
                },
                {
                  id: "analytical",
                  label: "Analytical",
                  icon: "🔬",
                  desc: "Precise and logical",
                },
              ].map((personality) => (
                <motion.button
                  key={personality.id}
                  onClick={() =>
                    setSelectedPersonality(
                      personality.id as
                        | "friendly"
                        | "professional"
                        | "creative"
                        | "analytical"
                    )
                  }
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    selectedPersonality === personality.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--card-border)] bg-[var(--card-background)] hover:bg-[var(--card-background-light)]"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-2xl mb-2">{personality.icon}</div>
                  <div className="font-semibold text-[var(--foreground)]">
                    {personality.label}
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    {personality.desc}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Status Controls */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="card p-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              Control Perin&apos;s Status
            </h2>
            <div className="flex flex-wrap gap-3">
              {[
                { id: "idle", label: "Idle", icon: "💭" },
                { id: "thinking", label: "Thinking", icon: "🧠" },
                { id: "typing", label: "Typing", icon: "✍️" },
                { id: "listening", label: "Listening", icon: "👂" },
                { id: "busy", label: "Busy", icon: "⚡" },
              ].map((status) => (
                <motion.button
                  key={status.id}
                  onClick={() =>
                    handleStatusChange(
                      status.id as
                        | "idle"
                        | "thinking"
                        | "typing"
                        | "listening"
                        | "busy"
                    )
                  }
                  className={`px-4 py-2 rounded-lg border transition-all duration-300 flex items-center space-x-2 ${
                    perinStatus === status.id
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--card-border)] bg-[var(--card-background)] text-[var(--foreground)] hover:bg-[var(--card-background-light)]"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{status.icon}</span>
                  <span>{status.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Demo Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Perin Avatar */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
              Perin Avatar
            </h3>
            <PerinAvatar
              name="Perin"
              status={perinStatus}
              personality={selectedPersonality}
              size="xl"
              className="justify-center"
            />
          </motion.div>

          {/* Perin Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
              Perin Status
            </h3>
            <PerinStatus
              status={perinStatus}
              currentTask={
                perinStatus === "busy" ? "Processing your request" : undefined
              }
              recentActions={demoActions}
              mood={perinMood}
            />
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
              Quick Actions
            </h3>
            <QuickActions onActionTrigger={handleActionTrigger} />
          </motion.div>
        </div>

        {/* Spotlight Card Demo */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpotlightCard
              spotlightColor="rgba(132, 0, 255, 0.2)"
              className="h-64 bg-[var(--card-background)] border-[var(--card-border)]"
            >
              <div className="text-[var(--foreground)] p-6">
                <h4 className="text-lg font-semibold mb-3">
                  🌟 Welcome to Perin
                </h4>
                <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                  Experience an AI assistant that feels alive, remembers your
                  preferences, and adapts to your personality. Perin is more
                  than just a tool - it&apos;s your digital companion.
                </p>
              </div>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(255, 154, 139, 0.3)"
              className="h-64 bg-[var(--card-background)] border-[var(--card-border)]"
            >
              <div className="text-[var(--foreground)] p-6">
                <h4 className="text-lg font-semibold mb-3">💡 Key Features</h4>
                <ul className="text-sm text-[var(--foreground-muted)] space-y-2">
                  <li>• Personality-driven interactions</li>
                  <li>• Emotional state awareness</li>
                  <li>• Living status indicators</li>
                  <li>• Memory and context retention</li>
                  <li>• Subtle, purposeful animations</li>
                </ul>
              </div>
            </SpotlightCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
