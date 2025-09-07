"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Clock, Mail, Smartphone, LogOut } from "lucide-react";
import BaseModal from "@/components/ui/BaseModal";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  getNotificationPreferencesService,
  updateNotificationPreferencesService,
} from "@/app/services/notifications";

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  perin_name: string;
  tone: string;
  timezone: string;
  preferred_hours: {
    start: string;
    end: string;
  };
}

interface NotificationPreferences {
  timezone?: string | null;
  dnd?: Record<string, unknown> | null;
  channels?: Record<string, unknown> | null;
  digest?: Record<string, unknown> | null;
}

export default function PreferencesModal({
  open,
  onClose,
}: PreferencesModalProps) {
  const { state, actions } = useUserData();
  const { user: profile, loading, errors } = state;
  const { logout } = useAuth();

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "notifications" | "preferences" | "settings"
  >("notifications");

  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    perin_name: "Perin",
    tone: "friendly",
    timezone: "UTC",
    preferred_hours: {
      start: "09:00",
      end: "17:00",
    },
  });

  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Initialize form data when profile is loaded
  useEffect(() => {
    if (profile && open) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        perin_name: profile.perin_name || "Perin",
        tone: profile.tone || "friendly",
        timezone: profile.timezone || "UTC",
        preferred_hours: (profile.preferred_hours as {
          start: string;
          end: string;
        }) || {
          start: "09:00",
          end: "17:00",
        },
      });
    }
  }, [profile, open]);

  // Load notification preferences
  useEffect(() => {
    if (open && activeTab === "notifications") {
      loadNotificationPreferences();
    }
  }, [open, activeTab]);

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

  const handleSave = async () => {
    try {
      setSaving(true);

      await actions.updateUser({
        name: formData.name,
        perin_name: formData.perin_name,
        tone: formData.tone,
        timezone: formData.timezone,
        preferred_hours: formData.preferred_hours,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    field: keyof ProfileFormData,
    value: string | object
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const TabButton = ({
    id,
    label,
    icon,
  }: {
    id: string;
    label: string;
    icon: string;
  }) => (
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
        activeTab === id
          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)] hover:bg-white/5"
      }`}
      onClick={() =>
        setActiveTab(id as "notifications" | "preferences" | "settings")
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  if (loading.user) {
    return (
      <BaseModal
        open={open}
        onClose={onClose}
        title="Preferences"
        description="Loading your preferences..."
        size="lg"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Preferences & Settings"
      description="Manage your notifications, preferences, and account settings"
      size="lg"
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabButton id="notifications" label="Notifications" icon="🔔" />
        <TabButton id="preferences" label="Preferences" icon="⚙️" />
        <TabButton id="settings" label="Settings" icon="🔧" />
      </div>

      {/* Error/Success Messages */}
      {errors.user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          {errors.user}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
        >
          Preferences updated successfully!
        </motion.div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "notifications" && (
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
        )}

        {activeTab === "preferences" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Conversation Tone
              </label>
              <select
                value={formData.tone}
                onChange={(e) => handleInputChange("tone", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange("timezone", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Asia/Kolkata">Mumbai</option>
                <option value="Asia/Jerusalem">Jerusalem</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Preferred Working Hours
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--foreground-muted)] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.preferred_hours.start}
                    onChange={(e) =>
                      handleInputChange("preferred_hours", {
                        ...formData.preferred_hours,
                        start: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-muted)] mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.preferred_hours.end}
                    onChange={(e) =>
                      handleInputChange("preferred_hours", {
                        ...formData.preferred_hours,
                        end: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                Perin will prefer to schedule meetings during these hours
              </p>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
              <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Account Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">
                    User ID:
                  </span>
                  <span className="text-[var(--foreground-primary)] font-mono text-xs">
                    {profile?.id || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">
                    Member Since:
                  </span>
                  <span className="text-[var(--foreground-primary)]">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">
                    Last Updated:
                  </span>
                  <span className="text-[var(--foreground-primary)]">
                    {profile?.updated_at
                      ? new Date(profile.updated_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
              <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Data & Privacy
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                Your data is encrypted and stored securely. We never share your
                personal information with third parties.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => window.open("/legal/privacy-policy", "_blank")}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() =>
                    window.open("/legal/terms-of-service", "_blank")
                  }
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
              <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Account Actions
              </h3>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-sm"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {activeTab !== "settings" && (
        <div className="flex justify-end pt-4 border-t border-[var(--card-border)]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 disabled:bg-[var(--accent-primary)]/50 text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </BaseModal>
  );
}
