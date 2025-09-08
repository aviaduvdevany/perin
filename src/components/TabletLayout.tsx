"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import {
  Settings,
  Bell,
  Network,
} from "lucide-react";
import { Glass } from "./ui/Glass";
import PerinAvatar from "./ui/PerinAvatar";
import { PerinChat } from "./PerinChat";

interface TabletLayoutProps {
  children?: ReactNode;
  className?: string;
}

export default function TabletLayout({
  children,
  className = "",
}: TabletLayoutProps) {
  const { actions } = useUserData();
  const {
    setNetworkOpen,
    setNotificationsOpen,
    setPreferencesOpen,
  } = actions;
  const { unreadCount, hasUnresolvedNotifications } = useNotifications();

  const quickActions = [
    {
      id: "notifications",
      icon: Bell,
      label: "Notifications",
      onClick: () => setNotificationsOpen(true),
      badge:
        unreadCount > 0 ? unreadCount : hasUnresolvedNotifications ? "!" : null,
    },
    {
      id: "network",
      icon: Network,
      label: "Network",
      onClick: () => setNetworkOpen(true),
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      onClick: () => setPreferencesOpen(true),
    },
  ];

  return (
    <div className={`h-full bg-[var(--background-primary)] flex ${className}`}>
      {/* Tablet Sidebar */}
      <motion.div
        className="w-20 bg-[var(--background-primary)]/80 backdrop-blur-xl border-r border-[var(--card-border)] flex flex-col items-center py-6"
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Perin Avatar */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <PerinAvatar size="md" />
        </motion.div>

        {/* Quick Actions */}
        <div className="flex flex-col items-center space-y-4 flex-1">
          {quickActions.map((action, index) => {
            const Icon = action.icon;

            return (
              <motion.button
                key={action.id}
                onClick={action.onClick}
                className="relative p-3 rounded-2xl bg-white/5 border border-[var(--card-border)] text-[var(--foreground-muted)] hover:text-[var(--cta-text)] hover:bg-white/10 transition-all duration-200 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-6 h-6" />

                {/* Badge */}
                {action.badge && (
                  <motion.div
                    className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-[var(--accent-secondary)] flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <span className="text-xs text-white font-bold">
                      {action.badge === "!"
                        ? "!"
                        : Number(action.badge) > 99
                        ? "99+"
                        : action.badge}
                    </span>
                  </motion.div>
                )}

                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--background-primary)] border border-[var(--card-border)] rounded-lg text-xs text-[var(--cta-text)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {action.label}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Status Indicator */}
        <motion.div
          className="flex flex-col items-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <p className="text-xs text-[var(--foreground-muted)] text-center leading-tight">
            Online
          </p>
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          className="p-6 border-b border-[var(--card-border)] bg-[var(--background-primary)]/80 backdrop-blur-xl"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--cta-text)]">
                Perin
              </h1>
              <p className="text-[var(--foreground-muted)]">
                Your AI-powered digital delegate
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center space-x-4">
              <Glass
                variant="default"
                border={true}
                glow={false}
                className="px-4 py-2"
              >
                <div className="text-center">
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Status
                  </p>
                  <p className="text-sm font-semibold text-[var(--success)]">
                    Active
                  </p>
                </div>
              </Glass>
            </div>
          </div>
        </motion.div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <PerinChat />
        </div>
      </div>
    </div>
  );
}
