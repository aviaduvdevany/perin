import type { UserIntegration } from "@/lib/queries/integrations";

export interface RevocationResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export interface RevocationAuditLog {
  timestamp: string;
  userId: string;
  integrationId: string;
  integrationType: string;
  tokenType: "access" | "refresh";
  success: boolean;
  error?: string;
  statusCode?: number;
}

// Audit logging for token revocation
const logRevocationAttempt = (log: RevocationAuditLog) => {
  const logEntry = {
    ...log,
    timestamp: new Date().toISOString(),
  };

  // Log to console for now - in production this should go to a proper audit system
  if (log.success) {
    console.log(`✅ Token revocation successful:`, logEntry);
  } else {
    console.error(`❌ Token revocation failed:`, logEntry);
  }

  // TODO: Send to proper audit logging system (e.g., structured logging, database, etc.)
};

export const revokeGoogleToken = async (
  accessToken: string,
  refreshToken?: string | null
): Promise<RevocationResult> => {
  const results: RevocationResult[] = [];

  // Revoke access token
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `token=${accessToken}`,
    });

    results.push({
      success: response.ok,
      statusCode: response.status,
      error: response.ok
        ? undefined
        : `HTTP ${response.status}: ${response.statusText}`,
    });
  } catch (error) {
    results.push({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Revoke refresh token if provided
  if (refreshToken) {
    try {
      const response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `token=${refreshToken}`,
      });

      results.push({
        success: response.ok,
        statusCode: response.status,
        error: response.ok
          ? undefined
          : `HTTP ${response.status}: ${response.statusText}`,
      });
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Return success only if all revocations succeeded
  const allSuccessful = results.every((r) => r.success);
  const firstError = results.find((r) => !r.success)?.error;

  return {
    success: allSuccessful,
    error: allSuccessful ? undefined : firstError,
    statusCode: results[0]?.statusCode,
  };
};

export const revokeIntegrationTokens = async (
  integration: UserIntegration,
  userId: string
): Promise<RevocationResult> => {
  const isGoogleIntegration =
    integration.integration_type === "gmail" ||
    integration.integration_type === "calendar";

  if (!isGoogleIntegration) {
    return {
      success: true, // Non-Google integrations don't need token revocation
    };
  }

  const result = await revokeGoogleToken(
    integration.access_token,
    integration.refresh_token
  );

  // Log the revocation attempt
  logRevocationAttempt({
    timestamp: new Date().toISOString(),
    userId,
    integrationId: integration.id,
    integrationType: integration.integration_type,
    tokenType: "access", // We revoke both access and refresh, but log as access
    success: result.success,
    error: result.error,
    statusCode: result.statusCode,
  });

  return result;
};

export const revokeAllGoogleTokens = async (
  integrations: UserIntegration[],
  userId: string
): Promise<RevocationResult[]> => {
  const googleIntegrations = integrations.filter(
    (integration) =>
      integration.integration_type === "gmail" ||
      integration.integration_type === "calendar"
  );

  const results = await Promise.all(
    googleIntegrations.map((integration) =>
      revokeIntegrationTokens(integration, userId)
    )
  );

  return results;
};
