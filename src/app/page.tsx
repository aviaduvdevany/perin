"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PerinChat } from "@/components/PerinChat";
import SidebarRail from "@/components/ui/SidebarRail";
import MobileHomeScreen from "@/components/MobileHomeScreen";
import { MobilePerinChat } from "@/components/MobilePerinChat";
import MobileBottomNavigation from "@/components/ui/MobileBottomNavigation";
import MobileDrawer from "@/components/ui/MobileDrawer";
import { useUserData } from "@/components/providers/UserDataProvider";
import { useNotifications } from "@/components/providers/NotificationContext";
import ProfileSummary from "@/components/ui/ProfileSummary";
import UnifiedIntegrationManager from "@/components/ui/UnifiedIntegrationManager";
import IntegrationManagerModal from "@/components/dock-modals/IntegrationManagerModal";
import NetworkModal from "@/components/dock-modals/NetworkModal";
import PreferencesModal from "@/components/dock-modals/PreferencesModal";
import PerinModal from "@/components/dock-modals/PerinModal";
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleOpenChat = () => {
    setMobileView("chat");
  };

  const handleBackToHome = () => {
    setMobileView("home");
  };

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
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden h-screen">
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
    </div>
  );
}
