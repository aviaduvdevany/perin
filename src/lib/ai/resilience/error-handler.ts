// Functional AI Error Handling System
export enum AIErrorType {
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  TIMEOUT = "timeout",
  SERVICE_UNAVAILABLE = "service_unavailable",
  INVALID_INPUT = "invalid_input",
  CONTEXT_TOO_LARGE = "context_too_large",
  UNKNOWN = "unknown",
}

export interface AIError {
  type: AIErrorType;
  message: string;
  code?: string;
  retryable: boolean;
  backoffMs?: number;
  metadata?: Record<string, unknown>;
}

export interface CircuitState {
  open: boolean;
  lastFailure: number;
  failures: number;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  circuitBreaker?: boolean;
}

// State storage (in production, use Redis)
const retryAttempts = new Map<string, number>();
const circuitState = new Map<string, CircuitState>();

/**
 * Main retry function with circuit breaker pattern
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  operationId: string,
  config: RetryConfig = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelayMs = 1000, circuitBreaker = true } = config;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check circuit breaker
      if (circuitBreaker && isCircuitOpen(operationId)) {
        throw new Error(`Circuit breaker open for ${operationId}`);
      }

      const result = await operation();

      // Reset on success
      retryAttempts.delete(operationId);
      if (circuitBreaker) {
        resetCircuitBreaker(operationId);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      const aiError = categorizeError(error);

      // Don't retry non-retryable errors
      if (!aiError.retryable || attempt === maxRetries) {
        if (circuitBreaker) {
          recordFailure(operationId);
        }
        throw enhanceError(error, operationId, attempt + 1);
      }

      // Exponential backoff with jitter
      const delay = calculateBackoff(attempt, baseDelayMs, aiError.backoffMs);
      await sleep(delay);
    }
  }

  throw lastError!;
};

/**
 * Categorize errors to determine retry strategy
 */
export const categorizeError = (error: unknown): AIError => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // OpenAI-specific errors
  if (errorMessage.includes("rate limit")) {
    return {
      type: AIErrorType.RATE_LIMIT,
      message: "API rate limit exceeded",
      retryable: true,
      backoffMs: 60000, // 1 minute
    };
  }

  if (errorMessage.includes("timeout") || errorMessage.includes("TIMEOUT")) {
    return {
      type: AIErrorType.TIMEOUT,
      message: "Request timeout",
      retryable: true,
      backoffMs: 5000,
    };
  }

  if (
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("authentication")
  ) {
    return {
      type: AIErrorType.AUTHENTICATION,
      message: "Authentication failed",
      retryable: false,
    };
  }

  if (errorMessage.includes("context_length_exceeded")) {
    return {
      type: AIErrorType.CONTEXT_TOO_LARGE,
      message: "Context size too large",
      retryable: false,
    };
  }

  // Default to retryable unknown error
  return {
    type: AIErrorType.UNKNOWN,
    message: errorMessage,
    retryable: true,
  };
};

/**
 * Check if circuit breaker is open
 */
export const isCircuitOpen = (operationId: string): boolean => {
  const circuit = circuitState.get(operationId);
  if (!circuit || !circuit.open) return false;

  // Check if circuit should be reset (5 minute timeout)
  if (Date.now() - circuit.lastFailure > 300000) {
    resetCircuitBreaker(operationId);
    return false;
  }

  return true;
};

/**
 * Record failure for circuit breaker
 */
export const recordFailure = (operationId: string): void => {
  const circuit = circuitState.get(operationId) || {
    open: false,
    lastFailure: 0,
    failures: 0,
  };
  circuit.failures++;
  circuit.lastFailure = Date.now();

  // Open circuit after 5 failures
  if (circuit.failures >= 5) {
    circuit.open = true;
  }

  circuitState.set(operationId, circuit);
};

/**
 * Reset circuit breaker state
 */
export const resetCircuitBreaker = (operationId: string): void => {
  circuitState.set(operationId, { open: false, lastFailure: 0, failures: 0 });
};

/**
 * Calculate exponential backoff with jitter
 */
export const calculateBackoff = (
  attempt: number,
  baseDelayMs: number,
  customDelayMs?: number
): number => {
  if (customDelayMs) return customDelayMs;

  // Exponential backoff with jitter
  const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), 30000);
  const jitter = Math.random() * 0.1 * exponentialDelay;
  return exponentialDelay + jitter;
};

/**
 * Enhance error with context information
 */
export const enhanceError = (
  error: unknown,
  operationId: string,
  attempts: number
): Error => {
  const originalMessage =
    error instanceof Error ? error.message : String(error);
  const enhanced = new Error(
    `[${operationId}] Failed after ${attempts} attempts: ${originalMessage}`
  );
  enhanced.stack = error instanceof Error ? error.stack : undefined;
  return enhanced;
};

/**
 * Sleep utility function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get circuit breaker status for monitoring
 */
export const getCircuitStatus = (operationId: string): CircuitState | null => {
  return circuitState.get(operationId) || null;
};

/**
 * Clear all circuit breaker state (useful for testing)
 */
export const clearAllCircuitState = (): void => {
  circuitState.clear();
  retryAttempts.clear();
};

// Graceful degradation functions
/**
 * Provide fallback response when AI is unavailable
 */
export const fallbackToSimpleResponse = async (
  userMessage: string
): Promise<string> => {
  // Simple keyword-based responses when AI is unavailable
  const message = userMessage.toLowerCase();

  if (message.includes("hello") || message.includes("hi")) {
    return "Hello! I'm currently experiencing some technical difficulties, but I'm here to help. Please try again in a moment.";
  }

  if (message.includes("help")) {
    return "I'd love to help! I'm currently running in limited mode. Please try your request again, or contact support if the issue persists.";
  }

  return "I apologize, but I'm currently experiencing technical difficulties. Please try again in a few moments, or contact support if the issue continues.";
};

/**
 * Get cached response (placeholder for cache integration)
 */
export const getCachedResponse = async (
  messageHash: string
): Promise<string | null> => {
  // Implementation would check Redis/memory cache for similar responses
  // This is a placeholder for cache integration
  return null;
};

/**
 * Create a hash of user message for caching
 */
export const createMessageHash = (message: string): string => {
  // Simple hash function for demo - in production use crypto.createHash
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};
