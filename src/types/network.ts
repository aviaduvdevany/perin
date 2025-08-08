// Network (Perin-to-Perin) types

export type NetworkScope =
  | "profile.basic.read"
  | "calendar.availability.read"
  | "calendar.events.propose"
  | "calendar.events.write.auto"
  | "calendar.events.write.confirm";

export interface ConnectionConstraints {
  workingHours?: {
    start: string; // e.g. "09:00"
    end: string; // e.g. "17:00"
    timezone?: string; // IANA TZ
    weekdays?: number[]; // 0-6 (Sun-Sat)
  };
  minNoticeHours?: number; // e.g. 24
  meetingLengthMins?: { min: number; max: number; default?: number };
  locationPreference?: "video" | "phone" | "in_person";
  maxMeetingsPerWeek?: number;
  autoScheduling?: boolean; // true -> auto confirm, false -> proposals only
  metadata?: Record<string, unknown>;
}

export interface UserConnection {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  status: "pending" | "active" | "revoked";
  created_at: string;
  updated_at: string;
}

export interface ConnectionPermission {
  id: string;
  connection_id: string;
  scopes: NetworkScope[];
  constraints: ConnectionConstraints;
  updated_at: string;
}

export type NetworkSessionType = "schedule_meeting" | "proposal_only";
export type NetworkSessionStatus =
  | "initiated"
  | "negotiating"
  | "awaiting_confirmation"
  | "confirmed"
  | "canceled"
  | "expired"
  | "error";

export interface AgentSessionOutcome {
  selectedSlot?: {
    start: string; // ISO
    end: string; // ISO
    tz: string;
  };
  eventIds?: {
    initiatorCalEventId?: string;
    counterpartCalEventId?: string;
  };
  reason?: string;
}

export interface AgentSession {
  id: string;
  type: NetworkSessionType;
  initiator_user_id: string;
  counterpart_user_id: string;
  connection_id: string;
  status: NetworkSessionStatus;
  ttl_expires_at: string; // ISO
  outcome?: AgentSessionOutcome;
  created_at: string;
  updated_at: string;
}

export type AgentMessageType =
  | "proposal"
  | "accept"
  | "confirm"
  | "cancel"
  | "error";

export interface AgentMessagePayloadProposal {
  proposals: Array<{ start: string; end: string; tz: string }>;
  durationMins: number;
  constraintsHash?: string;
}

export interface AgentMessagePayloadAccept {
  selected: { start: string; end: string; tz: string };
}

export interface AgentMessagePayloadConfirm extends AgentMessagePayloadAccept {
  eventIds?: { initiatorCalEventId?: string; counterpartCalEventId?: string };
}

export interface AgentMessagePayloadCancel {
  reason: string;
}

export interface AgentMessagePayloadError {
  code: string;
  message: string;
}

export type AgentMessagePayload =
  | AgentMessagePayloadProposal
  | AgentMessagePayloadAccept
  | AgentMessagePayloadConfirm
  | AgentMessagePayloadCancel
  | AgentMessagePayloadError;

export interface AgentMessage {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  type: AgentMessageType;
  payload: AgentMessagePayload;
  dedupe_key?: string;
  created_at: string;
}

export interface CreateConnectionRequest {
  targetUserId: string;
  scopes: NetworkScope[];
  constraints?: ConnectionConstraints;
}

export interface AcceptConnectionRequest {
  scopes: NetworkScope[];
  constraints?: ConnectionConstraints;
}

export interface UpdateConnectionPermissionsRequest {
  scopes?: NetworkScope[];
  constraints?: ConnectionConstraints;
}

export interface StartNetworkSessionRequest {
  type: NetworkSessionType;
  counterpartUserId: string;
  connectionId: string;
  intent?: "schedule" | "propose";
  meeting?: {
    durationMins: number;
    earliest?: string; // ISO
    latest?: string; // ISO
    tz: string;
  };
}

export interface PostNetworkMessageRequest {
  type: AgentMessageType;
  sessionId: string;
  toUserId: string;
  payload: AgentMessagePayload;
}
