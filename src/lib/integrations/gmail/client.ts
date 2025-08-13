import { google } from "googleapis";
import { createGmailOAuth2Client, refreshGmailToken } from "./auth";
import * as integrationQueries from "@/lib/queries/integrations";

// Create authenticated Gmail client
export const createGmailClient = async (userId: string) => {
  // Get user's Gmail integration
  const integration = await integrationQueries.getUserIntegration(
    userId,
    "gmail"
  );

  if (!integration || !integration.is_active) {
    throw new Error("Gmail not connected");
  }

  const oauth2Client = createGmailOAuth2Client();

  // Check if token needs refresh
  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);

  if (now >= expiresAt && integration.refresh_token) {
    try {
      // Refresh token
      const newTokens = await refreshGmailToken(integration.refresh_token);

      // Update stored tokens
      await integrationQueries.updateIntegrationTokens(
        integration.id,
        newTokens.access_token!,
        newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
      );

      oauth2Client.setCredentials(newTokens);
    } catch (error: unknown) {
      // If refresh token is invalid, surface a deterministic error for UI/LLM handling
      const code = (error as { code?: string })?.code;
      if (code === "INVALID_GRANT") {
        const e = new Error("GMAIL_REAUTH_REQUIRED");
        // @ts-expect-error attach code for upstream distinction
        e.code = "GMAIL_REAUTH_REQUIRED";
        throw e;
      }
      throw error;
    }
  } else {
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
    });
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
};

// Fetch recent emails
export const fetchRecentEmails = async (
  userId: string,
  maxResults: number = 10,
  query?: string // Gmail search query
) => {
  const gmail = await createGmailClient(userId);

  // Try progressively broader queries to ensure we return something useful
  const queries: (string | undefined)[] = [
    // Most restrictive: primary inbox only
    query || "in:inbox -category:promotions -category:social",
    // Broader: any inbox mail
    "in:inbox",
    // Broadest: any mail, prefer newer
    "newer_than:30d",
    // Final fallback: no query filter
    undefined,
  ];

  for (const q of queries) {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: q,
    });

    const messages = listResponse.data.messages;
    if (!messages || messages.length === 0) {
      continue;
    }

    const emails = await Promise.all(
      messages.map(async (msg) => {
        const fullMessage = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });
        return parseGmailMessage(fullMessage.data);
      })
    );

    if (emails.length > 0) {
      return emails;
    }
  }

  return [];
};

// Parse Gmail message to standardized format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseGmailMessage = (message: any) => {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
      ?.value;

  // Extract body content
  let body = "";
  if (message.payload?.parts) {
    const textPart = message.payload.parts.find(
      (part: { mimeType: string }) => part.mimeType === "text/plain"
    );
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString();
    }
  } else if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString();
  }

  return {
    id: message.id,
    threadId: message.threadId,
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    body: body.slice(0, 1000), // Limit body length for context
    snippet: message.snippet,
    unread: message.labelIds?.includes("UNREAD") || false,
  };
};
