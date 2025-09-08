"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Bell, Bot, Network, Share2, Settings, User } from "lucide-react";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";

interface SidebarRailProps {
  className?: string;
  size?: "md" | "lg";
  onOpenNotifications?: () => void;
  onOpenPreferences?: () => void;
  onOpenPerin?: () => void;
}

export default function SidebarRail({
  className = "",
  size = "md",
  onOpenNotifications,
  onOpenPreferences,
}: SidebarRailProps) {
  const { actions } = useUserData();
  const { setNetworkOpen } = actions;
  const [hovered, setHovered] = useState(false);

  const collapsedWidth = size === "lg" ? "w-[80px]" : "w-[64px]";
  const expandedWidth = size === "lg" ? "w-52" : "w-52";
  const itemPad = size === "lg" ? "px-4 py-4" : "px-3 py-3";
  const iconSize = size === "lg" ? "w-7 h-7" : "w-6 h-6";

  const Item = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
  }) => (
    <button
      className={`w-full cursor-pointer flex items-center gap-4 ${itemPad} rounded-xl text-[var(--cta-text)] hover:bg-white/7 border border-transparent hover:border-[var(--card-border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/35`}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className={`${iconSize}`} aria-hidden />
      {hovered && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm"
        >
          {label}
        </motion.span>
      )}
    </button>
  );

  const NotificationItem = () => {
    const { unreadCount, hasUnresolvedNotifications } = useNotifications();

    return (
      <div className="relative">
        <button
          className={`w-full cursor-pointer flex items-center gap-3 ${itemPad} rounded-xl text-[var(--cta-text)] hover:bg-white/7 border border-transparent hover:border-[var(--card-border)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/35`}
          onClick={onOpenNotifications}
          aria-label="Notifications"
        >
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Bell className={`${iconSize}`} aria-hidden />
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-secondary)] px-1 text-xs text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
            {/* Action required indicator */}
            {hasUnresolvedNotifications && (
              <motion.span
                className="absolute -bottom-1 -right-1 inline-flex h-2 w-2 rounded-full bg-orange-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
          {hovered && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm"
            >
              Notifications
            </motion.span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div
      className={`h-auto flex flex-col justify-between ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`rounded-2xl p-2 ${
          hovered ? expandedWidth : collapsedWidth
        } transition-[width] duration-200 border border-[var(--card-border)]`}
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 10%, transparent), color-mix(in oklab, var(--accent-secondary) 10%, transparent))",
        }}
      >
        <div className="space-y-2">
          <NotificationItem />
          <Item
            icon={Network}
            label="Network"
            onClick={() => setNetworkOpen(true)}
          />
          <Item
            icon={Share2}
            label="Talk to My Perin"
            onClick={() => actions.setDelegationOpen(true)}
          />
          <Item
            icon={Settings}
            label="Preferences"
            onClick={onOpenPreferences || (() => {})}
          />
        </div>
      </div>
    </div>
  );
}
