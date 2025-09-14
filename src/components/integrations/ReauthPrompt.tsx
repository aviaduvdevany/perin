"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Mail,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Glass } from "../ui/Glass";
import type { IntegrationType } from "@/types/integrations";

interface ReauthPromptProps {
  integrationType: IntegrationType;
  onReconnect: (type: IntegrationType) => Promise<void>;
  isConnecting?: boolean;
  className?: string;
}

const integrationConfig: Record<
  IntegrationType,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    description: string;
    capabilities: string[];
  }
> = {
  gmail: {
    name: "Gmail",
    icon: Mail,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    description: "Access your emails and manage your inbox",
    capabilities: ["Read emails", "Send messages", "Manage inbox"],
  },
  calendar: {
    name: "Google Calendar",
    icon: Calendar,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    description: "Manage your calendar events and schedule meetings",
    capabilities: ["Read events", "Schedule meetings", "Check availability"],
  },
  slack: {
    name: "Slack",
    icon: Mail, // Fallback icon
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-800",
    description: "Send messages and manage Slack channels",
    capabilities: ["Send messages", "Manage channels"],
  },
  notion: {
    name: "Notion",
    icon: Mail, // Fallback icon
    color: "from-gray-500 to-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    textColor: "text-gray-800",
    description: "Access and manage your Notion pages",
    capabilities: ["Read pages", "Create content"],
  },
  zoom: {
    name: "Zoom",
    icon: Mail, // Fallback icon
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    description: "Schedule and manage Zoom meetings",
    capabilities: ["Schedule meetings", "Manage rooms"],
  },
  teams: {
    name: "Microsoft Teams",
    icon: Mail, // Fallback icon
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    description: "Schedule and manage Teams meetings",
    capabilities: ["Schedule meetings", "Manage channels"],
  },
  github: {
    name: "GitHub",
    icon: Mail, // Fallback icon
    color: "from-gray-500 to-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    textColor: "text-gray-800",
    description: "Access and manage your GitHub repositories",
    capabilities: ["Read repos", "Create issues", "Manage PRs"],
  },
  discord: {
    name: "Discord",
    icon: Mail, // Fallback icon
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-800",
    description: "Send messages and manage Discord channels",
    capabilities: ["Send messages", "Manage channels"],
  },
};

export function ReauthPrompt({
  integrationType,
  onReconnect,
  isConnecting = false,
  className = "",
}: ReauthPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reconnectSuccess, setReconnectSuccess] = useState(false);

  const config = integrationConfig[integrationType];
  const IconComponent = config.icon;

  const handleReconnect = async () => {
    try {
      await onReconnect(integrationType);
      setReconnectSuccess(true);
      // Auto-collapse after success
      setTimeout(() => {
        setIsExpanded(false);
        setReconnectSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Reconnect failed:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`max-w-[85%] lg:max-w-lg ${className}`}
    >
      <Glass
        variant="default"
        border={true}
        glow={false}
        className="overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start space-x-3 p-4">
          <motion.div
            className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} text-white shadow-lg`}
            animate={{
              scale: isConnecting ? [1, 1.1, 1] : 1,
              rotate: isConnecting ? [0, 5, -5, 0] : 0,
            }}
            transition={{
              duration: 2,
              repeat: isConnecting ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <IconComponent className="w-5 h-5" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-semibold text-[var(--cta-text)]">
                {config.name} Access Needed
              </h3>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </motion.div>
            </div>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              {config.description} requires re-authentication to continue.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 pb-4">
          <motion.button
            onClick={handleReconnect}
            disabled={isConnecting || reconnectSuccess}
            className={`
              w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm
              transition-all duration-200 transform
              ${
                reconnectSuccess
                  ? "bg-green-500 text-white cursor-default"
                  : isConnecting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : `bg-gradient-to-r ${config.color} text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`
              }
              disabled:transform-none
            `}
            whileHover={
              !isConnecting && !reconnectSuccess ? { scale: 1.02 } : {}
            }
            whileTap={!isConnecting && !reconnectSuccess ? { scale: 0.98 } : {}}
          >
            <AnimatePresence mode="wait">
              {reconnectSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Reconnected!</span>
                </motion.div>
              ) : isConnecting ? (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="reconnect"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Reconnect {config.name}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Expandable Details */}
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 flex items-center justify-center space-x-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--cta-text)] transition-colors"
          >
            <span>Why is this needed?</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className={`mt-3 p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}
                >
                  <div className="space-y-2">
                    <p className={`text-xs ${config.textColor} font-medium`}>
                      Security & Privacy
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                      Your {config.name} access token has expired for security
                      reasons. This is normal and helps keep your account
                      secure.
                    </p>

                    <div className="pt-2">
                      <p
                        className={`text-xs ${config.textColor} font-medium mb-1`}
                      >
                        What Perin can do with {config.name}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {config.capabilities.map(
                          (capability: string, index: number) => (
                            <span
                              key={index}
                              className={`px-2 py-1 text-xs rounded-md ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
                            >
                              {capability}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Glass>
    </motion.div>
  );
}
