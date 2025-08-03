import OpenAI from "openai";
import type { LangGraphChatState } from "../../../../types";
import type { ChatMessage } from "../../../../types";

// Initialize OpenAI client only on server-side
let openai: OpenAI | null = null;

export const initializeOpenAI = (): OpenAI => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not configured");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
};

/**
 * Build dynamic system prompt based on user preferences and context
 */
export const buildSystemPrompt = (state: LangGraphChatState): string => {
  const { tone, perinName, memoryContext, user } = state;

  const basePrompt = `You are ${perinName}, a tone-aware digital delegate and personal AI assistant.

Core Capabilities:
- Natural negotiation and conversation
- Persistent memory and context awareness
- Emotionally intelligent, human-like responses
- Multi-agent coordination when needed

Your Tone: ${tone}
Your Name: ${perinName}

Key Principles:
1. Always maintain your assigned tone and personality
2. Use your name (${perinName}) naturally in conversation
3. Reference relevant memory and context when appropriate
4. Be emotionally intelligent and empathetic
5. Help with scheduling, coordination, and delegation tasks
6. Maintain persistent identity across conversations

Memory Context: ${JSON.stringify(memoryContext, null, 2)}

User Preferences:
- Timezone: ${user?.timezone || "UTC"}
- Preferred Hours: ${JSON.stringify(user?.preferred_hours || {}, null, 2)}

Remember: You are a digital delegate, not just a chatbot. Act with agency, empathy, and persistence.`;

  return basePrompt;
};

/**
 * OpenAI node for LangGraph workflow
 * Handles OpenAI API calls and streaming responses
 */
export const openaiNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    // Initialize OpenAI client
    const openaiClient = initializeOpenAI();

    // Build system prompt
    const systemPrompt = buildSystemPrompt(state);

    // Prepare messages with system prompt
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...state.messages,
    ];

    // Execute OpenAI chat completion
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Collect streaming response
    let fullResponse = "";
    const streamChunks: string[] = [];

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        streamChunks.push(content);
      }
    }

    return {
      systemPrompt,
      openaiResponse: fullResponse,
      streamChunks,
      currentStep: "openai_completed",
    };
  } catch (error) {
    console.error("Error in OpenAI node:", error);
    return {
      currentStep: "openai_error",
      error: error instanceof Error ? error.message : "OpenAI API call failed",
    };
  }
};
