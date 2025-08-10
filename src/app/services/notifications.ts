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
