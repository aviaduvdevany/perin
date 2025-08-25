export interface DelegationSession {
  id: string;
  ownerUserId: string;
  externalUserName?: string;
  externalUserEmail?: string;
  ttlExpiresAt: Date;
  constraints?: MeetingConstraints;
  status: "active" | "expired" | "revoked";
  createdAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  metadata: Record<string, unknown>;
}

export interface MeetingConstraints {
  durationMinutes?: number;
  timezone?: string;
  location?: string;
  meetingType?: "video" | "phone" | "in_person";
  preferredTimes?: string[];
  maxNoticeHours?: number;
  minNoticeHours?: number;
}

export interface DelegationMessage {
  id: string;
  delegationId: string;
  fromExternal: boolean;
  content: string;
  messageType: "text" | "proposal" | "confirmation";
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface DelegationOutcome {
  id: string;
  delegationId: string;
  outcomeType: "meeting_scheduled" | "meeting_declined" | "no_availability";
  meetingDetails?: Record<string, unknown>;
  externalUserFeedback?: string;
  createdAt: Date;
}

export interface CreateDelegationRequest {
  ttlHours: number;
  constraints?: MeetingConstraints;
  externalUserName?: string;
}

export interface CreateDelegationResponse {
  delegationId: string;
  shareableUrl: string;
  qrCodeData: string;
  expiresAt: Date;
}

export interface DelegationChatRequest {
  delegationId: string;
  message: string;
  externalUserName?: string;
  signature?: string;
}

export interface DelegationDetails {
  session: DelegationSession;
  messages: DelegationMessage[];
  outcomes: DelegationOutcome[];
  analytics: {
    totalMessages: number;
    externalMessages: number;
    proposalsGenerated: number;
    meetingsScheduled: number;
    averageResponseTime: number;
  };
}

export interface DelegationListResponse {
  delegations: DelegationSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
