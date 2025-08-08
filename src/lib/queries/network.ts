import { query } from "@/lib/db";
import {
  USER_CONNECTIONS_TABLE,
  CONNECTION_PERMISSIONS_TABLE,
  AGENT_SESSIONS_TABLE,
  AGENT_MESSAGES_TABLE,
  AUDIT_LOGS_TABLE,
  IDEMPOTENCY_KEYS_TABLE,
} from "@/lib/tables";
import type {
  UserConnection,
  ConnectionPermission,
  AgentSession,
  AgentMessage,
  NetworkScope,
  ConnectionConstraints,
  AgentSessionOutcome,
  AgentMessageType,
} from "@/types/network";

// Connections
export const createConnection = async (
  requesterUserId: string,
  targetUserId: string
): Promise<UserConnection> => {
  const sql = `
    INSERT INTO ${USER_CONNECTIONS_TABLE} (requester_user_id, target_user_id)
    VALUES ($1, $2)
    RETURNING *
  `;
  const result = await query(sql, [requesterUserId, targetUserId]);
  return result.rows[0];
};

export const getConnectionByUsers = async (
  userA: string,
  userB: string
): Promise<UserConnection | null> => {
  const sql = `
    SELECT * FROM ${USER_CONNECTIONS_TABLE}
    WHERE (requester_user_id = $1 AND target_user_id = $2)
       OR (requester_user_id = $2 AND target_user_id = $1)
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await query(sql, [userA, userB]);
  return result.rows[0] || null;
};

export const getConnectionById = async (
  id: string
): Promise<UserConnection | null> => {
  const sql = `
    SELECT * FROM ${USER_CONNECTIONS_TABLE}
    WHERE id = $1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

export const updateConnectionStatus = async (
  connectionId: string,
  status: "pending" | "active" | "revoked"
): Promise<UserConnection> => {
  const sql = `
    UPDATE ${USER_CONNECTIONS_TABLE}
    SET status = $2, updated_at = now()
    WHERE id = $1
    RETURNING *
  `;
  const result = await query(sql, [connectionId, status]);
  return result.rows[0];
};

export const listConnectionsForUser = async (
  userId: string
): Promise<UserConnection[]> => {
  const sql = `
    SELECT * FROM ${USER_CONNECTIONS_TABLE}
    WHERE requester_user_id = $1 OR target_user_id = $1
    ORDER BY updated_at DESC
  `;
  const result = await query(sql, [userId]);
  return result.rows;
};

// Permissions
export const upsertConnectionPermissions = async (
  connectionId: string,
  scopes: NetworkScope[],
  constraints: ConnectionConstraints
): Promise<ConnectionPermission> => {
  const sql = `
    INSERT INTO ${CONNECTION_PERMISSIONS_TABLE} (connection_id, scopes, constraints)
    VALUES ($1, $2, $3)
    ON CONFLICT (connection_id)
    DO UPDATE SET scopes = $2, constraints = $3, updated_at = now()
    RETURNING *
  `;
  const result = await query(sql, [
    connectionId,
    scopes,
    JSON.stringify(constraints || {}),
  ]);
  return result.rows[0];
};

export const getConnectionPermissions = async (
  connectionId: string
): Promise<ConnectionPermission | null> => {
  const sql = `
    SELECT * FROM ${CONNECTION_PERMISSIONS_TABLE}
    WHERE connection_id = $1
  `;
  const result = await query(sql, [connectionId]);
  return result.rows[0] || null;
};

// Agent Sessions
export const createAgentSession = async (session: {
  type: AgentSession["type"];
  initiator_user_id: string;
  counterpart_user_id: string;
  connection_id: string;
  status: AgentSession["status"];
  ttl_expires_at: string;
  outcome?: AgentSessionOutcome | null;
}): Promise<AgentSession> => {
  const sql = `
    INSERT INTO ${AGENT_SESSIONS_TABLE} (
      type, initiator_user_id, counterpart_user_id, connection_id, status, ttl_expires_at, outcome
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const params = [
    session.type,
    session.initiator_user_id,
    session.counterpart_user_id,
    session.connection_id,
    session.status,
    session.ttl_expires_at,
    JSON.stringify(session.outcome ?? null),
  ];
  const result = await query(sql, params);
  return result.rows[0];
};

export const updateAgentSession = async (
  id: string,
  updates: Partial<{
    status: AgentSession["status"];
    outcome: AgentSessionOutcome | null;
    ttl_expires_at: string;
  }>
): Promise<AgentSession> => {
  const sql = `
    UPDATE ${AGENT_SESSIONS_TABLE}
    SET
      status = COALESCE($2, status),
      outcome = COALESCE($3, outcome),
      ttl_expires_at = COALESCE($4, ttl_expires_at),
      updated_at = now()
    WHERE id = $1
    RETURNING *
  `;
  const result = await query(sql, [
    id,
    updates.status ?? null,
    updates.outcome ? JSON.stringify(updates.outcome) : null,
    updates.ttl_expires_at ?? null,
  ]);
  return result.rows[0];
};

export const getAgentSessionById = async (
  id: string
): Promise<AgentSession | null> => {
  const sql = `
    SELECT * FROM ${AGENT_SESSIONS_TABLE}
    WHERE id = $1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

// Agent Messages
export const createAgentMessage = async (message: {
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  type: AgentMessageType;
  payload: unknown;
  dedupe_key?: string | null;
}): Promise<AgentMessage> => {
  const sql = `
    INSERT INTO ${AGENT_MESSAGES_TABLE} (
      session_id, from_user_id, to_user_id, type, payload, dedupe_key
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await query(sql, [
    message.session_id,
    message.from_user_id,
    message.to_user_id,
    message.type,
    JSON.stringify(message.payload),
    message.dedupe_key || null,
  ]);
  return result.rows[0];
};

export const listAgentMessages = async (
  sessionId: string
): Promise<AgentMessage[]> => {
  const sql = `
    SELECT * FROM ${AGENT_MESSAGES_TABLE}
    WHERE session_id = $1
    ORDER BY created_at ASC
  `;
  const result = await query(sql, [sessionId]);
  return result.rows;
};

// Audit Logs (simple helper)
export const createAuditLog = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {}
): Promise<boolean> => {
  const sql = `
    INSERT INTO ${AUDIT_LOGS_TABLE} (user_id, action, resource_type, resource_id, details)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const result = await query(sql, [
    userId,
    action,
    resourceType,
    resourceId,
    JSON.stringify(details),
  ]);
  return (result.rowCount || 0) > 0;
};

// Idempotency keys (basic)
export const registerIdempotencyKey = async (
  key: string,
  scope: string
): Promise<boolean> => {
  const sql = `
    INSERT INTO ${IDEMPOTENCY_KEYS_TABLE} (key, scope)
    VALUES ($1, $2)
    ON CONFLICT (key) DO NOTHING
  `;
  const result = await query(sql, [key, scope]);
  return (result.rowCount || 0) > 0;
};
