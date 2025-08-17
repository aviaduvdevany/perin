"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import BaseModal from "@/components/ui/BaseModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useUserData } from "@/components/providers/UserDataProvider";
import type { UserConnection } from "@/types/network";

interface NetworkModalProps {
  open: boolean;
  onClose: () => void;
}

interface ConnectionWithStatus extends UserConnection {
  status: "active" | "pending" | "revoked";
  isInitiator: boolean;
  requester_user_name?: string;
  requester_user_email?: string;
  target_user_name?: string;
  target_user_email?: string;
}

export default function NetworkModal({ open, onClose }: NetworkModalProps) {
  const { state, actions } = useUserData();
  const {
    connections: providerConnections,
    pendingInvitations: providerPendingInvitations,
    loading,
    errors,
  } = state;

  const [targetUserId, setTargetUserId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "connections" | "invitations" | "invite"
  >("connections");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "accept" | "revoke";
    connectionId: string;
    userId: string;
  } | null>(null);

  // Transform provider data to component format
  const connections = providerConnections.map((conn) => ({
    ...conn,
    status: conn.status as "active" | "pending" | "revoked",
    isInitiator: conn.requester_user_id === conn.requester_user_id, // This will be fixed with actual user ID
  })) as ConnectionWithStatus[];

  const pendingInvitationsList = providerPendingInvitations.map((conn) => ({
    ...conn,
    status: conn.status as "active" | "pending" | "revoked",
    isInitiator: conn.requester_user_id === conn.requester_user_id, // This will be fixed with actual user ID
  })) as ConnectionWithStatus[];

  const handleInvite = async () => {
    if (!targetUserId.trim()) return;

    setInviteLoading(true);

    try {
      await actions.createConnection(
        targetUserId.trim(),
        [
          "profile.basic.read",
          "calendar.availability.read",
          "calendar.events.propose",
          "calendar.events.write.confirm",
        ],
        {
          workingHours: { start: "09:00", end: "18:00" },
          minNoticeHours: 4,
          meetingLengthMins: { min: 15, max: 90, default: 30 },
        }
      );

      setTargetUserId("");
      setSuccess("Connection invitation sent successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error("Failed to send invitation:", err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAccept = async (connectionId: string, userId: string) => {
    try {
      await actions.acceptConnection(
        connectionId,
        [
          "profile.basic.read",
          "calendar.availability.read",
          "calendar.events.propose",
          "calendar.events.write.confirm",
        ],
        {
          workingHours: { start: "09:00", end: "18:00" },
          minNoticeHours: 2,
        }
      );

      setSuccess("Connection accepted!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error accepting connection:", err);
    }
  };

  const handleRevoke = async (connectionId: string) => {
    try {
      await actions.revokeConnection(connectionId);

      setSuccess("Connection revoked");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error revoking connection:", err);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === "accept") {
        await handleAccept(pendingAction.connectionId, pendingAction.userId);
      } else if (pendingAction.type === "revoke") {
        await handleRevoke(pendingAction.connectionId);
      }
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const TabButton = ({
    id,
    label,
    icon,
    badge,
  }: {
    id: string;
    label: string;
    icon: string;
    badge?: number;
  }) => (
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors relative ${
        activeTab === id
          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)] hover:bg-white/5"
      }`}
      onClick={() =>
        setActiveTab(id as "connections" | "invitations" | "invite")
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-green-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-500">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Pending
          </span>
        );
      case "revoked":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Revoked
          </span>
        );
      default:
        return null;
    }
  };

  if (loading.connections) {
    return (
      <BaseModal
        open={open}
        onClose={onClose}
        title="Network"
        description="Loading your network information..."
        size="lg"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
        </div>
      </BaseModal>
    );
  }

  const pendingInvitations = connections.filter(
    (conn) => conn.status === "pending" && !conn.isInitiator
  );
  const activeConnections = connections.filter(
    (conn) => conn.status === "active"
  );

  // Helper function to get display name for a connection
  const getConnectionDisplayName = (connection: ConnectionWithStatus) => {
    // For active connections, show the other user's name
    if (connection.status === "active") {
      return (
        connection.target_user_name ||
        connection.target_user_email ||
        connection.target_user_id
      );
    }

    // For pending invitations, show the requester's name
    if (connection.status === "pending") {
      return (
        connection.requester_user_name ||
        connection.requester_user_email ||
        connection.requester_user_id
      );
    }

    // Fallback to user ID
    return connection.target_user_id;
  };

  // Helper function to get display email for a connection
  const getConnectionDisplayEmail = (connection: ConnectionWithStatus) => {
    if (connection.status === "active") {
      return connection.target_user_email;
    }
    if (connection.status === "pending") {
      return connection.requester_user_email;
    }
    return undefined;
  };

  return (
    <>
      <BaseModal
        open={open}
        onClose={onClose}
        title="Network"
        description="Manage your connections and invitations"
        size="lg"
      >
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton
            id="connections"
            label="Connections"
            icon="👥"
            badge={activeConnections.length}
          />
          <TabButton
            id="invitations"
            label="Invitations"
            icon="📨"
            badge={pendingInvitationsList.length}
          />
          <TabButton id="invite" label="Invite" icon="➕" />
        </div>

        {/* Error/Success Messages */}
        {errors.connections && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {errors.connections}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
          >
            {success}
          </motion.div>
        )}

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === "connections" && (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-[var(--foreground-primary)]">
                Active Connections ({activeConnections.length})
              </h3>

              {activeConnections.length === 0 ? (
                <div className="text-center py-8 text-[var(--foreground-muted)]">
                  <p className="text-sm">No active connections yet.</p>
                  <p className="text-xs mt-1">
                    Send invitations to start building your network.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground-primary)]">
                            {getConnectionDisplayName(connection)}
                          </p>
                          <p className="text-xs text-[var(--foreground-muted)]">
                            {getConnectionDisplayEmail(connection) && (
                              <span className="block">
                                {getConnectionDisplayEmail(connection)}
                              </span>
                            )}
                            Connected since{" "}
                            {new Date(
                              connection.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(connection.status)}
                          <button
                            onClick={() => {
                              setPendingAction({
                                type: "revoke",
                                connectionId: connection.id,
                                userId: connection.target_user_id,
                              });
                              setConfirmOpen(true);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "invitations" && (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-[var(--foreground-primary)]">
                Pending Invitations ({pendingInvitationsList.length})
              </h3>

              {pendingInvitationsList.length === 0 ? (
                <div className="text-center py-8 text-[var(--foreground-muted)]">
                  <p className="text-sm">No pending invitations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvitationsList.map((connection) => (
                    <div
                      key={connection.id}
                      className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground-primary)]">
                            {getConnectionDisplayName(connection)}
                          </p>
                          <p className="text-xs text-[var(--foreground-muted)]">
                            {getConnectionDisplayEmail(connection) && (
                              <span className="block">
                                {getConnectionDisplayEmail(connection)}
                              </span>
                            )}
                            Invited on{" "}
                            {new Date(
                              connection.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(connection.status)}
                          <button
                            onClick={() => {
                              setPendingAction({
                                type: "accept",
                                connectionId: connection.id,
                                userId: connection.requester_user_id,
                              });
                              setConfirmOpen(true);
                            }}
                            className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-500/10"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "invite" && (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-[var(--foreground-primary)]">
                Send Connection Invitation
              </h3>

              <div className="p-4 rounded-lg border border-[var(--card-border)] bg-[var(--background-secondary)]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-primary)] mb-2">
                      User ID or Email
                    </label>
                    <input
                      type="text"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="Enter user ID or email address"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background-primary)] text-[var(--foreground-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                    />
                  </div>

                  <div className="text-xs text-[var(--foreground-muted)]">
                    <p className="mb-2">
                      This invitation will grant the following permissions:
                    </p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Read basic profile information</li>
                      <li>Check calendar availability</li>
                      <li>Propose meeting times</li>
                      <li>Confirm and create calendar events</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading || !targetUserId.trim()}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 disabled:bg-[var(--accent-primary)]/50 text-white text-sm font-medium transition-colors"
                  >
                    {inviteLoading ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BaseModal>

      <ConfirmDialog
        open={confirmOpen}
        title={
          pendingAction?.type === "accept"
            ? "Accept Connection?"
            : "Revoke Connection?"
        }
        description={
          pendingAction?.type === "accept"
            ? "This will establish a connection and allow scheduling meetings with this user."
            : "This will permanently revoke the connection. You can send a new invitation later."
        }
        confirmLabel={pendingAction?.type === "accept" ? "Accept" : "Revoke"}
        cancelLabel="Cancel"
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
      />
    </>
  );
}
