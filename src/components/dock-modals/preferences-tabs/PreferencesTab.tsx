"use client";

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

interface PreferencesTabProps {
  onSave: (formData: ProfileFormData) => void;
  saving: boolean;
  formData: ProfileFormData;
  onFormDataChange: (
    field: keyof ProfileFormData,
    value: string | object
  ) => void;
}

export default function PreferencesTab({
  onSave,
  saving,
  formData,
  onFormDataChange,
}: PreferencesTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
          Conversation Tone
        </label>
        <select
          value={formData.tone}
          onChange={(e) => onFormDataChange("tone", e.target.value)}
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
          onChange={(e) => onFormDataChange("timezone", e.target.value)}
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
                onFormDataChange("preferred_hours", {
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
                onFormDataChange("preferred_hours", {
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

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-[var(--card-border)]">
        <button
          onClick={() => onSave(formData)}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 disabled:bg-[var(--accent-primary)]/50 text-white text-sm font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
