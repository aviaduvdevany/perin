import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

// Initialize Google OAuth2 client
let oauth2Client: OAuth2Client | null = null;

export const initializeGoogleCalendarAuth = (): OAuth2Client => {
  if (!oauth2Client) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Google Calendar OAuth2 configuration is missing");
    }

    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }
  return oauth2Client;
};

/**
 * Generate OAuth2 authorization URL for Google Calendar
 */
export const generateCalendarAuthUrl = (): string => {
  const oauth2Client = initializeGoogleCalendarAuth();

  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
};

/**
 * Exchange authorization code for access and refresh tokens
 */
export const exchangeCodeForCalendarTokens = async (code: string) => {
  const oauth2Client = initializeGoogleCalendarAuth();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
    };
  } catch (error) {
    console.error("Error exchanging code for calendar tokens:", error);
    throw new Error("Failed to exchange authorization code for tokens");
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshCalendarToken = async (refreshToken: string) => {
  const oauth2Client = initializeGoogleCalendarAuth();

  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      expiry_date: credentials.expiry_date,
      scope: credentials.scope,
      token_type: credentials.token_type,
    };
  } catch (error) {
    console.error("Error refreshing calendar token:", error);
    throw new Error("Failed to refresh access token");
  }
};

/**
 * Create authenticated Google Calendar client
 */
export const createCalendarClient = (accessToken: string) => {
  const oauth2Client = initializeGoogleCalendarAuth();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
};
