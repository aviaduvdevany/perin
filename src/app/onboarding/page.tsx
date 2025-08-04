"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Stepper, { Step } from "../../components/ui/Stepper";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { connectGmailService } from "../services/integrations";
import { updateUserProfileService } from "../services/users";

interface OnboardingData {
  name: string;
  perin_name: string;
  tone: string;
  timezone: string;
  preferred_hours: {
    start: string;
    end: string;
    days: string[];
  };
  avatar_url: string;
  gmail_connected: boolean;
}

const toneOptions = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Formal and business-like",
  },
  { value: "casual", label: "Casual", description: "Relaxed and informal" },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    description: "Energetic and positive",
  },
  { value: "calm", label: "Calm", description: "Peaceful and composed" },
];

const timezoneOptions = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

const dayOptions = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const avatarOptions = [
  {
    value: "/avatars/avatar-1.png",
    label: "Perin Classic",
    description: "The original Perin",
  },
  {
    value: "/avatars/avatar-2.png",
    label: "Perin Pro",
    description: "Professional assistant",
  },
  {
    value: "/avatars/avatar-3.png",
    label: "Perin Creative",
    description: "Creative collaborator",
  },
  {
    value: "/avatars/avatar-4.png",
    label: "Perin Zen",
    description: "Calm and focused",
  },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: session?.user?.name || "",
    perin_name: "Perin",
    tone: "friendly",
    timezone: "UTC",
    preferred_hours: {
      start: "09:00",
      end: "17:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    avatar_url: "/avatars/avatar-1.png",
    gmail_connected: false,
  });

  const [gmailConnecting, setGmailConnecting] = useState(false);

  const updateData = (field: keyof OnboardingData, value: string | boolean) => {
    setOnboardingData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePreferredHours = (
    field: keyof OnboardingData["preferred_hours"],
    value: string | string[]
  ) => {
    setOnboardingData((prev) => ({
      ...prev,
      preferred_hours: { ...prev.preferred_hours, [field]: value },
    }));
  };

  const connectGmail = async () => {
    setGmailConnecting(true);
    try {
      const { authUrl } = await connectGmailService();

      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error);
    } finally {
      setGmailConnecting(false);
    }
  };

  const handleComplete = async () => {
    try {
      // Update user profile with onboarding data
      const response = await updateUserProfileService({
          name: onboardingData.name,
          perin_name: onboardingData.perin_name,
          tone: onboardingData.tone,
          timezone: onboardingData.timezone,
          preferred_hours: onboardingData.preferred_hours,
          avatar_url: onboardingData.avatar_url,
      });

      if (response) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0E101C] via-[#1D2239] to-[#0E101C]">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-satoshi">
            Welcome to <span className="text-[#4B5DFF]">Perin</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Let&apos;s personalize your AI assistant to work perfectly for you
          </p>
        </motion.div>

        <Stepper
          initialStep={1}
          onFinalStepCompleted={handleComplete}
          className="max-w-4xl mx-auto"
        >
          {/* Step 1: Basic Information */}
          <Step>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Tell us about yourself
                </h2>
                <p className="text-gray-400">
                  Let&apos;s start with the basics
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={onboardingData.name}
                    onChange={(e) => updateData("name", e.target.value)}
                    className="w-full px-4 py-3 bg-[#1D2239] border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B5DFF] focus:border-transparent transition-all duration-300"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                    What should I call you?
                  </label>
                  <input
                    type="text"
                    value={onboardingData.perin_name}
                    onChange={(e) => updateData("perin_name", e.target.value)}
                    className="w-full px-4 py-3 bg-[#1D2239] border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B5DFF] focus:border-transparent transition-all duration-300"
                    placeholder="e.g., Perin, Assistant, Helper"
                  />
                </div>
              </div>
            </motion.div>
          </Step>

          {/* Step 2: Communication Tone */}
          <Step>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  How should I communicate?
                </h2>
                <p className="text-gray-400">
                  Choose your preferred communication style
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toneOptions.map((tone) => (
                  <motion.button
                    key={tone.value}
                    onClick={() => updateData("tone", tone.value)}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                      onboardingData.tone === tone.value
                        ? "border-[#4B5DFF] bg-[#4B5DFF]/10"
                        : "border-gray-600 bg-[#1D2239] hover:border-gray-500"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h3 className="font-semibold text-white mb-1">
                      {tone.label}
                    </h3>
                    <p className="text-sm text-gray-400">{tone.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </Step>

          {/* Step 3: Timezone & Schedule */}
          <Step>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  When are you available?
                </h2>
                <p className="text-gray-400">
                  Help me understand your schedule
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                    Your Timezone
                  </label>
                  <select
                    value={onboardingData.timezone}
                    onChange={(e) => updateData("timezone", e.target.value)}
                    className="w-full px-4 py-3 bg-[#1D2239] border border-gray-600 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#4B5DFF] focus:border-transparent transition-all duration-300"
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={onboardingData.preferred_hours.start}
                      onChange={(e) =>
                        updatePreferredHours("start", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-[#1D2239] border border-gray-600 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#4B5DFF] focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={onboardingData.preferred_hours.end}
                      onChange={(e) =>
                        updatePreferredHours("end", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-[#1D2239] border border-gray-600 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#4B5DFF] focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                    Available Days
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {dayOptions.map((day) => (
                      <motion.button
                        key={day.value}
                        onClick={() => {
                          const currentDays =
                            onboardingData.preferred_hours.days;
                          const newDays = currentDays.includes(day.value)
                            ? currentDays.filter((d) => d !== day.value)
                            : [...currentDays, day.value];
                          updatePreferredHours("days", newDays);
                        }}
                        className={`p-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                          onboardingData.preferred_hours.days.includes(
                            day.value
                          )
                            ? "bg-[#4B5DFF] text-white"
                            : "bg-[#1D2239] text-gray-400 border border-gray-600"
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {day.label.slice(0, 3)}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </Step>

          {/* Step 4: Gmail Integration */}
          <Step>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connect your Gmail
                </h2>
                <p className="text-gray-400">
                  Let me help you manage your emails
                </p>
              </div>

              <div className="bg-[#1D2239] rounded-2xl p-8 border border-gray-600">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-[#4B5DFF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Email Management
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Connect your Gmail to let me help you organize emails,
                    schedule meetings, and stay on top of your inbox.
                  </p>
                </div>

                <motion.button
                  onClick={connectGmail}
                  disabled={gmailConnecting}
                  className="w-full bg-gradient-to-r from-[#4B5DFF] to-[#7C3AED] text-white py-3 px-6 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-[#4B5DFF]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {gmailConnecting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                      Connect Gmail
                    </div>
                  )}
                </motion.button>

                <p className="text-xs text-gray-500 mt-4">
                  You can skip this step and connect later from your dashboard
                </p>
              </div>
            </motion.div>
          </Step>

          {/* Step 5: Choose Avatar */}
          <Step>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Choose your Perin
                </h2>
                <p className="text-gray-400">
                  Select an avatar that represents your assistant
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {avatarOptions.map((avatar) => (
                  <motion.button
                    key={avatar.value}
                    onClick={() => updateData("avatar_url", avatar.value)}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                      onboardingData.avatar_url === avatar.value
                        ? "border-[#4B5DFF] bg-[#4B5DFF]/10"
                        : "border-gray-600 bg-[#1D2239] hover:border-gray-500"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#4B5DFF] to-[#7C3AED] rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1">
                      {avatar.label}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {avatar.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </Step>

          {/* Step 6: Final Setup */}
          <Step>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#4B5DFF] to-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  You&apos;re all set!
                </h2>
                <p className="text-gray-400 mb-6">
                  Your personalized Perin assistant is ready to help you
                </p>
              </div>

              <div className="bg-[#1D2239] rounded-2xl p-6 border border-gray-600 text-left">
                <h3 className="font-semibold text-white mb-4">
                  Your Setup Summary:
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{onboardingData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assistant Name:</span>
                    <span className="text-white">
                      {onboardingData.perin_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Communication Style:</span>
                    <span className="text-white capitalize">
                      {onboardingData.tone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timezone:</span>
                    <span className="text-white">
                      {
                        timezoneOptions.find(
                          (tz) => tz.value === onboardingData.timezone
                        )?.label
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available Hours:</span>
                    <span className="text-white">
                      {onboardingData.preferred_hours.start} -{" "}
                      {onboardingData.preferred_hours.end}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gmail Connected:</span>
                    <span className="text-white">
                      {onboardingData.gmail_connected ? "✅ Yes" : "⏭️ Skipped"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-400 mt-6">
                You can always update these settings later from your dashboard
              </p>
            </motion.div>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}
