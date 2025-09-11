"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PerinChat } from "@/components/PerinChat";
import SidebarRail from "@/components/ui/SidebarRail";

import { MobilePerinChat } from "@/components/MobilePerinChat";
import MobileBottomNavigation from "@/components/ui/MobileBottomNavigation";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import { userNeedsOnboarding } from "@/lib/utils/onboarding";
import NetworkModal from "@/components/dock-modals/NetworkModal";
import PreferencesModal from "@/components/dock-modals/PreferencesModal";
import DelegationModal from "@/components/dock-modals/DelegationModal";
import {
  NotificationsModal,
  TimeProposalModal,
} from "@/components/notifications";
import {
  confirmTimeProposalService,
  declineTimeProposalService,
} from "@/app/services/notifications";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { state, actions } = useUserData();
  const { refreshNotifications } = useNotifications();

  const { networkOpen, notificationsOpen, preferencesOpen, delegationOpen } =
    state.ui;

  const {
    setNetworkOpen,
    setNotificationsOpen,
    setPreferencesOpen,
    setDelegationOpen,
  } = actions;

  // Notification modal state
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalModalData, setProposalModalData] = useState<{
    sessionId: string;
    messageId: string;
    proposals: Array<{ start: string; end: string; tz?: string }>;
    durationMins: number;
    initiatorName?: string;
    notificationId: string;
  } | null>(null);

  // Mobile chat ref
  const mobileChatRef = useRef<{
    handleSendMessage: (message: string) => void;
    isChatLoading: boolean;
  }>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  // Check if user needs onboarding
  useEffect(() => {
    if (isAuthenticated && state.user && !state.loading.user) {
      if (userNeedsOnboarding(state.user)) {
        router.push("/onboarding");
      }
    }
  }, [isAuthenticated, state.user, state.loading.user, router]);

  const handleOpenProposalModal = (data: {
    sessionId: string;
    messageId: string;
    proposals: Array<{ start: string; end: string; tz?: string }>;
    durationMins: number;
    initiatorName?: string;
    notificationId: string;
  }) => {
    setProposalModalData(data);
    setProposalModalOpen(true);
  };

  const handleConfirmProposal = async (proposal: {
    start: string;
    end: string;
    tz?: string;
  }) => {
    if (!proposalModalData) return;
    try {
      await confirmTimeProposalService({
        sessionId: proposalModalData.sessionId,
        start: proposal.start,
        end: proposal.end,
        tz: proposal.tz,
        notificationId: proposalModalData.notificationId,
      });
      await refreshNotifications();
    } catch (error) {
      console.error("Failed to confirm proposal:", error);
    }
  };

  const handleDeclineProposal = async () => {
    if (!proposalModalData) return;
    try {
      await declineTimeProposalService({
        sessionId: proposalModalData.sessionId,
        notificationId: proposalModalData.notificationId,
      });
      await refreshNotifications();
    } catch (error) {
      console.error("Failed to decline proposal:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-[var(--foreground-muted)] text-sm">
            Loading Perin...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[var(--background-primary)] overflow-hidden">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute right-[-10%] top-[-10%] w-[520px] h-[520px] blur-3xl opacity-45"
          style={{
            background:
              "radial-gradient(closest-side circle at 50% 50%, var(--accent-primary), transparent 70%)",
          }}
        />
        <div
          className="absolute left-[-12%] bottom-[-12%] w-[520px] h-[520px] blur-3xl opacity-38"
          style={{
            background:
              "radial-gradient(closest-side circle at 50% 50%, var(--accent-secondary), transparent 70%)",
          }}
        />
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:block h-screen">
        {/* Fixed left rail */}
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30">
          <SidebarRail
            size="lg"
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenPreferences={() => setPreferencesOpen(true)}
          />
        </div>

        {/* Main chat area */}
        <div className="h-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full mt-28">
            <PerinChat />
          </div>
        </div>

        {/* Desktop modals */}
        <NetworkModal
          open={networkOpen}
          onClose={() => setNetworkOpen(false)}
        />
        <PreferencesModal
          open={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
        />
        <DelegationModal
          open={delegationOpen}
          onClose={() => setDelegationOpen(false)}
        />
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden h-screen mobile-layout flex flex-col">
        {/* Mobile Content */}
        <div className="flex-1 mobile-content">
          <MobilePerinChat
            ref={mobileChatRef}
            onOpenMenu={() => setPreferencesOpen(true)}
          />
        </div>

        {/* Mobile Bottom Navigation with Input */}
        <MobileBottomNavigation
          onOpenChat={() => {}}
          onSendMessage={(message) =>
            mobileChatRef.current?.handleSendMessage(message)
          }
          isLoading={mobileChatRef.current?.isChatLoading || false}
        />

        {/* Mobile Modals - Same as Desktop */}
        <NetworkModal
          open={networkOpen}
          onClose={() => setNetworkOpen(false)}
        />
        <PreferencesModal
          open={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
        />
        <DelegationModal
          open={delegationOpen}
          onClose={() => setDelegationOpen(false)}
        />
      </div>

      {/* Notification modals - Top level for proper positioning */}
      <NotificationsModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenProposalModal={handleOpenProposalModal}
      />

      {proposalModalData && (
        <TimeProposalModal
          open={proposalModalOpen}
          onClose={() => {
            setProposalModalOpen(false);
            setProposalModalData(null);
          }}
          sessionId={proposalModalData.sessionId}
          messageId={proposalModalData.messageId}
          proposals={proposalModalData.proposals}
          durationMins={proposalModalData.durationMins}
          initiatorName={proposalModalData.initiatorName}
          onConfirm={handleConfirmProposal}
          onDecline={handleDeclineProposal}
        />
      )}
    </div>
  );
}
