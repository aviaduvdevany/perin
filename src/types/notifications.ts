export interface Notification {
  id: string;
  user_id: string;
  type:
    | "network.connection.invite"
    | "network.connection.accepted"
    | "network.session.started"
    | "network.message.received"
    | "network.meeting.confirmed"
    | "network.meeting.canceled"
    // Phase 1+ additions
    | "calendar.meeting.confirm_request"
    | "calendar.conflict.detected"
    | "calendar.meeting.reminder"
    | "assistant.suggestion.better_time"
    | "assistant.follow_up.suggested"
    | "system.digest.daily";
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  // Phase 1 fields — optional to maintain compatibility if columns are missing in older DBs
  requires_action?: boolean;
  is_resolved?: boolean;
  resolved_at?: string | null;
  action_deadline_at?: string | null;
  action_ref?: Record<string, unknown> | null;
  created_at: string;
}

// Notification devices (Phase 1)
export type NotificationDevicePlatform = "web" | "ios" | "android";

export interface NotificationDevice {
  id: string;
  user_id: string;
  platform: NotificationDevicePlatform;
  onesignal_player_id: string;
  device_info?: Record<string, unknown> | null;
  is_active: boolean;
  last_seen_at?: string | null;
  created_at: string;
}

// Preferences (Phase 1)
export interface NotificationPreferences {
  user_id: string;
  timezone?: string | null;
  dnd?: Record<string, unknown> | null; // windows per weekday
  channels?: Record<string, boolean> | null; // enable flags per type
  digest?: { enabled: boolean; windows?: unknown } | null;
  updated_at?: string | null;
}

// Deliveries (Phase 1)
export type NotificationDeliveryChannel =
  | "mobile_push"
  | "web_push"
  | "email"
  | "sms"
  | "in_app";

export type NotificationDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed";

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  provider_message_id?: string | null;
  error?: string | null;
  attempts: number;
  last_attempt_at?: string | null;
  created_at: string;
}
