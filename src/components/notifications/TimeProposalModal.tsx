"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Check, X, Loader2, Users } from "lucide-react";
import BaseModal from "@/components/ui/BaseModal";
import { Button } from "@/components/ui/button";

interface TimeProposal {
  start: string;
  end: string;
  tz?: string;
}

interface TimeProposalModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  messageId: string;
  proposals: TimeProposal[];
  durationMins: number;
  initiatorName?: string;
  onConfirm: (proposal: TimeProposal) => Promise<void>;
  onDecline: () => Promise<void>;
}

export default function TimeProposalModal({
  open,
  onClose,
  proposals,
  durationMins,
  initiatorName,
  onConfirm,
  onDecline,
}: TimeProposalModalProps) {
  const [selectedProposal, setSelectedProposal] = useState<TimeProposal | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"confirm" | "decline" | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedProposal(null);
      setIsLoading(false);
      setAction(null);
    }
  }, [open]);

  const formatTime = (dateString: string, timezone?: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTimeRange = (start: string, end: string, timezone?: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
    };
    return `${startDate.toLocaleTimeString(
      "en-US",
      options
    )} - ${endDate.toLocaleTimeString("en-US", options)}`;
  };

  const handleConfirm = async () => {
    if (!selectedProposal) return;

    setIsLoading(true);
    setAction("confirm");

    try {
      await onConfirm(selectedProposal);
      onClose();
    } catch (error) {
      console.error("Failed to confirm proposal:", error);
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setAction("decline");

    try {
      await onDecline();
      onClose();
    } catch (error) {
      console.error("Failed to decline proposal:", error);
    } finally {
      setIsLoading(false);
      setAction(null);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Meeting Proposal"
      description={`${initiatorName || "Someone"} has proposed ${
        proposals.length
      } time slots for a ${durationMins}-minute meeting.`}
      size="lg"
      showCloseButton={!isLoading}
      closeButtonText="Maybe Later"
    >
      <div className="space-y-6">
        {/* Header with emotional design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex justify-center">
            <motion.div
              className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="h-6 w-6 text-blue-400" />
            </motion.div>
          </div>
          <h3 className="text-lg font-medium text-[var(--foreground-primary)]">
            Choose Your Preferred Time
          </h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Select a time that works best for you
          </p>
        </motion.div>

        {/* Time proposals */}
        <div className="space-y-3">
          {proposals.map((proposal, index) => (
            <motion.div
              key={`${proposal.start}-${proposal.end}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => setSelectedProposal(proposal)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedProposal === proposal
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : "border-[var(--card-border)] bg-[var(--background-secondary)] hover:border-blue-400/50 hover:bg-blue-500/5"
                }`}
                disabled={isLoading}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedProposal === proposal
                          ? "bg-blue-500 text-white"
                          : "bg-[var(--background-primary)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-[var(--foreground-primary)]">
                        {formatTime(proposal.start, proposal.tz)}
                      </div>
                      <div className="text-sm text-[var(--foreground-muted)] flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTimeRange(
                            proposal.start,
                            proposal.end,
                            proposal.tz
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedProposal === proposal && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="p-1 rounded-full bg-blue-500 text-white"
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex space-x-3 pt-4"
        >
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
            className="flex-1 h-12 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
          >
            {isLoading && action === "decline" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Decline
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!selectedProposal || isLoading}
            className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading && action === "confirm" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirm Meeting
          </Button>
        </motion.div>

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
            >
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-[var(--foreground-muted)]">
                  {action === "confirm"
                    ? "Confirming meeting..."
                    : "Processing..."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BaseModal>
  );
}
