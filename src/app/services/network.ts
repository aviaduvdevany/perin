import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";
import type {
  CreateConnectionRequest,
  AcceptConnectionRequest,
  UpdateConnectionPermissionsRequest,
  StartNetworkSessionRequest,
  PostNetworkMessageRequest,
} from "@/types/network";

// Connections
export const createConnectionService = async (
  payload: CreateConnectionRequest
) => internalApiRequest("network/connections", HTTPMethod.POST, payload);

export const acceptConnectionService = async (
  connectionId: string,
  payload: AcceptConnectionRequest
) =>
  internalApiRequest(
    `network/connections/${connectionId}/accept`,
    HTTPMethod.POST,
    payload
  );

export const listConnectionsService = async () =>
  internalApiRequest("network/connections", HTTPMethod.GET);

export const updateConnectionPermissionsService = async (
  connectionId: string,
  payload: UpdateConnectionPermissionsRequest
) =>
  internalApiRequest(
    `network/connections/${connectionId}/permissions`,
    HTTPMethod.PUT,
    payload
  );

export const revokeConnectionService = async (connectionId: string) =>
  internalApiRequest(`network/connections/${connectionId}`, HTTPMethod.DELETE);

// Sessions
export const startNetworkSessionService = async (
  payload: StartNetworkSessionRequest
) => internalApiRequest("network/sessions", HTTPMethod.POST, payload);

export const getNetworkSessionService = async (sessionId: string) =>
  internalApiRequest(`network/sessions/${sessionId}`, HTTPMethod.GET);

export const sendProposalsService = async (
  sessionId: string,
  payload: {
    durationMins: number;
    earliest?: string;
    latest?: string;
    tz?: string;
    limit?: number;
  }
) =>
  internalApiRequest(
    `network/sessions/${sessionId}/proposals`,
    HTTPMethod.POST,
    payload
  );

export const confirmMeetingService = async (
  sessionId: string,
  payload: {
    start: string;
    end: string;
    tz?: string;
    title?: string;
    description?: string;
    location?: string;
  }
) =>
  internalApiRequest(
    `network/sessions/${sessionId}/confirm`,
    HTTPMethod.POST,
    payload
  );

// Messages
export const postNetworkMessageService = async (
  sessionId: string,
  payload: PostNetworkMessageRequest
) =>
  internalApiRequest(
    `network/sessions/${sessionId}/messages`,
    HTTPMethod.POST,
    payload
  );

export const getNetworkTranscriptService = async (sessionId: string) =>
  internalApiRequest(`network/sessions/${sessionId}/messages`, HTTPMethod.GET);
