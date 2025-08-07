import type {
  IntegrationType,
  IntegrationContext,
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  IntegrationCallbackRequest,
  IntegrationCallbackResponse,
  IntegrationStatus,
} from "@/types/integrations";
import {
  getIntegrationConfig,
  detectIntegrationContext,
  getAvailableIntegrationTypes,
} from "./registry";
import { createUnifiedOAuth2Manager } from "./oauth2-manager";
import * as integrationQueries from "@/lib/queries/integrations";

/**
 * Connect an integration (initiate OAuth2 flow)
 */
export const connectIntegration = async (
  request: ConnectIntegrationRequest
): Promise<ConnectIntegrationResponse> => {
  try {
    const { type, userId } = request;
    const config = getIntegrationConfig(type);

    // Create OAuth2 manager for this integration
    const oauth2Manager = createUnifiedOAuth2Manager(type, config.scopes);

    // Generate authorization URL
    const authUrl = oauth2Manager.generateAuthUrl(userId);

    return {
      authUrl,
      message: `Connect to ${config.name}`,
    };
  } catch (error) {
    console.error(`Error connecting ${request.type}:`, error);
    throw new Error(`Failed to connect ${request.type} integration`);
  }
};

/**
 * Handle OAuth2 callback and store integration
 */
export const handleIntegrationCallback = async (
  type: IntegrationType,
  request: IntegrationCallbackRequest
): Promise<IntegrationCallbackResponse> => {
  try {
    const { code } = request;
    const config = getIntegrationConfig(type);

    // Create OAuth2 manager
    const oauth2Manager = createUnifiedOAuth2Manager(type, config.scopes);

    // Exchange code for tokens
    const tokens = await oauth2Manager.exchangeCode(code);

    // Store integration in database
    const integration = await integrationQueries.createUserIntegration(
      request.state || "unknown", // userId from state
      type,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600000),
      config.scopes,
      { connectedAt: new Date().toISOString() }
    );

    return {
      success: true,
      message: `Successfully connected ${config.name}`,
      integration: {
        id: integration.id,
        userId: integration.user_id,
        type: integration.integration_type as IntegrationType,
        isActive: integration.is_active,
        connectedAt: integration.connected_at,
        lastSyncAt: integration.last_sync_at || undefined,
        scopes: integration.scopes,
        metadata: integration.metadata,
      },
    };
  } catch (error) {
    console.error(`Error handling ${type} callback:`, error);
    return {
      success: false,
      message: `Failed to connect ${type} integration`,
    };
  }
};

/**
 * Get integration status
 */
export const getIntegrationStatus = async (
  userId: string,
  type: IntegrationType
): Promise<IntegrationStatus | null> => {
  try {
    const integration = await integrationQueries.getUserIntegration(
      userId,
      type
    );

    if (!integration) {
      return null;
    }

    return {
      id: integration.id,
      userId: integration.user_id,
      type: integration.integration_type as IntegrationType,
      isActive: integration.is_active,
      connectedAt: integration.connected_at,
      lastSyncAt: integration.last_sync_at || undefined,
      scopes: integration.scopes,
      metadata: integration.metadata,
    };
  } catch (error) {
    console.error(`Error getting ${type} status:`, error);
    return null;
  }
};

/**
 * Load integration context data
 */
export const loadIntegrationContext = async (
  userId: string,
  type: IntegrationType,
  params?: unknown
): Promise<IntegrationContext> => {
  try {
    const config = getIntegrationConfig(type);
    const status = await getIntegrationStatus(userId, type);

    if (!status?.isActive) {
      return {
        isConnected: false,
        data: [],
        count: 0,
      };
    }

    // Load context data using the integration's context loader
    const data = await config.contextLoader(userId, params);

    // Transform data if transformer is available
    const transformedData = config.contextTransformer
      ? config.contextTransformer(data)
      : data;

    return {
      isConnected: true,
      data: transformedData as unknown[],
      count: Array.isArray(data) ? data.length : 0,
      lastSync: new Date().toISOString(),
      metadata: {
        integrationType: type,
        integrationName: config.name,
      },
    };
  } catch (error) {
    console.error(`Error loading ${type} context:`, error);
    return {
      isConnected: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Refresh integration tokens
 */
export const refreshIntegrationTokens = async (
  userId: string,
  type: IntegrationType
): Promise<boolean> => {
  try {
    const integration = await integrationQueries.getUserIntegration(
      userId,
      type
    );

    if (!integration?.refresh_token) {
      return false;
    }

    const config = getIntegrationConfig(type);
    const oauth2Manager = createUnifiedOAuth2Manager(type, config.scopes);

    const newTokens = await oauth2Manager.refreshToken(
      integration.refresh_token
    );

    await integrationQueries.updateIntegrationTokens(
      integration.id,
      newTokens.access_token,
      newTokens.expiry_date
        ? new Date(newTokens.expiry_date)
        : new Date(Date.now() + 3600000)
    );

    return true;
  } catch (error) {
    console.error(`Error refreshing ${type} tokens:`, error);
    return false;
  }
};

/**
 * Disconnect an integration
 */
export const disconnectIntegration = async (
  userId: string,
  type: IntegrationType
): Promise<boolean> => {
  try {
    const integration = await integrationQueries.getUserIntegration(
      userId,
      type
    );

    if (!integration) {
      return false;
    }

    await integrationQueries.deactivateIntegration(userId, type);
    return true;
  } catch (error) {
    console.error(`Error disconnecting ${type}:`, error);
    return false;
  }
};

/**
 * Get all user integrations
 */
export const getUserIntegrations = async (
  userId: string
): Promise<IntegrationStatus[]> => {
  try {
    const integrations = await integrationQueries.getUserIntegrations(userId);

    return integrations.map((integration) => ({
      id: integration.id,
      userId: integration.user_id,
      type: integration.integration_type as IntegrationType,
      isActive: integration.is_active,
      connectedAt: integration.connected_at,
      lastSyncAt: integration.last_sync_at || undefined,
      scopes: integration.scopes,
      metadata: integration.metadata,
    }));
  } catch (error) {
    console.error("Error getting user integrations:", error);
    return [];
  }
};

/**
 * Detect relevant integrations for a conversation
 */
export const detectRelevantIntegrations = (
  conversationText: string
): IntegrationType[] => {
  return getAvailableIntegrationTypes().filter((type) => {
    const detection = detectIntegrationContext(conversationText, type);
    return detection.isRelevant;
  });
};

/**
 * Load context for all relevant integrations
 */
export const loadRelevantContexts = async (
  userId: string,
  conversationText: string
): Promise<Record<IntegrationType, IntegrationContext>> => {
  const relevantTypes = detectRelevantIntegrations(conversationText);
  const contexts: Record<IntegrationType, IntegrationContext> = {} as Record<
    IntegrationType,
    IntegrationContext
  >;

  // Load context for each relevant integration
  await Promise.all(
    relevantTypes.map(async (type) => {
      contexts[type] = await loadIntegrationContext(userId, type);
    })
  );

  return contexts;
};
