"use client";

import { Bell } from "lucide-react";
import { Button } from "../ui/button";
import { useNotifications } from "../providers/NotificationContext";

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount, hasUnresolvedNotifications } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
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
  );
}
