"use client";

import { motion } from "framer-motion";
import { StepCard } from "./StepCard";
import { Button } from "@/components/ui/button";
import { OnboardingStepProps } from "./types";

const integrationOptions = [
  {
    id: "gmail",
    name: "Gmail",
    icon: "📧",
    color: "from-red-500 to-pink-500",
    description: "Access your emails and manage your inbox",
    benefits: ["Email management", "Smart replies", "Schedule emails"],
  },
  {
    id: "calendar",
    name: "Google Calendar",
    icon: "📅",
    color: "from-blue-500 to-indigo-500",
    description: "Manage your schedule and appointments",
    benefits: ["Schedule meetings", "Time blocking", "Reminders"],
  },
];

export function IntegrationsStep({
  onboardingData,
  connectingIntegrations,
  connectIntegration,
}: Pick<
  OnboardingStepProps,
  "onboardingData" | "connectingIntegrations" | "connectIntegration"
>) {
  if (!connectingIntegrations || !connectIntegration) {
    return null;
  }

  return (
    <StepCard
      icon="🔗"
      title="Connect your tools"
      description="Link your favorite apps to unlock Perin's full potential"
      iconGradient="from-orange-500 to-red-500"
    >
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
                `${integration.id}_connected` as keyof typeof onboardingData
              ] ? (
                <div className="flex items-center text-success">
                  <span className="text-sm font-medium mr-2">Connected</span>
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
        {(connectingIntegrations.gmail || connectingIntegrations.calendar) && (
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
                {connectingIntegrations.gmail && connectingIntegrations.calendar
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
    </StepCard>
  );
}
