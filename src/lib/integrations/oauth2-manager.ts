import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { OAuth2Tokens, OAuth2Config } from "@/types/integrations";

/**
 * Unified OAuth2 Manager for Google integrations
 * Handles authentication for Gmail, Calendar, and future Google services
 */
export class GoogleOAuth2Manager {
  private client: OAuth2Client;
  private config: OAuth2Config;

  constructor(config: OAuth2Config) {
    this.config = config;
    this.client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthUrl(state?: string): string {
    return this.client.generateAuthUrl({
      access_type: "offline",
      scope: this.config.scopes,
      prompt: "consent", // Force refresh token
      state: state || undefined,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuth2Tokens> {
    try {
      const { tokens } = await this.client.getToken(code);

      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
        scope: tokens.scope || undefined,
        token_type: tokens.token_type || undefined,
      };
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw new Error("Failed to exchange authorization code for tokens");
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<OAuth2Tokens> {
    try {
      this.client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.client.refreshAccessToken();

      return {
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date || undefined,
        scope: credentials.scope || undefined,
        token_type: credentials.token_type || undefined,
      };
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiryDate?: number): boolean {
    if (!expiryDate) return true;
    return Date.now() >= expiryDate;
  }

  /**
   * Get OAuth2 client with credentials
   */
  getAuthenticatedClient(accessToken: string): OAuth2Client {
    this.client.setCredentials({
      access_token: accessToken,
    });
    return this.client;
  }

  /**
   * Validate OAuth2 configuration
   */
  validateConfig(): boolean {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.redirectUri
    );
  }
}

/**
 * Factory function to create OAuth2 managers for different integrations
 */
export const createOAuth2Manager = (
  integrationType: string,
  redirectUri?: string,
  scopes?: string[]
): GoogleOAuth2Manager => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      `Google OAuth2 configuration is missing for ${integrationType}`
    );
  }

  // Use integration-specific redirect URI or fallback to default
  const finalRedirectUri =
    redirectUri ||
    process.env[`GOOGLE_${integrationType.toUpperCase()}_REDIRECT_URI`] ||
    process.env.GOOGLE_REDIRECT_URI ||
    `http://localhost:3000/api/integrations/${integrationType}/callback`;

  const config: OAuth2Config = {
    clientId,
    clientSecret,
    redirectUri: finalRedirectUri,
    scopes: scopes || [],
  };

  return new GoogleOAuth2Manager(config);
};

/**
 * Gmail-specific OAuth2 manager
 */
export const createGmailOAuth2Manager = (): GoogleOAuth2Manager => {
  return createOAuth2Manager("gmail", undefined, [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic",
  ]);
};

/**
 * Calendar-specific OAuth2 manager
 */
export const createCalendarOAuth2Manager = (): GoogleOAuth2Manager => {
  return createOAuth2Manager("calendar", undefined, [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ]);
};

/**
 * Unified OAuth2 manager factory that uses the unified callback endpoint
 */
export const createUnifiedOAuth2Manager = (
  integrationType: string,
  scopes?: string[]
): GoogleOAuth2Manager => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      `Google OAuth2 configuration is missing for ${integrationType}`
    );
  }

  // Use unified callback endpoint
  const unifiedRedirectUri = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/integrations/callback?type=${integrationType}`
    : `http://localhost:3000/api/integrations/callback?type=${integrationType}`;

  const config: OAuth2Config = {
    clientId,
    clientSecret,
    redirectUri: unifiedRedirectUri,
    scopes: scopes || [],
  };

  return new GoogleOAuth2Manager(config);
};
