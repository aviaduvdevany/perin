"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "./button";
import { Glass } from "./Glass";
import {
  listNotificationsService,
  markNotificationReadService,
} from "@/app/services/notifications";
import type { Notification } from "@/types/notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listNotificationsService(false);
      const list = (res.notifications || []) as Notification[];
      setNotifications(list);
      setUnreadCount(
        (res.unreadCount as number) || list.filter((n) => !n.is_read).length
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    try {
      await markNotificationReadService(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-secondary)] px-1.5 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw]">
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
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading && (
                  <div className="text-sm text-[var(--foreground-subtle)]">
                    Loading...
                  </div>
                )}
                {!loading && notifications.length === 0 && (
                  <div className="text-sm text-[var(--foreground-subtle)]">
                    No notifications
                  </div>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg p-3 transition ${
                      n.is_read ? "opacity-70" : "bg-[var(--accent-primary)]/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-[var(--cta-text)]">
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-xs text-[var(--foreground-subtle)] mt-0.5">
                            {n.body}
                          </div>
                        )}
                      </div>
                      {!n.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markRead(n.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {n.requires_action && n.is_resolved === false && (
                      <div className="mt-2 text-[0.7rem] text-[var(--accent-secondary)]">
                        Requires action
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
