"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/components/providers/UserDataProvider";
// import { useTheme } from "@/components/providers/ThemeProvider";
import { getUserTimezone } from "@/lib/utils/timezone";
import { TimezoneSelector } from "@/components/ui/TimezoneSelector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  gmail_connected: boolean;
  calendar_connected: boolean;
}

const toneOptions = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable",
    emoji: "😊",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Formal and business-like",
    emoji: "💼",
    color: "from-slate-600 to-slate-800",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed and informal",
    emoji: "😎",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    description: "Energetic and positive",
    emoji: "🚀",
    color: "from-orange-500 to-red-500",
  },
  {
    value: "calm",
    label: "Calm",
    description: "Peaceful and composed",
    emoji: "🧘",
    color: "from-purple-500 to-indigo-500",
  },
];

const dayOptions = [
  { value: "monday", label: "Mon", short: "M" },
  { value: "tuesday", label: "Tue", short: "T" },
  { value: "wednesday", label: "Wed", short: "W" },
  { value: "thursday", label: "Thu", short: "T" },
  { value: "friday", label: "Fri", short: "F" },
  { value: "saturday", label: "Sat", short: "S" },
  { value: "sunday", label: "Sun", short: "S" },
];

const integrationOptions = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Manage emails and stay organized",
    icon: "📧",
    color: "from-red-500 to-pink-500",
    benefits: ["Email organization", "Smart replies", "Meeting scheduling"],
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Schedule meetings and manage time",
    icon: "📅",
    color: "from-blue-500 to-indigo-500",
    benefits: ["Event creation", "Time blocking", "Meeting coordination"],
  },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { state, actions } = useUserData();
  // const { theme } = useTheme(); // Available for future theme-specific customizations
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);
  const [connectingIntegrations, setConnectingIntegrations] = useState<{
    gmail: boolean;
    calendar: boolean;
  }>({
    gmail: false,
    calendar: false,
  });

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: session?.user?.name || "",
    perin_name: "Perin",
    tone: "friendly",
    timezone: getUserTimezone(),
    preferred_hours: {
      start: "09:00",
      end: "17:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    gmail_connected: false,
    calendar_connected: false,
  });

  // Check URL parameters for connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailStatus = urlParams.get("gmail");
    const calendarStatus = urlParams.get("calendar");

    if (gmailStatus === "connected") {
      setOnboardingData((prev) => ({ ...prev, gmail_connected: true }));
    }

    if (calendarStatus === "connected") {
      setOnboardingData((prev) => ({ ...prev, calendar_connected: true }));
    }
  }, []);

  // Listen for integration status changes from UserDataProvider
  useEffect(() => {
    const checkIntegrationStatus = () => {
      const integrations = state.integrations;
      if (integrations) {
        const gmailConnected = integrations.some(
          (i) => i.type === "gmail" && i.isActive
        );
        const calendarConnected = integrations.some(
          (i) => i.type === "calendar" && i.isActive
        );

        setOnboardingData((prev) => ({
          ...prev,
          gmail_connected: gmailConnected,
          calendar_connected: calendarConnected,
        }));

        // Clear loading states if integrations are connected
        if (gmailConnected || calendarConnected) {
          setConnectingIntegrations((prev) => ({
            ...prev,
            gmail: gmailConnected ? false : prev.gmail,
            calendar: calendarConnected ? false : prev.calendar,
          }));

          // Clear timeouts for completed integrations
          if (
            gmailConnected &&
            (window as unknown as { gmail_timeout?: NodeJS.Timeout })
              .gmail_timeout
          ) {
            clearTimeout(
              (window as unknown as { gmail_timeout: NodeJS.Timeout })
                .gmail_timeout
            );
            delete (window as unknown as { gmail_timeout?: NodeJS.Timeout })
              .gmail_timeout;
          }
          if (
            calendarConnected &&
            (window as unknown as { calendar_timeout?: NodeJS.Timeout })
              .calendar_timeout
          ) {
            clearTimeout(
              (window as unknown as { calendar_timeout: NodeJS.Timeout })
                .calendar_timeout
            );
            delete (window as unknown as { calendar_timeout?: NodeJS.Timeout })
              .calendar_timeout;
          }
        }
      }
    };

    checkIntegrationStatus();
  }, [state.integrations]);

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

  const connectIntegration = async (integrationId: string) => {
    try {
      // Set loading state
      setConnectingIntegrations((prev) => ({ ...prev, [integrationId]: true }));

      // Start the connection process
      await actions.connectIntegration(integrationId as "gmail" | "calendar");

      // Set a timeout to clear loading state if integration doesn't complete
      // This handles cases where the user closes the popup without completing
      const timeoutId = setTimeout(() => {
        setConnectingIntegrations((prev) => ({
          ...prev,
          [integrationId]: false,
        }));
      }, 30000); // 30 second timeout

      // Store timeout ID for cleanup
      (window as unknown as Record<string, NodeJS.Timeout>)[
        `${integrationId}_timeout`
      ] = timeoutId;
    } catch (error) {
      console.error(`Error connecting ${integrationId}:`, error);
      setConnectingIntegrations((prev) => ({
        ...prev,
        [integrationId]: false,
      }));
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await actions.updateUser({
        name: onboardingData.name,
        perin_name: onboardingData.perin_name,
        tone: onboardingData.tone,
        timezone: onboardingData.timezone,
        preferred_hours: onboardingData.preferred_hours,
      });

      // Add a delightful completion animation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.push("/");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setIsCompleting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return onboardingData.name.trim().length > 0;
      case 2:
        return true; // Tone is always selected
      case 3:
        return true; // Schedule is always valid
      case 4:
        return true; // Integrations are optional
      default:
        return false;
    }
  };

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-6 flex items-center justify-center"
          >
            <span className="text-3xl">✨</span>
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Setting up your Perin...
          </h2>
          <p className="text-muted-foreground">
            Almost ready to start your journey!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to <span className="gradient-text-primary">Perin</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Let&apos;s create your perfect AI assistant in just a few steps
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  animate={{
                    scale: step === currentStep ? 1.1 : 1,
                    boxShadow:
                      step === currentStep
                        ? "0 0 20px rgba(76, 91, 255, 0.3)"
                        : "none",
                  }}
                >
                  {step < currentStep ? "✓" : step}
                </motion.div>
                {step < 4 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      step < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <Card className="p-8 ">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <span className="text-xl">👋</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Let&apos;s get to know you
                  </h2>
                  <p className="text-muted-foreground">
                    Tell us your name so Perin can address you properly
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-foreground font-medium"
                    >
                      What&apos;s your name?
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={onboardingData.name}
                      onChange={(e) => updateData("name", e.target.value)}
                      placeholder="Enter your name"
                      className="mt-2"
                      autoFocus
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="perin_name"
                      className="text-foreground font-medium"
                    >
                      What&apos;s my name?
                    </Label>
                    <Input
                      id="perin_name"
                      type="text"
                      value={onboardingData.perin_name}
                      onChange={(e) => updateData("perin_name", e.target.value)}
                      placeholder="e.g., Perin, Assistant, Helper"
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="p-8">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <span className="text-xl">💬</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    How should I talk to you?
                  </h2>
                  <p className="text-muted-foreground">
                    Choose the communication style that feels right for you
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toneOptions.map((tone) => (
                    <motion.button
                      key={tone.value}
                      onClick={() => updateData("tone", tone.value)}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${
                        onboardingData.tone === tone.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center mb-3">
                        <span className="text-2xl mr-3">{tone.emoji}</span>
                        <h3 className="font-semibold text-foreground">
                          {tone.label}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tone.description}
                      </p>
                      {onboardingData.tone === tone.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                        >
                          <span className="text-xs text-primary-foreground">
                            ✓
                          </span>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="p-8">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <span className="text-xl">⏰</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    When are you available?
                  </h2>
                  <p className="text-muted-foreground">
                    Help me understand your schedule for better assistance
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="text-foreground font-medium">
                      Your Timezone
                    </Label>
                    <TimezoneSelector
                      value={onboardingData.timezone}
                      onChange={(timezone) => updateData("timezone", timezone)}
                      placeholder="Select your timezone"
                      className="mt-2"
                      autoDetect={true}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground font-medium">
                        Start Time
                      </Label>
                      <Input
                        type="time"
                        value={onboardingData.preferred_hours.start}
                        onChange={(e) =>
                          updatePreferredHours("start", e.target.value)
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground font-medium">
                        End Time
                      </Label>
                      <Input
                        type="time"
                        value={onboardingData.preferred_hours.end}
                        onChange={(e) =>
                          updatePreferredHours("end", e.target.value)
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-foreground font-medium mb-3 block">
                      Available Days
                    </Label>
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
                          className={`p-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                            onboardingData.preferred_hours.days.includes(
                              day.value
                            )
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {day.short}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {currentStep === 4 && (
              <Card className="p-8">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <span className="text-xl">🔗</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Connect your tools
                  </h2>
                  <p className="text-muted-foreground">
                    Link your favorite apps to unlock Perin&apos;s full
                    potential
                  </p>
                </div>

                <div className="space-y-6">
                  {integrationOptions.map((integration) => (
                    <motion.div
                      key={integration.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-6 rounded-2xl border border-border bg-card"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div
                            className={`w-12 h-12 bg-gradient-to-r ${integration.color} rounded-full flex items-center justify-center mr-4`}
                          >
                            <span className="text-xl">{integration.icon}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {integration.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                        {onboardingData[
                          `${integration.id}_connected` as keyof OnboardingData
                        ] ? (
                          <div className="flex items-center text-success">
                            <span className="text-sm font-medium mr-2">
                              Connected
                            </span>
                            <span className="text-lg">✓</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => connectIntegration(integration.id)}
                            variant="outline"
                            size="sm"
                            disabled={
                              connectingIntegrations[
                                integration.id as keyof typeof connectingIntegrations
                              ]
                            }
                            className="min-w-[100px]"
                          >
                            {connectingIntegrations[
                              integration.id as keyof typeof connectingIntegrations
                            ] ? (
                              <div className="flex items-center">
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Connecting...
                              </div>
                            ) : (
                              "Connect"
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {integration.benefits.map((benefit, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                          >
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground text-center">
                    💡 You can always connect these later from your settings
                  </p>
                  {(connectingIntegrations.gmail ||
                    connectingIntegrations.calendar) && (
                    <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="text-sm text-primary font-medium">
                          {connectingIntegrations.gmail &&
                          connectingIntegrations.calendar
                            ? "Connecting Gmail and Calendar..."
                            : connectingIntegrations.gmail
                            ? "Connecting Gmail..."
                            : "Connecting Calendar..."}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Please complete the authorization in the popup window
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 1}
            className="min-w-[120px]"
          >
            Back
          </Button>

          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="min-w-[120px] bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {currentStep === 4 ? "Complete Setup" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
