/**
 * Core Delegation AI class - handles both analysis and conversational responses
 * for external users interacting with Perin on behalf of the owner
 */

import { OpenAI } from "openai";
import { initializeOpenAI } from "../../langgraph/nodes/openai-node";
import { analysisMonitor } from "../../analysis/analysis-monitor";
import { buildDelegationPrompt } from "./delegation-prompts";
import type {
  DelegationContext,
  DelegationResponse,
  DelegationAnalysisContext,
  TimeAnalysis,
  MeetingContext,
  ContextualMessages,
} from "./delegation-types";

export class DelegationAI {
  private openaiClient: OpenAI;
  private readonly model = "gpt-3.5-turbo";

  constructor() {
    this.openaiClient = initializeOpenAI();
  }

  /**
   * Main entry point - processes message and returns both analysis and conversational response
   */
  async processMessage(
    message: string,
    context: DelegationContext
  ): Promise<DelegationResponse> {
    const startTime = Date.now();
    const sessionId = context.delegationId;

    try {
      const result = await this.performUnifiedAnalysis(message, context);
      const finalResult = {
        ...result,
        method: "unified" as const,
        processingTime: Date.now() - startTime,
      };

      // Track successful analysis
      analysisMonitor.trackAnalysis({
        sessionId,
        method: "unified",
        latency: finalResult.processingTime,
        success: true,
        confidence: finalResult.analysis.confidence,
        timestamp: new Date(),
      });

      return finalResult;
    } catch (error) {
      console.error("Delegation AI analysis failed, using fallback:", error);
      const fallbackResult = this.createFallbackResponse(
        message,
        context,
        startTime,
        error
      );

      // Track failed analysis
      analysisMonitor.trackAnalysis({
        sessionId,
        method: fallbackResult.method,
        latency: fallbackResult.processingTime,
        success: false,
        confidence: fallbackResult.analysis.confidence,
        errorType: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      });

      return fallbackResult;
    }
  }

  /**
   * Core unified analysis using a single, comprehensive LLM call
   */
  private async performUnifiedAnalysis(
    message: string,
    context: DelegationContext
  ): Promise<Omit<DelegationResponse, "method" | "processingTime">> {
    const analysisPrompt = buildDelegationPrompt(message, context);

    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 800, // Increased for both analysis and conversational response
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    // Console log the raw LLM response for debugging
    console.log("🤖 Raw Delegation AI Response (before parsing):", {
      response: content.substring(0, 1000),
      fullLength: content.length,
    });

    // Extract and parse JSON response with better error handling
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ No JSON found in Delegation AI response:", content);
      throw new Error("Invalid response format - no JSON found");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("❌ JSON parsing failed:", {
        error: parseError,
        jsonString: jsonMatch[0],
        position:
          parseError instanceof SyntaxError
            ? (parseError as unknown as { message: string }).message
            : "unknown",
      });

      // Try to fix common JSON issues
      let fixedJson = jsonMatch[0];

      // Fix trailing commas
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, "$1");

      // Fix unescaped quotes in strings
      fixedJson = fixedJson.replace(/(".*?[^\\])"([^,}\]]*?)"/g, '$1\\"$2"');

      try {
        parsedResponse = JSON.parse(fixedJson);
        console.log("✅ Fixed JSON parsing succeeded");
      } catch (fixError) {
        console.error("❌ Even fixed JSON failed:", fixError);
        throw new Error(`JSON parsing failed: ${parseError}`);
      }
    }

    // Console log the parsed response for debugging
    console.log("🤖 Parsed Delegation AI Response:", {
      hasAnalysis: !!parsedResponse.analysis,
      hasPerinResponse: !!parsedResponse.perinResponse,
      hasContextualMessages: !!parsedResponse.contextualMessages,
      requiresScheduling: parsedResponse.analysis?.requiresScheduling,
    });

    // Process and validate the response
    return this.processLLMResponse(parsedResponse);
  }

  /**
   * Process and validate the LLM response
   */
  private processLLMResponse(
    response: Record<string, unknown>
  ): Omit<DelegationResponse, "method" | "processingTime"> {
    // Validate required fields
    if (!response.analysis || typeof response.analysis !== "object") {
      throw new Error("Invalid analysis field in response");
    }

    if (typeof response.perinResponse !== "string") {
      throw new Error("Invalid perinResponse field in response");
    }

    const analysis = response.analysis as Record<string, unknown>;

    if (typeof analysis.requiresScheduling !== "boolean") {
      throw new Error("Invalid requiresScheduling field");
    }

    const result: Omit<DelegationResponse, "method" | "processingTime"> = {
      analysis: {
        requiresScheduling: analysis.requiresScheduling,
        confidence: Math.max(
          0,
          Math.min(1, Number(analysis.confidence) || 0.5)
        ),
        reasoning: String(analysis.reasoning || "Analysis completed"),
      },
      perinResponse: String(response.perinResponse),
    };

    // Process time analysis if scheduling is required
    if (analysis.requiresScheduling && analysis.timeAnalysis) {
      const timeAnalysis = analysis.timeAnalysis as Record<string, unknown>;
      let parsedDateTime: Date | null = null;

      // Parse the datetime if provided
      if (typeof timeAnalysis.parsedDateTime === "string") {
        try {
          parsedDateTime = new Date(timeAnalysis.parsedDateTime);
          // Validate the date
          if (isNaN(parsedDateTime.getTime())) {
            parsedDateTime = null;
          }
        } catch {
          parsedDateTime = null;
        }
      }

      result.analysis.timeAnalysis = {
        parsedDateTime,
        confidence:
          (timeAnalysis.confidence as "high" | "medium" | "low") || "low",
        extractedComponents:
          (timeAnalysis.extractedComponents as Record<string, string>) || {},
        reasoning:
          (timeAnalysis.reasoning as string) || "Time analysis completed",
        fallbackSuggestions:
          (timeAnalysis.fallbackSuggestions as string[]) || [],
      };
    }

    // Process meeting context
    if (analysis.meetingContext) {
      const meetingContext = analysis.meetingContext as Record<string, unknown>;
      result.analysis.meetingContext = {
        duration: (meetingContext.duration as number) || 30,
        title: (meetingContext.title as string) || "Meeting",
        urgency:
          (meetingContext.urgency as "high" | "medium" | "low") || "medium",
        meetingType: meetingContext.meetingType as string,
      };
    }

    // Process contextual messages
    if (response.contextualMessages) {
      const messages = response.contextualMessages as Record<string, unknown>;
      result.contextualMessages = {
        availabilityConfirmed: messages.availabilityConfirmed as string,
        meetingScheduled: messages.meetingScheduled as string,
        timeConflict: messages.timeConflict as string,
        unavailable: messages.unavailable as string,
        needsMoreInfo: messages.needsMoreInfo as string,
        clarifyTime: messages.clarifyTime as string,
        clarifyDate: messages.clarifyDate as string,
        checkingAvailability: messages.checkingAvailability as string,
        schedulingMeeting: messages.schedulingMeeting as string,
        calendarError: messages.calendarError as string,
        generalError: messages.generalError as string,
      };

      // Generate fallback messages if critical ones are missing
      const isHebrew = /[\u0590-\u05FF]/.test(result.perinResponse);
      if (!result.contextualMessages.checkingAvailability) {
        result.contextualMessages.checkingAvailability = isHebrew
          ? "בודק זמינות..."
          : "Checking availability...";
      }
      if (!result.contextualMessages.schedulingMeeting) {
        result.contextualMessages.schedulingMeeting = isHebrew
          ? "מתזמן את הפגישה..."
          : "Scheduling the meeting...";
      }

      // Console log the contextual messages to debug
      console.log("🗣️ Generated Contextual Messages:", {
        availabilityConfirmed: result.contextualMessages.availabilityConfirmed,
        meetingScheduled: result.contextualMessages.meetingScheduled,
        timeConflict: result.contextualMessages.timeConflict,
        checkingAvailability: result.contextualMessages.checkingAvailability,
        schedulingMeeting: result.contextualMessages.schedulingMeeting,
      });
    } else {
      console.log("⚠️ No contextual messages generated by Delegation AI");
    }

    return result;
  }

  /**
   * Fallback response when unified approach fails
   */
  private createFallbackResponse(
    message: string,
    context: DelegationContext,
    startTime: number,
    _error: unknown
  ): DelegationResponse {
    const text = message.toLowerCase().trim();

    // Simple keyword-based fallback for intent detection
    const explicitSchedulingPhrases = [
      "schedule a meeting",
      "book a meeting",
      "set up a meeting",
      "schedule an appointment",
      "book an appointment",
      "create a meeting",
      "arrange a meeting",
      "i want a meeting",
      "i need a meeting",
      "לקבוע פגישה",
      "תזמן פגישה",
      "אני רוצה פגישה",
      "אני צריך פגישה",
      "רוצה פגישה",
      "צריך פגישה",
      "פגישה ביום",
    ];

    const hasExplicitIntent = explicitSchedulingPhrases.some((phrase) =>
      text.includes(phrase)
    );

    // Generate fallback conversational response based on detected language
    const isHebrew = /[\u0590-\u05FF]/.test(message);
    const fallbackPerinResponse = hasExplicitIntent
      ? isHebrew
        ? `שלום! אני ${context.perinPersonality.name}, העוזר של ${context.ownerName}. אני כאן כדי לעזור לך לתזמן פגישה. אמור לי בבקשה מתי היית רוצה להיפגש?`
        : `Hello! I'm ${context.perinPersonality.name}, ${context.ownerName}'s assistant. I'm here to help you schedule a meeting. Could you please tell me when you'd like to meet?`
      : isHebrew
      ? `שלום! איך אני יכול לעזור לך היום?`
      : `Hello! How can I help you today?`;

    return {
      analysis: {
        requiresScheduling: hasExplicitIntent,
        confidence: hasExplicitIntent ? 0.7 : 0.9,
        reasoning: hasExplicitIntent
          ? "Fallback detected explicit scheduling phrase"
          : "Fallback found no clear scheduling intent",
        timeAnalysis: hasExplicitIntent
          ? {
              parsedDateTime: null,
              confidence: "low",
              extractedComponents: {},
              reasoning:
                "Fallback could not parse time - user clarification needed",
              fallbackSuggestions: [
                "Please specify both the day and time for your meeting",
                "For example: 'Schedule for Friday at 2 PM'",
              ],
            }
          : undefined,
        meetingContext: hasExplicitIntent
          ? {
              duration: (context.constraints?.defaultDuration as number) || 30,
              title: "Meeting",
              urgency: "medium",
            }
          : undefined,
      },
      perinResponse: fallbackPerinResponse,
      method: "fallback",
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Legacy compatibility method for existing code
   */
  async analyzeMessage(
    message: string,
    context: DelegationAnalysisContext
  ): Promise<{
    requiresScheduling: boolean;
    confidence: number;
    reasoning: string;
    timeAnalysis?: TimeAnalysis;
    meetingContext?: MeetingContext;
    contextualMessages?: ContextualMessages;
    method: "unified" | "fallback";
    processingTime: number;
  }> {
    const delegationContext: DelegationContext = {
      delegationId: context.delegationId,
      ownerUserId: "legacy-user", // Legacy compatibility - this method is deprecated
      ownerName: "Owner", // Will be replaced when we integrate with user data
      ownerTimezone: "UTC", // Will be replaced when we integrate with user data
      externalUserName: context.externalUserName,
      externalUserTimezone: context.externalUserTimezone,
      constraints: context.constraints,
      conversationHistory: context.conversationHistory,
      perinPersonality: {
        name: context.ownerPersonality?.perinName || "Perin",
        tone: context.ownerPersonality?.tone || "friendly",
        communicationStyle:
          context.ownerPersonality?.communicationStyle || "warm",
        language: context.ownerPersonality?.language || "auto",
      },
    };

    const response = await this.processMessage(message, delegationContext);

    return {
      requiresScheduling: response.analysis.requiresScheduling,
      confidence: response.analysis.confidence,
      reasoning: response.analysis.reasoning,
      timeAnalysis: response.analysis.timeAnalysis,
      meetingContext: response.analysis.meetingContext,
      contextualMessages: response.contextualMessages,
      method: response.method,
      processingTime: response.processingTime,
    };
  }
}
