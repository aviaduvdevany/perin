"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import { MessageCircle, Settings, User, Bell, Plus } from "lucide-react";

interface MobileBottomNavigationProps {
  onOpenChat: () => void;
  className?: string;
}

export default function MobileBottomNavigation({
  onOpenChat,
  className = "",
}: MobileBottomNavigationProps) {
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
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const navigationItems = [
    {
      id: "chat",
      icon: MessageCircle,
      label: "Chat",
      onClick: onOpenChat,
      badge: null,
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Notifications",
      onClick: () => setNotificationsOpen(true),
      badge:
        unreadCount > 0 ? unreadCount : hasUnresolvedNotifications ? "!" : null,
    },
    {
      id: "profile",
      icon: User,
      label: "Profile",
      onClick: () => setProfileOpen(true),
      badge: null,
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      onClick: () => setPreferencesOpen(true),
      badge: null,
    },
  ];

  return (
    <motion.div
      className={`xl:hidden fixed bottom-0 left-0 right-0 z-50 ${className}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Background blur and border */}
      <div className="backdrop-blur-xl bg-[var(--background-primary)]/80 border-t border-[var(--card-border)]">
        {/* Safe area padding for devices with home indicators */}
        <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-center justify-around px-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    item.onClick();
                    setActiveTab(item.id);
                  }}
                  className="relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Active indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 rounded-2xl border border-[var(--accent-primary)]/30"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon */}
                  <div className="relative z-10">
                    <Icon
                      className={`w-6 h-6 transition-colors duration-200 ${
                        isActive
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--foreground-muted)] group-hover:text-[var(--cta-text)]"
                      }`}
                    />

                    {/* Badge */}
                    {item.badge && (
                      <motion.div
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[var(--accent-secondary)] flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {item.badge === "!"
                            ? "!"
                            : Number(item.badge) > 99
                            ? "99+"
                            : item.badge}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-xs mt-1 transition-colors duration-200 ${
                      isActive
                        ? "text-[var(--accent-primary)] font-medium"
                        : "text-[var(--foreground-muted)] group-hover:text-[var(--cta-text)]"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* Quick Actions FAB */}
            <motion.button
              onClick={() => setIntegrationsOpen(true)}
              className="relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative z-10">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-xs mt-1 text-[var(--foreground-muted)] group-hover:text-[var(--cta-text)] transition-colors duration-200">
                Connect
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
