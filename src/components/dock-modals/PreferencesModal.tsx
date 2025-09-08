"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plug, Bell, Settings, User } from "lucide-react";
import BaseModal from "@/components/ui/BaseModal";
import { useUserData } from "@/components/providers/UserDataProvider";
import {
  IntegrationsTab,
  NotificationsTab,
  PreferencesTab,
  SettingsTab,
} from "./preferences-tabs";

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

export default function PreferencesModal({
  open,
  onClose,
}: PreferencesModalProps) {
  const { state, actions } = useUserData();
  const { user: profile, loading, errors } = state;

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "integrations" | "notifications" | "preferences" | "settings"
  >("integrations");

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

  const handleSave = async (data: ProfileFormData) => {
    try {
      setSaving(true);

      await actions.updateUser({
        name: data.name,
        perin_name: data.perin_name,
        tone: data.tone,
        timezone: data.timezone,
        preferred_hours: data.preferred_hours,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFormDataChange = (
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
    icon: Icon,
  }: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
        activeTab === id
          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)] hover:bg-white/5"
      }`}
      onClick={() =>
        setActiveTab(
          id as "integrations" | "notifications" | "preferences" | "settings"
        )
      }
    >
      <Icon className="w-4 h-4" />
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
      description="Manage your integrations, notifications, preferences, and account settings"
      size="lg"
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          <TabButton id="integrations" label="Integrations" icon={Plug} />
          <TabButton id="notifications" label="Notifications" icon={Bell} />
          <TabButton id="preferences" label="Preferences" icon={Settings} />
          <TabButton id="settings" label="Settings" icon={User} />
        </div>
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
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "preferences" && (
          <PreferencesTab
            onSave={handleSave}
            saving={saving}
            formData={formData}
            onFormDataChange={handleFormDataChange}
          />
        )}
        {activeTab === "settings" && <SettingsTab onClose={onClose} />}
      </div>
    </BaseModal>
  );
}
