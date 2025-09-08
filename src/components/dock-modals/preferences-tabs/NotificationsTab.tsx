"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotificationPreferencesService,
  updateNotificationPreferencesService,
} from "@/app/services/notifications";

interface NotificationPreferences {
  timezone?: string | null;
  dnd?: Record<string, unknown> | null;
  channels?: Record<string, unknown> | null;
  digest?: Record<string, unknown> | null;
}

export default function NotificationsTab() {
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load notification preferences
  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    setLoadingPrefs(true);
    try {
      const prefs = await getNotificationPreferencesService();
      setNotificationPrefs(prefs);
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const updateNotificationPreferences = async (
    updates: Partial<NotificationPreferences>
  ) => {
    if (!notificationPrefs) return;

    setSavingPrefs(true);
    try {
      const updatedPrefs = { ...notificationPrefs, ...updates };
      await updateNotificationPreferencesService(updatedPrefs);
      setNotificationPrefs(updatedPrefs);
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleChannel = async (channel: string) => {
    const currentChannels = notificationPrefs?.channels || {};
    const updatedChannels = {
      ...currentChannels,
      [channel]: !currentChannels[channel],
    };
    await updateNotificationPreferences({ channels: updatedChannels });
  };

  const toggleDnd = async (enabled: boolean) => {
    const dndSettings = enabled
      ? {
          enabled: true,
          startTime: "22:00",
          endTime: "08:00",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      : null;
    await updateNotificationPreferences({ dnd: dndSettings });
  };

  const toggleDigest = async (enabled: boolean) => {
    const digestSettings = enabled
      ? {
          enabled: true,
          frequency: "daily",
          time: "09:00",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      : null;
    await updateNotificationPreferences({ digest: digestSettings });
  };

  const isChannelEnabled = (channel: string) => {
    return notificationPrefs?.channels?.[channel] !== false;
  };

  const isDndEnabled = () => {
    return notificationPrefs?.dnd?.enabled === true;
  };

  const isDigestEnabled = () => {
    return notificationPrefs?.digest?.enabled === true;
  };

  return (
    <div className="space-y-4">
      {loadingPrefs ? (
        <div className="text-sm text-[var(--foreground-subtle)]">
          Loading notification preferences...
        </div>
      ) : (
        <>
          {/* Channels */}
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
              Notification Channels
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[var(--foreground-subtle)]" />
                  <span className="text-sm">Push Notifications</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChannel("push")}
                  className={
                    isChannelEnabled("push")
                      ? "text-green-500"
                      : "text-gray-400"
                  }
                >
                  {isChannelEnabled("push") ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--foreground-subtle)]" />
                  <span className="text-sm">Email</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChannel("email")}
                  className={
                    isChannelEnabled("email")
                      ? "text-green-500"
                      : "text-gray-400"
                  }
                >
                  {isChannelEnabled("email") ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Do Not Disturb */}
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
              Do Not Disturb
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--foreground-subtle)]" />
                <span className="text-sm">Quiet Hours (10 PM - 8 AM)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDnd(!isDndEnabled())}
                className={isDndEnabled() ? "text-green-500" : "text-gray-400"}
              >
                {isDndEnabled() ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Digest */}
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
              Daily Digest
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--foreground-subtle)]" />
                <span className="text-sm">Morning summary at 9 AM</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDigest(!isDigestEnabled())}
                className={
                  isDigestEnabled() ? "text-green-500" : "text-gray-400"
                }
              >
                {isDigestEnabled() ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {savingPrefs && (
            <div className="text-xs text-[var(--foreground-subtle)] text-center">
              Saving changes...
            </div>
          )}
        </>
      )}
    </div>
  );
}
