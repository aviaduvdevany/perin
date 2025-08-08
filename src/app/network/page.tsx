"use client";

import { useEffect, useState } from "react";
import {
  createConnectionService,
  listConnectionsService,
  acceptConnectionService,
  revokeConnectionService,
} from "@/app/services/network";
import {
  listNotificationsService,
  markNotificationReadService,
} from "@/app/services/notifications";
import type { UserConnection } from "@/types/network";
import type { Notification as NotificationType } from "@/types/notifications";

export default function NetworkPage() {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = async () => {
    try {
      const res = await listConnectionsService();
      setConnections((res.connections || []) as UserConnection[]);
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await listNotificationsService(false);
      setNotifications((res.notifications || []) as NotificationType[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConnections();
    loadNotifications();
  }, []);

  const handleInvite = async () => {
    setError(null);
    if (!targetUserId) return;
    setInviteLoading(true);
    try {
      await createConnectionService({
        targetUserId,
        scopes: [
          "profile.basic.read",
          "calendar.availability.read",
          "calendar.events.propose",
          "calendar.events.write.confirm",
        ],
        constraints: {
          workingHours: { start: "09:00", end: "18:00" },
          minNoticeHours: 4,
          meetingLengthMins: { min: 15, max: 90, default: 30 },
        },
      });
      setTargetUserId("");
      await loadConnections();
      await loadNotifications();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptConnectionService(id, {
        scopes: [
          "profile.basic.read",
          "calendar.availability.read",
          "calendar.events.propose",
          "calendar.events.write.confirm",
        ],
        constraints: {
          workingHours: { start: "09:00", end: "18:00" },
          minNoticeHours: 2,
        },
      });
      await loadConnections();
      await loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeConnectionService(id);
      await loadConnections();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationReadService(id);
      await loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Perin Network</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Invite Connection</h2>
        <div className="flex gap-2">
          <input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Target User ID"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleInvite}
            disabled={inviteLoading || !targetUserId}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          >
            {inviteLoading ? "Sending..." : "Send Invite"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Connections</h2>
        <div className="space-y-2">
          {connections.length === 0 && (
            <p className="text-sm text-gray-500">No connections yet</p>
          )}
          {connections.map((c) => (
            <div
              key={c.id}
              className="border rounded p-3 flex items-center justify-between"
            >
              <div className="text-sm">
                <div>ID: {c.id}</div>
                <div>Status: {c.status}</div>
                <div>Requester: {c.requester_user_id}</div>
                <div>Target: {c.target_user_id}</div>
              </div>
              <div className="flex gap-2">
                {c.status === "pending" && (
                  <button
                    onClick={() => handleAccept(c.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Accept
                  </button>
                )}
                <button
                  onClick={() => handleRevoke(c.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Notifications</h2>
        <div className="space-y-2">
          {notifications.length === 0 && (
            <p className="text-sm text-gray-500">No notifications</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className="border rounded p-3 flex items-center justify-between"
            >
              <div className="text-sm">
                <div className="font-medium">{n.title}</div>
                <div className="text-gray-600">{n.body}</div>
                <div className="text-xs text-gray-500">{n.type}</div>
              </div>
              <div className="flex items-center gap-2">
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
