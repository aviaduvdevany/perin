"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUserData } from "@/components/providers/UserDataProvider";
import { Button } from "@/components/ui/button";
import {
  IntroductionStep,
  CommunicationStyleStep,
  ScheduleSetupStep,
  IntegrationsStep,
  OnboardingData,
} from "@/components/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const { state, actions } = useUserData();

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
    name: "",
    perin_name: "Perin",
    tone: "friendly",
    timezone: "",
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
    const gmailConnected = urlParams.get("gmail_connected") === "true";
    const calendarConnected = urlParams.get("calendar_connected") === "true";

    if (gmailConnected || calendarConnected) {
      setOnboardingData((prev) => ({
        ...prev,
        gmail_connected: gmailConnected || prev.gmail_connected,
        calendar_connected: calendarConnected || prev.calendar_connected,
      }));
    }
  }, []);

  // Check integration status from UserDataProvider
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
    };
    checkIntegrationStatus();
  }, [state.integrations]);

  const updateData = (key: keyof OnboardingData, value: string) => {
    setOnboardingData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updatePreferredHours = (key: string, value: string | string[]) => {
    setOnboardingData((prev) => ({
      ...prev,
      preferred_hours: {
        ...prev.preferred_hours,
        [key]: value,
      },
    }));
  };

  const connectIntegration = async (integrationId: string) => {
    try {
      setConnectingIntegrations((prev) => ({ ...prev, [integrationId]: true }));
      await actions.connectIntegration(integrationId as "gmail" | "calendar");
      const timeoutId = setTimeout(() => {
        setConnectingIntegrations((prev) => ({
          ...prev,
          [integrationId]: false,
        }));
      }, 30000);
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

  if (isCompleting) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background-primary via-background-secondary to-background-primary flex items-center justify-center">
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
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
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
            Let&apos;s set up your personal AI assistant in just a few quick
            steps
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center">
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

        {/* Step Content - Dynamic Size Container */}
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-card border rounded-2xl shadow-lg overflow-hidden onboarding-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                {currentStep === 1 && (
                  <IntroductionStep
                    onboardingData={onboardingData}
                    updateData={updateData}
                  />
                )}

                {currentStep === 2 && (
                  <CommunicationStyleStep
                    onboardingData={onboardingData}
                    updateData={updateData}
                  />
                )}

                {currentStep === 3 && (
                  <ScheduleSetupStep
                    onboardingData={onboardingData}
                    updateData={updateData}
                    updatePreferredHours={updatePreferredHours}
                  />
                )}

                {currentStep === 4 && (
                  <IntegrationsStep
                    onboardingData={onboardingData}
                    connectingIntegrations={connectingIntegrations}
                    connectIntegration={connectIntegration}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

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
            {currentStep === 4 ? "Complete Setup" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
