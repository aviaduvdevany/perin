"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PerinAvatar from "./PerinAvatar";
import { getUserProfileService } from "@/app/services/users";

interface ProfileData {
  user: {
    id: string;
    name?: string | null;
    perin_name?: string | null;
    tone?: string | null;
    timezone?: string | null;
    avatar_url?: string | null;
  };
}

interface ProfileSummaryProps {
  className?: string;
}

export default function ProfileSummary({
  className = "",
}: ProfileSummaryProps) {
  const [profile, setProfile] = useState<ProfileData["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data: ProfileData = await getUserProfileService();
        if (mounted) setProfile(data.user);
      } catch (err) {
        // noop: keep placeholder UI
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const name = profile?.name || "Your profile";
  const perinName = profile?.perin_name || "Perin";
  const timezone = profile?.timezone || "Set timezone";

  return (
    <div className={`space-y-4 ${className}`}>
      <motion.div
        className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <PerinAvatar name={perinName} size="md" status="idle" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--cta-text)] truncate">
              {name}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] truncate">
              Timezone: {timezone}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--foreground-muted)]">
            Assistant name
          </p>
          <p className="text-xs font-medium text-[var(--cta-text)]">
            {perinName}
          </p>
        </div>
      </motion.div>

      <motion.div
        className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--foreground-muted)]">Tone</p>
          <p className="text-xs font-medium text-[var(--cta-text)]">
            {profile?.tone || "Friendly"}
          </p>
        </div>
      </motion.div>

      {/* Quick actions entry point */}
      <motion.button
        type="button"
        className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15 transition-colors"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        Edit profile
      </motion.button>
    </div>
  );
}
