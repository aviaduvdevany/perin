import { NextResponse } from "next/server";
import { COPY } from "@/constants/copy";

// Error handling utilities for API routes

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse {
  const error: ApiError = {
    message,
    code,
    details,
  };

  return NextResponse.json(error, { status });
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  badRequest: (message?: string) =>
    createErrorResponse(message || COPY.ERRORS.VALIDATION, 400, "BAD_REQUEST"),

  unauthorized: (message?: string) =>
    createErrorResponse(
      message || COPY.ERRORS.UNAUTHORIZED,
      401,
      "UNAUTHORIZED"
    ),

  notFound: (message?: string) =>
    createErrorResponse(message || COPY.ERRORS.NOT_FOUND, 404, "NOT_FOUND"),

  tooManyRequests: (message?: string) =>
    createErrorResponse(
      message || "Too many requests",
      429,
      "TOO_MANY_REQUESTS"
    ),

  conflict: (message?: string) =>
    createErrorResponse(message || "Conflict", 409, "CONFLICT"),

  internalServerError: (message?: string) =>
    createErrorResponse(
      message || COPY.ERRORS.GENERIC,
      500,
      "INTERNAL_SERVER_ERROR"
    ),

  databaseError: (message?: string) =>
    createErrorResponse(
      message || "Database operation failed",
      500,
      "DATABASE_ERROR"
    ),
};

/**
 * Handle async route handlers with error catching
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API route error:", error);

      if (error instanceof Error) {
        return ErrorResponses.internalServerError(error.message);
      }

      return ErrorResponses.internalServerError();
    }
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    (field) =>
      body[field] === undefined || body[field] === null || body[field] === ""
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
