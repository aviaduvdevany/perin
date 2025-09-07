import { google } from "googleapis";

// Gmail OAuth scopes - read only access
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly", // Read emails only
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
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent", // Force refresh token
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
  try {
    const oauth2Client = createGmailOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    // Normalize Google invalid_grant into a typed error we can handle upstream
    const err = new Error("INVALID_GRANT");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "INVALID_GRANT";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).cause = error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "INVALID_GRANT";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).cause = error;
    throw err;
  }
};
