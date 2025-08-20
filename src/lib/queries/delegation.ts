import { query } from "@/lib/db";
import type {
  DelegationSession,
  DelegationMessage,
  DelegationOutcome,
  MeetingConstraints,
} from "@/types/delegation";

/**
 * Create a new delegation session
 */
export const createDelegationSession = async (
  ownerUserId: string,
  ttlExpiresAt: Date,
  constraints?: MeetingConstraints,
  externalUserName?: string,
  externalUserEmail?: string
): Promise<DelegationSession> => {
  const result = await query(
    `INSERT INTO delegation_sessions (
      owner_user_id, 
      external_user_name, 
      external_user_email, 
      ttl_expires_at, 
      constraints, 
      status
    ) VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING *`,
    [
      ownerUserId,
      externalUserName,
      externalUserEmail,
      ttlExpiresAt,
      JSON.stringify(constraints),
      "active",
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    externalUserName: row.external_user_name,
    externalUserEmail: row.external_user_email,
    ttlExpiresAt: new Date(row.ttl_expires_at),
    constraints: row.constraints || {},
    status: row.status,
    createdAt: new Date(row.created_at),
    lastAccessedAt: row.last_accessed_at
      ? new Date(row.last_accessed_at)
      : undefined,
    accessCount: row.access_count || 0,
    metadata: row.metadata || {},
  };
};

/**
 * Get delegation session by ID
 */
export const getDelegationSession = async (
  delegationId: string
): Promise<DelegationSession | null> => {
  const result = await query(
    `SELECT * FROM delegation_sessions WHERE id = $1`,
    [delegationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    externalUserName: row.external_user_name,
    externalUserEmail: row.external_user_email,
    ttlExpiresAt: new Date(row.ttl_expires_at),
    constraints: row.constraints || {},
    status: row.status,
    createdAt: new Date(row.created_at),
    lastAccessedAt: row.last_accessed_at
      ? new Date(row.last_accessed_at)
      : undefined,
    accessCount: row.access_count || 0,
    metadata: row.metadata || {},
  };
};

/**
 * Update delegation session access
 */
export const updateDelegationAccess = async (
  delegationId: string
): Promise<void> => {
  await query(
    `UPDATE delegation_sessions 
     SET last_accessed_at = now(), access_count = access_count + 1 
     WHERE id = $1`,
    [delegationId]
  );
};

/**
 * Revoke delegation session
 */
export const revokeDelegationSession = async (
  delegationId: string,
  ownerUserId: string
): Promise<boolean> => {
  const result = await query(
    `UPDATE delegation_sessions 
     SET status = 'revoked' 
     WHERE id = $1 AND owner_user_id = $2`,
    [delegationId, ownerUserId]
  );

  return (result.rowCount ?? 0) > 0;
};

/**
 * List user's delegations with pagination
 */
export const listUserDelegations = async (
  ownerUserId: string,
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<{
  delegations: DelegationSession[];
  total: number;
}> => {
  const offset = (page - 1) * limit;

  let whereClause = "WHERE owner_user_id = $1";
  const params = [ownerUserId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM delegation_sessions ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get delegations
  const delegationsResult = await query(
    `SELECT * FROM delegation_sessions 
     ${whereClause}
     ORDER BY created_at DESC 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const delegations = delegationsResult.rows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id,
    externalUserName: row.external_user_name,
    externalUserEmail: row.external_user_email,
    ttlExpiresAt: new Date(row.ttl_expires_at),
    constraints: row.constraints || {},
    status: row.status,
    createdAt: new Date(row.created_at),
    lastAccessedAt: row.last_accessed_at
      ? new Date(row.last_accessed_at)
      : undefined,
    accessCount: row.access_count || 0,
    metadata: row.metadata || {},
  }));

  return { delegations, total };
};

/**
 * Create delegation message
 */
export const createDelegationMessage = async (
  delegationId: string,
  fromExternal: boolean,
  content: string,
  messageType: "text" | "proposal" | "confirmation" = "text",
  metadata: Record<string, unknown> = {}
): Promise<DelegationMessage> => {
  const result = await query(
    `INSERT INTO delegation_messages (
      delegation_id, 
      from_external, 
      content, 
      message_type, 
      metadata
    ) VALUES ($1, $2, $3, $4, $5) 
    RETURNING *`,
    [delegationId, fromExternal, content, messageType, JSON.stringify(metadata)]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    delegationId: row.delegation_id,
    fromExternal: row.from_external,
    content: row.content,
    messageType: row.message_type,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
  };
};

/**
 * Get delegation messages
 */
export const getDelegationMessages = async (
  delegationId: string,
  limit: number = 50
): Promise<DelegationMessage[]> => {
  const result = await query(
    `SELECT * FROM delegation_messages 
     WHERE delegation_id = $1 
     ORDER BY created_at ASC 
     LIMIT $2`,
    [delegationId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    delegationId: row.delegation_id,
    fromExternal: row.from_external,
    content: row.content,
    messageType: row.message_type,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
  }));
};

/**
 * Create delegation outcome
 */
export const createDelegationOutcome = async (
  delegationId: string,
  outcomeType: "meeting_scheduled" | "meeting_declined" | "no_availability",
  meetingDetails?: Record<string, unknown>,
  externalUserFeedback?: string
): Promise<DelegationOutcome> => {
  const result = await query(
    `INSERT INTO delegation_outcomes (
      delegation_id, 
      outcome_type, 
      meeting_details, 
      external_user_feedback
    ) VALUES ($1, $2, $3, $4) 
    RETURNING *`,
    [
      delegationId,
      outcomeType,
      meetingDetails ? JSON.stringify(meetingDetails) : null,
      externalUserFeedback,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    delegationId: row.delegation_id,
    outcomeType: row.outcome_type,
    meetingDetails: row.meeting_details,
    externalUserFeedback: row.external_user_feedback,
    createdAt: new Date(row.created_at),
  };
};

/**
 * Get delegation outcomes
 */
export const getDelegationOutcomes = async (
  delegationId: string
): Promise<DelegationOutcome[]> => {
  const result = await query(
    `SELECT * FROM delegation_outcomes 
     WHERE delegation_id = $1 
     ORDER BY created_at DESC`,
    [delegationId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    delegationId: row.delegation_id,
    outcomeType: row.outcome_type,
    meetingDetails: row.meeting_details,
    externalUserFeedback: row.external_user_feedback,
    createdAt: new Date(row.created_at),
  }));
};

/**
 * Expire old delegation sessions
 */
export const expireOldDelegationSessions = async (): Promise<number> => {
  const result = await query(
    `UPDATE delegation_sessions 
     SET status = 'expired' 
     WHERE status = 'active' AND ttl_expires_at < now()`
  );

  return result.rowCount ?? 0;
};

/**
 * Get delegation analytics
 */
export const getDelegationAnalytics = async (
  delegationId: string
): Promise<{
  totalMessages: number;
  externalMessages: number;
  proposalsGenerated: number;
  meetingsScheduled: number;
  averageResponseTime: number;
}> => {
  // Get message counts
  const messageStats = await query(
    `SELECT 
       COUNT(*) as total_messages,
       COUNT(*) FILTER (WHERE from_external = true) as external_messages,
       COUNT(*) FILTER (WHERE message_type = 'proposal') as proposals_generated
     FROM delegation_messages 
     WHERE delegation_id = $1`,
    [delegationId]
  );

  // Get meeting outcomes
  const outcomeStats = await query(
    `SELECT COUNT(*) as meetings_scheduled
     FROM delegation_outcomes 
     WHERE delegation_id = $1 AND outcome_type = 'meeting_scheduled'`,
    [delegationId]
  );

  // Calculate average response time (simplified - could be enhanced)
  const responseTimeStats = await query(
    `SELECT AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) as avg_response_time
     FROM delegation_messages m1
     JOIN delegation_messages m2 ON m1.delegation_id = m2.delegation_id
     WHERE m1.delegation_id = $1 
       AND m1.from_external = true 
       AND m2.from_external = false
       AND m2.created_at > m1.created_at
       AND m2.created_at <= m1.created_at + INTERVAL '1 hour'`,
    [delegationId]
  );

  const msgRow = messageStats.rows[0];
  const outcomeRow = outcomeStats.rows[0];
  const timeRow = responseTimeStats.rows[0];

  return {
    totalMessages: parseInt(msgRow.total_messages) || 0,
    externalMessages: parseInt(msgRow.external_messages) || 0,
    proposalsGenerated: parseInt(msgRow.proposals_generated) || 0,
    meetingsScheduled: parseInt(outcomeRow.meetings_scheduled) || 0,
    averageResponseTime: parseFloat(timeRow.avg_response_time) || 0,
  };
};
