"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Settings, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/Glass";
import {
  getNotificationPreferencesService,
  updateNotificationPreferencesService,
} from "@/app/(main-app)/services/notifications";

interface NotificationPreferences {
  timezone?: string | null;
  dnd?: Record<string, unknown> | null;
  channels?: Record<string, unknown> | null;
  digest?: Record<string, unknown> | null;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await getNotificationPreferencesService();
      setPreferences(prefs);
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const updatePreferences = async (
    updates: Partial<NotificationPreferences>
  ) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const updatedPrefs = { ...preferences, ...updates };
      await updateNotificationPreferencesService(updatedPrefs);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (channel: string) => {
    const currentChannels = preferences?.channels || {};
    const updatedChannels = {
      ...currentChannels,
      [channel]: !currentChannels[channel],
    };
    await updatePreferences({ channels: updatedChannels });
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
    await updatePreferences({ dnd: dndSettings });
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
    await updatePreferences({ digest: digestSettings });
  };

  const isChannelEnabled = (channel: string) => {
    return preferences?.channels?.[channel] !== false;
  };

  const isDndEnabled = () => {
    return preferences?.dnd?.enabled === true;
  };

  const isDigestEnabled = () => {
    return preferences?.digest?.enabled === true;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50">
          <Glass
            variant="default"
            border={true}
            glow={false}
            className="border border-[var(--card-border)]"
          >
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--cta-text)]">
                  Notification Settings
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
              </div>

              {loading ? (
                <div className="text-sm text-[var(--foreground-subtle)]">
                  Loading preferences...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Channels */}
                  <div>
                    <h3 className="text-sm font-medium text-[var(--cta-text)] mb-2">
                      Notification Channels
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
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
                      <div className="flex items-center justify-between">
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
                    <h3 className="text-sm font-medium text-[var(--cta-text)] mb-2">
                      Do Not Disturb
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[var(--foreground-subtle)]" />
                        <span className="text-sm">
                          Quiet Hours (10 PM - 8 AM)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDnd(!isDndEnabled())}
                        className={
                          isDndEnabled() ? "text-green-500" : "text-gray-400"
                        }
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
                    <h3 className="text-sm font-medium text-[var(--cta-text)] mb-2">
                      Daily Digest
                    </h3>
                    <div className="flex items-center justify-between">
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

                  {saving && (
                    <div className="text-xs text-[var(--foreground-subtle)] text-center">
                      Saving changes...
                    </div>
                  )}
                </div>
              )}
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
