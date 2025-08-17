import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";

export const listNotificationsService = async (unreadOnly = false) =>
  internalApiRequest(
    `notifications?unread=${unreadOnly ? "true" : "false"}`,
    HTTPMethod.GET
  );

export const markNotificationReadService = async (id: string) =>
  internalApiRequest(`notifications/${id}/read`, HTTPMethod.POST);

export const resolveNotificationService = async (id: string) =>
  internalApiRequest(`notifications/${id}/resolve`, HTTPMethod.POST, { id });

export const listUnresolvedNotificationsService = async (
  requiresActionOnly = true
) =>
  internalApiRequest(
    `notifications?unresolved=true${
      requiresActionOnly ? "&requiresAction=true" : ""
    }`,
    HTTPMethod.GET
  );

export const registerNotificationDeviceService = async (
  platform: "web" | "ios" | "android",
  playerId: string,
  deviceInfo?: Record<string, unknown> | null
) =>
  internalApiRequest(`notifications/devices/register`, HTTPMethod.POST, {
    platform,
    playerId,
    deviceInfo: deviceInfo ?? null,
  });

export const getNotificationPreferencesService = async () =>
  internalApiRequest(`notifications/preferences`, HTTPMethod.GET);

export const updateNotificationPreferencesService = async (prefs: {
  timezone?: string | null;
  dnd?: Record<string, unknown> | null;
  channels?: Record<string, unknown> | null;
  digest?: Record<string, unknown> | null;
}) => internalApiRequest(`notifications/preferences`, HTTPMethod.PUT, prefs);

// New function to dispatch notifications with push support
export const dispatchNotificationService = async (params: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  requiresAction?: boolean;
  actionDeadlineAt?: string | null;
  actionRef?: Record<string, unknown> | null;
}) => {
  const internalKey = process.env.NOTIFICATIONS_INTERNAL_KEY;
  if (!internalKey) {
    console.warn(
      "NOTIFICATIONS_INTERNAL_KEY not set, falling back to direct creation"
    );
    // Fallback to direct creation if dispatch is not configured
    return internalApiRequest(`notifications`, HTTPMethod.POST, params);
  }

  // Use direct fetch for dispatch with custom headers
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL || "";
  const url = `${baseUrl}/api/notifications/dispatch`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": internalKey,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `Dispatch failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

// Time proposal action services
export const confirmTimeProposalService = async (params: {
  sessionId: string;
  start: string;
  end: string;
  tz?: string;
  title?: string;
  description?: string;
  location?: string;
  notificationId?: string;
}) => {
  const idempotencyKey = `confirm:${params.sessionId}:${params.start}:${params.end}`;

  const response = await fetch(
    `/api/network/sessions/${params.sessionId}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        start: params.start,
        end: params.end,
        tz: params.tz || "UTC",
        title: params.title,
        description: params.description,
        location: params.location,
      }),
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(
      error.message || `Failed to confirm proposal: ${response.status}`
    );
  }

  // Mark notification as resolved if provided
  if (params.notificationId) {
    try {
      await resolveNotificationService(params.notificationId);
    } catch (error) {
      console.warn("Failed to resolve notification:", error);
    }
  }

  return response.json();
};

export const declineTimeProposalService = async (params: {
  sessionId: string;
  notificationId?: string;
}) => {
  // For now, we'll just mark the notification as resolved
  // In the future, this could send a decline message to the initiator
  if (params.notificationId) {
    try {
      await resolveNotificationService(params.notificationId);
    } catch (error) {
      console.warn("Failed to resolve notification:", error);
    }
  }

  return { success: true };
};

export const getSessionProposalsService = async (sessionId: string) => {
  const response = await fetch(`/api/network/sessions/${sessionId}/messages`);

  if (!response.ok) {
    throw new Error(`Failed to fetch session messages: ${response.status}`);
  }

  const data = await response.json();
  const messages = data.messages || [];

  // Find the proposal message
  const proposalMessage = messages.find(
    (m: {
      type: string;
      id: string;
      payload?: { proposals?: unknown[]; durationMins?: number };
    }) => m.type === "proposal"
  );

  if (!proposalMessage) {
    throw new Error("No proposal message found in session");
  }

  return {
    messageId: proposalMessage.id,
    proposals: proposalMessage.payload?.proposals || [],
    durationMins: proposalMessage.payload?.durationMins || 30,
  };
};
