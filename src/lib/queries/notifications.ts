import { query } from "@/lib/db";
import type {
  Notification,
  NotificationDevice,
  NotificationDevicePlatform,
  NotificationPreferences,
} from "@/types/notifications";
import { NOTIFICATIONS_TABLE, DEVICES_TABLE, PREFS_TABLE } from "@/lib/tables";

// Helper function to dispatch notifications with push support
export const dispatchNotification = async (
  userId: string,
  type: Notification["type"],
  title: string,
  body?: string | null,
  data?: Record<string, unknown> | null,
  requiresAction?: boolean,
  actionDeadlineAt?: string | null,
  actionRef?: Record<string, unknown> | null
): Promise<Notification> => {
  // Try to use dispatch service first (for push notifications)
  try {
    const internalKey = process.env.NOTIFICATIONS_INTERNAL_KEY;
    if (internalKey) {
      const response = await fetch(
        `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/notifications/dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": internalKey,
          },
          body: JSON.stringify({
            userId,
            type,
            title,
            body,
            data,
            requiresAction,
            actionDeadlineAt,
            actionRef,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.notification;
      }
    }
  } catch (error) {
    console.warn(
      "Failed to dispatch notification, falling back to direct creation:",
      error
    );
  }

  // Fallback to direct creation
  return createNotification(userId, type, title, body, data);
};

export const createNotification = async (
  userId: string,
  type: Notification["type"],
  title: string,
  body?: string | null,
  data?: Record<string, unknown> | null
): Promise<Notification> => {
  const sql = `
    INSERT INTO ${NOTIFICATIONS_TABLE} (user_id, type, title, body, data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    type,
    title,
    body ?? null,
    JSON.stringify(data ?? null),
  ]);
  return result.rows[0];
};

export const listNotifications = async (
  userId: string,
  onlyUnread = false
): Promise<Notification[]> => {
  const sql = `
    SELECT * FROM ${NOTIFICATIONS_TABLE}
    WHERE user_id = $1 ${onlyUnread ? "AND is_read = false" : ""}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const result = await query(sql, [userId]);
  return result.rows;
};

export const markNotificationRead = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const sql = `
    UPDATE ${NOTIFICATIONS_TABLE}
    SET is_read = true
    WHERE id = $1 AND user_id = $2
  `;
  const result = await query(sql, [id, userId]);
  return (result.rowCount || 0) > 0;
};

export const updateNotificationActionability = async (
  id: string,
  userId: string,
  fields: {
    requires_action?: boolean;
    action_deadline_at?: string | null;
    action_ref?: Record<string, unknown> | null;
  }
): Promise<boolean> => {
  const sql = `
    UPDATE ${NOTIFICATIONS_TABLE}
    SET
      requires_action = COALESCE($3, requires_action),
      action_deadline_at = COALESCE($4, action_deadline_at),
      action_ref = COALESCE($5, action_ref)
    WHERE id = $1 AND user_id = $2
  `;
  const result = await query(sql, [
    id,
    userId,
    fields.requires_action ?? null,
    fields.action_deadline_at ?? null,
    fields.action_ref ? JSON.stringify(fields.action_ref) : null,
  ]);
  return (result.rowCount || 0) > 0;
};

export const listUnresolvedNotifications = async (
  userId: string,
  requiresActionOnly = true
): Promise<Notification[]> => {
  const sql = `
    SELECT * FROM ${NOTIFICATIONS_TABLE}
    WHERE user_id = $1
      AND is_resolved = false
      ${requiresActionOnly ? "AND requires_action = true" : ""}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const result = await query(sql, [userId]);
  return result.rows;
};

export const markNotificationResolved = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const sql = `
    UPDATE ${NOTIFICATIONS_TABLE}
    SET is_resolved = true, resolved_at = now()
    WHERE id = $1 AND user_id = $2
  `;
  const result = await query(sql, [id, userId]);
  return (result.rowCount || 0) > 0;
};

export const upsertNotificationDevice = async (
  userId: string,
  platform: NotificationDevicePlatform,
  playerId: string,
  deviceInfo?: Record<string, unknown> | null
): Promise<NotificationDevice> => {
  const sql = `
    INSERT INTO ${DEVICES_TABLE} (user_id, platform, onesignal_player_id, device_info, is_active, last_seen_at)
    VALUES ($1, $2, $3, $4, true, now())
    ON CONFLICT (user_id, platform, onesignal_player_id)
    DO UPDATE SET device_info = EXCLUDED.device_info, is_active = true, last_seen_at = now()
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    platform,
    playerId,
    deviceInfo ? JSON.stringify(deviceInfo) : null,
  ]);
  return result.rows[0];
};

export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences | null> => {
  const sql = `
    SELECT * FROM ${PREFS_TABLE}
    WHERE user_id = $1
    LIMIT 1
  `;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
};

export const upsertNotificationPreferences = async (
  userId: string,
  prefs: Omit<NotificationPreferences, "user_id" | "updated_at">
): Promise<NotificationPreferences> => {
  const sql = `
    INSERT INTO ${PREFS_TABLE} (user_id, timezone, dnd, channels, digest)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      timezone = EXCLUDED.timezone,
      dnd = EXCLUDED.dnd,
      channels = EXCLUDED.channels,
      digest = EXCLUDED.digest,
      updated_at = now()
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    prefs.timezone ?? null,
    prefs.dnd ? JSON.stringify(prefs.dnd) : null,
    prefs.channels ? JSON.stringify(prefs.channels) : null,
    prefs.digest ? JSON.stringify(prefs.digest) : null,
  ]);
  return result.rows[0];
};

export const getActiveDevicesForUser = async (
  userId: string
): Promise<NotificationDevice[]> => {
  const sql = `
    SELECT * FROM ${DEVICES_TABLE}
    WHERE user_id = $1 AND is_active = true
  `;
  const result = await query(sql, [userId]);
  return result.rows;
};

export const insertNotificationDelivery = async (
  notificationId: string,
  channel: "mobile_push" | "web_push" | "email" | "sms" | "in_app",
  status: "queued" | "sent" | "delivered" | "failed",
  providerMessageId?: string | null,
  error?: string | null
) => {
  const sql = `
    INSERT INTO notification_deliveries
      (notification_id, channel, status, provider_message_id, error, attempts, last_attempt_at)
    VALUES ($1, $2, $3, $4, $5, 1, now())
    RETURNING *
  `;
  const result = await query(sql, [
    notificationId,
    channel,
    status,
    providerMessageId ?? null,
    error ?? null,
  ]);
  return result.rows[0];
};
