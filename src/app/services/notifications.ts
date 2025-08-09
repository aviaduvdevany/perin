import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";

export const listNotificationsService = async (unreadOnly = false) =>
  internalApiRequest(
    `notifications?unread=${unreadOnly ? "true" : "false"}`,
    HTTPMethod.GET
  );

export const markNotificationReadService = async (id: string) =>
  internalApiRequest(`notifications/${id}/read`, HTTPMethod.POST);

export const registerNotificationDeviceService = async (
  platform: "web" | "ios" | "android",
  playerId: string,
  deviceInfo?: Record<string, unknown>
) =>
  internalApiRequest(`notifications/devices/register`, HTTPMethod.POST, {
    platform,
    playerId,
    deviceInfo,
  });

export const getNotificationPreferencesService = async () =>
  internalApiRequest(`notifications/preferences`, HTTPMethod.GET);

export const updateNotificationPreferencesService = async (
  prefs: Record<string, unknown>
) => internalApiRequest(`notifications/preferences`, HTTPMethod.PUT, prefs);

export const dispatchNotificationService = async (payload: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  channels?: Array<"mobile_push" | "web_push" | "email" | "sms" | "in_app">;
}) => internalApiRequest(`notifications/dispatch`, HTTPMethod.POST, payload);

export const resolveNotificationService = async (id: string) =>
  internalApiRequest(`notifications/${id}/resolve`, HTTPMethod.POST);

export const listUnresolvedNotificationsService = async (
  requiresActionOnly: boolean = true
) =>
  internalApiRequest(
    `notifications?unresolved=true&requiresAction=${
      requiresActionOnly ? "true" : "false"
    }`,
    HTTPMethod.GET
  );
