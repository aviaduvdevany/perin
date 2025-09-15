import type {
  IntegrationType,
  IntegrationRegistryEntry,
  ContextDetectionResult,
  GmailData,
  CalendarData,
} from "@/types/integrations";
import { fetchRecentEmailsFromAll } from "@/lib/integrations/gmail/client";
import { fetchRecentEventsFromAll } from "@/lib/integrations/calendar/client";
import { getUserById } from "../queries/users";

// Context loaders for each integration
const gmailContextLoader = async (userId: string): Promise<GmailData[]> => {
  try {
    // Fetch recent emails across all connected Gmail accounts
    const emails = await fetchRecentEmailsFromAll(userId, 5);

    return emails.map(
      (email) =>
        ({
          id: email.id,
          from: email.from,
          to: email.to,
          subject: email.subject,
          snippet: email.snippet,
          date: email.date,
          unread: email.unread,
          // carry through per-account tagging in a widened shape
          ...(email.__accountId ? { __accountId: email.__accountId } : {}),
          ...(email.__accountEmail
            ? { __accountEmail: email.__accountEmail }
            : {}),
        } as unknown as GmailData)
    );
  } catch (error) {
    console.error("Error in Gmail context loader:", error);
    // Propagate so upstream can signal reauth and stop LLM streaming
    throw error;
  }
};

const calendarContextLoader = async (
  userId: string
): Promise<CalendarData[]> => {
  try {
    console.log("Calendar context loader called for user:", userId);

    // Get user's timezone
    const user = await getUserById(userId)
    
    const userTimezone = user?.timezone || "UTC";
    console.log("User timezone:", userTimezone);

    // Fetch recent events across all connected calendar accounts
    console.log("Fetching recent events from all calendar accounts...");
    const events = await fetchRecentEventsFromAll(userId, 7, 5);
    console.log("Fetched events count:", events.length);

    const mappedEvents = events.map((event) => {
      // Convert times to user's timezone
      const convertToUserTimezone = (isoString: string) => {
        if (!isoString) return isoString;
        try {
          const date = new Date(isoString);
          return date.toLocaleString("en-US", {
            timeZone: userTimezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        } catch {
          return isoString;
        }
      };

      return {
        id: event.id,
        summary: event.summary,
        description: event.description || "",
        start: convertToUserTimezone(event.start),
        end: convertToUserTimezone(event.end),
        location: event.location || "",
        isAllDay: event.isAllDay,
        attendees: event.attendees?.length || 0,
        ...(event.__accountId ? { __accountId: event.__accountId } : {}),
        ...(event.__accountEmail
          ? { __accountEmail: event.__accountEmail }
          : {}),
      } as unknown as CalendarData;
    });

    return mappedEvents;
  } catch (error) {
    console.error("Error in Calendar context loader:", error);
    // Propagate so upstream can signal reauth and stop LLM streaming
    throw error;
  }
};

/**
 * Integration Registry
 * Centralized configuration for all integrations
 */
export const INTEGRATION_REGISTRY: Record<
  IntegrationType,
  IntegrationRegistryEntry
> = {
  gmail: {
    type: "gmail",
    name: "Gmail",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    keywords: [
      // English keywords
      "email",
      "message",
      "inbox",
      "sent",
      "reply",
      "mail",
      "gmail",
      "correspondence",
      "inbox",
      "outbox",
      "draft",
      "attachment",
      // Hebrew keywords
      "אימייל",
      "הודעה",
      "הודעות",
      "תיבת דואר",
      "דואר נכנס",
      "נשלח",
      "תשובה",
      "תגובה",
      "דואר",
      "ג'ימייל",
      "התכתבות",
      "טיוטה",
      "קובץ מצורף",
      "צירוף",
    ],
    contextLoader: gmailContextLoader,
    authUrl: "/api/integrations/gmail/connect",
    callbackUrl: "/api/integrations/gmail/callback",
    icon: "📧",
    description: "Access and manage your Gmail messages",
    oauth2Config: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/gmail/callback",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    },
    contextTransformer: (data: unknown[]) => {
      const emails = data as Array<
        GmailData & { __accountId?: string; __accountEmail?: string }
      >;
      return {
        recentEmails: emails.map((email) => ({
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          date: email.date,
          unread: email.unread,
          accountEmail: email.__accountEmail,
          accountId: email.__accountId,
        })),
        emailCount: emails.length,
        hasUnread: emails.some((email) => email.unread),
        accounts: Array.from(
          emails.reduce(
            (set, e) => set.add(`${e.__accountId}::${e.__accountEmail || ""}`),
            new Set<string>()
          )
        ).map((key) => {
          const [accountId, accountEmail] = key.split("::");
          return { accountId, accountEmail };
        }),
      };
    },
  },

  calendar: {
    type: "calendar",
    name: "Google Calendar",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    keywords: [
      // English keywords
      "calendar",
      "schedule",
      "meeting",
      "appointment",
      "event",
      "book",
      "reserve",
      "available",
      "busy",
      "free time",
      "tomorrow",
      "next week",
      "today",
      "when",
      "time",
      "agenda",
      "availability",
      // Hebrew keywords
      "לוח",
      "לוח זמנים",
      "תזמון",
      "פגישה",
      "הפגישות",
      "פגישות",
      "פגישה",
      "אירוע",
      "אירועים",
      "תור",
      "הזמנה",
      "זמין",
      "עסוק",
      "זמן פנוי",
      "מחר",
      "שבוע הבא",
      "היום",
      "מתי",
      "שעה",
      "זמן",
      "סדר יום",
      "זמינות",
      "בלו״ז",
      "לוז",
    ],
    contextLoader: calendarContextLoader,
    authUrl: "/api/integrations/calendar/connect",
    callbackUrl: "/api/integrations/calendar/callback",
    icon: "📅",
    description: "Manage your calendar events and schedule",
    oauth2Config: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri:
        process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/calendar/callback",
      scopes: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    },
    contextTransformer: (data: unknown[]) => {
      const events = data as Array<
        CalendarData & { __accountId?: string; __accountEmail?: string }
      >;

      const transformed = {
        recentEvents: events.map((event) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          isAllDay: event.isAllDay,
          attendees: event.attendees,
          accountEmail: event.__accountEmail,
          accountId: event.__accountId,
        })),
        eventCount: events.length,
        hasUpcomingEvents: events.length > 0,
        accounts: Array.from(
          events.reduce(
            (set, e) => set.add(`${e.__accountId}::${e.__accountEmail || ""}`),
            new Set<string>()
          )
        ).map((key) => {
          const [accountId, accountEmail] = key.split("::");
          return { accountId, accountEmail };
        }),
      };

      return transformed;
    },
  },

  // Future integrations - placeholder structure
  slack: {
    type: "slack",
    name: "Slack",
    scopes: ["chat:write", "channels:read", "users:read"],
    keywords: ["slack", "message", "channel", "team", "chat", "notification"],
    contextLoader: async () => [],
    authUrl: "/api/integrations/slack/connect",
    callbackUrl: "/api/integrations/slack/callback",
    icon: "💬",
    description: "Send messages and manage Slack channels",
    oauth2Config: {
      clientId: process.env.SLACK_CLIENT_ID || "",
      clientSecret: process.env.SLACK_CLIENT_SECRET || "",
      redirectUri:
        process.env.SLACK_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/slack/callback",
      scopes: ["chat:write", "channels:read", "users:read"],
    },
  },

  notion: {
    type: "notion",
    name: "Notion",
    scopes: ["read_content", "update_content"],
    keywords: ["notion", "page", "database", "workspace", "document", "note"],
    contextLoader: async () => [],
    authUrl: "/api/integrations/notion/connect",
    callbackUrl: "/api/integrations/notion/callback",
    icon: "📝",
    description: "Access and manage your Notion pages",
    oauth2Config: {
      clientId: process.env.NOTION_CLIENT_ID || "",
      clientSecret: process.env.NOTION_CLIENT_SECRET || "",
      redirectUri:
        process.env.NOTION_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/notion/callback",
      scopes: ["read_content", "update_content"],
    },
  },

  github: {
    type: "github",
    name: "GitHub",
    scopes: ["repo", "user"],
    keywords: [
      "github",
      "repository",
      "commit",
      "pull request",
      "issue",
      "code",
    ],
    contextLoader: async () => [],
    authUrl: "/api/integrations/github/connect",
    callbackUrl: "/api/integrations/github/callback",
    icon: "🐙",
    description: "Manage GitHub repositories and issues",
    oauth2Config: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      redirectUri:
        process.env.GITHUB_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/github/callback",
      scopes: ["repo", "user"],
    },
  },

  discord: {
    type: "discord",
    name: "Discord",
    scopes: ["identify", "guilds"],
    keywords: ["discord", "server", "channel", "message", "guild"],
    contextLoader: async () => [],
    authUrl: "/api/integrations/discord/connect",
    callbackUrl: "/api/integrations/discord/callback",
    icon: "🎮",
    description: "Manage Discord servers and channels",
    oauth2Config: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      redirectUri:
        process.env.DISCORD_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/discord/callback",
      scopes: ["identify", "guilds"],
    },
  },

  zoom: {
    type: "zoom",
    name: "Zoom",
    scopes: ["meeting:write", "meeting:read"],
    keywords: ["zoom", "meeting", "video call", "conference", "webinar"],
    contextLoader: async () => [],
    authUrl: "/api/integrations/zoom/connect",
    callbackUrl: "/api/integrations/zoom/callback",
    icon: "📹",
    description: "Schedule and manage Zoom meetings",
    oauth2Config: {
      clientId: process.env.ZOOM_CLIENT_ID || "",
      clientSecret: process.env.ZOOM_CLIENT_SECRET || "",
      redirectUri:
        process.env.ZOOM_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/zoom/callback",
      scopes: ["meeting:write", "meeting:read"],
    },
  },

  teams: {
    type: "teams",
    name: "Microsoft Teams",
    scopes: ["Chat.ReadWrite", "User.Read"],
    keywords: ["teams", "microsoft", "chat", "channel", "meeting"],
    contextLoader: async () => [],
    authUrl: "/api/integrations/teams/connect",
    callbackUrl: "/api/integrations/teams/callback",
    icon: "💼",
    description: "Manage Microsoft Teams chats and meetings",
    oauth2Config: {
      clientId: process.env.TEAMS_CLIENT_ID || "",
      clientSecret: process.env.TEAMS_CLIENT_SECRET || "",
      redirectUri:
        process.env.TEAMS_REDIRECT_URI ||
        "http://localhost:3000/api/integrations/teams/callback",
      scopes: ["Chat.ReadWrite", "User.Read"],
    },
  },
};

/**
 * Get integration configuration by type
 */
export const getIntegrationConfig = (
  type: IntegrationType
): IntegrationRegistryEntry => {
  const config = INTEGRATION_REGISTRY[type];
  if (!config) {
    throw new Error(`Integration type '${type}' not found in registry`);
  }
  return config;
};

/**
 * Get all available integration types
 */
export const getAvailableIntegrationTypes = (): IntegrationType[] => {
  return Object.keys(INTEGRATION_REGISTRY) as IntegrationType[];
};

/**
 * Check if integration type is supported
 */
export const isIntegrationSupported = (
  type: string
): type is IntegrationType => {
  return type in INTEGRATION_REGISTRY;
};

/**
 * Smart context detection for integrations
 */
export const detectIntegrationContext = (
  conversationText: string,
  integrationType: IntegrationType
): ContextDetectionResult => {
  const config = getIntegrationConfig(integrationType);
  const normalizedText = conversationText.toLowerCase();

  const matchedKeywords = config.keywords.filter((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  );

  const confidence =
    matchedKeywords.length > 0
      ? Math.min(matchedKeywords.length / 3, 1) // Normalize to 0-1
      : 0;

  const isRelevant = confidence > 0.3; // Threshold for relevance

  if (integrationType === "calendar") {
    console.log("Calendar detection:", {
      conversationText: normalizedText,
      matchedKeywords,
      confidence,
      isRelevant,
      threshold: 0.3,
      textLength: normalizedText.length,
    });
  }

  if (integrationType === "gmail") {
    console.log("Gmail detection:", {
      conversationText: normalizedText,
      matchedKeywords,
      confidence,
      isRelevant,
      threshold: 0.3,
      textLength: normalizedText.length,
    });
  }

  return {
    isRelevant,
    confidence,
    matchedKeywords,
    suggestedAction: isRelevant ? `Load ${config.name} context` : undefined,
  };
};

/**
 * Get relevant integrations for a conversation
 */
export const getRelevantIntegrations = (
  conversationText: string
): IntegrationType[] => {
  return getAvailableIntegrationTypes().filter((type) => {
    const detection = detectIntegrationContext(conversationText, type);
    return detection.isRelevant;
  });
};
