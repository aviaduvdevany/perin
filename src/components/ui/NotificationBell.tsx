"use client";

import { useState, useMemo } from "react";
import { Bell, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Glass } from "./Glass";
import { useNotifications } from "../providers/NotificationContext";
import type { Notification } from "@/types/notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-secondary)] px-1.5 text-xs text-white">
            {unreadCount}
          </span>
        )}
        {hasUnresolvedNotifications && (
          <span className="absolute -bottom-1 -right-1 inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] z-50">
          <Glass
            variant="default"
            border={true}
            glow={false}
            className="border border-[var(--card-border)]"
          >
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--cta-text)]">
                  Notifications
                  {hasUnresolvedNotifications && (
                    <span className="ml-2 text-xs text-orange-500">
                      • Action required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loading && (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--foreground-subtle)]" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshNotifications()}
                    className="text-[var(--foreground-subtle)] hover:text-[var(--cta-text)]"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
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
                      {typeNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-lg p-3 transition-all ${
                            n.is_read
                              ? "opacity-70 hover:opacity-100"
                              : "bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20"
                          } ${
                            n.requires_action && !n.is_resolved
                              ? "border-l-4 border-l-orange-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--cta-text)] truncate">
                                {n.title}
                              </div>
                              {n.body && (
                                <div className="text-xs text-[var(--foreground-subtle)] mt-0.5 line-clamp-2">
                                  {n.body}
                                </div>
                              )}
                              <div className="text-xs text-[var(--foreground-subtle)] mt-1">
                                {new Date(n.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            {!n.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsRead(n.id)}
                                className="flex-shrink-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {n.requires_action && n.is_resolved === false && (
                            <div className="mt-2 text-[0.7rem] text-orange-500 font-medium">
                              ⚠️ Requires action
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
