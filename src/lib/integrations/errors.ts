/**
 * Centralized integration error handling system
 * This eliminates the need to check for specific integration error types throughout the codebase
 */

export enum IntegrationErrorType {
  REAUTH_REQUIRED = "REAUTH_REQUIRED",
  NOT_CONNECTED = "NOT_CONNECTED",
  RATE_LIMITED = "RATE_LIMITED",
  INVALID_SCOPES = "INVALID_SCOPES",
  API_ERROR = "API_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export enum IntegrationType {
  CALENDAR = "calendar",
  GMAIL = "gmail",
  SLACK = "slack",
  NOTION = "notion",
  ZOOM = "zoom",
  TEAMS = "teams",
}

export class IntegrationError extends Error {
  public readonly integrationType: IntegrationType;
  public readonly errorType: IntegrationErrorType;
  public readonly originalError?: Error;
  public readonly requiresUserAction: boolean;

  constructor(
    integrationType: IntegrationType,
    errorType: IntegrationErrorType,
    message?: string,
    originalError?: Error
  ) {
    super(
      message ||
        `${integrationType} ${errorType.toLowerCase().replace("_", " ")}`
    );
    this.name = "IntegrationError";
    this.integrationType = integrationType;
    this.errorType = errorType;
    this.originalError = originalError;
    this.requiresUserAction = this.isUserActionRequired();

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IntegrationError);
    }
  }

  private isUserActionRequired(): boolean {
    return (
      this.errorType === IntegrationErrorType.REAUTH_REQUIRED ||
      this.errorType === IntegrationErrorType.NOT_CONNECTED ||
      this.errorType === IntegrationErrorType.INVALID_SCOPES
    );
  }

  /**
   * Check if this error should trigger a reauth flow for the user
   */
  public shouldTriggerReauth(): boolean {
    return (
      this.errorType === IntegrationErrorType.REAUTH_REQUIRED ||
      this.errorType === IntegrationErrorType.NOT_CONNECTED
    );
  }

  /**
   * Generate the action token for the frontend
   */
  public getActionToken(): string {
    if (this.shouldTriggerReauth()) {
      return `[[PERIN_ACTION:${this.integrationType}_reauth_required]]`;
    }
    return `[[PERIN_ACTION:${this.integrationType}_error]]`;
  }

  /**
   * Convert legacy error messages to IntegrationError
   */
  static fromLegacyError(error: Error): IntegrationError | null {
    const message = error.message;

    // Calendar errors
    if (message.includes("CALENDAR_REAUTH_REQUIRED")) {
      return new IntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.REAUTH_REQUIRED,
        message,
        error
      );
    }
    if (message.includes("CALENDAR_NOT_CONNECTED")) {
      return new IntegrationError(
        IntegrationType.CALENDAR,
        IntegrationErrorType.NOT_CONNECTED,
        message,
        error
      );
    }

    // Gmail errors
    if (message.includes("GMAIL_REAUTH_REQUIRED")) {
      return new IntegrationError(
        IntegrationType.GMAIL,
        IntegrationErrorType.REAUTH_REQUIRED,
        message,
        error
      );
    }
    if (message.includes("GMAIL_NOT_CONNECTED")) {
      return new IntegrationError(
        IntegrationType.GMAIL,
        IntegrationErrorType.NOT_CONNECTED,
        message,
        error
      );
    }

    return null; // Not an integration error
  }
}

/**
 * Helper function to check if an error requires user reauth action
 */
export function isReauthError(error: unknown): boolean {
  if (error instanceof IntegrationError) {
    return error.shouldTriggerReauth();
  }

  // Fallback for legacy error checking
  if (error instanceof Error) {
    const message = error.message;
    return (
      message.includes("REAUTH_REQUIRED") || message.includes("NOT_CONNECTED")
    );
  }

  return false;
}

/**
 * Helper function to extract integration type from error
 */
export function getIntegrationType(error: unknown): IntegrationType | null {
  if (error instanceof IntegrationError) {
    return error.integrationType;
  }

  // Fallback for legacy error checking
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("CALENDAR")) return IntegrationType.CALENDAR;
    if (message.includes("GMAIL")) return IntegrationType.GMAIL;
    if (message.includes("SLACK")) return IntegrationType.SLACK;
    if (message.includes("NOTION")) return IntegrationType.NOTION;
  }

  return null;
}

/**
 * Helper function to create integration errors consistently
 */
export function createIntegrationError(
  integrationType: IntegrationType,
  errorType: IntegrationErrorType,
  message?: string,
  originalError?: Error
): IntegrationError {
  return new IntegrationError(
    integrationType,
    errorType,
    message,
    originalError
  );
}
