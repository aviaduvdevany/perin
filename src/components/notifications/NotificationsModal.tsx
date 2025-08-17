"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Glass } from "../ui/Glass";
import { useNotifications } from "../providers/NotificationContext";
import TimeProposalModal from "./TimeProposalModal";
import {
  confirmTimeProposalService,
  declineTimeProposalService,
  getSessionProposalsService,
} from "@/app/services/notifications";
import type { Notification } from "@/types/notifications";

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenProposalModal: (data: {
    sessionId: string;
    messageId: string;
    proposals: Array<{ start: string; end: string; tz?: string }>;
    durationMins: number;
    initiatorName?: string;
    notificationId: string;
  }) => void;
}

// Utility functions for formatting
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes === 0 ? "Just now" : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours}h ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else if (diffInHours < 168) {
    // 7 days
    const days = Math.floor(diffInHours / 24);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};

const formatMeetingTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatUserDisplayName = (notification: Notification): string => {
  // Try to get the most user-friendly name
  if (notification.user_name) {
    return notification.user_name;
  }
  if (notification.user_perin_name) {
    return notification.user_perin_name;
  }
  if (notification.user_email) {
    return notification.user_email.split("@")[0]; // Just the username part
  }
  return "Someone";
};

const formatNotificationBody = (notification: Notification): string => {
  const originalBody = notification.body || "";

  // Replace user IDs with display names
  if (
    notification.user_name ||
    notification.user_perin_name ||
    notification.user_email
  ) {
    const displayName = formatUserDisplayName(notification);

    // Replace common patterns
    let formattedBody = originalBody
      .replace(/User [a-f0-9-]{36}/g, displayName) // Replace UUID patterns
      .replace(
        /User [a-f0-9-]{8}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{12}/g,
        displayName
      ); // Full UUID pattern

    // Replace ISO timestamps with readable meeting times
    formattedBody = formattedBody.replace(
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/g,
      (match) => formatMeetingTime(match)
    );

    return formattedBody;
  }

  // Even if no user data, still format timestamps
  const formattedBody = originalBody.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/g,
    (match) => formatMeetingTime(match)
  );

  return formattedBody;
};

export default function NotificationsModal({
  open,
  onClose,
  onOpenProposalModal,
}: NotificationsModalProps) {
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  const {
    notifications,
    unreadCount,
    hasUnresolvedNotifications,
    loading,
    markAsRead,
    refreshNotifications,
  } = useNotifications();

  // Group notifications by type for better UX
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};

    notifications.forEach((notification) => {
      const type = notification.type.split(".")[0]; // network, calendar, etc.
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
    });

    return groups;
  }, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Don't allow clicking on resolved notifications
    if (notification.is_resolved) {
      return;
    }

    // Check if this is a time proposal notification
    if (
      notification.type === "network.message.received" &&
      notification.action_ref?.kind === "network.proposals"
    ) {
      const sessionId = notification.action_ref.sessionId as string;
      const messageId = notification.action_ref.messageId as string;

      if (!sessionId) return;

      setIsLoadingModal(true);
      try {
        // Fetch the proposal data
        const proposalData = await getSessionProposalsService(sessionId);

        const modalData = {
          sessionId,
          messageId,
          proposals: proposalData.proposals,
          durationMins: proposalData.durationMins,
          notificationId: notification.id,
        };

        // Close notifications modal and open proposal modal
        onClose();
        onOpenProposalModal(modalData);
      } catch (error) {
        console.error("Failed to load proposal data:", error);
      } finally {
        setIsLoadingModal(false);
      }
    }
  };

  const getNotificationStatus = (notification: Notification) => {
    if (notification.is_resolved) {
      return {
        type: "resolved" as const,
        color: "green",
        icon: <CheckCircle className="h-3 w-3" />,
        text: "Resolved",
        borderColor: "border-l-green-500",
        bgColor: "bg-green-500/5",
        borderColorHover: "hover:border-green-400/50",
        bgColorHover: "hover:bg-green-500/5",
        cursor: "cursor-default",
        opacity: "opacity-60",
      };
    }

    if (notification.requires_action && !notification.is_resolved) {
      return {
        type: "actionable" as const,
        color: "orange",
        icon: null,
        text: "Requires action",
        borderColor: "border-l-orange-500",
        bgColor: "bg-orange-500/5",
        borderColorHover: "hover:border-orange-400/50",
        bgColorHover: "hover:bg-orange-500/10",
        cursor: "cursor-pointer",
        opacity: "opacity-100",
      };
    }

    return {
      type: "normal" as const,
      color: "blue",
      icon: null,
      text: null,
      borderColor: "",
      bgColor: "bg-[var(--accent-primary)]/5",
      borderColorHover: "hover:border-[var(--accent-primary)]/50",
      bgColorHover: "hover:bg-[var(--accent-primary)]/10",
      cursor: "cursor-pointer",
      opacity: notification.is_read ? "opacity-70" : "opacity-100",
    };
  };

  return (
    <>
      {/* Main Notifications Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Full-screen backdrop with diffusing effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-md"
              onClick={onClose}
            />

            {/* Notifications Panel - Emerging from sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.3,
              }}
              className="absolute left-20 top-20 w-96 max-w-[calc(100vw-5rem)] z-10"
            >
              <Glass
                variant="default"
                border={true}
                glow={true}
                className="border border-[var(--card-border)] shadow-2xl backdrop-blur-xl"
              >
                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                        <span className="text-lg">🔔</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--cta-text)]">
                          Notifications
                        </div>
                        {hasUnresolvedNotifications && (
                          <div className="text-xs text-orange-500 font-medium">
                            Action required
                          </div>
                        )}
                      </div>
                    </motion.div>
                    <div className="flex items-center gap-2">
                      {loading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--foreground-subtle)]" />
                        </motion.div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshNotifications()}
                        className="text-[var(--foreground-subtle)] hover:text-[var(--cta-text)] transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-[var(--foreground-subtle)] hover:text-[var(--cta-text)] transition-colors"
                      >
                        Close
                      </Button>
                    </div>
                  </div>

                  <motion.div
                    className="max-h-96 overflow-y-auto space-y-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {loading && notifications.length === 0 && (
                      <div className="text-sm text-[var(--foreground-subtle)] flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading notifications...
                      </div>
                    )}

                    {!loading && notifications.length === 0 && (
                      <div className="text-sm text-[var(--foreground-subtle)] text-center py-4">
                        No notifications yet
                      </div>
                    )}

                    {Object.entries(groupedNotifications).map(
                      ([type, typeNotifications]) => (
                        <div key={type} className="space-y-2">
                          <div className="text-xs font-medium text-[var(--foreground-subtle)] uppercase tracking-wide">
                            {type}
                          </div>
                          {typeNotifications.map((n) => {
                            const status = getNotificationStatus(n);

                            return (
                              <div
                                key={n.id}
                                className={`rounded-lg p-3 transition-all ${
                                  status.cursor
                                } ${
                                  status.borderColor
                                    ? `border-l-4 ${status.borderColor}`
                                    : ""
                                } ${status.bgColor} ${
                                  status.borderColorHover
                                } ${status.bgColorHover} ${status.opacity}`}
                                onClick={() => handleNotificationClick(n)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-[var(--cta-text)] truncate">
                                      {n.title}
                                    </div>
                                    {n.body && (
                                      <div className="text-xs text-[var(--foreground-subtle)] mt-0.5 line-clamp-2">
                                        {formatNotificationBody(n)}
                                      </div>
                                    )}
                                    <div className="text-xs text-[var(--foreground-subtle)] mt-1">
                                      {formatTime(n.created_at)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {status.icon && (
                                      <div
                                        className={`text-${status.color}-500`}
                                      >
                                        {status.icon}
                                      </div>
                                    )}
                                    {!n.is_read && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(n.id);
                                        }}
                                        className="flex-shrink-0"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {status.text && (
                                  <div
                                    className={`mt-2 text-[0.7rem] text-${status.color}-500 font-medium flex items-center gap-1`}
                                  >
                                    {status.icon && status.icon}
                                    {status.text}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </motion.div>
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Modal - Centered */}
      <AnimatePresence>
        {isLoadingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--background-primary)] rounded-2xl p-6 border border-[var(--card-border)] shadow-2xl"
            >
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-[var(--foreground-muted)]">
                  Loading proposal details...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
