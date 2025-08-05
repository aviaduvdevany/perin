import OpenAI from "openai";
import type { PerinChatRequest, PerinChatResponse } from "@/types/ai";

// Initialize OpenAI client only on server-side
let openai: OpenAI | null = null;

const initializeOpenAI = (): OpenAI => {
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
 * Smart query function that executes OpenAI chat completion directly
 * Returns typed results with proper error handling
 * 
 * @deprecated Use executePerinChatWithLangGraph from langgraph/index.ts instead
 */
export const executePerinChat = async (
  request: PerinChatRequest
): Promise<PerinChatResponse> => {
  try {
    // Initialize OpenAI client (server-side only)
    const openaiClient = initializeOpenAI();

    // Construct dynamic system prompt
    const systemPrompt = buildSystemPrompt(request);

    // Prepare messages with system prompt
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...request.messages,
    ];

    // Execute OpenAI chat completion
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4",
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Create a readable stream from the OpenAI response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Create response object
    const responseObj = new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

    return {
      stream,
      response: responseObj,
    };
  } catch (error) {
    console.error("Error executing Perin chat:", error);
    throw error;
  }
};

/**
 * Build dynamic system prompt based on user preferences and context
 */
const buildSystemPrompt = (request: PerinChatRequest): string => {
  const { tone = "friendly", perinName = "Perin", memory = {} } = request;

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
2. Reference relevant memory and context when appropriate
3. Be emotionally intelligent and empathetic
4. Help with scheduling, coordination, and delegation tasks
5. Maintain persistent identity across conversations

Memory Context: ${JSON.stringify(memory, null, 2)}

Remember: You are a digital delegate, not just a chatbot. Act with agency, empathy, and persistence.`;

  return basePrompt;
};

/**
 * Helper function to validate OpenAI API key
 */
export const validateOpenAIConfig = (): boolean => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return false;
  }
  return true;
};
