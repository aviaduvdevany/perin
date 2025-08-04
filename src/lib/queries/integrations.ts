import { query } from "@/lib/db";

const INTEGRATIONS_TABLE = 'user_integrations';

export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

// Get user integration by type
export const getUserIntegration = async (
  userId: string,
  integrationType: string
): Promise<UserIntegration | null> => {
  const sql = `
    SELECT * FROM ${INTEGRATIONS_TABLE}
    WHERE user_id = $1 AND integration_type = $2 AND is_active = true
  `;

  try {
    const result = await query(sql, [userId, integrationType]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user integration:', error);
    throw error;
  }
};

// Create new integration
export const createUserIntegration = async (
  userId: string,
  integrationType: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date,
  scopes: string[],
  metadata: Record<string, unknown> = {}
): Promise<UserIntegration> => {
  const sql = `
    INSERT INTO ${INTEGRATIONS_TABLE} (
      user_id, integration_type, access_token, refresh_token, 
      token_expires_at, scopes, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, integration_type) 
    DO UPDATE SET 
      access_token = $3,
      refresh_token = $4,
      token_expires_at = $5,
      scopes = $6,
      metadata = $7,
      connected_at = now(),
      is_active = true
    RETURNING *
  `;

  try {
    const result = await query(sql, [
      userId, integrationType, accessToken, refreshToken,
      expiresAt.toISOString(), scopes, JSON.stringify(metadata)
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user integration:', error);
    throw error;
  }
};

// Update integration tokens
export const updateIntegrationTokens = async (
  integrationId: string,
  accessToken: string,
  expiresAt: Date | null
): Promise<boolean> => {
  const sql = `
    UPDATE ${INTEGRATIONS_TABLE}
    SET access_token = $1, token_expires_at = $2, last_sync_at = now()
    WHERE id = $3
  `;

  try {
    const result = await query(sql, [
      accessToken, 
      expiresAt?.toISOString() || null, 
      integrationId
    ]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error updating integration tokens:', error);
    throw error;
  }
};

// Get all user integrations
export const getUserIntegrations = async (
  userId: string
): Promise<UserIntegration[]> => {
  const sql = `
    SELECT * FROM ${INTEGRATIONS_TABLE}
    WHERE user_id = $1 AND is_active = true
    ORDER BY connected_at DESC
  `;

  try {
    const result = await query(sql, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting user integrations:', error);
    throw error;
  }
};

// Deactivate integration
export const deactivateIntegration = async (
  userId: string,
  integrationType: string
): Promise<boolean> => {
  const sql = `
    UPDATE ${INTEGRATIONS_TABLE}
    SET is_active = false
    WHERE user_id = $1 AND integration_type = $2
  `;

  try {
    const result = await query(sql, [userId, integrationType]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deactivating integration:', error);
    throw error;
  }
};