/**
 * Tool System Types
 *
 * Defines types for the LLM tool-calling architecture that enables
 * structured actions while maintaining type safety and error handling.
 */

import { z } from "zod";

/**
 * Envelope for all tool results to ensure consistent error handling
 */
export type ToolEnvelope<T> =
  | { ok: true; data: T; needs?: undefined; error?: undefined }
  | { ok: false; needs: Record<string, boolean>; error?: undefined }
  | { ok: false; error: { code: string; message: string }; needs?: undefined };

/**
 * Context passed to all tool handlers
 */
export interface ToolContext {
  userId: string;
  conversationContext: string;
  memoryContext: Record<string, unknown>;
  integrations: Record<string, unknown>;
  delegationContext?: {
    delegationId: string;
    externalUserName?: string;
    constraints?: Record<string, unknown>;
    isDelegation: boolean;
    externalUserTimezone?: string;
  };
}

/**
 * Tool handler function signature
 */
export type ToolHandler<TArgs, TResult> = (
  context: ToolContext,
  args: TArgs
) => Promise<ToolEnvelope<TResult>>;

/**
 * OpenAI tool specification for LLM
 */
export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Registry entry combining spec and handler
 */
export interface ToolRegistryEntry<TArgs, TResult> {
  spec: ToolSpec;
  handler: ToolHandler<TArgs, TResult>;
  schema: z.ZodSchema<TArgs>;
}

/**
 * Error codes for consistent error handling
 */
export enum ToolErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  SCOPES_MISSING = "SCOPES_MISSING",
  CONNECTION_INACTIVE = "CONNECTION_INACTIVE",
  RATE_LIMITED = "RATE_LIMITED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
}

/**
 * Standard error response builder
 */
export const createToolError = (
  code: ToolErrorCode,
  message: string
): ToolEnvelope<never> => ({
  ok: false,
  error: { code, message },
});

/**
 * Missing requirements response builder
 */
export const createToolNeeds = (
  needs: Record<string, boolean>
): ToolEnvelope<never> => ({
  ok: false,
  needs,
});

/**
 * Success response builder
 */
export const createToolSuccess = <T>(data: T): ToolEnvelope<T> => ({
  ok: true,
  data,
});

/**
 * Tool call from OpenAI
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  result: ToolEnvelope<unknown>;
  duration: number;
  timestamp: string;
}
