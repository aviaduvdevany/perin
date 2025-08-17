import { IntegrationError, isReauthError, getIntegrationType } from "./errors";

/**
 * Centralized integration error handling for different contexts
 */

export interface ErrorHandlingContext {
  currentUserId?: string;
  operationUserId?: string;
  allowGracefulDegradation?: boolean;
  defaultValue?: unknown;
}

/**
 * Handle integration errors based on context
 * This replaces all the scattered error checking throughout the codebase
 */
export function handleIntegrationError(
  error: unknown,
  context: ErrorHandlingContext = {}
): { shouldBubble: boolean; fallbackValue?: unknown } {
  const {
    currentUserId,
    operationUserId,
    allowGracefulDegradation = false,
    defaultValue = null,
  } = context;

  // Convert legacy errors to new IntegrationError format
  let integrationError: IntegrationError | null = null;

  if (error instanceof IntegrationError) {
    integrationError = error;
  } else if (error instanceof Error) {
    integrationError = IntegrationError.fromLegacyError(error);
  }

  // If it's not an integration error, always bubble up
  if (!integrationError) {
    return { shouldBubble: true };
  }

  // If it's not a reauth error, bubble up (rate limits, API errors, etc.)
  if (!integrationError.shouldTriggerReauth()) {
    return { shouldBubble: true };
  }

  // If we have user context, check if current user needs reauth
  if (currentUserId && operationUserId) {
    const isCurrentUserError = operationUserId === currentUserId;

    if (isCurrentUserError) {
      // Current user needs reauth - bubble up to show reauth UI
      return { shouldBubble: true };
    } else if (allowGracefulDegradation) {
      // Other user needs reauth - handle gracefully if allowed
      console.log(
        `User ${operationUserId} needs ${integrationError.integrationType} reauth, using fallback`
      );
      return { shouldBubble: false, fallbackValue: defaultValue };
    }
  }

  // Default behavior - bubble up if we can't determine context
  return { shouldBubble: true };
}

/**
 * Wrapper function for async operations that might need integration error handling
 */
export async function withIntegrationErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorHandlingContext = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const { shouldBubble, fallbackValue } = handleIntegrationError(
      error,
      context
    );

    if (shouldBubble) {
      throw error;
    } else {
      return fallbackValue as T;
    }
  }
}

/**
 * Check if error should trigger reauth flow (simplified interface)
 */
export function shouldTriggerReauth(
  error: unknown,
  currentUserId?: string,
  operationUserId?: string
): boolean {
  if (!isReauthError(error)) return false;

  // If no user context, always trigger reauth
  if (!currentUserId || !operationUserId) return true;

  // Only trigger reauth if it's the current user's error
  return operationUserId === currentUserId;
}

/**
 * Generate action token for frontend (centralized)
 */
export function getErrorActionToken(error: unknown): string | null {
  if (error instanceof IntegrationError) {
    return error.getActionToken();
  }

  // Fallback for legacy errors
  const integrationType = getIntegrationType(error);
  if (integrationType && isReauthError(error)) {
    return `[[PERIN_ACTION:${integrationType}_reauth_required]]`;
  }

  return null;
}
