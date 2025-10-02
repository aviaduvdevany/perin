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
  ConversationDelegationResponse,
  SchedulingDelegationResponse,
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
        confidence: finalResult.confidence,
        timestamp: new Date(),
      });

      return finalResult as DelegationResponse;
    } catch (error) {
      console.error("Delegation AI analysis failed, using fallback:", error);
      const fallbackResult = this.createFallbackResponse(
        message,
        context,
        startTime
      );

      // Track failed analysis
      analysisMonitor.trackAnalysis({
        sessionId,
        method: fallbackResult.method,
        latency: fallbackResult.processingTime,
        success: false,
        confidence: fallbackResult.confidence,
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
      max_tokens: 3500, // Increased for both analysis and conversational response
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
    return this.processLLMResponse(parsedResponse, context);
  }

  /**
   * Process and validate the new optimized LLM response
   */
  private processLLMResponse(
    response: Record<string, unknown>,
    context: DelegationContext
  ): Omit<DelegationResponse, "method" | "processingTime"> {
    // Validate required fields
    if (typeof response.intent !== "string") {
      throw new Error("Invalid intent field in response");
    }

    if (typeof response.perinResponse !== "string") {
      throw new Error("Invalid perinResponse field in response");
    }

    if (typeof response.confidence !== "number") {
      throw new Error("Invalid confidence field in response");
    }

    const intent = response.intent as
      | "scheduling"
      | "conversation"
      | "information";
    const confidence = Math.max(0, Math.min(1, response.confidence));
    const perinResponse = String(response.perinResponse);

    // Handle conversation/information intents (simple response)
    if (intent === "conversation" || intent === "information") {
      const result: Omit<
        ConversationDelegationResponse,
        "method" | "processingTime"
      > = {
        intent,
        confidence,
        perinResponse,
      };

      console.log("💬 Simple conversation response generated");
      return result;
    }

    // Handle scheduling intent (complex response with analysis)
    if (intent === "scheduling") {
      if (
        !response.schedulingAnalysis ||
        typeof response.schedulingAnalysis !== "object"
      ) {
        throw new Error("Missing schedulingAnalysis for scheduling intent");
      }

      const schedulingAnalysis = response.schedulingAnalysis as Record<
        string,
        unknown
      >;

      // Process time analysis
      const timeAnalysisData = schedulingAnalysis.timeAnalysis as Record<
        string,
        unknown
      >;
      let parsedDateTime: Date | null = null;

      if (typeof timeAnalysisData?.parsedDateTime === "string") {
        try {
          parsedDateTime = new Date(timeAnalysisData.parsedDateTime);
          if (isNaN(parsedDateTime.getTime())) {
            parsedDateTime = null;
          }
        } catch {
          parsedDateTime = null;
        }
      }

      // Smart fallback: If LLM didn't parse date but we have time and conversation context
      if (!parsedDateTime && timeAnalysisData?.extractedComponents) {
        const components = timeAnalysisData.extractedComponents as Record<
          string,
          string
        >;
        const time = components.time;
        const timezone =
          components.timezone || context.externalUserTimezone || "UTC";

        if (time && context.conversationHistory) {
          parsedDateTime = this.inferDateFromConversationContext(
            time,
            timezone,
            context.conversationHistory,
            context.externalUserTimezone || "UTC"
          );

          if (parsedDateTime) {
            console.log(
              "🧠 Smart fallback: Inferred date from conversation context:",
              {
                originalTime: time,
                inferredDateTime: parsedDateTime.toISOString(),
                conversationContext: context.conversationHistory.substring(
                  0,
                  100
                ),
              }
            );
          }
        }
      }

      const timeAnalysis: TimeAnalysis = {
        parsedDateTime,
        confidence:
          (timeAnalysisData?.confidence as "high" | "medium" | "low") || "low",
        extractedComponents:
          (timeAnalysisData?.extractedComponents as Record<string, string>) ||
          {},
        reasoning:
          (timeAnalysisData?.reasoning as string) || "Time analysis completed",
        fallbackSuggestions:
          (timeAnalysisData?.fallbackSuggestions as string[]) || [],
      };

      // Process meeting context
      const meetingContextData = schedulingAnalysis.meetingContext as Record<
        string,
        unknown
      >;
      const meetingContext: MeetingContext = {
        duration: (meetingContextData?.duration as number) || 30,
        title: (meetingContextData?.title as string) || "Meeting",
        urgency:
          (meetingContextData?.urgency as "high" | "medium" | "low") ||
          "medium",
        meetingType: meetingContextData?.meetingType as string,
      };

      // Process contextual messages
      const messagesData = schedulingAnalysis.contextualMessages as Record<
        string,
        unknown
      >;
      const contextualMessages: ContextualMessages = {
        meetingScheduled: messagesData?.meetingScheduled as string,
        timeConflict: messagesData?.timeConflict as string,
      };

      const result: Omit<
        SchedulingDelegationResponse,
        "method" | "processingTime"
      > = {
        intent: "scheduling",
        confidence,
        perinResponse,
        schedulingAnalysis: {
          timeAnalysis,
          meetingContext,
          contextualMessages,
        },
      };

      console.log("📅 Scheduling response generated with full analysis");
      return result;
    }

    throw new Error(`Unknown intent: ${intent}`);
  }

  /**
   * Smart fallback: Infer date from conversation context when LLM fails to parse
   */
  private inferDateFromConversationContext(
    time: string,
    timezone: string,
    conversationHistory: string,
    userTimezone: string
  ): Date | null {
    try {
      // Look for date references in conversation history

      let baseDate: Date | null = null;
      const now = new Date();
      const userNow = new Date(
        now.toLocaleString("en-US", { timeZone: userTimezone })
      );

      // Look for specific dates in ISO format (from previous LLM responses) - highest priority
      const isoMatch = conversationHistory.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
      if (isoMatch) {
        baseDate = new Date(isoMatch[0]);
        console.log("🧠 Found ISO date in conversation:", isoMatch[0]);
      }
      // Check for "tomorrow" in conversation
      else if (conversationHistory.toLowerCase().includes("tomorrow")) {
        baseDate = new Date(userNow);
        baseDate.setDate(baseDate.getDate() + 1);
        console.log(
          "🧠 Found 'tomorrow' in conversation, using:",
          baseDate.toISOString().split("T")[0]
        );
      }
      // Check for "today" in conversation
      else if (conversationHistory.toLowerCase().includes("today")) {
        baseDate = new Date(userNow);
        console.log(
          "🧠 Found 'today' in conversation, using:",
          baseDate.toISOString().split("T")[0]
        );
      }

      if (baseDate) {
        // Parse the time (e.g., "15:00", "3pm", "14:30")
        const timeMatch = time.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2] || "0");
          const ampm = timeMatch[3]?.toLowerCase();

          // Handle AM/PM
          if (ampm === "pm" && hours !== 12) hours += 12;
          if (ampm === "am" && hours === 12) hours = 0;

          // Set the time on the base date
          baseDate.setHours(hours, minutes, 0, 0);

          return baseDate;
        }
      }

      return null;
    } catch (error) {
      console.error("Error inferring date from conversation context:", error);
      return null;
    }
  }

  /**
   * Fallback response when unified approach fails
   */
  private createFallbackResponse(
    message: string,
    context: DelegationContext,
    startTime: number
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

    if (hasExplicitIntent) {
      // Return scheduling response for explicit scheduling intent
      const result: SchedulingDelegationResponse = {
        intent: "scheduling",
        confidence: 0.7,
        perinResponse: fallbackPerinResponse,
        schedulingAnalysis: {
          timeAnalysis: {
            parsedDateTime: null,
            confidence: "low",
            extractedComponents: {},
            reasoning:
              "Fallback could not parse time - user clarification needed",
            fallbackSuggestions: [
              "Please specify both the day and time for your meeting",
              "For example: 'Schedule for Friday at 2 PM'",
            ],
          },
          meetingContext: {
            duration: (context.constraints?.defaultDuration as number) || 30,
            title: "Meeting",
            urgency: "medium",
          },
          contextualMessages: {
            meetingScheduled: isHebrew
              ? "הפגישה נקבעה בהצלחה!"
              : "Meeting scheduled successfully!",
            timeConflict: isHebrew
              ? "הזמן הזה לא פנוי, אבדוק חלופות"
              : "That time isn't available, let me check alternatives",
          },
        },
        method: "fallback",
        processingTime: Date.now() - startTime,
      };
      return result;
    } else {
      // Return simple conversation response
      const result: ConversationDelegationResponse = {
        intent: "conversation",
        confidence: 0.9,
        perinResponse: fallbackPerinResponse,
        method: "fallback",
        processingTime: Date.now() - startTime,
      };
      return result;
    }
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

    // Convert new format to legacy format
    if (response.intent === "scheduling") {
      return {
        requiresScheduling: true,
        confidence: response.confidence,
        reasoning: "Scheduling intent detected",
        timeAnalysis: response.schedulingAnalysis.timeAnalysis,
        meetingContext: response.schedulingAnalysis.meetingContext,
        contextualMessages: response.schedulingAnalysis.contextualMessages,
        method: response.method,
        processingTime: response.processingTime,
      };
    } else {
      return {
        requiresScheduling: false,
        confidence: response.confidence,
        reasoning: "Conversation intent detected",
        method: response.method,
        processingTime: response.processingTime,
      };
    }
  }
}
