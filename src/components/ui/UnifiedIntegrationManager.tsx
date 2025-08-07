"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  connectIntegrationService,
  getAvailableIntegrationsService,
} from "@/app/services/integrations";
import type { IntegrationType } from "@/types/integrations";

interface Integration {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  isConnected?: boolean;
  isConnecting?: boolean;
}

interface UnifiedIntegrationManagerProps {
  className?: string;
  showOnlyConnectable?: boolean; // Show only Gmail and Calendar for now
}

export default function UnifiedIntegrationManager({
  className = "",
  showOnlyConnectable = true,
}: UnifiedIntegrationManagerProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingTypes, setConnectingTypes] = useState<Set<IntegrationType>>(
    new Set()
  );

  useEffect(() => {
    loadAvailableIntegrations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAvailableIntegrations = async () => {
    try {
      const response = await getAvailableIntegrationsService();
      let availableIntegrations = response.integrations || [];

      // If showOnlyConnectable is true, filter to only Gmail and Calendar
      if (showOnlyConnectable) {
        availableIntegrations = availableIntegrations.filter(
          (integration: Integration) =>
            integration.type === "gmail" || integration.type === "calendar"
        );
      }

      setIntegrations(availableIntegrations);
    } catch (error) {
      console.error("Error loading integrations:", error);
      // Fallback to hardcoded list if API fails
      const fallbackIntegrations: Integration[] = [
        {
          type: "gmail",
          name: "Gmail",
          description: "Access and manage your Gmail messages",
          icon: "📧",
        },
        {
          type: "calendar",
          name: "Google Calendar",
          description: "Manage your calendar events and schedule",
          icon: "📅",
        },
      ];

      if (!showOnlyConnectable) {
        fallbackIntegrations.push(
          {
            type: "slack",
            name: "Slack",
            description: "Send messages and manage Slack channels",
            icon: "💬",
          },
          {
            type: "notion",
            name: "Notion",
            description: "Access and manage your Notion pages",
            icon: "📝",
          }
        );
      }

      setIntegrations(fallbackIntegrations);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: IntegrationType) => {
    setConnectingTypes((prev) => new Set(prev).add(type));

    try {
      const response = await connectIntegrationService(type);
      console.log(`${type} connect response:`, response);

      const { authUrl } = response;

      if (authUrl) {
        console.log("Redirecting to:", authUrl);
        window.location.href = authUrl;
      } else {
        console.error("No authUrl in response:", response);
      }
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

  if (loading) {
    return (
      <div className={`unified-integration-manager ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`unified-integration-manager ${className}`}>
      <h3 className="text-lg font-semibold mb-6">Connect Your Services</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration, index) => {
          const isConnecting = connectingTypes.has(integration.type);

          return (
            <motion.div
              key={integration.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="integration-card p-6 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <div
                  className="text-3xl"
                  role="img"
                  aria-label={integration.name}
                >
                  {integration.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {integration.name}
                  </h4>

                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    {integration.description}
                  </p>

                  {integration.isConnected ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 font-medium text-sm">
                          Connected
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Perin can now help you with{" "}
                        {integration.name.toLowerCase()}.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.type)}
                      disabled={isConnecting}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      {isConnecting ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                          <span>Connecting...</span>
                        </span>
                      ) : (
                        `Connect ${integration.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Integration capabilities preview */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {integration.type === "gmail" && (
                    <>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        Read emails
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        Send messages
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        Manage inbox
                      </span>
                    </>
                  )}
                  {integration.type === "calendar" && (
                    <>
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                        Read events
                      </span>
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                        Schedule meetings
                      </span>
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                        Check availability
                      </span>
                    </>
                  )}
                  {integration.type === "slack" && (
                    <>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                        Send messages
                      </span>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                        Manage channels
                      </span>
                    </>
                  )}
                  {integration.type === "notion" && (
                    <>
                      <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded">
                        Read pages
                      </span>
                      <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded">
                        Create content
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showOnlyConnectable && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>More integrations coming soon!</strong> We&apos;re working
            on adding support for Slack, Notion, GitHub, and more.
          </p>
        </div>
      )}
    </div>
  );
}
