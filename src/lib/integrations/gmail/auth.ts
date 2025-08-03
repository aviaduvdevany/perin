import { google } from 'googleapis';

// Gmail OAuth scopes - using full access for future features
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify', // Read, send, delete emails
  'https://www.googleapis.com/auth/gmail.settings.basic', // Basic settings
];

// Create OAuth2 client
export const createGmailOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// Generate OAuth URL
export const getGmailAuthUrl = (): string => {
  const oauth2Client = createGmailOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // Force refresh token
  });
};

// Exchange code for tokens
export const exchangeCodeForTokens = async (code: string) => {
  const oauth2Client = createGmailOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Refresh access token
export const refreshGmailToken = async (refreshToken: string) => {
  const oauth2Client = createGmailOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
};