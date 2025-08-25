import OpenAI from "openai";
import {
  UserIntent,
  IntentType,
  ExtractedEntity,
  IntentAnalysis,
  ConversationContext,
  TimeExpression,
} from "../../../types/understanding";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IntentAnalysisRequest {
  input: string;
  conversationContext: ConversationContext;
  userId: string;
}

export interface IntentAnalysisResponse {
  primaryIntent: UserIntent;
  secondaryIntents: UserIntent[];
  confidence: number;
  entities: ExtractedEntity[];
  context: ConversationContext;
  language: string;
  requiresAction: boolean;
  suggestedTools: ToolSuggestion[];
}

export interface ToolSuggestion {
  toolName: string;
  confidence: number;
  reasoning: string;
  parameters?: Record<string, unknown>;
}

export class IntentAnalyzer {
  private static instance: IntentAnalyzer;

  private constructor() {}

  public static getInstance(): IntentAnalyzer {
    if (!IntentAnalyzer.instance) {
      IntentAnalyzer.instance = new IntentAnalyzer();
    }
    return IntentAnalyzer.instance;
  }

  public async analyzeIntent(
    request: IntentAnalysisRequest
  ): Promise<IntentAnalysisResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt();
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

      const analysis = JSON.parse(response.choices[0].message.content || "{}");

      return this.validateAndTransformAnalysis(analysis, request);
    } catch (error) {
      console.error("Intent analysis failed:", error);
      return this.getFallbackAnalysis(request);
    }
  }

  private buildSystemPrompt(): string {
    return `You are an advanced AI intent analyzer for Perin, a personal AI assistant. Your job is to understand user requests and extract their true intent, regardless of language or expression.

Key responsibilities:
1. Detect the primary intent and any secondary intents
2. Extract relevant entities (people, times, locations, events, preferences)
3. Determine the language of the input
4. Assess confidence in your analysis
5. Suggest relevant tools that might be needed
6. Determine if the request requires immediate action

Output format (JSON):
{
  "primaryIntent": {
    "type": "scheduling|information|coordination|delegation|preference|general",
    "subtype": "string",
    "confidence": 0.95,
    "parameters": {},
    "timeExpression": null,
    "urgency": "low|medium|high"
  },
  "secondaryIntents": [],
  "confidence": 0.95,
  "entities": [
    {
      "type": "person|time|location|event|preference",
      "value": "string",
      "confidence": 0.9,
      "metadata": {}
    }
  ],
  "language": "en",
  "requiresAction": true,
  "suggestedTools": [
    {
      "toolName": "calendar",
      "confidence": 0.8,
      "reasoning": "User wants to schedule something",
      "parameters": {}
    }
  ]
}

Be precise, context-aware, and consider the user's conversation history when available.`;
  }

  private buildUserPrompt(request: IntentAnalysisRequest): string {
    const { input, conversationContext } = request;

    let prompt = `Analyze the following user input:\n\n"${input}"\n\n`;

    if (conversationContext.conversationHistory.length > 0) {
      prompt += `Recent conversation context:\n`;
      const recentHistory = conversationContext.conversationHistory.slice(-3);
      recentHistory.forEach((turn) => {
        prompt += `${turn.role}: ${turn.content}\n`;
      });
      prompt += "\n";
    }

    if (conversationContext.userPreferences) {
      prompt += `User preferences: ${JSON.stringify(
        conversationContext.userPreferences
      )}\n\n`;
    }

    prompt += `Please provide a detailed intent analysis in the specified JSON format.`;

    return prompt;
  }

  private validateAndTransformAnalysis(
    analysis: Record<string, unknown>,
    request: IntentAnalysisRequest
  ): IntentAnalysisResponse {
    // Validate and transform the AI response
    const primaryIntent: UserIntent = {
      type: (((analysis.primaryIntent as Record<string, unknown>)
        ?.type as string) || "general") as IntentType,
      subtype: (analysis.primaryIntent as Record<string, unknown>)
        ?.subtype as string,
      confidence: Math.min(
        Math.max(
          ((analysis.primaryIntent as Record<string, unknown>)
            ?.confidence as number) || 0.5,
          0
        ),
        1
      ),
      parameters:
        ((analysis.primaryIntent as Record<string, unknown>)
          ?.parameters as Record<string, unknown>) || {},
      timeExpression: (analysis.primaryIntent as Record<string, unknown>)
        ?.timeExpression as TimeExpression | undefined,
      urgency: (((analysis.primaryIntent as Record<string, unknown>)
        ?.urgency as string) || "low") as "low" | "medium" | "high",
    };

    const secondaryIntents: UserIntent[] = (
      (analysis.secondaryIntents as Record<string, unknown>[]) || []
    ).map((intent: Record<string, unknown>) => ({
      type: ((intent.type as string) || "general") as IntentType,
      subtype: intent.subtype as string,
      confidence: Math.min(
        Math.max((intent.confidence as number) || 0.5, 0),
        1
      ),
      parameters: (intent.parameters as Record<string, unknown>) || {},
      timeExpression: intent.timeExpression as TimeExpression | undefined,
      urgency: ((intent.urgency as string) || "low") as
        | "low"
        | "medium"
        | "high",
    }));

    const entities: ExtractedEntity[] = (
      (analysis.entities as Record<string, unknown>[]) || []
    ).map((entity: Record<string, unknown>) => ({
      type: ((entity.type as string) ||
        "preference") as ExtractedEntity["type"],
      value: (entity.value as string) || "",
      confidence: Math.min(
        Math.max((entity.confidence as number) || 0.5, 0),
        1
      ),
      metadata: (entity.metadata as Record<string, unknown>) || {},
    }));

    const suggestedTools: ToolSuggestion[] = (
      (analysis.suggestedTools as Record<string, unknown>[]) || []
    ).map((tool: Record<string, unknown>) => ({
      toolName: (tool.toolName as string) || "",
      confidence: Math.min(Math.max((tool.confidence as number) || 0.5, 0), 1),
      reasoning: (tool.reasoning as string) || "",
      parameters: (tool.parameters as Record<string, unknown>) || {},
    }));

    return {
      primaryIntent,
      secondaryIntents,
      confidence: Math.min(
        Math.max((analysis.confidence as number) || 0.5, 0),
        1
      ),
      entities,
      context: request.conversationContext,
      language: (analysis.language as string) || "en",
      requiresAction: (analysis.requiresAction as boolean) || false,
      suggestedTools,
    };
  }

  private getFallbackAnalysis(
    request: IntentAnalysisRequest
  ): IntentAnalysisResponse {
    // Fallback analysis when AI fails
    return {
      primaryIntent: {
        type: "general",
        confidence: 0.5,
        parameters: {},
        urgency: "low",
      },
      secondaryIntents: [],
      confidence: 0.5,
      entities: [],
      context: request.conversationContext,
      language: "en",
      requiresAction: false,
      suggestedTools: [],
    };
  }

  public async batchAnalyzeIntents(
    requests: IntentAnalysisRequest[]
  ): Promise<IntentAnalysisResponse[]> {
    const results = await Promise.allSettled(
      requests.map((request) => this.analyzeIntent(request))
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : this.getFallbackAnalysis(requests[0])
    );
  }
}

export const intentAnalyzer = IntentAnalyzer.getInstance();
