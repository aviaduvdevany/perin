"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { ReauthPrompt } from "./ReauthPrompt";
import { connectIntegrationService } from "@/app/services/integrations";
import { useUserData } from "@/components/providers/UserDataProvider";
import type { IntegrationType } from "@/types/integrations";

interface IntegrationReauthHandlerProps {
  messages: Array<{ content: string; role: string; id: string }>;
  className?: string;
}

export function IntegrationReauthHandler({
  messages,
  className = "",
}: IntegrationReauthHandlerProps) {
  const [detectedIntegrations, setDetectedIntegrations] = useState<
    IntegrationType[]
  >([]);
  const [connectingTypes, setConnectingTypes] = useState<Set<IntegrationType>>(
    new Set()
  );
  const { actions } = useUserData();

  // Detect which integrations need reauth based on message content
  useEffect(() => {
    const reauthIntegrations: IntegrationType[] = [];

    // Only check the most recent assistant message for reauth requests
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "assistant");

    if (lastAssistantMessage) {
      const content = lastAssistantMessage.content.toLowerCase();

      // Check for Gmail reauth messages
      if (content.includes("gmail") && content.includes("reconnect")) {
        if (!reauthIntegrations.includes("gmail")) {
          reauthIntegrations.push("gmail");
        }
      }

      // Check for Calendar reauth messages
      if (content.includes("calendar") && content.includes("reconnect")) {
        if (!reauthIntegrations.includes("calendar")) {
          reauthIntegrations.push("calendar");
        }
      }

      // Check for generic reauth messages
      if (
        content.includes("needs a quick reconnect") ||
        content.includes("session needs a quick reconnect")
      ) {
        // If it mentions Gmail specifically
        if (content.includes("gmail")) {
          if (!reauthIntegrations.includes("gmail")) {
            reauthIntegrations.push("gmail");
          }
        }
        // If it mentions calendar specifically
        else if (content.includes("calendar")) {
          if (!reauthIntegrations.includes("calendar")) {
            reauthIntegrations.push("calendar");
          }
        }
        // If it's generic, check the conversation context
        else {
          // Look at recent messages to determine which integration is needed
          const recentMessages = messages.slice(-3);
          const recentText = recentMessages
            .map((m) => m.content)
            .join(" ")
            .toLowerCase();

          if (
            recentText.includes("email") ||
            recentText.includes("gmail") ||
            recentText.includes("inbox")
          ) {
            if (!reauthIntegrations.includes("gmail")) {
              reauthIntegrations.push("gmail");
            }
          }
          if (
            recentText.includes("calendar") ||
            recentText.includes("event") ||
            recentText.includes("meeting") ||
            recentText.includes("schedule")
          ) {
            if (!reauthIntegrations.includes("calendar")) {
              reauthIntegrations.push("calendar");
            }
          }
        }
      }
    }

    setDetectedIntegrations(reauthIntegrations);
  }, [messages]);

  const handleReconnect = async (type: IntegrationType) => {
    setConnectingTypes((prev) => new Set(prev).add(type));

    try {
      const response = await connectIntegrationService(type);
      console.log(`${type} reconnect response:`, response);

      const { authUrl } = response;

      if (authUrl) {
        // Open OAuth flow in a new tab
        const popup = window.open(
          authUrl,
          "oauth-popup",
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
          throw new Error("Popup blocked. Please allow popups for this site.");
        }

        // Listen for messages from the popup
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === "INTEGRATION_CALLBACK") {
            const { result } = event.data;

            // Remove the event listener
            window.removeEventListener("message", messageHandler);

            // Handle the result
            if (result.success) {
              console.log(
                `${type} integration completed successfully:`,
                result.message
              );
              // Remove this integration from detected list
              setDetectedIntegrations((prev) => prev.filter((t) => t !== type));
              // Refresh integration data so the AI system knows about the new connection
              actions.refreshIntegrations();
            } else {
              console.error(`${type} integration failed:`, result.error);
            }

            // Clean up connecting state
            setConnectingTypes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(type);
              return newSet;
            });
          }
        };

        window.addEventListener("message", messageHandler);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener("message", messageHandler);

            // Clean up connecting state
            setConnectingTypes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(type);
              return newSet;
            });
          }
        }, 1000);
      } else {
        console.error("No authUrl in response:", response);
      }
    } catch (error) {
      console.error(`Error reconnecting ${type}:`, error);
      setConnectingTypes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
    }
  };

  // Don't render if no integrations need reauth
  if (detectedIntegrations.length === 0) {
    return null;
  }

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="space-y-3">
        <AnimatePresence>
          {detectedIntegrations.map((integrationType) => (
            <ReauthPrompt
              key={integrationType}
              integrationType={integrationType}
              onReconnect={handleReconnect}
              isConnecting={connectingTypes.has(integrationType)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
