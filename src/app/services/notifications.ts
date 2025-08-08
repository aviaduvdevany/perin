import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";

export const listNotificationsService = async (unreadOnly = false) =>
  internalApiRequest(
    `notifications?unread=${unreadOnly ? "true" : "false"}`,
    HTTPMethod.GET
  );

export const markNotificationReadService = async (id: string) =>
  internalApiRequest(`notifications/${id}/read`, HTTPMethod.POST);
