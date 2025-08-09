import { query } from "@/lib/db";
import type {
  Notification,
  NotificationDevice,
  NotificationDevicePlatform,
  NotificationPreferences,
  NotificationDelivery,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
} from "@/types/notifications";

const NOTIFICATIONS_TABLE = "notifications";

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

// Phase 1 — unresolved and resolve
export const listUnresolvedNotifications = async (
  userId: string,
  requiresActionOnly = true
): Promise<Notification[]> => {
  const sql = `
    SELECT * FROM ${NOTIFICATIONS_TABLE}
    WHERE user_id = $1
      AND COALESCE(is_resolved, false) = false
      ${requiresActionOnly ? "AND COALESCE(requires_action, false) = true" : ""}
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
    SET is_resolved = true, resolved_at = NOW()
    WHERE id = $1 AND user_id = $2
  `;
  const result = await query(sql, [id, userId]);
  return (result.rowCount || 0) > 0;
};

// Phase 1 — devices
const DEVICES_TABLE = "notification_devices";

export const upsertNotificationDevice = async (
  userId: string,
  platform: NotificationDevicePlatform,
  playerId: string,
  deviceInfo?: Record<string, unknown> | null
): Promise<NotificationDevice> => {
  const sql = `
    INSERT INTO ${DEVICES_TABLE} (user_id, platform, onesignal_player_id, device_info, is_active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (user_id, platform, onesignal_player_id)
    DO UPDATE SET device_info = EXCLUDED.device_info, is_active = true, last_seen_at = NOW()
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    platform,
    playerId,
    JSON.stringify(deviceInfo ?? null),
  ]);
  return result.rows[0];
};

// Phase 1 — preferences
const PREFS_TABLE = "notification_preferences";

export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences | null> => {
  const sql = `SELECT * FROM ${PREFS_TABLE} WHERE user_id = $1`;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
};

export const upsertNotificationPreferences = async (
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const sql = `
    INSERT INTO ${PREFS_TABLE} (user_id, timezone, dnd, channels, digest, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET timezone = EXCLUDED.timezone, dnd = EXCLUDED.dnd, channels = EXCLUDED.channels, digest = EXCLUDED.digest, updated_at = NOW()
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    prefs.timezone ?? null,
    JSON.stringify(prefs.dnd ?? null),
    JSON.stringify(prefs.channels ?? null),
    JSON.stringify(prefs.digest ?? null),
  ]);
  return result.rows[0];
};

// Phase 1 — deliveries (tracking only, no provider integration yet)
const DELIVERIES_TABLE = "notification_deliveries";

export const createNotificationDelivery = async (
  notificationId: string,
  channel: NotificationDeliveryChannel,
  status: NotificationDeliveryStatus,
  providerMessageId?: string | null,
  error?: string | null
): Promise<NotificationDelivery> => {
  const sql = `
    INSERT INTO ${DELIVERIES_TABLE} (notification_id, channel, status, provider_message_id, error, attempts)
    VALUES ($1, $2, $3, $4, $5, 1)
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

export const updateNotificationDeliveryStatus = async (
  deliveryId: string,
  status: NotificationDeliveryStatus,
  providerMessageId?: string | null,
  error?: string | null
): Promise<boolean> => {
  const sql = `
    UPDATE ${DELIVERIES_TABLE}
    SET status = $2, provider_message_id = COALESCE($3, provider_message_id), error = $4, last_attempt_at = NOW(), attempts = attempts + 1
    WHERE id = $1
  `;
  const result = await query(sql, [
    deliveryId,
    status,
    providerMessageId ?? null,
    error ?? null,
  ]);
  return (result.rowCount || 0) > 0;
};
