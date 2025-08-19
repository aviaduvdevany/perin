"use client";

import { ReactNode, useState } from "react";
import SidebarRail from "@/components/ui/SidebarRail";
import { useUserData } from "@/components/providers/UserDataProvider";
import MobileTopBar from "@/components/ui/MobileTopBar";
import MobileBottomNavigation from "@/components/ui/MobileBottomNavigation";
import MobileDrawer from "@/components/ui/MobileDrawer";
import MobileHomeScreen from "@/components/MobileHomeScreen";
import { MobilePerinChat } from "@/components/MobilePerinChat";
import TabletLayout from "@/components/TabletLayout";
import BottomSheet from "@/components/ui/BottomSheet";
import ProfileSummary from "@/components/ui/ProfileSummary";
import IntegrationManagerModal from "@/components/dock-modals/IntegrationManagerModal";
import NetworkModal from "@/components/dock-modals/NetworkModal";
import PreferencesModal from "@/components/dock-modals/PreferencesModal";
import PerinModal from "@/components/dock-modals/PerinModal";
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
  const {
    profileOpen,
    integrationsOpen,
    networkOpen,
    notificationsOpen,
    preferencesOpen,
    perinOpen,
  } = state.ui;
  const {
    setProfileOpen,
    setIntegrationsOpen,
    setNetworkOpen,
    setNotificationsOpen,
    setPreferencesOpen,
    setPerinOpen,
  } = actions;

  // Mobile state
  const [mobileView, setMobileView] = useState<"home" | "chat">("home");

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

  const handleOpenChat = () => {
    setMobileView("chat");
  };

  const handleBackToHome = () => {
    setMobileView("home");
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

      {/* Desktop Layout */}
      <div className="hidden xl:block">
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
            onOpenPreferences={() => setPreferencesOpen(true)}
            onOpenPerin={() => setPerinOpen(true)}
          />
        </div>

        {/* Desktop modals */}
        <div className="hidden lg:block">
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
        </div>
      </div>

      {/* Tablet Layout */}
      <div className="hidden lg:block xl:hidden">
        <TabletLayout />
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden">
        {/* Mobile Top Bar - only show in chat view */}
        {mobileView === "chat" && (
          <MobileTopBar onOpenProfile={() => setProfileOpen(true)} />
        )}

        {/* Mobile Content */}
        <div className="h-full">
          {mobileView === "home" ? (
            <MobileHomeScreen onOpenChat={handleOpenChat} />
          ) : (
            <MobilePerinChat
              onBack={handleBackToHome}
              onOpenMenu={() => setProfileOpen(true)}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNavigation onOpenChat={handleOpenChat} />

        {/* Mobile Drawers */}
        <MobileDrawer
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          title="Profile"
          position="right"
          size="md"
        >
          <ProfileSummary />
        </MobileDrawer>

        <MobileDrawer
          open={integrationsOpen}
          onClose={() => setIntegrationsOpen(false)}
          title="Connect Services"
          position="bottom"
          size="lg"
        >
          <div className="p-4">
            <UnifiedIntegrationManager showOnlyConnectable={true} />
          </div>
        </MobileDrawer>

        <MobileDrawer
          open={networkOpen}
          onClose={() => setNetworkOpen(false)}
          title="Network"
          position="bottom"
          size="lg"
        >
          <div className="p-4">
            <p className="text-[var(--foreground-muted)] text-center py-8">
              Network management coming soon...
            </p>
          </div>
        </MobileDrawer>

        <MobileDrawer
          open={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
          title="Settings"
          position="right"
          size="md"
        >
          <div className="p-4">
            <p className="text-[var(--foreground-muted)] text-center py-8">
              Settings panel coming soon...
            </p>
          </div>
        </MobileDrawer>

        <MobileDrawer
          open={perinOpen}
          onClose={() => setPerinOpen(false)}
          title="About Perin"
          position="bottom"
          size="md"
        >
          <div className="p-4">
            <p className="text-[var(--foreground-muted)] text-center py-8">
              Perin is your AI-powered digital delegate...
            </p>
          </div>
        </MobileDrawer>
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
