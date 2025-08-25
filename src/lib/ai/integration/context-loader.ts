import {
  UserIntent,
  ConversationContext,
  TimeExpression,
} from "../../../types/understanding";
import { IntegrationType, IntegrationRelevance } from "./smart-detector";

export interface ContextRequirement {
  integrationType: IntegrationType;
  dataTypes: string[];
  timeRange?: TimeRange;
  priority: "high" | "medium" | "low";
  reasoning: string;
  filters?: Record<string, unknown>;
}

export interface TimeRange {
  start: Date;
  end: Date;
  relative?: boolean;
}

export interface LoadedContext {
  integrationType: IntegrationType;
  data: Record<string, unknown>;
  metadata: {
    loadTime: number;
    dataSize: number;
    freshness: Date;
    source: string;
  };
  relevance: number;
}

export interface SmartContextLoaderRequest {
  userIntent: UserIntent;
  conversationContext: ConversationContext;
  relevantIntegrations: IntegrationRelevance[];
  userId: string;
}

export interface SmartContextLoaderResponse {
  loadedContexts: LoadedContext[];
  missingContexts: ContextRequirement[];
  totalLoadTime: number;
  insights: string[];
}

export class SmartContextLoader {
  private static instance: SmartContextLoader;

  private constructor() {}

  public static getInstance(): SmartContextLoader {
    if (!SmartContextLoader.instance) {
      SmartContextLoader.instance = new SmartContextLoader();
    }
    return SmartContextLoader.instance;
  }

  public async loadRelevantContext(
    request: SmartContextLoaderRequest
  ): Promise<SmartContextLoaderResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Analyze context requirements
      const requirements = await this.analyzeContextNeeds(request);

      // Step 2: Load contexts based on requirements
      const loadedContexts = await this.loadContexts(
        requirements,
        request.userId
      );

      // Step 3: Identify missing contexts
      const missingContexts = this.identifyMissingContexts(
        requirements,
        loadedContexts
      );

      // Step 4: Generate insights
      const insights = this.generateInsights(
        loadedContexts,
        missingContexts,
        request
      );

      return {
        loadedContexts,
        missingContexts,
        totalLoadTime: Date.now() - startTime,
        insights,
      };
    } catch (error) {
      console.error("Smart context loading failed:", error);
      return this.getFallbackResponse(request);
    }
  }

  private async analyzeContextNeeds(
    request: SmartContextLoaderRequest
  ): Promise<ContextRequirement[]> {
    const requirements: ContextRequirement[] = [];
    const { userIntent, relevantIntegrations } = request;

    for (const integration of relevantIntegrations) {
      const requirement = await this.buildContextRequirement(
        integration,
        userIntent
      );
      if (requirement) {
        requirements.push(requirement);
      }
    }

    // Sort by priority
    return requirements.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async buildContextRequirement(
    integration: IntegrationRelevance,
    userIntent: UserIntent
  ): Promise<ContextRequirement | null> {
    const baseRequirement: ContextRequirement = {
      integrationType: integration.integrationType,
      dataTypes: integration.suggestedActions,
      priority: integration.priority,
      reasoning: integration.reasoning,
      filters: {},
    };

    // Add time range for time-sensitive intents
    if (userIntent.timeExpression) {
      baseRequirement.timeRange = this.extractTimeRange(
        userIntent.timeExpression
      );
    }

    // Add specific data types based on intent
    switch (userIntent.type) {
      case "scheduling":
        if (integration.integrationType === "calendar") {
          baseRequirement.dataTypes = ["availability", "events", "preferences"];
          baseRequirement.filters = {
            timeRange: baseRequirement.timeRange,
            includeBusy: true,
          };
        }
        break;

      case "information":
        if (integration.integrationType === "gmail") {
          baseRequirement.dataTypes = ["emails", "drafts", "labels"];
          baseRequirement.filters = {
            limit: 50,
            unreadOnly: false,
          };
        }
        break;

      case "coordination":
        if (integration.integrationType === "slack") {
          baseRequirement.dataTypes = ["channels", "messages", "users"];
          baseRequirement.filters = {
            recentOnly: true,
            limit: 100,
          };
        }
        break;
    }

    return baseRequirement;
  }

  private extractTimeRange(
    timeExpression: TimeExpression
  ): TimeRange | undefined {
    if (!timeExpression || !timeExpression.value) {
      return undefined;
    }

    try {
      const baseTime = new Date(timeExpression.value);
      const start = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
      const end = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours after

      return {
        start,
        end,
        relative: timeExpression.metadata?.relative || false,
      };
    } catch (error) {
      console.error("Failed to extract time range:", error);
      return undefined;
    }
  }

  private async loadContexts(
    requirements: ContextRequirement[],
    userId: string
  ): Promise<LoadedContext[]> {
    const loadedContexts: LoadedContext[] = [];

    for (const requirement of requirements) {
      try {
        const context = await this.loadIntegrationContext(requirement, userId);
        if (context) {
          loadedContexts.push(context);
        }
      } catch (error) {
        console.error(
          `Failed to load context for ${requirement.integrationType}:`,
          error
        );
      }
    }

    return loadedContexts;
  }

  private async loadIntegrationContext(
    requirement: ContextRequirement,
    userId: string
  ): Promise<LoadedContext | null> {
    const startTime = Date.now();

    try {
      let data: Record<string, unknown> = {};

      switch (requirement.integrationType) {
        case "calendar":
          data = await this.loadCalendarContext(requirement, userId);
          break;

        case "gmail":
          data = await this.loadGmailContext(requirement, userId);
          break;

        case "slack":
          data = await this.loadSlackContext(requirement, userId);
          break;

        default:
          // For other integrations, return basic context
          data = {
            integrationType: requirement.integrationType,
            available: true,
            capabilities: requirement.dataTypes,
          };
      }

      const loadTime = Date.now() - startTime;

      return {
        integrationType: requirement.integrationType,
        data,
        metadata: {
          loadTime,
          dataSize: JSON.stringify(data).length,
          freshness: new Date(),
          source: "api",
        },
        relevance:
          requirement.priority === "high"
            ? 0.9
            : requirement.priority === "medium"
            ? 0.7
            : 0.5,
      };
    } catch (error) {
      console.error(
        `Failed to load ${requirement.integrationType} context:`,
        error
      );
      return null;
    }
  }

  private async loadCalendarContext(
    requirement: ContextRequirement,
    userId: string
  ): Promise<Record<string, unknown>> {
    // This would integrate with the actual calendar service
    // For now, return mock data
    return {
      events: [],
      availability: {
        busy: [],
        free: [],
      },
      preferences: {
        workingHours: { start: "09:00", end: "17:00" },
        timezone: "UTC",
      },
      nextEvent: null,
      todayEvents: [],
    };
  }

  private async loadGmailContext(
    requirement: ContextRequirement,
    userId: string
  ): Promise<Record<string, unknown>> {
    // This would integrate with the actual Gmail service
    // For now, return mock data
    return {
      emails: [],
      drafts: [],
      labels: [],
      unreadCount: 0,
      recentEmails: [],
    };
  }

  private async loadSlackContext(
    requirement: ContextRequirement,
    userId: string
  ): Promise<Record<string, unknown>> {
    // This would integrate with the actual Slack service
    // For now, return mock data
    return {
      channels: [],
      messages: [],
      users: [],
      unreadCount: 0,
      recentActivity: [],
    };
  }

  private identifyMissingContexts(
    requirements: ContextRequirement[],
    loadedContexts: LoadedContext[]
  ): ContextRequirement[] {
    const loadedTypes = new Set(
      loadedContexts.map((ctx) => ctx.integrationType)
    );
    return requirements.filter((req) => !loadedTypes.has(req.integrationType));
  }

  private generateInsights(
    loadedContexts: LoadedContext[],
    missingContexts: ContextRequirement[],
    request: SmartContextLoaderRequest
  ): string[] {
    const insights: string[] = [];

    if (loadedContexts.length > 0) {
      insights.push(`Loaded ${loadedContexts.length} integration contexts`);

      const avgLoadTime =
        loadedContexts.reduce((sum, ctx) => sum + ctx.metadata.loadTime, 0) /
        loadedContexts.length;
      insights.push(`Average load time: ${Math.round(avgLoadTime)}ms`);
    }

    if (missingContexts.length > 0) {
      insights.push(
        `Missing contexts for: ${missingContexts
          .map((ctx) => ctx.integrationType)
          .join(", ")}`
      );
    }

    const highPriorityContexts = loadedContexts.filter(
      (ctx) => ctx.relevance > 0.8
    );
    if (highPriorityContexts.length > 0) {
      insights.push(
        `High priority contexts loaded: ${highPriorityContexts.length}`
      );
    }

    return insights;
  }

  private getFallbackResponse(
    request: SmartContextLoaderRequest
  ): SmartContextLoaderResponse {
    return {
      loadedContexts: [],
      missingContexts: request.relevantIntegrations.map((integration) => ({
        integrationType: integration.integrationType,
        dataTypes: integration.suggestedActions,
        priority: integration.priority,
        reasoning: "Fallback: Context loading failed",
        filters: {},
      })),
      totalLoadTime: 0,
      insights: ["Fallback response due to context loading error"],
    };
  }

  public async preloadContexts(
    userId: string,
    integrationTypes: IntegrationType[]
  ): Promise<LoadedContext[]> {
    const requirements: ContextRequirement[] = integrationTypes.map((type) => ({
      integrationType: type,
      dataTypes: ["basic"],
      priority: "low",
      reasoning: "Preloading for better performance",
      filters: {},
    }));

    return await this.loadContexts(requirements, userId);
  }

  public async refreshContext(
    integrationType: IntegrationType,
    userId: string
  ): Promise<LoadedContext | null> {
    const requirement: ContextRequirement = {
      integrationType,
      dataTypes: ["refresh"],
      priority: "high",
      reasoning: "Manual refresh requested",
      filters: {},
    };

    return await this.loadIntegrationContext(requirement, userId);
  }
}

export const smartContextLoader = SmartContextLoader.getInstance();
