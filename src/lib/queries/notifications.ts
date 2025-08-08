import { query } from "@/lib/db";
import type { Notification } from "@/types/notifications";

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
