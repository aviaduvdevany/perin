"use client";

import { motion } from "framer-motion";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import { Bell, MessageCircle, Network, Settings, Share } from "lucide-react";
import { FloatingInput } from "./FloatingInput";

interface MobileBottomNavigationProps {
  onOpenChat: () => void;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

export default function MobileBottomNavigation({
  onOpenChat,
  onSendMessage,
  isLoading = false,
  className = "",
}: MobileBottomNavigationProps) {
  const { actions } = useUserData();
  const {
    setNetworkOpen,
    setNotificationsOpen,
    setPreferencesOpen,
    setDelegationOpen,
  } = actions;
  const { unreadCount, hasUnresolvedNotifications } = useNotifications();

  const navigationItems = [
    {
      id: "notifications",
      icon: Bell,
      label: "Notifications",
      onClick: () => setNotificationsOpen(true),
      badge:
        unreadCount > 0 ? unreadCount : hasUnresolvedNotifications ? "!" : null,
    },
    {
      id: "talk-to-perin",
      icon: Share,
      label: "Share Me",
      onClick: () => setDelegationOpen(true),
      badge: null,
    },
    {
      id: "network",
      icon: Network,
      label: "Network",
      onClick: () => setNetworkOpen(true),
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
      <div className="backdrop-blur-xl bg-[var(--background-primary)]/90 border-t border-[var(--card-border)]">
        {/* Safe area padding for devices with home indicators */}
        <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Input Component */}
          <div className="px-3 pt-3 pb-2">
            <FloatingInput
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              placeholder="Type your message..."
              disabled={false}
              className="max-w-none"
            />
          </div>

          {/* Navigation Items */}
          <div className="flex items-center justify-around px-4 pt-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  onClick={item.onClick}
                  className="relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Icon */}
                  <div className="relative z-10">
                    <Icon className="w-5 h-5 text-[var(--foreground-muted)] group-hover:text-[var(--cta-text)] transition-colors duration-200" />

                    {/* Badge */}
                    {item.badge && (
                      <motion.div
                        className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[var(--accent-secondary)] flex items-center justify-center"
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
                  <span className="text-xs mt-1 text-[var(--foreground-muted)] group-hover:text-[var(--cta-text)] transition-colors duration-200">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
