import OpenAI from "openai";
import { UserIntent, ConversationContext } from "../../../types/understanding";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IntegrationRelevance {
  integrationType: IntegrationType;
  relevance: number;
  reasoning: string;
  suggestedActions: string[];
  contextNeeded: boolean;
  priority: "high" | "medium" | "low";
}

export type IntegrationType =
  | "calendar"
  | "gmail"
  | "slack"
  | "notion"
  | "github"
  | "jira"
  | "trello"
  | "zoom"
  | "teams"
  | "discord";

export interface SmartIntegrationRequest {
  userIntent: UserIntent;
  conversationContext: ConversationContext;
  availableIntegrations: IntegrationType[];
  userInput: string;
}

export interface SmartIntegrationResponse {
  relevantIntegrations: IntegrationRelevance[];
  primaryIntegration?: IntegrationType;
  confidence: number;
  reasoning: string;
  suggestedWorkflow: string[];
}

export class SmartIntegrationDetector {
  private static instance: SmartIntegrationDetector;

  private integrationCapabilities: Record<IntegrationType, string[]> = {
    calendar: [
      "schedule_meeting",
      "check_availability",
      "view_calendar",
      "update_event",
      "delete_event",
    ],
    gmail: [
      "send_email",
      "read_email",
      "search_emails",
      "compose_draft",
      "reply_to_email",
    ],
    slack: [
      "send_message",
      "read_messages",
      "create_channel",
      "join_channel",
      "search_messages",
    ],
    notion: [
      "create_page",
      "read_page",
      "update_page",
      "search_pages",
      "create_database",
    ],
    github: [
      "create_issue",
      "read_issues",
      "create_pr",
      "review_pr",
      "search_repos",
    ],
    jira: [
      "create_ticket",
      "read_tickets",
      "update_ticket",
      "search_tickets",
      "create_sprint",
    ],
    trello: [
      "create_card",
      "move_card",
      "read_board",
      "create_list",
      "add_comment",
    ],
    zoom: [
      "schedule_meeting",
      "join_meeting",
      "create_meeting",
      "get_meeting_info",
    ],
    teams: ["send_message", "schedule_meeting", "join_call", "create_channel"],
    discord: ["send_message", "read_messages", "create_channel", "join_server"],
  };

  private constructor() {}

  public static getInstance(): SmartIntegrationDetector {
    if (!SmartIntegrationDetector.instance) {
      SmartIntegrationDetector.instance = new SmartIntegrationDetector();
    }
    return SmartIntegrationDetector.instance;
  }

  public async detectRelevantIntegrations(
    request: SmartIntegrationRequest
  ): Promise<SmartIntegrationResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(
        request.availableIntegrations
      );
      const userPrompt = this.buildUserPrompt(request);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return this.validateAndTransformResult(result, request);
    } catch (error) {
      console.error("Smart integration detection failed:", error);
      return this.getFallbackResponse(request);
    }
  }

  private buildSystemPrompt(availableIntegrations: IntegrationType[]): string {
    const integrationList = availableIntegrations.join("|");

    return `You are an expert at determining which integrations are relevant to user requests. Analyze the user intent and suggest the most appropriate integrations.

Available integrations: ${integrationList}

For each relevant integration, provide:
- Relevance score (0-1)
- Reasoning for why it's relevant
- Suggested actions from the integration's capabilities
- Whether additional context is needed
- Priority level (high/medium/low)

Output format (JSON):
{
  "relevantIntegrations": [
    {
      "integrationType": "calendar|gmail|slack|notion|github|jira|trello|zoom|teams|discord",
      "relevance": 0.95,
      "reasoning": "User wants to schedule a meeting",
      "suggestedActions": ["schedule_meeting", "check_availability"],
      "contextNeeded": true,
      "priority": "high"
    }
  ],
  "primaryIntegration": "calendar",
  "confidence": 0.95,
  "reasoning": "Primary intent is scheduling",
  "suggestedWorkflow": ["check_availability", "schedule_meeting", "send_confirmation"]
}

Only include integrations that are actually available and relevant. Return empty array if no integrations are needed.`;
  }

  private buildUserPrompt(request: SmartIntegrationRequest): string {
    const { userIntent, userInput, conversationContext } = request;

    let prompt = `User Input: "${userInput}"\n\n`;
    prompt += `Primary Intent: ${userIntent.type} (${
      userIntent.subtype || "none"
    })\n`;
    prompt += `Confidence: ${userIntent.confidence}\n`;
    prompt += `Urgency: ${userIntent.urgency}\n`;

    if (
      userIntent.parameters &&
      Object.keys(userIntent.parameters).length > 0
    ) {
      prompt += `Intent Parameters: ${JSON.stringify(userIntent.parameters)}\n`;
    }

    if (conversationContext.currentState.topic !== "general") {
      prompt += `Conversation Topic: ${conversationContext.currentState.topic}\n`;
    }

    prompt += `\nPlease analyze which integrations are relevant and provide detailed reasoning.`;

    return prompt;
  }

  private validateAndTransformResult(
    result: Record<string, unknown>,
    request: SmartIntegrationRequest
  ): SmartIntegrationResponse {
    // Validate and transform relevant integrations
    const relevantIntegrations: IntegrationRelevance[] = (
      (result.relevantIntegrations as Record<string, unknown>[]) || []
    )
      .filter((integration: Record<string, unknown>) => {
        const type = integration.integrationType as string;
        return request.availableIntegrations.includes(type as IntegrationType);
      })
      .map((integration: Record<string, unknown>) => ({
        integrationType: integration.integrationType as IntegrationType,
        relevance: Math.min(
          Math.max((integration.relevance as number) || 0.5, 0),
          1
        ),
        reasoning: (integration.reasoning as string) || "No reasoning provided",
        suggestedActions: (integration.suggestedActions as string[]) || [],
        contextNeeded: (integration.contextNeeded as boolean) || false,
        priority:
          (integration.priority as "high" | "medium" | "low") || "medium",
      }))
      .sort((a, b) => b.relevance - a.relevance);

    // Get primary integration (highest relevance)
    const primaryIntegration =
      relevantIntegrations.length > 0
        ? relevantIntegrations[0].integrationType
        : undefined;

    return {
      relevantIntegrations,
      primaryIntegration,
      confidence: Math.min(
        Math.max((result.confidence as number) || 0.5, 0),
        1
      ),
      reasoning: (result.reasoning as string) || "No reasoning provided",
      suggestedWorkflow: (result.suggestedWorkflow as string[]) || [],
    };
  }

  private getFallbackResponse(
    request: SmartIntegrationRequest
  ): SmartIntegrationResponse {
    // Fallback to keyword-based detection
    const relevantIntegrations = this.fallbackKeywordDetection(request);

    return {
      relevantIntegrations,
      primaryIntegration:
        relevantIntegrations.length > 0
          ? relevantIntegrations[0].integrationType
          : undefined,
      confidence: 0.5,
      reasoning: "Fallback keyword-based detection used",
      suggestedWorkflow: [],
    };
  }

  private fallbackKeywordDetection(
    request: SmartIntegrationRequest
  ): IntegrationRelevance[] {
    const { userInput, availableIntegrations } = request;
    const input = userInput.toLowerCase();
    const relevant: IntegrationRelevance[] = [];

    // Calendar detection
    if (
      availableIntegrations.includes("calendar") &&
      (input.includes("schedule") ||
        input.includes("meeting") ||
        input.includes("appointment") ||
        input.includes("calendar") ||
        input.includes("time") ||
        input.includes("date"))
    ) {
      relevant.push({
        integrationType: "calendar",
        relevance: 0.8,
        reasoning: "Keywords suggest scheduling intent",
        suggestedActions: ["check_availability", "schedule_meeting"],
        contextNeeded: true,
        priority: "high",
      });
    }

    // Gmail detection
    if (
      availableIntegrations.includes("gmail") &&
      (input.includes("email") ||
        input.includes("message") ||
        input.includes("send") ||
        input.includes("inbox") ||
        input.includes("mail"))
    ) {
      relevant.push({
        integrationType: "gmail",
        relevance: 0.7,
        reasoning: "Keywords suggest email intent",
        suggestedActions: ["send_email", "check_inbox"],
        contextNeeded: false,
        priority: "medium",
      });
    }

    // Slack detection
    if (
      availableIntegrations.includes("slack") &&
      (input.includes("slack") ||
        input.includes("channel") ||
        input.includes("message"))
    ) {
      relevant.push({
        integrationType: "slack",
        relevance: 0.6,
        reasoning: "Keywords suggest Slack communication",
        suggestedActions: ["send_message", "read_messages"],
        contextNeeded: false,
        priority: "medium",
      });
    }

    return relevant.sort((a, b) => b.relevance - a.relevance);
  }

  public async batchDetectIntegrations(
    requests: SmartIntegrationRequest[]
  ): Promise<SmartIntegrationResponse[]> {
    const results = await Promise.allSettled(
      requests.map((request) => this.detectRelevantIntegrations(request))
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : this.getFallbackResponse(requests[0])
    );
  }

  public getIntegrationCapabilities(
    integrationType: IntegrationType
  ): string[] {
    return this.integrationCapabilities[integrationType] || [];
  }

  public async suggestWorkflow(
    userIntent: UserIntent,
    relevantIntegrations: IntegrationRelevance[]
  ): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a workflow suggestion expert. Given a user intent and relevant integrations, suggest the optimal workflow steps.

Output format (JSON array of action strings):
["check_availability", "schedule_meeting", "send_confirmation"]`,
          },
          {
            role: "user",
            content: `Intent: ${userIntent.type} (${
              userIntent.subtype || "none"
            })
Integrations: ${relevantIntegrations
              .map(
                (i) => `${i.integrationType}: ${i.suggestedActions.join(", ")}`
              )
              .join("; ")}
Suggest optimal workflow steps.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "[]");
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Workflow suggestion failed:", error);
      return [];
    }
  }
}

export const smartIntegrationDetector = SmartIntegrationDetector.getInstance();
