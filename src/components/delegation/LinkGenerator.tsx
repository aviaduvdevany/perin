"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/Glass";
import {
  createDelegationService,
  copyToClipboard,
  shareDelegationLink,
  validateConstraints,
} from "@/app/services/delegation";
import type {
  CreateDelegationRequest,
  MeetingConstraints,
  CreateDelegationResponse,
} from "@/types/delegation";
import {
  Clock,
  Calendar,
  Video,
  Phone,
  MapPin,
  Copy,
  Share2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LinkGeneratorProps {
  onGenerate: (delegation: CreateDelegationResponse) => void;
}

export default function LinkGenerator({ onGenerate }: LinkGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDelegation, setGeneratedDelegation] =
    useState<CreateDelegationResponse | null>(null);

  // Form state
  const [ttlHours, setTtlHours] = useState(24);
  const [externalUserName, setExternalUserName] = useState("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [constraints, setConstraints] = useState<Partial<MeetingConstraints>>(
    {}
  );

  const ttlOptions = [
    { value: 1, label: "1 hour" },
    { value: 24, label: "24 hours" },
    { value: 168, label: "1 week" },
    { value: 720, label: "30 days" },
  ];

  const meetingTypes = [
    { value: "video", label: "Video Call", icon: Video },
    { value: "phone", label: "Phone Call", icon: Phone },
    { value: "in_person", label: "In Person", icon: MapPin },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only validate constraints if any are set
      if (Object.keys(constraints).length > 0) {
        const validation = validateConstraints(constraints);
        if (!validation.isValid) {
          setError(validation.errors[0]);
          return;
        }
      }

      const request: CreateDelegationRequest = {
        ttlHours,
        constraints:
          Object.keys(constraints).length > 0
            ? (constraints as MeetingConstraints)
            : undefined,
        externalUserName: externalUserName || undefined,
      };

      const delegation = await createDelegationService(request);
      setGeneratedDelegation(delegation);
      onGenerate(delegation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedDelegation) return;

    const success = await copyToClipboard(generatedDelegation.shareableUrl);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!generatedDelegation) return;

    await shareDelegationLink(generatedDelegation.shareableUrl);
  };

  const updateConstraint = (
    key: keyof MeetingConstraints,
    value: string | number | undefined
  ) => {
    setConstraints((prev) => {
      if (value === undefined) {
        const newConstraints = { ...prev };
        delete newConstraints[key];
        return newConstraints;
      }
      return { ...prev, [key]: value };
    });
  };

  if (generatedDelegation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Glass variant="default" border={true} glow={true} className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--success)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[var(--success)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--cta-text)] mb-2">
              🎉 Link Generated Successfully!
            </h3>
            <p className="text-[var(--foreground-muted)]">
              Share this link with others to let them chat with your Perin AI
            </p>
          </div>

          <div className="bg-[var(--background-secondary)]/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-[var(--foreground-muted)] mb-2">
              Shareable Link
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatedDelegation.shareableUrl}
                readOnly
                className="flex-1 bg-transparent text-[var(--cta-text)] text-sm border-none outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="text-[var(--foreground-muted)] hover:text-[var(--cta-text)]"
              >
                {isCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleShare}
              className="flex-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              onClick={() => setGeneratedDelegation(null)}
              variant="outline"
              className="flex-1"
            >
              Generate Another
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
            <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-3">
              Link Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--foreground-muted)]">Expires</p>
                <p className="text-[var(--cta-text)]">
                  {new Date(generatedDelegation.expiresAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[var(--foreground-muted)]">Duration</p>
                <p className="text-[var(--cta-text)]">
                  {constraints.durationMinutes} minutes
                </p>
              </div>
            </div>
          </div>
        </Glass>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Glass variant="default" border={true} glow={true} className="p-6">
        <h3 className="text-xl font-semibold text-[var(--cta-text)] mb-2">
          Generate Delegation Link
        </h3>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">
          Create a secure link that lets others chat with your Perin AI for
          scheduling. Just set the expiration time and you&apos;re ready to go!
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg mb-6"
          >
            <AlertCircle className="w-4 h-4 text-[var(--error)]" />
            <p className="text-sm text-[var(--error)]">{error}</p>
          </motion.div>
        )}

        {/* TTL Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-3">
            <Clock className="w-4 h-4 inline mr-2" />
            Link Expiration
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ttlOptions.map((option) => (
              <Button
                key={option.value}
                variant={ttlHours === option.value ? "default" : "outline"}
                onClick={() => setTtlHours(option.value)}
                className="justify-start"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* External User Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
            External User Name (Optional)
          </label>
          <input
            type="text"
            value={externalUserName}
            onChange={(e) => setExternalUserName(e.target.value)}
            placeholder="e.g., John from Acme Corp"
            className="w-full px-3 py-2 bg-[var(--background-secondary)]/50 border border-[var(--card-border)] rounded-lg text-[var(--cta-text)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* Meeting Preferences - Collapsible */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowPreferences(!showPreferences)}
            className="flex items-center justify-between w-full p-3 bg-[var(--background-secondary)]/30 border border-[var(--card-border)] rounded-lg hover:bg-[var(--background-secondary)]/50 transition-colors"
          >
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-[var(--foreground-muted)]" />
              <span className="text-sm font-medium text-[var(--foreground-muted)]">
                Meeting Preferences (Optional)
              </span>
              <span className="text-xs text-[var(--foreground-muted)] ml-2">
                Duration, type, notice period
              </span>
            </div>
            {showPreferences ? (
              <ChevronUp className="w-4 h-4 text-[var(--foreground-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
            )}
          </button>

          {showPreferences && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-[var(--background-secondary)]/20 border border-[var(--card-border)] rounded-lg"
            >
              {/* Duration */}
              <div className="mb-4">
                <label className="block text-xs text-[var(--foreground-muted)] mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={constraints.durationMinutes || ""}
                  onChange={(e) =>
                    updateConstraint(
                      "durationMinutes",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  min="15"
                  max="480"
                  placeholder="30"
                  className="w-full px-3 py-2 bg-[var(--background-secondary)]/50 border border-[var(--card-border)] rounded-lg text-[var(--cta-text)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Meeting Type */}
              <div className="mb-4">
                <label className="block text-xs text-[var(--foreground-muted)] mb-2">
                  Meeting Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {meetingTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Button
                        key={type.value}
                        variant={
                          constraints.meetingType === type.value
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          updateConstraint("meetingType", type.value)
                        }
                        className="justify-start text-xs"
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Notice Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--foreground-muted)] mb-2">
                    Min Notice (hours)
                  </label>
                  <input
                    type="number"
                    value={constraints.minNoticeHours || ""}
                    onChange={(e) =>
                      updateConstraint(
                        "minNoticeHours",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    min="0"
                    max="720"
                    placeholder="1"
                    className="w-full px-3 py-2 bg-[var(--background-secondary)]/50 border border-[var(--card-border)] rounded-lg text-[var(--cta-text)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-muted)] mb-2">
                    Max Notice (hours)
                  </label>
                  <input
                    type="number"
                    value={constraints.maxNoticeHours || ""}
                    onChange={(e) =>
                      updateConstraint(
                        "maxNoticeHours",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    min="0"
                    max="720"
                    placeholder="168"
                    className="w-full px-3 py-2 bg-[var(--background-secondary)]/50 border border-[var(--card-border)] rounded-lg text-[var(--cta-text)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-lg font-medium py-3"
        >
          {isLoading ? "Generating..." : "✨ Generate Link"}
        </Button>
      </Glass>
    </motion.div>
  );
}
