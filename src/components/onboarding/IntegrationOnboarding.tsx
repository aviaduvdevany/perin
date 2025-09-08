"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import {
  Mail,
  Calendar,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useUserData } from "@/components/providers/UserDataProvider";
import type { IntegrationType } from "@/types/integrations";

interface IntegrationOnboardingProps {
  onComplete?: () => void;
  className?: string;
}

export default function IntegrationOnboarding({
  onComplete,
  className = "",
}: IntegrationOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [connectingTypes, setConnectingTypes] = useState<Set<IntegrationType>>(
    new Set()
  );
  const [completedTypes, setCompletedTypes] = useState<Set<IntegrationType>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);

  const { state, actions } = useUserData();
  const { integrations } = state;
  const router = useRouter();

  const integrationSteps = [
    {
      type: "gmail" as IntegrationType,
      title: "Connect Gmail",
      description:
        "Let Perin read your recent emails to provide better context and insights",
      icon: Mail,
      benefits: [
        "Email context for smarter responses",
        "Recent conversation awareness",
        "Better delegation capabilities",
      ],
      color: "from-red-500 to-pink-500",
    },
    {
      type: "calendar" as IntegrationType,
      title: "Connect Calendar",
      description:
        "Enable Perin to help with scheduling, availability, and meeting coordination",
      icon: Calendar,
      benefits: [
        "Smart scheduling assistance",
        "Availability checking",
        "Meeting coordination",
      ],
      color: "from-blue-500 to-cyan-500",
    },
  ];

  const isConnected = (type: IntegrationType) =>
    integrations.some(
      (integration) => integration.type === type && integration.isActive
    );

  const handleConnect = async (type: IntegrationType) => {
    setConnectingTypes((prev) => new Set(prev).add(type));
    try {
      await actions.connectIntegration(type);
      setCompletedTypes((prev) => new Set(prev).add(type));

      // Auto-advance to next step after successful connection
      setTimeout(() => {
        if (currentStep < integrationSteps.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          handleComplete();
        }
      }, 1500);
    } catch (error) {
      console.error(`Error connecting ${type}:`, error);
    } finally {
      setConnectingTypes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
    }
  };

  const handleSkip = () => {
    if (currentStep < integrationSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsLoading(true);
    if (onComplete) {
      onComplete();
    } else {
      router.push("/");
    }
  };

  const currentIntegration = integrationSteps[currentStep];
  const isConnecting = connectingTypes.has(currentIntegration.type);
  const isCompleted = completedTypes.has(currentIntegration.type);
  const isAlreadyConnected = isConnected(currentIntegration.type);

  return (
    <div className={`integration-onboarding ${className}`}>
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {integrationSteps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? "bg-[var(--accent-primary)]"
                    : "bg-[var(--card-border)]"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-[var(--foreground-muted)] text-sm">
            Step {currentStep + 1} of {integrationSteps.length}
          </p>
        </div>

        <GlassCard className="p-8 text-center">
          {/* Header */}
          <div className="mb-8">
            <div
              className={`w-16 h-16 bg-gradient-to-r ${currentIntegration.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
            >
              <currentIntegration.icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--cta-text)] mb-2">
              {currentIntegration.title}
            </h2>
            <p className="text-[var(--foreground-muted)] text-lg">
              {currentIntegration.description}
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[var(--cta-text)] mb-4">
              What you&apos;ll get:
            </h3>
            <div className="space-y-3">
              {currentIntegration.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center space-x-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-[var(--foreground-muted)]">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {isAlreadyConnected ? (
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Already connected!</span>
              </div>
            ) : isCompleted ? (
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Connected successfully!</span>
              </div>
            ) : (
              <button
                onClick={() => handleConnect(currentIntegration.type)}
                disabled={isConnecting}
                className="w-full h-12 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Connect {currentIntegration.title}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleSkip}
              disabled={isConnecting}
              className="w-full h-12 border border-[var(--card-border)] text-[var(--foreground-muted)] font-medium rounded-lg transition-all duration-300 hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep < integrationSteps.length - 1
                ? "Skip for now"
                : "Continue without connecting"}
            </button>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--foreground-muted)]">
              You can always connect these integrations later in your settings
            </p>
          </div>
        </GlassCard>

        {/* Completion state */}
        {isLoading && (
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center space-x-2 text-[var(--accent-primary)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-medium">
                Setting up your Perin experience...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
