"use client";

import { LogOut } from "lucide-react";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useAuth } from "@/hooks/useAuth";

interface SettingsTabProps {
  onClose: () => void;
}

export default function SettingsTab({ onClose }: SettingsTabProps) {
  const { state } = useUserData();
  const { user: profile } = state;
  const { logout } = useAuth();

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
        <h3 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
          Account Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--foreground-muted)]">User ID:</span>
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
            onClick={() => window.open("/legal/terms-of-service", "_blank")}
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
  );
}
