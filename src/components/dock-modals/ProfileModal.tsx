"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import BaseModal from "@/components/ui/BaseModal";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

interface ProfileModalProps {
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

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { state, actions } = useUserData();
  const { user: profile, loading, errors } = state;
  const { logout } = useAuth();

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "preferences" | "settings"
  >("profile");

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
      onClick={() => setActiveTab(id as "profile" | "preferences" | "settings")}
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
        title="Profile"
        description="Loading your profile information..."
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
      title="Profile & Settings"
      description="Manage your personal information and preferences"
      size="lg"
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabButton id="profile" label="Profile" icon="👤" />
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
          Profile updated successfully!
        </motion.div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-muted)] cursor-not-allowed"
                  placeholder="Email address"
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                Perin&apos;s Name
              </label>
              <input
                type="text"
                value={formData.perin_name}
                onChange={(e) =>
                  handleInputChange("perin_name", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                placeholder="What should Perin call you?"
              />
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                This is how Perin will address you in conversations
              </p>
            </div>
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
              <button className="text-xs text-[var(--accent-primary)] hover:underline">
                View Privacy Policy
              </button>
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
