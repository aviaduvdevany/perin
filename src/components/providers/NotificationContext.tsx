"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  listNotificationsService,
  markNotificationReadService,
} from "@/app/services/notifications";
import type { Notification } from "@/types/notifications";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  hasUnresolvedNotifications: boolean;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsResolved: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30 * 1000;

  const loadNotifications = useCallback(
    async (force = false) => {
      // Don't reload if we have recent data and not forcing
      if (!force && lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
        return;
      }

      setLoading(true);
      try {
        const res = await listNotificationsService(false);
        const list = (res.notifications || []) as Notification[];
        console.log("Loaded notifications:", list.length, "notifications");
        setNotifications(list);
        setLastFetched(Date.now());
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setLoading(false);
      }
    },
    [lastFetched]
  );

  const refreshNotifications = useCallback(async () => {
    console.log("Manually refreshing notifications...");
    await loadNotifications(true);
  }, [loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationReadService(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAsResolved = useCallback(async (id: string) => {
    try {
      // TODO: Implement resolveNotificationService
      // await resolveNotificationService(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, is_resolved: true, resolved_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as resolved:", error);
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Auto-refresh every 30 seconds (more frequent for better responsiveness)
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 30 * 1000); // 30 seconds instead of 2 minutes

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Calculate derived state
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasUnresolvedNotifications = notifications.some(
    (n) => n.requires_action && !n.is_resolved
  );

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    hasUnresolvedNotifications,
    loading,
    refreshNotifications,
    markAsRead,
    markAsResolved,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
