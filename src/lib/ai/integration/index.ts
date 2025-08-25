import { smartIntegrationDetector } from "./smart-detector";
import { smartContextLoader } from "./context-loader";
import { UserIntent, ConversationContext } from "../../../types/understanding";
import {
  IntegrationType,
  IntegrationRelevance,
  SmartIntegrationRequest,
  SmartIntegrationResponse,
} from "./smart-detector";
import {
  SmartContextLoaderRequest,
  SmartContextLoaderResponse,
  LoadedContext,
} from "./context-loader";

export interface IntegrationOrchestrationRequest {
  userIntent: UserIntent;
  conversationContext: ConversationContext;
  userInput: string;
  userId: string;
  availableIntegrations: IntegrationType[];
}

export interface IntegrationOrchestrationResponse {
  relevantIntegrations: IntegrationRelevance[];
  loadedContexts: LoadedContext[];
  primaryIntegration?: IntegrationType;
  suggestedWorkflow: string[];
  confidence: number;
  insights: string[];
  processingTime: number;
}

export interface IntegrationOrchestrationBatchRequest {
  requests: IntegrationOrchestrationRequest[];
}

export interface IntegrationOrchestrationBatchResponse {
  responses: IntegrationOrchestrationResponse[];
  totalProcessingTime: number;
}

export class IntegrationOrchestrator {
  private static instance: IntegrationOrchestrator;

  private constructor() {}

  public static getInstance(): IntegrationOrchestrator {
    if (!IntegrationOrchestrator.instance) {
      IntegrationOrchestrator.instance = new IntegrationOrchestrator();
    }
    return IntegrationOrchestrator.instance;
  }

  public async orchestrateIntegrations(
    request: IntegrationOrchestrationRequest
  ): Promise<IntegrationOrchestrationResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Detect relevant integrations
      const integrationResponse = await this.detectIntegrations(request);

      // Step 2: Load relevant contexts
      const contextResponse = await this.loadContexts(
        request,
        integrationResponse
      );

      // Step 3: Synthesize results
      const response = this.synthesizeResults(
        integrationResponse,
        contextResponse,
        request
      );

      console.log(
        `Integration orchestration completed in ${Date.now() - startTime}ms`
      );
      return response;
    } catch (error) {
      console.error("Integration orchestration failed:", error);
      return this.getFallbackResponse(request);
    }
  }

  private async detectIntegrations(
    request: IntegrationOrchestrationRequest
  ): Promise<SmartIntegrationResponse> {
    const integrationRequest: SmartIntegrationRequest = {
      userIntent: request.userIntent,
      conversationContext: request.conversationContext,
      availableIntegrations: request.availableIntegrations,
      userInput: request.userInput,
    };

    return await smartIntegrationDetector.detectRelevantIntegrations(
      integrationRequest
    );
  }

  private async loadContexts(
    request: IntegrationOrchestrationRequest,
    integrationResponse: SmartIntegrationResponse
  ): Promise<SmartContextLoaderResponse> {
    const contextRequest: SmartContextLoaderRequest = {
      userIntent: request.userIntent,
      conversationContext: request.conversationContext,
      relevantIntegrations: integrationResponse.relevantIntegrations,
      userId: request.userId,
    };

    return await smartContextLoader.loadRelevantContext(contextRequest);
  }

  private synthesizeResults(
    integrationResponse: SmartIntegrationResponse,
    contextResponse: SmartContextLoaderResponse,
    request: IntegrationOrchestrationRequest
  ): IntegrationOrchestrationResponse {
    // Combine insights from both responses
    const insights = [
      ...integrationResponse.relevantIntegrations.map(
        (integration) =>
          `${integration.integrationType}: ${
            integration.reasoning
          } (${Math.round(integration.relevance * 100)}% relevant)`
      ),
      ...contextResponse.insights,
    ];

    // Generate workflow suggestions
    const suggestedWorkflow = this.generateWorkflow(
      request.userIntent,
      integrationResponse.relevantIntegrations,
      contextResponse.loadedContexts
    );

    return {
      relevantIntegrations: integrationResponse.relevantIntegrations,
      loadedContexts: contextResponse.loadedContexts,
      primaryIntegration: integrationResponse.primaryIntegration,
      suggestedWorkflow,
      confidence: Math.min(integrationResponse.confidence, 0.9), // Cap at 0.9 for integration confidence
      insights,
      processingTime: Date.now() - Date.now(), // This will be set by the calling method
    };
  }

  private generateWorkflow(
    userIntent: UserIntent,
    relevantIntegrations: IntegrationRelevance[],
    loadedContexts: LoadedContext[]
  ): string[] {
    const workflow: string[] = [];

    // Add intent-specific workflow steps
    switch (userIntent.type) {
      case "scheduling":
        if (
          relevantIntegrations.some((i) => i.integrationType === "calendar")
        ) {
          workflow.push(
            "check_availability",
            "schedule_meeting",
            "send_confirmation"
          );
        }
        break;

      case "information":
        if (relevantIntegrations.some((i) => i.integrationType === "gmail")) {
          workflow.push(
            "search_emails",
            "summarize_results",
            "present_findings"
          );
        }
        break;

      case "coordination":
        if (relevantIntegrations.some((i) => i.integrationType === "slack")) {
          workflow.push("read_messages", "analyze_context", "send_response");
        }
        break;

      case "delegation":
        workflow.push(
          "analyze_request",
          "identify_delegatee",
          "create_delegation",
          "notify_parties"
        );
        break;

      default:
        workflow.push("analyze_request", "execute_action", "provide_feedback");
    }

    // Add integration-specific steps
    relevantIntegrations.forEach((integration) => {
      if (integration.suggestedActions.length > 0) {
        workflow.push(...integration.suggestedActions.slice(0, 2)); // Limit to 2 actions per integration
      }
    });

    // Remove duplicates and limit length
    return [...new Set(workflow)].slice(0, 10);
  }

  private getFallbackResponse(
    request: IntegrationOrchestrationRequest
  ): IntegrationOrchestrationResponse {
    return {
      relevantIntegrations: [],
      loadedContexts: [],
      primaryIntegration: undefined,
      suggestedWorkflow: ["analyze_request", "provide_fallback_response"],
      confidence: 0.5,
      insights: ["Fallback response due to orchestration error"],
      processingTime: 0,
    };
  }

  public async batchOrchestrateIntegrations(
    request: IntegrationOrchestrationBatchRequest
  ): Promise<IntegrationOrchestrationBatchResponse> {
    const startTime = Date.now();

    const responses = await Promise.allSettled(
      request.requests.map((req) => this.orchestrateIntegrations(req))
    );

    const validResponses = responses.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : this.getFallbackResponse(request.requests[0])
    );

    return {
      responses: validResponses,
      totalProcessingTime: Date.now() - startTime,
    };
  }

  public async preloadUserIntegrations(
    userId: string,
    integrationTypes: IntegrationType[]
  ): Promise<LoadedContext[]> {
    return await smartContextLoader.preloadContexts(userId, integrationTypes);
  }

  public async refreshIntegration(
    userId: string,
    integrationType: IntegrationType
  ): Promise<LoadedContext | null> {
    return await smartContextLoader.refreshContext(integrationType, userId);
  }

  public async suggestWorkflow(
    userIntent: UserIntent,
    relevantIntegrations: IntegrationRelevance[]
  ): Promise<string[]> {
    return await smartIntegrationDetector.suggestWorkflow(
      userIntent,
      relevantIntegrations
    );
  }

  public getIntegrationCapabilities(
    integrationType: IntegrationType
  ): string[] {
    return smartIntegrationDetector.getIntegrationCapabilities(integrationType);
  }

  public async validateIntegrationAccess(
    userId: string,
    integrationType: IntegrationType
  ): Promise<boolean> {
    try {
      // This would check if the user has access to the integration
      // For now, return true for all integrations
      return true;
    } catch (error) {
      console.error(`Failed to validate access for ${integrationType}:`, error);
      return false;
    }
  }

  public async getIntegrationStatus(
    userId: string,
    integrationTypes: IntegrationType[]
  ): Promise<
    Record<
      IntegrationType,
      { connected: boolean; lastSync?: Date; error?: string }
    >
  > {
    const status: Record<
      IntegrationType,
      { connected: boolean; lastSync?: Date; error?: string }
    > = {} as Record<
      IntegrationType,
      { connected: boolean; lastSync?: Date; error?: string }
    >;

    for (const type of integrationTypes) {
      try {
        const connected = await this.validateIntegrationAccess(userId, type);
        status[type] = {
          connected,
          lastSync: connected ? new Date() : undefined,
        };
      } catch (error) {
        status[type] = {
          connected: false,
          error: (error as Error).message,
        };
      }
    }

    return status;
  }
}

export const integrationOrchestrator = IntegrationOrchestrator.getInstance();

// Export individual components for direct use if needed
export { smartIntegrationDetector, smartContextLoader };
