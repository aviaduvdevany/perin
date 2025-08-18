"use client";

import BaseModal from "@/components/ui/BaseModal";

interface PerinModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PerinModal({ open, onClose }: PerinModalProps) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Perin"
      description="Your AI assistant"
      size="md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-2xl">
            🤖
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground-primary)] mb-2">
            Perin
          </h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Your AI assistant is here to help you with scheduling,
            communication, and more.
          </p>
        </div>

        <div className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
          <h4 className="text-sm font-medium text-[var(--foreground-primary)] mb-2">
            Coming Soon
          </h4>
          <p className="text-xs text-[var(--foreground-muted)]">
            More Perin features and customization options will be available
            soon.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
