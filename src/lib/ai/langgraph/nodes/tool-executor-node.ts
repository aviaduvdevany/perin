/**
 * Tool Executor Node
 *
 * Executes tool calls from the LLM planner phase, validates arguments,
 * ensures permissions and scopes, and returns structured results.
 */

import type { LangGraphChatState } from "../state/chat-state";
import {
  ToolCall,
  ToolExecutionResult,
  ToolContext,
  createToolError,
  ToolErrorCode,
} from "../../tools/types";
import { getToolHandler } from "../../tools/registry";

/**
 * Execute a single tool call with validation and error handling
 */
async function executeToolCall(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Get tool handler
    const toolHandler = getToolHandler(toolCall.function.name);
    if (!toolHandler) {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        result: createToolError(
          ToolErrorCode.NOT_FOUND,
          `Unknown tool: ${toolCall.function.name}`
        ),
        duration: Date.now() - startTime,
        timestamp,
      };
    }

    // Parse and validate arguments
    let args: unknown;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        result: createToolError(
          ToolErrorCode.VALIDATION_ERROR,
          "Invalid JSON in tool arguments"
        ),
        duration: Date.now() - startTime,
        timestamp,
      };
    }

    // Validate with Zod schema
    const validation = toolHandler.schema.safeParse(args);
    if (!validation.success) {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        result: createToolError(
          ToolErrorCode.VALIDATION_ERROR,
          `Invalid arguments: ${validation.error.message}`
        ),
        duration: Date.now() - startTime,
        timestamp,
      };
    }

    // Execute the tool handler
    let result;
    try {
      result = await toolHandler.handler(context, validation.data as never);
    } catch (error) {
      // Check for reauth required errors that should bubble up to the orchestrator
      if (
        error instanceof Error &&
        (error.message.includes("CALENDAR_REAUTH_REQUIRED") ||
          error.message.includes("CALENDAR_NOT_CONNECTED") ||
          error.message.includes("GMAIL_REAUTH_REQUIRED") ||
          error.message.includes("GMAIL_NOT_CONNECTED"))
      ) {
        // These errors should bubble up to trigger the reauth flow
        console.log(
          "Tool executor bubbling up integration error:",
          error.message
        );
        throw error;
      }

      // For other errors, create a tool error result
      result = createToolError(
        ToolErrorCode.INTERNAL_ERROR,
        `Tool execution failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Log successful execution
    console.log(`Tool executed successfully: ${toolCall.function.name}`, {
      toolCallId: toolCall.id,
      duration: Date.now() - startTime,
      success: result.ok,
    });

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      result,
      duration: Date.now() - startTime,
      timestamp,
    };
  } catch (error) {
    // Check for reauth required errors that should bubble up to the orchestrator
    if (
      error instanceof Error &&
      (error.message.includes("CALENDAR_REAUTH_REQUIRED") ||
        error.message.includes("CALENDAR_NOT_CONNECTED") ||
        error.message.includes("GMAIL_REAUTH_REQUIRED") ||
        error.message.includes("GMAIL_NOT_CONNECTED"))
    ) {
      // These errors should bubble up to trigger the reauth flow
      console.log(
        "executeToolCall outer catch: bubbling up reauth error:",
        error.message
      );
      throw error;
    }

    console.error(`Tool execution failed: ${toolCall.function.name}`, {
      toolCallId: toolCall.id,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      result: createToolError(
        ToolErrorCode.INTERNAL_ERROR,
        "Tool execution failed"
      ),
      duration: Date.now() - startTime,
      timestamp,
    };
  }
}

/**
 * Tool Executor Node for LangGraph
 *
 * Processes tool calls from the planner phase and returns results
 * for the responder phase.
 */
export const toolExecutorNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  // Extract tool calls from the last assistant message
  const lastMessage = state.messages[state.messages.length - 1];
  if (
    !lastMessage ||
    lastMessage.role !== "assistant" ||
    !lastMessage.tool_calls
  ) {
    return {
      currentStep: "tool_executor_no_tools",
      streamChunks: [],
    };
  }

  const toolCalls = lastMessage.tool_calls as ToolCall[];
  if (toolCalls.length === 0) {
    return {
      currentStep: "tool_executor_no_tools",
      streamChunks: [],
    };
  }

  // Build tool context
  const context: ToolContext = {
    userId: state.userId,
    conversationContext: state.conversationContext || "",
    memoryContext: state.memoryContext || {},
    integrations: state.integrations || {},
  };

  console.log(`Executing ${toolCalls.length} tool call(s)`, {
    userId: state.userId,
    tools: toolCalls.map((tc) => tc.function.name),
    timestamp: new Date().toISOString(),
  });

  // Execute all tool calls in parallel for efficiency
  let results;
  try {
    const executionPromises = toolCalls.map((toolCall) =>
      executeToolCall(toolCall, context)
    );

    results = await Promise.all(executionPromises);
  } catch (error) {
    console.log("Promise.all caught error in tool executor:", {
      message: error instanceof Error ? error.message : "Unknown",
      isReauthError:
        error instanceof Error &&
        error.message.includes("CALENDAR_REAUTH_REQUIRED"),
    });

    // Check for reauth required errors that should bubble up
    if (
      error instanceof Error &&
      (error.message.includes("CALENDAR_REAUTH_REQUIRED") ||
        error.message.includes("CALENDAR_NOT_CONNECTED") ||
        error.message.includes("GMAIL_REAUTH_REQUIRED") ||
        error.message.includes("GMAIL_NOT_CONNECTED"))
    ) {
      // Bubble up to the orchestrator for reauth handling
      console.log(
        "Tool executor batch bubbling up integration error:",
        error.message
      );
      throw error;
    }

    // For other errors, continue with error handling
    console.error("Tool execution batch failed:", error);
    return {
      currentStep: "tool_executor_error",
      error: error instanceof Error ? error.message : "Tool execution failed",
      streamChunks: [],
    };
  }

  // Create tool result messages for the responder phase
  const toolMessages = results.map((result) => ({
    role: "tool" as const,
    tool_call_id: result.toolCallId,
    content: JSON.stringify({
      tool_name: result.toolName,
      result: result.result,
      duration: result.duration,
      timestamp: result.timestamp,
    }),
  }));

  // Log execution summary
  const successCount = results.filter((r) => r.result.ok).length;
  const failureCount = results.length - successCount;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log("Tool execution summary", {
    userId: state.userId,
    totalTools: results.length,
    successCount,
    failureCount,
    totalDuration,
    averageDuration: totalDuration / results.length,
  });

  // Store tool execution results in state for responder
  const toolExecutionResults = results.reduce((acc, result) => {
    acc[result.toolName] = result;
    return acc;
  }, {} as Record<string, ToolExecutionResult>);

  return {
    currentStep: "tool_executor_completed",
    messages: [...state.messages, ...toolMessages],
    toolExecutionResults,
    streamChunks: [],
  };
};
