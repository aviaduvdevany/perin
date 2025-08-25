import OpenAI from "openai";
import { ExtractedEntity, TimeExpression } from "../../../types/understanding";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EntityExtractionRequest {
  input: string;
  language: string;
  context?: string;
  entityTypes?: string[];
}

export interface EntityExtractionResponse {
  entities: ExtractedEntity[];
  timeExpressions: TimeExpression[];
  confidence: number;
  language: string;
}

export class EntityExtractor {
  private static instance: EntityExtractor;

  private constructor() {}

  public static getInstance(): EntityExtractor {
    if (!EntityExtractor.instance) {
      EntityExtractor.instance = new EntityExtractor();
    }
    return EntityExtractor.instance;
  }

  public async extractEntities(
    request: EntityExtractionRequest
  ): Promise<EntityExtractionResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(request.entityTypes);
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
      console.error("Entity extraction failed:", error);
      return this.getFallbackResponse(request);
    }
  }

  private buildSystemPrompt(entityTypes?: string[]): string {
    const types =
      entityTypes?.join("|") || "person|time|location|event|preference";

    return `You are an expert entity extractor for Perin, a personal AI assistant. Extract relevant entities from the given text.

Entity types to extract: ${types}

Output format (JSON):
{
  "entities": [
    {
      "type": "person|time|location|event|preference",
      "value": "extracted value",
      "confidence": 0.95,
      "metadata": {
        "normalized": "normalized value",
        "context": "additional context"
      }
    }
  ],
  "timeExpressions": [
    {
      "expression": "tomorrow at 3pm",
      "type": "specific_time|relative_time|duration|recurring|approximate",
      "value": "2024-01-16T15:00:00Z",
      "confidence": 0.95,
      "language": "en",
      "metadata": {
        "relative": true,
        "timezone": "user_local"
      }
    }
  ],
  "confidence": 0.95,
  "language": "en"
}

Be precise and extract only relevant entities. Return empty arrays if no entities found.`;
  }

  private buildUserPrompt(request: EntityExtractionRequest): string {
    let prompt = `Extract entities from this ${request.language} text:\n\n"${request.input}"\n\n`;

    if (request.context) {
      prompt += `Context: ${request.context}\n\n`;
    }

    prompt += `Please provide detailed entity extraction in the specified JSON format.`;

    return prompt;
  }

  private validateAndTransformResult(
    result: Record<string, unknown>,
    request: EntityExtractionRequest
  ): EntityExtractionResponse {
    // Validate and transform entities
    const entities: ExtractedEntity[] = (
      (result.entities as Record<string, unknown>[]) || []
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

    // Validate and transform time expressions
    const timeExpressions: TimeExpression[] = (
      (result.timeExpressions as Record<string, unknown>[]) || []
    ).map((time: Record<string, unknown>) => ({
      expression: (time.expression as string) || "",
      type: ((time.type as string) || "approximate") as TimeExpression["type"],
      value: (time.value as string) || "",
      confidence: Math.min(Math.max((time.confidence as number) || 0.5, 0), 1),
      language: (time.language as string) || request.language,
      metadata: (time.metadata as Record<string, unknown>) || {},
    }));

    return {
      entities,
      timeExpressions,
      confidence: Math.min(
        Math.max((result.confidence as number) || 0.5, 0),
        1
      ),
      language: (result.language as string) || request.language,
    };
  }

  private getFallbackResponse(
    request: EntityExtractionRequest
  ): EntityExtractionResponse {
    return {
      entities: [],
      timeExpressions: [],
      confidence: 0.5,
      language: request.language,
    };
  }

  public async extractPersonEntities(
    input: string,
    language: string
  ): Promise<ExtractedEntity[]> {
    const response = await this.extractEntities({
      input,
      language,
      entityTypes: ["person"],
    });

    return response.entities.filter((entity) => entity.type === "person");
  }

  public async extractTimeEntities(
    input: string,
    language: string
  ): Promise<TimeExpression[]> {
    const response = await this.extractEntities({
      input,
      language,
      entityTypes: ["time"],
    });

    return response.timeExpressions;
  }

  public async extractLocationEntities(
    input: string,
    language: string
  ): Promise<ExtractedEntity[]> {
    const response = await this.extractEntities({
      input,
      language,
      entityTypes: ["location"],
    });

    return response.entities.filter((entity) => entity.type === "location");
  }

  public async extractPreferenceEntities(
    input: string,
    language: string
  ): Promise<ExtractedEntity[]> {
    const response = await this.extractEntities({
      input,
      language,
      entityTypes: ["preference"],
    });

    return response.entities.filter((entity) => entity.type === "preference");
  }

  public async batchExtractEntities(
    requests: EntityExtractionRequest[]
  ): Promise<EntityExtractionResponse[]> {
    const results = await Promise.allSettled(
      requests.map((request) => this.extractEntities(request))
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : this.getFallbackResponse(requests[0])
    );
  }

  public async normalizeEntity(
    entity: ExtractedEntity,
    context: string
  ): Promise<ExtractedEntity> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an entity normalization expert. Normalize the given entity value to a standardized format.

Output format (JSON):
{
  "normalizedValue": "standardized value",
  "confidence": 0.95,
  "metadata": {
    "originalValue": "original value",
    "normalizationType": "spelling|format|abbreviation|etc"
  }
}`,
          },
          {
            role: "user",
            content: `Normalize this ${entity.type} entity: "${entity.value}" in context: "${context}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        ...entity,
        value: result.normalizedValue || entity.value,
        confidence: Math.min(
          Math.max(result.confidence || entity.confidence, 0),
          1
        ),
        metadata: {
          ...entity.metadata,
          ...result.metadata,
        },
      };
    } catch (error) {
      console.error("Entity normalization failed:", error);
      return entity;
    }
  }
}

export const entityExtractor = EntityExtractor.getInstance();
