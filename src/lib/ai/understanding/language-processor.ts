import OpenAI from "openai";
import { LanguageInfo, TimeExpression } from "../../../types/understanding";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LanguageProcessorRequest {
  input: string;
  targetLanguage?: string;
  sourceLanguage?: string;
}

export interface LanguageProcessorResponse {
  languageInfo: LanguageInfo;
  translatedText?: string;
  timeExpressions: TimeExpression[];
  confidence: number;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
}

export class LanguageProcessor {
  private static instance: LanguageProcessor;
  private supportedLanguages = new Set([
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ru",
    "ja",
    "ko",
    "zh",
    "ar",
    "hi",
    "th",
    "vi",
    "tr",
    "he",
  ]);

  private constructor() {}

  public static getInstance(): LanguageProcessor {
    if (!LanguageProcessor.instance) {
      LanguageProcessor.instance = new LanguageProcessor();
    }
    return LanguageProcessor.instance;
  }

  public async detectLanguage(input: string): Promise<LanguageInfo> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a language detection expert. Analyze the input text and return the detected language information in JSON format.

Output format:
{
  "language": "en",
  "confidence": 0.95,
  "script": "Latin",
  "region": "US"
}

Language codes should be ISO 639-1 (2-letter codes). Confidence should be between 0 and 1.`,
          },
          {
            role: "user",
            content: `Detect the language of this text: "${input}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        language: result.language || "en",
        confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        script: result.script,
        region: result.region,
      };
    } catch (error) {
      console.error("Language detection failed:", error);
      return {
        language: "en",
        confidence: 0.5,
        script: "Latin",
        region: "US",
      };
    }
  }

  public async translateToEnglish(
    input: string,
    sourceLanguage: string
  ): Promise<string> {
    if (sourceLanguage === "en") {
      return input;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text from ${sourceLanguage} to English. Maintain the original meaning and tone. Return only the translated text without any additional formatting or explanations.`,
          },
          {
            role: "user",
            content: `Translate this text to English: "${input}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || input;
    } catch (error) {
      console.error("Translation to English failed:", error);
      return input; // Return original if translation fails
    }
  }

  public async translateFromEnglish(
    input: string,
    targetLanguage: string
  ): Promise<string> {
    if (targetLanguage === "en") {
      return input;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given English text to ${targetLanguage}. Maintain the original meaning and tone. Return only the translated text without any additional formatting or explanations.`,
          },
          {
            role: "user",
            content: `Translate this English text to ${targetLanguage}: "${input}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || input;
    } catch (error) {
      console.error("Translation from English failed:", error);
      return input; // Return original if translation fails
    }
  }

  public async extractTimeExpressions(
    input: string,
    language: string
  ): Promise<TimeExpression[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting time expressions from text in any language. Analyze the input and extract all time-related expressions.

Output format (JSON array):
[
  {
    "expression": "tomorrow at 3pm",
    "type": "specific_time",
    "value": "2024-01-16T15:00:00Z",
    "confidence": 0.95,
    "language": "en",
    "metadata": {
      "relative": true,
      "timezone": "user_local"
    }
  }
]

Types: "specific_time", "relative_time", "duration", "recurring", "approximate"
Return empty array if no time expressions found.`,
          },
          {
            role: "user",
            content: `Extract time expressions from this ${language} text: "${input}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "[]");
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Time expression extraction failed:", error);
      return [];
    }
  }

  public async processLanguage(
    request: LanguageProcessorRequest
  ): Promise<LanguageProcessorResponse> {
    try {
      // Detect language if not provided
      const languageInfo = request.sourceLanguage
        ? {
            language: request.sourceLanguage,
            confidence: 1,
            script: "Unknown",
            region: "Unknown",
          }
        : await this.detectLanguage(request.input);

      // Extract time expressions
      const timeExpressions = await this.extractTimeExpressions(
        request.input,
        languageInfo.language
      );

      // Translate to English if needed
      let translatedText: string | undefined;
      if (languageInfo.language !== "en" && !request.targetLanguage) {
        translatedText = await this.translateToEnglish(
          request.input,
          languageInfo.language
        );
      }

      // Translate to target language if specified
      if (
        request.targetLanguage &&
        request.targetLanguage !== languageInfo.language
      ) {
        const englishText = translatedText || request.input;
        translatedText = await this.translateFromEnglish(
          englishText,
          request.targetLanguage
        );
      }

      return {
        languageInfo,
        translatedText,
        timeExpressions,
        confidence: languageInfo.confidence,
      };
    } catch (error) {
      console.error("Language processing failed:", error);
      return {
        languageInfo: {
          language: "en",
          confidence: 0.5,
          script: "Latin",
          region: "US",
        },
        timeExpressions: [],
        confidence: 0.5,
      };
    }
  }

  public async batchTranslate(
    requests: TranslationRequest[]
  ): Promise<string[]> {
    const results = await Promise.allSettled(
      requests.map((request) =>
        this.translateToEnglish(request.text, request.sourceLanguage)
      )
    );

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : requests[0].text
    );
  }

  public isLanguageSupported(languageCode: string): boolean {
    return this.supportedLanguages.has(languageCode.toLowerCase());
  }

  public getSupportedLanguages(): string[] {
    return Array.from(this.supportedLanguages);
  }

  public async normalizeTimeExpression(
    expression: string,
    language: string
  ): Promise<TimeExpression | null> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at normalizing time expressions. Convert the given time expression to a standardized format.

Output format (JSON):
{
  "expression": "original expression",
  "type": "specific_time|relative_time|duration|recurring|approximate",
  "value": "ISO 8601 datetime string or duration string",
  "confidence": 0.95,
  "language": "en",
  "metadata": {
    "relative": true,
    "timezone": "user_local",
    "duration_seconds": 3600
  }
}

Return null if the expression cannot be normalized.`,
          },
          {
            role: "user",
            content: `Normalize this ${language} time expression: "${expression}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "null");
      return result;
    } catch (error) {
      console.error("Time expression normalization failed:", error);
      return null;
    }
  }

  public async detectFormality(
    input: string,
    language: string
  ): Promise<"formal" | "informal" | "neutral"> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at detecting the formality level of text. Analyze the given text and determine if it's formal, informal, or neutral.

Output format (JSON):
{
  "formality": "formal|informal|neutral",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`,
          },
          {
            role: "user",
            content: `Detect the formality level of this ${language} text: "${input}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.formality || "neutral";
    } catch (error) {
      console.error("Formality detection failed:", error);
      return "neutral";
    }
  }
}

export const languageProcessor = LanguageProcessor.getInstance();
