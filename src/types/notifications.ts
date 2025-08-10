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
    // Calendar, assistant, and system additions
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
  requires_action?: boolean;
  is_resolved?: boolean;
  resolved_at?: string | null;
  action_deadline_at?: string | null;
  action_ref?: Record<string, unknown> | null;
  created_at: string;
}

export type NotificationChannel =
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
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  provider_message_id?: string | null;
  error?: string | null;
  attempts: number;
  last_attempt_at?: string | null;
  created_at: string;
}

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

export interface NotificationPreferences {
  user_id: string;
  timezone?: string | null;
  dnd?: Record<string, unknown> | null; // windows per weekday
  channels?: Record<string, unknown> | null; // enable flags per type/channel
  digest?: Record<string, unknown> | null; // windows and flags
  updated_at: string;
}
