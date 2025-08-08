import * as networkQueries from "@/lib/queries/network";
import type { NetworkScope } from "@/types/network";

export async function requireActiveConnection(connectionId: string) {
  const connection = await networkQueries.getConnectionById(connectionId);
  if (!connection) throw new Error("connection:not_found");
  if (connection.status !== "active") throw new Error("connection:not_active");
  return connection;
}

export async function requireConnectionMembership(
  connectionId: string,
  userId: string
) {
  const connection = await networkQueries.getConnectionById(connectionId);
  if (!connection) throw new Error("connection:not_found");
  if (
    connection.requester_user_id !== userId &&
    connection.target_user_id !== userId
  ) {
    throw new Error("connection:not_member");
  }
  return connection;
}

export async function requireScopes(
  connectionId: string,
  required: NetworkScope[]
) {
  const permissions = await networkQueries.getConnectionPermissions(
    connectionId
  );
  const scopes = permissions?.scopes || [];
  for (const s of required) {
    if (!scopes.includes(s)) throw new Error("connection:insufficient_scopes");
  }
  return { scopes, constraints: permissions?.constraints || {} };
}

export function requireCounterpartMatch(
  session: { initiator_user_id: string; counterpart_user_id: string },
  userId: string
) {
  if (
    session.initiator_user_id !== userId &&
    session.counterpart_user_id !== userId
  ) {
    throw new Error("session:not_participant");
  }
}

export function ensureSessionNotExpired(ttlIso: string) {
  const expires = new Date(ttlIso).getTime();
  if (Date.now() > expires) throw new Error("session:expired");
}
