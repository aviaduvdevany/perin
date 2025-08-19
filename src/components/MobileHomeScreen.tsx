"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import {
  MessageCircle,
  Settings,
  User,
  Bell,
  Plus,
  Calendar,
  Mail,
  Network,
  Sparkles,
} from "lucide-react";
import { Glass } from "./ui/Glass";
import PerinAvatar from "./ui/PerinAvatar";

interface MobileHomeScreenProps {
  onOpenChat: () => void;
  className?: string;
}

export default function MobileHomeScreen({
  onOpenChat,
  className = "",
}: MobileHomeScreenProps) {
  const { actions } = useUserData();
  const {
    setProfileOpen,
    setIntegrationsOpen,
    setNetworkOpen,
    setNotificationsOpen,
    setPreferencesOpen,
    setPerinOpen,
  } = actions;
  const { unreadCount, hasUnresolvedNotifications } = useNotifications();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const quickActions = [
    {
      id: "chat",
      icon: MessageCircle,
      title: "Chat with Perin",
      subtitle: "Ask anything about scheduling, coordination, or assistance",
      color: "from-[var(--accent-primary)] to-[var(--accent-secondary)]",
      onClick: onOpenChat,
      primary: true,
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Notifications",
      subtitle: `${
        unreadCount > 0 ? `${unreadCount} unread` : "All caught up"
      }`,
      color: "from-orange-500 to-red-500",
      onClick: () => setNotificationsOpen(true),
      badge:
        unreadCount > 0 ? unreadCount : hasUnresolvedNotifications ? "!" : null,
    },
    {
      id: "integrations",
      icon: Plus,
      title: "Connect Services",
      subtitle: "Gmail, Calendar, and more",
      color: "from-green-500 to-blue-500",
      onClick: () => setIntegrationsOpen(true),
    },
    {
      id: "network",
      icon: Network,
      title: "Network",
      subtitle: "Manage connections and sessions",
      color: "from-purple-500 to-pink-500",
      onClick: () => setNetworkOpen(true),
    },
  ];

  const secondaryActions = [
    {
      id: "profile",
      icon: User,
      title: "Profile",
      onClick: () => setProfileOpen(true),
    },
    {
      id: "settings",
      icon: Settings,
      title: "Settings",
      onClick: () => setPreferencesOpen(true),
    },
    {
      id: "perin",
      icon: Sparkles,
      title: "About Perin",
      onClick: () => setPerinOpen(true),
    },
  ];

  return (
    <div
      className={`h-full bg-[var(--background-primary)] overflow-y-auto ${className}`}
    >
      {/* Header */}
      <motion.div
        className="p-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PerinAvatar size="lg" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--cta-text)]">
              Welcome back
            </h1>
            <p className="text-[var(--foreground-muted)]">
              Ready to help you stay organized
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="px-6 pb-6">
        <motion.h2
          className="text-lg font-semibold text-[var(--cta-text)] mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Quick Actions
        </motion.h2>

        <div className="space-y-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            const isSelected = selectedCard === action.id;

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              >
                <Glass
                  variant="default"
                  border={true}
                  glow={action.primary}
                  className="p-4 cursor-pointer transition-all duration-200"
                  onClick={() => {
                    action.onClick();
                    setSelectedCard(action.id);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative p-3 rounded-2xl bg-gradient-to-r ${action.color} shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                      {action.badge && (
                        <motion.div
                          className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-white flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                          }}
                        >
                          <span className="text-xs text-black font-bold">
                            {action.badge === "!"
                              ? "!"
                              : Number(action.badge) > 99
                              ? "99+"
                              : action.badge}
                          </span>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--cta-text)] mb-1">
                        {action.title}
                      </h3>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        {action.subtitle}
                      </p>
                    </div>
                    <div className="text-[var(--foreground-muted)]">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </Glass>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="px-6 pb-6">
        <motion.h2
          className="text-lg font-semibold text-[var(--cta-text)] mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          More Options
        </motion.h2>

        <div className="grid grid-cols-3 gap-3">
          {secondaryActions.map((action, index) => {
            const Icon = action.icon;

            return (
              <motion.button
                key={action.id}
                onClick={action.onClick}
                className="p-4 rounded-2xl bg-white/5 border border-[var(--card-border)] text-center transition-all duration-200 hover:bg-white/10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-6 h-6 text-[var(--foreground-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--foreground-muted)]">
                  {action.title}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="px-6 pb-6">
        <motion.div
          className="p-4 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <p className="text-sm text-[var(--foreground-muted)]">
              Perin is online and ready to help
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom spacing for navigation */}
      <div className="h-24" />
    </div>
  );
}
