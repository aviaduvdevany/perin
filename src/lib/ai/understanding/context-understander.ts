import {
  ConversationContext,
  ConversationTurn,
  ConversationState,
  IntegrationContext,
  MemoryContext,
  DelegationContext,
  UserPreferences,
} from "../../../types/understanding";

export interface ContextUnderstandingRequest {
  currentInput: string;
  conversationHistory: ConversationTurn[];
  userPreferences: UserPreferences;
  integrationContext?: IntegrationContext;
  memoryContext?: MemoryContext;
  delegationContext?: DelegationContext;
  userId: string;
}

export interface ContextUnderstandingResponse {
  conversationContext: ConversationContext;
  currentState: ConversationState;
  contextInsights: ContextInsight[];
  relevantMemories: MemoryContext[];
  integrationRelevance: IntegrationRelevance[];
}

export interface ContextInsight {
  type: "preference" | "pattern" | "intent" | "emotion" | "urgency";
  value: string;
  confidence: number;
  reasoning: string;
}

export interface IntegrationRelevance {
  integrationType: string;
  relevance: number;
  reasoning: string;
  suggestedActions: string[];
}

export class ContextUnderstander {
  private static instance: ContextUnderstander;

  private constructor() {}

  public static getInstance(): ContextUnderstander {
    if (!ContextUnderstander.instance) {
      ContextUnderstander.instance = new ContextUnderstander();
    }
    return ContextUnderstander.instance;
  }

  public async understandContext(
    request: ContextUnderstandingRequest
  ): Promise<ContextUnderstandingResponse> {
    try {
      const conversationContext = this.buildConversationContext(request);
      const currentState = this.analyzeConversationState(conversationContext);
      const contextInsights = await this.extractContextInsights(request);
      const relevantMemories = await this.findRelevantMemories(request);
      const integrationRelevance = await this.analyzeIntegrationRelevance(
        request
      );

      return {
        conversationContext,
        currentState,
        contextInsights,
        relevantMemories,
        integrationRelevance,
      };
    } catch (error) {
      console.error("Context understanding failed:", error);
      return this.getFallbackContextUnderstanding(request);
    }
  }

  private buildConversationContext(
    request: ContextUnderstandingRequest
  ): ConversationContext {
    const {
      conversationHistory,
      userPreferences,
      integrationContext,
      memoryContext,
      delegationContext,
    } = request;

    return {
      conversationHistory: this.cleanConversationHistory(conversationHistory),
      userPreferences,
      currentState: this.analyzeConversationState({
        conversationHistory,
        userPreferences,
      }),
      integrationContext:
        integrationContext || this.getDefaultIntegrationContext(),
      memoryContext: memoryContext || this.getDefaultMemoryContext(),
      delegationContext,
    };
  }

  private cleanConversationHistory(
    history: ConversationTurn[]
  ): ConversationTurn[] {
    return history
      .filter((turn) => turn.content && turn.content.trim().length > 0)
      .map((turn) => ({
        ...turn,
        content: turn.content.trim(),
        timestamp: turn.timestamp || new Date(),
      }))
      .slice(-50); // Keep last 50 turns to prevent context overflow
  }

  private analyzeConversationState(context: {
    conversationHistory: ConversationTurn[];
    userPreferences: UserPreferences;
  }): ConversationState {
    const { conversationHistory } = context;

    if (conversationHistory.length === 0) {
      return {
        phase: "greeting",
        mood: "neutral",
        engagement: "low",
        urgency: "low",
        topic: "general",
      };
    }

    const recentTurns = conversationHistory.slice(-5);
    const userTurns = recentTurns.filter((turn) => turn.role === "user");
    const assistantTurns = recentTurns.filter(
      (turn) => turn.role === "assistant"
    );

    // Analyze conversation phase
    const phase = this.determineConversationPhase(conversationHistory);

    // Analyze mood based on language patterns
    const mood = this.analyzeMood(userTurns);

    // Analyze engagement level
    const engagement = this.analyzeEngagement(userTurns, assistantTurns);

    // Analyze urgency
    const urgency = this.analyzeUrgency(userTurns);

    // Analyze current topic
    const topic = this.analyzeTopic(recentTurns);

    return {
      phase: phase as ConversationState["phase"],
      mood: mood as ConversationState["mood"],
      engagement: engagement as ConversationState["engagement"],
      urgency: urgency as ConversationState["urgency"],
      topic: topic as ConversationState["topic"],
    };
  }

  private determineConversationPhase(history: ConversationTurn[]): string {
    if (history.length === 0) return "greeting";
    if (history.length === 1) return "introduction";
    if (history.length < 5) return "exploration";

    const recentTurns = history.slice(-10);
    const hasQuestions = recentTurns.some(
      (turn) =>
        turn.role === "user" &&
        (turn.content.includes("?") ||
          turn.content.toLowerCase().includes("what") ||
          turn.content.toLowerCase().includes("how"))
    );

    if (hasQuestions) return "inquiry";

    const hasActions = recentTurns.some(
      (turn) =>
        turn.role === "user" &&
        (turn.content.toLowerCase().includes("schedule") ||
          turn.content.toLowerCase().includes("send") ||
          turn.content.toLowerCase().includes("find"))
    );

    if (hasActions) return "action";

    return "discussion";
  }

  private analyzeMood(userTurns: ConversationTurn[]): string {
    if (userTurns.length === 0) return "neutral";

    const content = userTurns
      .map((turn) => turn.content.toLowerCase())
      .join(" ");

    // Simple mood analysis based on keywords
    if (
      content.includes("thank") ||
      content.includes("great") ||
      content.includes("awesome") ||
      content.includes("love")
    ) {
      return "positive";
    }

    if (
      content.includes("frustrated") ||
      content.includes("angry") ||
      content.includes("upset") ||
      content.includes("annoyed")
    ) {
      return "negative";
    }

    if (
      content.includes("urgent") ||
      content.includes("asap") ||
      content.includes("emergency")
    ) {
      return "stressed";
    }

    return "neutral";
  }

  private analyzeEngagement(
    userTurns: ConversationTurn[],
    assistantTurns: ConversationTurn[]
  ): string {
    if (userTurns.length === 0) return "low";

    const avgUserLength =
      userTurns.reduce((sum, turn) => sum + turn.content.length, 0) /
      userTurns.length;
    const responseRate = assistantTurns.length / Math.max(userTurns.length, 1);

    if (avgUserLength > 100 && responseRate > 0.8) return "high";
    if (avgUserLength > 50 && responseRate > 0.5) return "medium";
    return "low";
  }

  private analyzeUrgency(userTurns: ConversationTurn[]): string {
    if (userTurns.length === 0) return "low";

    const content = userTurns
      .map((turn) => turn.content.toLowerCase())
      .join(" ");

    if (
      content.includes("urgent") ||
      content.includes("asap") ||
      content.includes("emergency") ||
      content.includes("now")
    ) {
      return "high";
    }

    if (
      content.includes("soon") ||
      content.includes("today") ||
      content.includes("quick")
    ) {
      return "medium";
    }

    return "low";
  }

  private analyzeTopic(turns: ConversationTurn[]): string {
    if (turns.length === 0) return "general";

    const content = turns.map((turn) => turn.content.toLowerCase()).join(" ");

    if (
      content.includes("schedule") ||
      content.includes("meeting") ||
      content.includes("calendar")
    ) {
      return "scheduling";
    }

    if (
      content.includes("email") ||
      content.includes("message") ||
      content.includes("send")
    ) {
      return "communication";
    }

    if (
      content.includes("find") ||
      content.includes("search") ||
      content.includes("look")
    ) {
      return "information";
    }

    if (
      content.includes("delegate") ||
      content.includes("assign") ||
      content.includes("help")
    ) {
      return "delegation";
    }

    return "general";
  }

  private async extractContextInsights(
    request: ContextUnderstandingRequest
  ): Promise<ContextInsight[]> {
    const insights: ContextInsight[] = [];

    // Analyze user preferences
    if (request.userPreferences) {
      insights.push({
        type: "preference",
        value: "User has defined preferences",
        confidence: 0.9,
        reasoning: "User preferences are available in context",
      });
    }

    // Analyze conversation patterns
    const patterns = this.analyzeConversationPatterns(
      request.conversationHistory
    );
    insights.push(...patterns);

    // Analyze urgency patterns
    const urgencyInsight = this.analyzeUrgencyPattern(request.currentInput);
    if (urgencyInsight) {
      insights.push(urgencyInsight);
    }

    return insights;
  }

  private analyzeConversationPatterns(
    history: ConversationTurn[]
  ): ContextInsight[] {
    const insights: ContextInsight[] = [];

    if (history.length === 0) return insights;

    const userTurns = history.filter((turn) => turn.role === "user");

    // Analyze communication style
    const avgLength =
      userTurns.reduce((sum, turn) => sum + turn.content.length, 0) /
      userTurns.length;

    if (avgLength > 100) {
      insights.push({
        type: "pattern",
        value: "Detailed communicator",
        confidence: 0.8,
        reasoning: `Average message length is ${Math.round(
          avgLength
        )} characters`,
      });
    } else if (avgLength < 30) {
      insights.push({
        type: "pattern",
        value: "Concise communicator",
        confidence: 0.8,
        reasoning: `Average message length is ${Math.round(
          avgLength
        )} characters`,
      });
    }

    return insights;
  }

  private analyzeUrgencyPattern(input: string): ContextInsight | null {
    const urgencyKeywords = [
      "urgent",
      "asap",
      "emergency",
      "now",
      "immediately",
      "quick",
    ];
    const hasUrgency = urgencyKeywords.some((keyword) =>
      input.toLowerCase().includes(keyword)
    );

    if (hasUrgency) {
      return {
        type: "urgency",
        value: "High urgency detected",
        confidence: 0.9,
        reasoning: "Input contains urgency indicators",
      };
    }

    return null;
  }

  private async findRelevantMemories(
    request: ContextUnderstandingRequest
  ): Promise<MemoryContext[]> {
    // This would integrate with the semantic memory system
    // For now, return empty array
    return [];
  }

  private async analyzeIntegrationRelevance(
    request: ContextUnderstandingRequest
  ): Promise<IntegrationRelevance[]> {
    const relevance: IntegrationRelevance[] = [];

    // Analyze if calendar integration might be relevant
    const calendarKeywords = [
      "schedule",
      "meeting",
      "appointment",
      "calendar",
      "time",
      "date",
    ];
    const hasCalendarIntent = calendarKeywords.some((keyword) =>
      request.currentInput.toLowerCase().includes(keyword)
    );

    if (hasCalendarIntent) {
      relevance.push({
        integrationType: "calendar",
        relevance: 0.8,
        reasoning: "User input contains scheduling-related keywords",
        suggestedActions: [
          "check_availability",
          "schedule_meeting",
          "view_calendar",
        ],
      });
    }

    // Analyze if email integration might be relevant
    const emailKeywords = ["email", "message", "send", "inbox", "mail"];
    const hasEmailIntent = emailKeywords.some((keyword) =>
      request.currentInput.toLowerCase().includes(keyword)
    );

    if (hasEmailIntent) {
      relevance.push({
        integrationType: "gmail",
        relevance: 0.7,
        reasoning: "User input contains email-related keywords",
        suggestedActions: ["send_email", "check_inbox", "search_emails"],
      });
    }

    return relevance;
  }

  private getDefaultIntegrationContext(): IntegrationContext {
    return {
      availableIntegrations: [],
      activeIntegrations: [],
      lastUsed: null,
    };
  }

  private getDefaultMemoryContext(): MemoryContext {
    return {
      recentMemories: [],
      relevantMemories: [],
      memoryCount: 0,
    };
  }

  private getFallbackContextUnderstanding(
    request: ContextUnderstandingRequest
  ): ContextUnderstandingResponse {
    return {
      conversationContext: this.buildConversationContext(request),
      currentState: {
        phase: "general",
        mood: "neutral",
        engagement: "low",
        urgency: "low",
        topic: "general",
      },
      contextInsights: [],
      relevantMemories: [],
      integrationRelevance: [],
    };
  }
}

export const contextUnderstander = ContextUnderstander.getInstance();
