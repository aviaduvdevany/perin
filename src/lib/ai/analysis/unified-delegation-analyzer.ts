/**
 * Unified Delegation Analyzer
 *
 * Combines intent detection and time parsing into a single, efficient LLM call.
 * Replaces the legacy multi-step approach with a comprehensive analysis system.
 */

import { OpenAI } from "openai";
import { initializeOpenAI } from "../langgraph/nodes/openai-node";
import { analysisMonitor } from "./analysis-monitor";

export interface TimeAnalysis {
  parsedDateTime: Date | null;
  confidence: "high" | "medium" | "low";
  extractedComponents: {
    date?: string;
    time?: string;
    timezone?: string;
  };
  reasoning: string;
  fallbackSuggestions?: string[];
}

export interface MeetingContext {
  duration?: number;
  title?: string;
  urgency?: "high" | "medium" | "low";
  meetingType?: string;
}

export interface ContextualMessages {
  // Success scenarios
  availabilityConfirmed?: string;
  meetingScheduled?: string;

  // Conflict scenarios
  timeConflict?: string;
  unavailable?: string;

  // Clarification scenarios
  needsMoreInfo?: string;
  clarifyTime?: string;
  clarifyDate?: string;

  // Progress messages
  checkingAvailability?: string;
  schedulingMeeting?: string;

  // Error scenarios
  calendarError?: string;
  generalError?: string;
}

export interface UnifiedDelegationAnalysis {
  // Intent analysis
  requiresScheduling: boolean;
  confidence: number;
  reasoning: string;

  // Time analysis (if scheduling required)
  timeAnalysis?: TimeAnalysis;

  // Meeting context
  meetingContext?: MeetingContext;

  // Contextual messaging
  contextualMessages?: ContextualMessages;

  // Metadata
  method: "unified" | "fallback";
  processingTime: number;
}

export interface DelegationAnalysisContext {
  delegationId: string;
  externalUserName?: string;
  externalUserTimezone?: string;
  constraints?: Record<string, unknown>;
  conversationHistory?: string;

  // Owner's Perin personality
  ownerPersonality?: {
    perinName?: string;
    tone?: string; // "professional", "friendly", "casual", etc.
    language?: string; // "auto", "hebrew", "english"
    communicationStyle?: string; // "formal", "warm", "direct", etc.
  };
}

export class UnifiedDelegationAnalyzer {
  private openaiClient: OpenAI;
  private readonly model = "gpt-3.5-turbo";

  constructor() {
    this.openaiClient = initializeOpenAI();
  }

  /**
   * Main analysis method - single entry point for all delegation analysis
   */
  async analyzeMessage(
    message: string,
    context: DelegationAnalysisContext
  ): Promise<UnifiedDelegationAnalysis> {
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

      return finalResult;
    } catch (error) {
      console.error("Unified analysis failed, using fallback:", error);
      const fallbackResult = this.createFallbackAnalysis(
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
    context: DelegationAnalysisContext
  ): Promise<Omit<UnifiedDelegationAnalysis, "method" | "processingTime">> {
    const userTimezone = context.externalUserTimezone || "UTC";
    const currentTime = new Date();
    const userTime = new Date(
      currentTime.toLocaleString("en-US", { timeZone: userTimezone })
    );

    const constraints = context.constraints || {};
    const defaultDuration = (constraints.defaultDuration as number) || 30;

    const analysisPrompt = `You are analyzing a scheduling request for a delegation system. Provide comprehensive analysis including BOTH intent detection AND time extraction in a single response.

CONTEXT:
- Current date/time: ${userTime.toLocaleString()} (${userTimezone})
- Current day of week: ${userTime.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: userTimezone,
    })}
- Today's date: ${userTime.toLocaleDateString("en-US", {
      timeZone: userTimezone,
    })}
- Default meeting duration: ${defaultDuration} minutes
- Available meeting types: ${JSON.stringify(
      constraints.meetingType || ["video", "in_person"]
    )}
- Conversation history: ${context.conversationHistory || "None"}

USER MESSAGE: "${message}"

OWNER'S PERIN PERSONALITY:
- Name: ${context.ownerPersonality?.perinName || "Perin"}
- Tone: ${context.ownerPersonality?.tone || "friendly"}
- Communication Style: ${context.ownerPersonality?.communicationStyle || "warm"}
- Preferred Language: ${context.ownerPersonality?.language || "auto"}

CRITICAL INSTRUCTIONS:
1. Analyze ONLY the latest message for intent - ignore conversation history for intent detection
2. Be VERY conservative on scheduling intent (avoid false positives)
3. For time parsing, use ALL available context including conversation history
4. Handle ALL languages (Hebrew, English, etc.) naturally
5. Extract meeting components when scheduling intent is detected
6. **LANGUAGE MATCHING RULE**: Generate contextual messages in the SAME LANGUAGE as the user's message If user writes in Hebrew, generate ALL contextual messages in Hebrew. If user writes in English, generate ALL contextual messages in English.
7. Embody the owner's Perin personality in all generated messages
8. Keep messages privacy-friendly (no specific calendar details)

SCHEDULING INTENT (requiresScheduling = true) ONLY FOR:
- Clear intent to schedule: "Schedule a meeting for tomorrow"
- Clear intent to book time: "Book me for 2pm Thursday" 
- Clear intent to create event: "Set up a call with John next week"

NOT scheduling intent (requiresScheduling = false):
- Greetings: "hey", "hello", "hi"
- Questions: "How are you?", "What can you help with?"
- Information requests: "What times are available?"
- Casual conversation: "Thanks", "Sounds good"
- Clarifying questions: "What timezone?", "How long?"

TIME PARSING RULES:
- Extract BOTH date and time when possible
- Support natural language: "tomorrow at 3pm", "שלוש בצהריים", "Friday morning"
- Use conversation context for ambiguous references
- If only time given, assume context date from conversation
- If only date given, ask for time clarification (low confidence)

HEBREW DAY NAMES (CRITICAL - DO NOT CONFUSE):
- ראשון = Sunday (1st day)
- שני = Monday (2nd day) 
- שלישי = Tuesday (3rd day)
- רביעי = Wednesday (4th day)
- חמישי = Thursday (5th day)
- שישי = Friday (6th day)
- שבת = Saturday (7th day)

HEBREW TIME EXPRESSIONS:
- בבוקר = in the morning
- בצהריים = at noon/afternoon (12 PM - 6 PM)
- אחר הצהריים = in the afternoon
- בערב = in the evening
- בלילה = at night
- שלוש = 3 o'clock
- שתיים = 2 o'clock
- ארבע = 4 o'clock

DAY CALCULATION RULES:
- When user says "ביום שישי" (on Friday), find the NEXT Friday from today
- When user says "tomorrow"/"מחר", use tomorrow's date
- When user says "today"/"היום", use today's date
- ALWAYS verify the day name matches the calculated date
- EXAMPLE: If today is Monday and user says "שישי" (Friday), schedule for THIS WEEK's Friday

Respond with ONLY valid JSON:
{
  "requiresScheduling": boolean,
  "confidence": number (0-1),
  "reasoning": "Brief explanation of intent analysis",
  "timeAnalysis": {
    "parsedDateTime": "ISO string or null",
    "confidence": "high|medium|low", 
    "extractedComponents": {
      "date": "extracted date phrase or null",
      "time": "extracted time phrase or null",
      "timezone": "detected timezone or provided timezone"
    },
    "reasoning": "Explanation of time parsing logic",
    "fallbackSuggestions": ["suggestion1", "suggestion2"] // if parsing unclear
  },
  "meetingContext": {
    "duration": number_in_minutes,
    "title": "suggested meeting title",
    "urgency": "high|medium|low",
    "meetingType": "suggested type based on context"
  },
  "contextualMessages": {
    "availabilityConfirmed": "Message when time slot is available (Hebrew example: 'בדקתי את היומן והזמן פנוי!' English example: 'I checked the calendar and the time is available!')",
    "meetingScheduled": "Success message when meeting is created (Hebrew example: 'הפגישה נקבעה בהצלחה!' English example: 'The meeting has been successfully scheduled!')",
    "timeConflict": "Privacy-friendly message when time conflicts (Hebrew example: 'יש התנגשות בזמן המבוקש' English example: 'There is a conflict with the requested time')",
    "unavailable": "Message when owner is unavailable",
    "needsMoreInfo": "Message when more details needed",
    "clarifyTime": "Message asking to clarify time",
    "clarifyDate": "Message asking to clarify date", 
    "checkingAvailability": "Progress message while checking calendar (Hebrew example: 'בודק זמינות ביומן...' English example: 'Checking calendar availability...')",
    "schedulingMeeting": "Progress message while creating meeting (Hebrew example: 'מכין את הפגישה...' English example: 'Setting up the meeting...')",
    "calendarError": "Error message for calendar issues",
    "generalError": "Generic error message"
  }
}`;

    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    // Extract and parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format - no JSON found");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Console log the raw LLM response for debugging
    console.log("🤖 Raw LLM Analysis Response:", {
      requiresScheduling: analysis.requiresScheduling,
      timeAnalysis: analysis.timeAnalysis,
      contextualMessages: analysis.contextualMessages,
      fullResponse: analysis,
    });

    // Validate and process the response
    return this.processAnalysisResponse(analysis);
  }

  /**
   * Process and validate the LLM analysis response
   */
  private processAnalysisResponse(
    analysis: Record<string, unknown>
  ): Omit<UnifiedDelegationAnalysis, "method" | "processingTime"> {
    // Validate required fields
    if (typeof analysis.requiresScheduling !== "boolean") {
      throw new Error("Invalid requiresScheduling field");
    }

    const result: Omit<UnifiedDelegationAnalysis, "method" | "processingTime"> =
      {
        requiresScheduling: analysis.requiresScheduling,
        confidence: Math.max(
          0,
          Math.min(1, Number(analysis.confidence) || 0.5)
        ),
        reasoning: String(analysis.reasoning || "Analysis completed"),
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

      result.timeAnalysis = {
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
      result.meetingContext = {
        duration: (meetingContext.duration as number) || 30,
        title: (meetingContext.title as string) || "Meeting",
        urgency:
          (meetingContext.urgency as "high" | "medium" | "low") || "medium",
        meetingType: meetingContext.meetingType as string,
      };
    }

    // Process contextual messages
    if (analysis.contextualMessages) {
      const messages = analysis.contextualMessages as Record<string, unknown>;
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

      // Console log the contextual messages to debug
      console.log("🗣️ Generated Contextual Messages:", {
        availabilityConfirmed: result.contextualMessages.availabilityConfirmed,
        meetingScheduled: result.contextualMessages.meetingScheduled,
        timeConflict: result.contextualMessages.timeConflict,
        checkingAvailability: result.contextualMessages.checkingAvailability,
        schedulingMeeting: result.contextualMessages.schedulingMeeting,
      });
    } else {
      console.log("⚠️ No contextual messages generated by LLM");
    }

    return result;
  }

  /**
   * Fallback analysis when unified approach fails
   */
  private createFallbackAnalysis(
    message: string,
    context: DelegationAnalysisContext,
    startTime: number,
    _error: unknown
  ): UnifiedDelegationAnalysis {
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
      "לקבוע פגישה",
      "תזמן פגישה",
    ];

    const hasExplicitIntent = explicitSchedulingPhrases.some((phrase) =>
      text.includes(phrase)
    );

    return {
      requiresScheduling: hasExplicitIntent,
      confidence: hasExplicitIntent ? 0.7 : 0.9,
      reasoning: hasExplicitIntent
        ? "Fallback detected explicit scheduling phrase"
        : "Fallback found no clear scheduling intent",
      method: "fallback",
      processingTime: Date.now() - startTime,
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
    };
  }
}

// Export singleton instance
export const unifiedDelegationAnalyzer = new UnifiedDelegationAnalyzer();
