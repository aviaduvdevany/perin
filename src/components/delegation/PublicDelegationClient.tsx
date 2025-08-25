"use client";

import { motion } from "framer-motion";
import DelegationChat from "@/components/delegation/DelegationChat";
import type { DelegationSession } from "@/types/delegation";

interface PublicDelegationClientProps {
  session: DelegationSession;
}

export default function PublicDelegationClient({
  session,
}: PublicDelegationClientProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen"
    >
      <DelegationChat
        delegationId={session.id}
        externalUserName={session.externalUserName}
        session={session}
      />
    </motion.div>
  );
}
