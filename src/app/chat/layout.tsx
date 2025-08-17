"use client";

import { ReactNode, useState } from "react";
import SidebarRail from "@/components/ui/SidebarRail";
import { useUserData } from "@/components/providers/UserDataProvider";
import MobileTopBar from "@/components/ui/MobileTopBar";
import BottomSheet from "@/components/ui/BottomSheet";
import ProfileSummary from "@/components/ui/ProfileSummary";
import IntegrationManagerModal from "@/components/dock-modals/IntegrationManagerModal";
import ProfileModal from "@/components/dock-modals/ProfileModal";
import NetworkModal from "@/components/dock-modals/NetworkModal";
import UnifiedIntegrationManager from "@/components/ui/UnifiedIntegrationManager";
import {
  NotificationsModal,
  TimeProposalModal,
} from "@/components/notifications";
import { useNotifications } from "@/components/providers/NotificationContext";
import {
  confirmTimeProposalService,
  declineTimeProposalService,
} from "@/app/services/notifications";
// import UserDataDebug from "@/components/ui/UserDataDebug";

function ChatLayoutInner({ children }: { children: ReactNode }) {
  const { state, actions } = useUserData();
  const { profileOpen, integrationsOpen, networkOpen } = state.ui;
  const { setProfileOpen, setIntegrationsOpen, setNetworkOpen } = actions;

  // Notification modal state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalModalData, setProposalModalData] = useState<{
    sessionId: string;
    messageId: string;
    proposals: Array<{ start: string; end: string; tz?: string }>;
    durationMins: number;
    initiatorName?: string;
    notificationId: string;
  } | null>(null);

  const { refreshNotifications } = useNotifications();

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

      // Refresh notifications to update the UI
      await refreshNotifications();
    } catch (error) {
      console.error("Failed to confirm proposal:", error);
      throw error;
    }
  };

  const handleDeclineProposal = async () => {
    if (!proposalModalData) return;

    try {
      await declineTimeProposalService({
        sessionId: proposalModalData.sessionId,
        notificationId: proposalModalData.notificationId,
      });

      // Refresh notifications to update the UI
      await refreshNotifications();
    } catch (error) {
      console.error("Failed to decline proposal:", error);
      throw error;
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--background-primary)] overflow-x-hidden overflow-y-hidden">
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

      {/* Mobile top bar */}
      <MobileTopBar onOpenProfile={() => setProfileOpen(true)} />

      <div className="mx-auto max-w-full h-full px-4 pt-12 lg:pt-0">
        <div className="grid grid-cols-12 gap-4 h-full py-4">
          <div className="hidden lg:block col-span-1" />
          <main className="col-span-12 lg:col-span-10 xl:col-span-10 h-full">
            {children}
          </main>
          <div className="hidden lg:block col-span-1" />
        </div>
      </div>

      {/* Fixed left rail, centered (tablet/desktop) */}
      <div className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-30">
        <SidebarRail
          size="lg"
          onOpenNotifications={() => setNotificationsOpen(true)}
        />
      </div>

      {/* Mobile sheets */}
      <div className="lg:hidden">
        <BottomSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          title="Profile"
        >
          <ProfileSummary />
        </BottomSheet>

        <BottomSheet
          open={integrationsOpen}
          onClose={() => setIntegrationsOpen(false)}
          title="Integrations"
        >
          <UnifiedIntegrationManager showOnlyConnectable={true} />
        </BottomSheet>
      </div>

      {/* Desktop modals */}
      <div className="hidden lg:block">
        <IntegrationManagerModal
          open={integrationsOpen}
          onClose={() => setIntegrationsOpen(false)}
        />
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
        <NetworkModal
          open={networkOpen}
          onClose={() => setNetworkOpen(false)}
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

      {/* Debug component (remove in production) */}
      {/* <UserDataDebug /> */}
    </div>
  );
}

export default function ChatWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ChatLayoutInner>{children}</ChatLayoutInner>;
}
