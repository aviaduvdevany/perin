import { query } from "@/lib/db";
import { USER_INTEGRATIONS_TABLE } from "@/lib/tables";
import { encryptToken, decryptToken } from "@/lib/utils/token-encryption";

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
  account_email?: string | null;
  account_label?: string | null;
  metadata: Record<string, unknown>;
}

// Get user integration by type
export const getUserIntegration = async (
  userId: string,
  integrationType: string
): Promise<UserIntegration | null> => {
  const sql = `
    SELECT * FROM ${USER_INTEGRATIONS_TABLE}
    WHERE user_id = $1 AND integration_type = $2 AND is_active = true
    ORDER BY connected_at DESC
    LIMIT 1
  `;

  try {
    const result = await query(sql, [userId, integrationType]);
    if (!result.rows[0]) return null;

    const integration = result.rows[0];
    return {
      ...integration,
      access_token: decryptToken(integration.access_token),
      refresh_token: integration.refresh_token
        ? decryptToken(integration.refresh_token)
        : null,
    };
  } catch (error) {
    console.error("Error getting user integration:", error);
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
  metadata: Record<string, unknown> = {},
  accountEmail?: string | null,
  accountLabel?: string | null
): Promise<UserIntegration> => {
  // Encrypt tokens before storage
  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = refreshToken
    ? encryptToken(refreshToken)
    : null;

  const sql = `
    INSERT INTO ${USER_INTEGRATIONS_TABLE} (
      user_id, integration_type, access_token, refresh_token,
      token_expires_at, scopes, metadata, account_email, account_label
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (user_id, integration_type, account_email)
    DO UPDATE SET 
      access_token = $3,
      refresh_token = $4,
      token_expires_at = $5,
      scopes = $6,
      metadata = $7,
      account_label = COALESCE($9, ${USER_INTEGRATIONS_TABLE}.account_label),
      connected_at = now(),
      is_active = true
    RETURNING *
  `;

  try {
    // For single-account integrations (like calendar), find and update the existing one
    // This maintains the existing ID and constraints while updating tokens
    const existingIntegration = await getUserIntegration(
      userId,
      integrationType
    );

    if (existingIntegration) {
      console.log("Updating existing integration:", {
        existingId: existingIntegration.id,
        oldExpiry: existingIntegration.token_expires_at,
        newExpiry: expiresAt.toISOString(),
      });

      // Update the existing integration with new tokens
      const updateSql = `
        UPDATE ${USER_INTEGRATIONS_TABLE} 
        SET 
          access_token = $1,
          refresh_token = $2,
          token_expires_at = $3,
          scopes = $4,
          metadata = $5,
          account_email = COALESCE($6, account_email),
          account_label = COALESCE($7, account_label),
          connected_at = now(),
          is_active = true
        WHERE id = $8
        RETURNING *
      `;

      const result = await query(updateSql, [
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt.toISOString(),
        scopes,
        JSON.stringify(metadata),
        accountEmail || null,
        accountLabel || null,
        existingIntegration.id,
      ]);

      console.log("Updated existing integration:", {
        integrationId: result.rows[0].id,
        connectedAt: result.rows[0].connected_at,
        accountEmail: result.rows[0].account_email,
      });

      return {
        ...result.rows[0],
        access_token: accessToken, // Return decrypted for immediate use
        refresh_token: refreshToken, // Return decrypted for immediate use
      };
    } else {
      // No existing integration, create a new one
      console.log("Creating new integration (no existing found)");

      const result = await query(sql, [
        userId,
        integrationType,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt.toISOString(),
        scopes,
        JSON.stringify(metadata),
        accountEmail || null,
        accountLabel || null,
      ]);

      console.log("Created new integration:", {
        integrationId: result.rows[0].id,
        connectedAt: result.rows[0].connected_at,
        accountEmail: result.rows[0].account_email,
      });

      return {
        ...result.rows[0],
        access_token: accessToken, // Return decrypted for immediate use
        refresh_token: refreshToken, // Return decrypted for immediate use
      };
    }
  } catch (error) {
    console.error("Error creating/updating user integration:", error);
    throw error;
  }
};

// Update integration tokens
export const updateIntegrationTokens = async (
  integrationId: string,
  accessToken: string,
  expiresAt: Date | null
): Promise<boolean> => {
  const encryptedAccessToken = encryptToken(accessToken);
  const sql = `
    UPDATE ${USER_INTEGRATIONS_TABLE}
    SET access_token = $1, token_expires_at = $2, last_sync_at = now()
    WHERE id = $3
  `;

  try {
    const result = await query(sql, [
      encryptedAccessToken,
      expiresAt?.toISOString() || null,
      integrationId,
    ]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error updating integration tokens:", error);
    throw error;
  }
};

// Get all user integrations
export const getUserIntegrations = async (
  userId: string
): Promise<UserIntegration[]> => {
  const sql = `
    SELECT * FROM ${USER_INTEGRATIONS_TABLE}
    WHERE user_id = $1 AND is_active = true
    ORDER BY connected_at DESC
  `;

  try {
    const result = await query(sql, [userId]);
    return result.rows.map((integration) => {
      try {
        return {
          ...integration,
          access_token: decryptToken(integration.access_token),
          refresh_token: integration.refresh_token
            ? decryptToken(integration.refresh_token)
            : null,
        };
      } catch (decryptError) {
        console.error(
          `Error decrypting tokens for integration ${integration.id}:`,
          decryptError
        );
        // Return integration with null tokens - this will trigger re-authentication
        return {
          ...integration,
          access_token: null,
          refresh_token: null,
          needs_reauth: true,
        };
      }
    });
  } catch (error) {
    console.error("Error getting user integrations:", error);
    throw error;
  }
};

// Deactivate integration
export const deactivateIntegration = async (
  userId: string,
  integrationType: string
): Promise<boolean> => {
  const sql = `
    UPDATE ${USER_INTEGRATIONS_TABLE}
    SET is_active = false
    WHERE user_id = $1 AND integration_type = $2
  `;

  try {
    const result = await query(sql, [userId, integrationType]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error deactivating integration:", error);
    throw error;
  }
};

// Deactivate a specific integration by id (multi-account safe)
export const deactivateIntegrationById = async (
  integrationId: string,
  userId: string
): Promise<boolean> => {
  const sql = `
    UPDATE ${USER_INTEGRATIONS_TABLE}
    SET is_active = false
    WHERE id = $1 AND user_id = $2 AND is_active = true
  `;

  try {
    const result = await query(sql, [integrationId, userId]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error deactivating integration by id:", error);
    throw error;
  }
};

// Clean up duplicate integrations (keep only the most recent one)
export const cleanupDuplicateIntegrations = async (
  userId: string,
  integrationType: string
): Promise<{ deactivated: number; kept: string | null }> => {
  try {
    // Get all active integrations of this type, ordered by most recent first
    const allIntegrations = await query(
      `SELECT id, connected_at FROM ${USER_INTEGRATIONS_TABLE} 
       WHERE user_id = $1 AND integration_type = $2 AND is_active = true 
       ORDER BY connected_at DESC`,
      [userId, integrationType]
    );

    if (allIntegrations.rows.length <= 1) {
      return { deactivated: 0, kept: allIntegrations.rows[0]?.id || null };
    }

    // Keep the first (most recent) and deactivate the rest
    const [keepIntegration, ...deactivateIntegrations] = allIntegrations.rows;

    if (deactivateIntegrations.length > 0) {
      const idsToDeactivate = deactivateIntegrations.map((row) => row.id);

      await query(
        `UPDATE ${USER_INTEGRATIONS_TABLE} 
         SET is_active = false 
         WHERE id = ANY($1::uuid[])`,
        [idsToDeactivate]
      );

      console.log("Cleaned up duplicate integrations:", {
        userId,
        integrationType,
        kept: keepIntegration.id,
        deactivated: idsToDeactivate,
      });
    }

    return {
      deactivated: deactivateIntegrations.length,
      kept: keepIntegration.id,
    };
  } catch (error) {
    console.error("Error cleaning up duplicate integrations:", error);
    throw error;
  }
};

// Completely remove integration data (for secure disconnection)
export const removeIntegrationData = async (
  integrationId: string,
  userId: string
): Promise<boolean> => {
  const sql = `
    DELETE FROM ${USER_INTEGRATIONS_TABLE}
    WHERE id = $1 AND user_id = $2
  `;

  try {
    const result = await query(sql, [integrationId, userId]);
    const deleted = (result.rowCount || 0) > 0;

    if (deleted) {
      console.log("Removed integration data:", {
        integrationId,
        userId,
      });
    }

    return deleted;
  } catch (error) {
    console.error("Error removing integration data:", error);
    throw error;
  }
};
