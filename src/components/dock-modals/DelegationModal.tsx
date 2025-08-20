"use client";

import { AnimatePresence, motion } from "framer-motion";
import BaseModal from "@/components/ui/BaseModal";
import LinkGenerator from "@/components/delegation/LinkGenerator";
import type { CreateDelegationResponse } from "@/types/delegation";

interface DelegationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DelegationModal({
  open,
  onClose,
}: DelegationModalProps) {
  const handleGenerate = (delegation: CreateDelegationResponse) => {
    // You can add additional logic here, like showing a success notification
    console.log("Delegation generated:", delegation);
  };

  return (
    <AnimatePresence>
      {open && (
        <BaseModal
          open={open}
          onClose={onClose}
          title="Talk to My Perin"
          description="Generate secure, time-limited links that allow others to interact with your Perin AI assistant for scheduling purposes."
          size="xl"
        >
          <div className="space-y-6">
            <LinkGenerator onGenerate={handleGenerate} />
          </div>
        </BaseModal>
      )}
    </AnimatePresence>
  );
}
