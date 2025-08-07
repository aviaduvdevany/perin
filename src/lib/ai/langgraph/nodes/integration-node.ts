import type { LangGraphChatState } from "@/types/ai";
import type { IntegrationType, IntegrationContext } from "@/types/integrations";
import {
  getIntegrationStatus,
  loadIntegrationContext,
  detectRelevantIntegrations,
  loadRelevantContexts,
} from "@/lib/integrations/service";
import { detectIntegrationContext } from "@/lib/integrations/registry";

/**
 * Generic Integration Node for LangGraph
 * Handles any integration type dynamically
 */
export const createIntegrationNode = (integrationType: IntegrationType) => {
  return async (
    state: LangGraphChatState
  ): Promise<Partial<LangGraphChatState>> => {
    try {
      // Check if integration is connected
      const status = await getIntegrationStatus(state.userId, integrationType);

      if (!status?.isActive) {
        return {
          [`${integrationType}Context`]: {
            isConnected: false,
            data: [],
            count: 0,
          },
          currentStep: `${integrationType}_not_connected`,
        };
      }

      // Detect if conversation is relevant to this integration
      const conversationText = state.conversationContext.toLowerCase();
      const detection = detectIntegrationContext(
        conversationText,
        integrationType
      );

      // Smart context loading - only load if contextually relevant
      if (detection.isRelevant) {
        const { withRetry } = await import("@/lib/ai/resilience/error-handler");

        const context = await withRetry(
          async () => {
            return await loadIntegrationContext(state.userId, integrationType);
          },
          `integration-${integrationType}-${state.userId}`,
          { maxRetries: 2, baseDelayMs: 500, circuitBreaker: false }
        );

        return {
          [`${integrationType}Context`]: context,
          currentStep: `${integrationType}_context_loaded`,
        };
      }

      // Return empty context if not relevant
      return {
        [`${integrationType}Context`]: {
          isConnected: true,
          data: [],
          count: 0,
        },
        currentStep: `${integrationType}_context_loaded`,
      };
    } catch (error) {
      console.error(`Error in ${integrationType} integration node:`, error);
      return {
        [`${integrationType}Context`]: {
          isConnected: false,
          data: [],
          count: 0,
          error:
            error instanceof Error
              ? error.message
              : `${integrationType} integration error`,
        },
        currentStep: `${integrationType}_error`,
        error:
          error instanceof Error
            ? error.message
            : `${integrationType} integration error`,
      };
    }
  };
};

/**
 * Multi-Integration Node
 * Loads context for all relevant integrations in parallel
 */
export const multiIntegrationNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    const conversationText = state.conversationContext.toLowerCase();

    // Detect all relevant integrations
    const relevantIntegrations = detectRelevantIntegrations(conversationText);

    if (relevantIntegrations.length === 0) {
      return {
        integrations: {},
        currentStep: "no_relevant_integrations",
      };
    }

    // Load context for all relevant integrations in parallel
    const integrationContexts = await loadRelevantContexts(
      state.userId,
      conversationText
    );

    // Build the integrations object for the state
    const integrations: Record<IntegrationType, IntegrationContext> =
      {} as Record<IntegrationType, IntegrationContext>;

    // Initialize all integration contexts
    const allIntegrationTypes = [
      "gmail",
      "calendar",
      "slack",
      "notion",
      "github",
      "discord",
      "zoom",
      "teams",
    ] as IntegrationType[];

    allIntegrationTypes.forEach((type) => {
      integrations[type] = integrationContexts[type] || {
        isConnected: false,
        data: [],
        count: 0,
      };
    });

    return {
      integrations,
      currentStep: "integrations_loaded",
    };
  } catch (error) {
    console.error("Error in multi-integration node:", error);
    return {
      integrations: {},
      currentStep: "integration_error",
      error:
        error instanceof Error ? error.message : "Integration loading error",
    };
  }
};

/**
 * Legacy compatibility nodes
 * These maintain backward compatibility with existing code
 */
export const gmailNode = createIntegrationNode("gmail");
export const calendarNode = createIntegrationNode("calendar");

/**
 * Enhanced integration node with advanced features
 */
export const enhancedIntegrationNode = async (
  state: LangGraphChatState,
  options?: {
    forceLoad?: IntegrationType[];
    skipDetection?: boolean;
    maxIntegrations?: number;
  }
): Promise<Partial<LangGraphChatState>> => {
  try {
    const conversationText = state.conversationContext.toLowerCase();
    let relevantIntegrations: IntegrationType[] = [];

    if (options?.skipDetection) {
      // Use forced integrations
      relevantIntegrations = options.forceLoad || [];
    } else {
      // Detect relevant integrations
      relevantIntegrations = detectRelevantIntegrations(conversationText);

      // Add forced integrations if not already detected
      if (options?.forceLoad) {
        options.forceLoad.forEach((type) => {
          if (!relevantIntegrations.includes(type)) {
            relevantIntegrations.push(type);
          }
        });
      }
    }

    // Limit number of integrations if specified
    if (
      options?.maxIntegrations &&
      relevantIntegrations.length > options.maxIntegrations
    ) {
      relevantIntegrations = relevantIntegrations.slice(
        0,
        options.maxIntegrations
      );
    }

    if (relevantIntegrations.length === 0) {
      return {
        integrations: {},
        currentStep: "no_relevant_integrations",
      };
    }

    // Load contexts with enhanced error handling
    const integrationContexts: Record<IntegrationType, IntegrationContext> =
      {} as Record<IntegrationType, IntegrationContext>;

    await Promise.allSettled(
      relevantIntegrations.map(async (type) => {
        try {
          const context = await loadIntegrationContext(state.userId, type);
          integrationContexts[type] = context;
        } catch (error) {
          console.error(`Error loading ${type} context:`, error);
          integrationContexts[type] = {
            isConnected: false,
            data: [],
            count: 0,
            error: error instanceof Error ? error.message : "Loading error",
          };
        }
      })
    );

    // Initialize all integration types with default values
    const allIntegrationTypes = [
      "gmail",
      "calendar",
      "slack",
      "notion",
      "github",
      "discord",
      "zoom",
      "teams",
    ] as IntegrationType[];

    allIntegrationTypes.forEach((type) => {
      if (!integrationContexts[type]) {
        integrationContexts[type] = {
          isConnected: false,
          data: [],
          count: 0,
        };
      }
    });

    return {
      integrations: integrationContexts,
      currentStep: "enhanced_integrations_loaded",
    };
  } catch (error) {
    console.error("Error in enhanced integration node:", error);
    return {
      integrations: {},
      currentStep: "enhanced_integration_error",
      error:
        error instanceof Error
          ? error.message
          : "Enhanced integration loading error",
    };
  }
};
