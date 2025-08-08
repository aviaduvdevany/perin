export interface Notification {
  id: string;
  user_id: string;
  type:
    | "network.connection.invite"
    | "network.connection.accepted"
    | "network.session.started"
    | "network.message.received"
    | "network.meeting.confirmed"
    | "network.meeting.canceled";
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}
