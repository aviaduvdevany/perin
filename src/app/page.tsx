"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PerinChat } from "@/components/PerinChat";
import SidebarRail from "@/components/ui/SidebarRail";

import { MobilePerinChat } from "@/components/MobilePerinChat";
import MobileBottomNavigation from "@/components/ui/MobileBottomNavigation";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import IntegrationManagerModal from "@/components/dock-modals/IntegrationManagerModal";
import NetworkModal from "@/components/dock-modals/NetworkModal";
import PreferencesModal from "@/components/dock-modals/PreferencesModal";
import PerinModal from "@/components/dock-modals/PerinModal";
import DelegationModal from "@/components/dock-modals/DelegationModal";
import LinkGenerator from "@/components/delegation/LinkGenerator";
import {
  NotificationsModal,
  TimeProposalModal,
} from "@/components/notifications";
import {
  confirmTimeProposalService,
  declineTimeProposalService,
} from "@/app/services/notifications";
import type { CreateDelegationResponse } from "@/types/delegation";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { state, actions } = useUserData();
  const { refreshNotifications } = useNotifications();

  const {
    profileOpen,
    integrationsOpen,
    networkOpen,
    notificationsOpen,
    preferencesOpen,
    perinOpen,
    delegationOpen,
  } = state.ui;

  const {
    setProfileOpen,
    setIntegrationsOpen,
    setNetworkOpen,
    setNotificationsOpen,
    setPreferencesOpen,
    setPerinOpen,
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

  // Mobile chat state
  const [mobileMessages, setMobileMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [mobileChatLoading, setMobileChatLoading] = useState(false);

  const handleMobileMessage = (message: string) => {
    // For now, just add the message to the list
    const newMessage = {
      id: `mobile-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMobileMessages((prev) => [...prev, newMessage]);
    setMobileChatLoading(true);

    // Simulate response
    setTimeout(() => {
      const response = {
        id: `mobile-response-${Date.now()}`,
        role: "assistant",
        content: "I received your message: " + message,
      };
      setMobileMessages((prev) => [...prev, response]);
      setMobileChatLoading(false);
    }, 1000);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

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
            onOpenPerin={() => setPerinOpen(true)}
          />
        </div>

        {/* Main chat area */}
        <div className="h-full pl-24">
          <PerinChat />
        </div>

        {/* Desktop modals */}
        <IntegrationManagerModal
          open={integrationsOpen}
          onClose={() => setIntegrationsOpen(false)}
        />
        <NetworkModal
          open={networkOpen}
          onClose={() => setNetworkOpen(false)}
        />
        <PreferencesModal
          open={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
        />
        <PerinModal open={perinOpen} onClose={() => setPerinOpen(false)} />
        <DelegationModal
          open={delegationOpen}
          onClose={() => setDelegationOpen(false)}
        />
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden h-screen mobile-layout flex flex-col">
        {/* Mobile Content */}
        <div className="flex-1 mobile-content relative">
          <MobilePerinChat onOpenMenu={() => setProfileOpen(true)} />

          {/* Mobile Input - Positioned above bottom navigation */}
          <div
            className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--background-primary)]/80 backdrop-blur-xl border-t border-[var(--card-border)]"
            style={{
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 80px)",
            }}
          >
            <FloatingInput
              onSendMessage={handleMobileMessage}
              isLoading={mobileChatLoading}
              placeholder="Type your message..."
              disabled={false}
              className="max-w-none"
            />
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNavigation onOpenChat={() => {}} />

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
        <IntegrationManagerModal
          open={integrationsOpen}
          onClose={() => setIntegrationsOpen(false)}
        />
        <PerinModal open={perinOpen} onClose={() => setPerinOpen(false)} />
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
