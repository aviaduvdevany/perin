"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import DelegationChat from "@/components/delegation/DelegationChat";
import { Glass } from "@/components/ui/Glass";
import { validateAndAccessDelegation } from "@/lib/delegation/session-manager";
import type { DelegationSession } from "@/types/delegation";
import { AlertCircle, X, Loader2 } from "lucide-react";

export default function PublicDelegationPage() {
  const params = useParams();
  const delegationId = params.delegationId as string;

  const [session, setSession] = useState<DelegationSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateDelegation = async () => {
      try {
        setIsLoading(true);

        // Get signature from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const signature = urlParams.get("sig");

        const { session: delegationSession, error: validationError } =
          await validateAndAccessDelegation(
            delegationId,
            signature || undefined
          );

        if (validationError || !delegationSession) {
          setError(validationError || "Invalid delegation link");
          return;
        }

        setSession(delegationSession);
      } catch (err) {
        setError("Failed to validate delegation link");
        console.error("Delegation validation error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (delegationId) {
      validateDelegation();
    }
  }, [delegationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--accent-primary)]" />
          <p className="text-[var(--foreground-muted)]">
            Loading delegation...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center p-4">
        <Glass
          variant="default"
          border={true}
          glow={true}
          className="p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-[var(--error)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-[var(--error)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--cta-text)] mb-2">
            Invalid or Expired Link
          </h1>
          <p className="text-[var(--foreground-muted)] mb-6">
            {error || "This delegation link is no longer valid."}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--foreground-muted)]">
            <AlertCircle className="w-4 h-4" />
            <span>
              Please contact the person who shared this link with you.
            </span>
          </div>
        </Glass>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen"
    >
      <DelegationChat
        delegationId={delegationId}
        externalUserName={session.externalUserName}
        session={session}
      />
    </motion.div>
  );
}
