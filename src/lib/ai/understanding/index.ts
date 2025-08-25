import { intentAnalyzer } from "./intent-analyzer";
import { ContextInsight, contextUnderstander } from "./context-understander";
import { languageProcessor } from "./language-processor";
import { entityExtractor } from "./entity-extractor";
import {
  IntentAnalysisRequest,
  IntentAnalysisResponse,
  ContextUnderstandingRequest,
  ContextUnderstandingResponse,
  LanguageProcessorRequest,
  LanguageProcessorResponse,
  EntityExtractionRequest,
  EntityExtractionResponse,
  ToolSuggestion,
} from "./types";
import {
  ConversationContext,
  UserIntent,
  ExtractedEntity,
  TimeExpression,
  UserPreferences,
  ConversationTurn,
} from "../../../types/understanding";

export interface UnderstandingRequest {
  input: string;
  userId: string;
  conversationHistory: ConversationTurn[];
  userPreferences: UserPreferences;
  context?: Record<string, unknown>;
}

export interface UnderstandingResponse {
  intent: UserIntent;
  entities: ExtractedEntity[];
  timeExpressions: TimeExpression[];
  language: string;
  confidence: number;
  context: ConversationContext;
  requiresAction: boolean;
  suggestedTools: string[];
  insights: string[];
}

export interface UnderstandingBatchRequest {
  requests: UnderstandingRequest[];
}

export interface UnderstandingBatchResponse {
  responses: UnderstandingResponse[];
  processingTime: number;
}

export class UnderstandingOrchestrator {
  private static instance: UnderstandingOrchestrator;

  private constructor() {}

  public static getInstance(): UnderstandingOrchestrator {
    if (!UnderstandingOrchestrator.instance) {
      UnderstandingOrchestrator.instance = new UnderstandingOrchestrator();
    }
    return UnderstandingOrchestrator.instance;
  }

  public async understand(
    request: UnderstandingRequest
  ): Promise<UnderstandingResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Language Processing
      const languageResponse = await this.processLanguage(request);

      // Step 2: Context Understanding
      const contextResponse = await this.processContext(
        request,
        languageResponse
      );

      // Step 3: Intent Analysis
      const intentResponse = await this.processIntent(
        request,
        languageResponse,
        contextResponse
      );

      // Step 4: Entity Extraction
      const entityResponse = await this.processEntities(
        request,
        languageResponse
      );

      // Step 5: Synthesize Results
      const response = this.synthesizeResults(
        request,
        languageResponse,
        contextResponse,
        intentResponse,
        entityResponse
      );

      console.log(`Understanding completed in ${Date.now() - startTime}ms`);
      return response;
    } catch (error) {
      console.error("Understanding orchestration failed:", error);
      return this.getFallbackResponse(request);
    }
  }

  private async processLanguage(
    request: UnderstandingRequest
  ): Promise<LanguageProcessorResponse> {
    const languageRequest: LanguageProcessorRequest = {
      input: request.input,
      sourceLanguage: request.userPreferences.language,
    };

    return await languageProcessor.processLanguage(languageRequest);
  }

  private async processContext(
    request: UnderstandingRequest,
    languageResponse: LanguageProcessorResponse
  ): Promise<ContextUnderstandingResponse> {
    const contextRequest: ContextUnderstandingRequest = {
      currentInput: request.input,
      conversationHistory: request.conversationHistory,
      userPreferences: request.userPreferences,
      userId: request.userId,
    };

    return await contextUnderstander.understandContext(contextRequest);
  }

  private async processIntent(
    request: UnderstandingRequest,
    languageResponse: LanguageProcessorResponse,
    contextResponse: ContextUnderstandingResponse
  ): Promise<IntentAnalysisResponse> {
    const intentRequest: IntentAnalysisRequest = {
      input: languageResponse.translatedText || request.input,
      conversationContext: contextResponse.conversationContext,
      userId: request.userId,
    };

    return await intentAnalyzer.analyzeIntent(intentRequest);
  }

  private async processEntities(
    request: UnderstandingRequest,
    languageResponse: LanguageProcessorResponse
  ): Promise<EntityExtractionResponse> {
    const entityRequest: EntityExtractionRequest = {
      input: request.input,
      language: languageResponse.languageInfo.language,
      context: request.context ? JSON.stringify(request.context) : undefined,
    };

    return await entityExtractor.extractEntities(entityRequest);
  }

  private synthesizeResults(
    request: UnderstandingRequest,
    languageResponse: LanguageProcessorResponse,
    contextResponse: ContextUnderstandingResponse,
    intentResponse: IntentAnalysisResponse,
    entityResponse: EntityExtractionResponse
  ): UnderstandingResponse {
    // Merge entities from different sources
    const allEntities = [
      ...intentResponse.entities,
      ...entityResponse.entities,
    ];

    // Remove duplicates based on value and type
    const uniqueEntities = this.deduplicateEntities(allEntities);

    // Merge time expressions
    const allTimeExpressions = [
      ...languageResponse.timeExpressions,
      ...entityResponse.timeExpressions,
    ];

    const uniqueTimeExpressions =
      this.deduplicateTimeExpressions(allTimeExpressions);

    // Generate insights
    const insights = this.generateInsights(
      contextResponse.contextInsights,
      intentResponse,
      entityResponse
    );

    return {
      intent: intentResponse.primaryIntent,
      entities: uniqueEntities,
      timeExpressions: uniqueTimeExpressions,
      language: languageResponse.languageInfo.language,
      confidence: Math.min(
        languageResponse.confidence,
        intentResponse.confidence,
        entityResponse.confidence
      ),
      context: contextResponse.conversationContext,
      requiresAction: intentResponse.requiresAction,
      suggestedTools: intentResponse.suggestedTools.map(
        (tool: ToolSuggestion) => tool.toolName
      ),
      insights,
    };
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter((entity) => {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private deduplicateTimeExpressions(
    expressions: TimeExpression[]
  ): TimeExpression[] {
    const seen = new Set<string>();
    return expressions.filter((expression) => {
      const key = expression.expression.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateInsights(
    contextInsights: ContextInsight[],
    intentResponse: IntentAnalysisResponse,
    entityResponse: EntityExtractionResponse
  ): string[] {
    const insights: string[] = [];

    // Add context insights
    contextInsights.forEach((insight) => {
      insights.push(
        `${insight.type}: ${insight.value} (${Math.round(
          insight.confidence * 100
        )}% confidence)`
      );
    });

    // Add intent insights
    if (intentResponse.confidence > 0.8) {
      insights.push(
        `High confidence intent detected: ${intentResponse.primaryIntent.type}`
      );
    }

    // Add entity insights
    if (entityResponse.entities.length > 0) {
      const entityTypes = [
        ...new Set(entityResponse.entities.map((e) => e.type)),
      ];
      insights.push(`Extracted entities: ${entityTypes.join(", ")}`);
    }

    return insights;
  }

  private getFallbackResponse(
    request: UnderstandingRequest
  ): UnderstandingResponse {
    return {
      intent: {
        type: "general",
        confidence: 0.5,
        parameters: {},
        urgency: "low",
      },
      entities: [],
      timeExpressions: [],
      language: request.userPreferences.language || "en",
      confidence: 0.5,
      context: {
        conversationHistory: request.conversationHistory,
        userPreferences: request.userPreferences,
        currentState: {
          phase: "general",
          mood: "neutral",
          engagement: "low",
          urgency: "low",
          topic: "general",
        },
        integrationContext: {
          availableIntegrations: [],
          activeIntegrations: [],
          lastUsed: null,
        },
        memoryContext: {
          recentMemories: [],
          relevantMemories: [],
          memoryCount: 0,
        },
      },
      requiresAction: false,
      suggestedTools: [],
      insights: ["Fallback response due to processing error"],
    };
  }

  public async batchUnderstand(
    request: UnderstandingBatchRequest
  ): Promise<UnderstandingBatchResponse> {
    const startTime = Date.now();

    const responses = await Promise.allSettled(
      request.requests.map((req) => this.understand(req))
    );

    const validResponses = responses.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : this.getFallbackResponse(request.requests[0])
    );

    return {
      responses: validResponses,
      processingTime: Date.now() - startTime,
    };
  }

  public async understandWithRetry(
    request: UnderstandingRequest,
    maxRetries: number = 3
  ): Promise<UnderstandingResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.understand(request);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Understanding attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          );
        }
      }
    }

    console.error(
      `All understanding attempts failed after ${maxRetries} retries`
    );
    return this.getFallbackResponse(request);
  }
}

export const understandingOrchestrator =
  UnderstandingOrchestrator.getInstance();

// Export individual components for direct use if needed
export {
  intentAnalyzer,
  contextUnderstander,
  languageProcessor,
  entityExtractor,
};
