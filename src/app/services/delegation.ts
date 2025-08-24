import type {
  CreateDelegationRequest,
  CreateDelegationResponse,
  DelegationChatRequest,
  DelegationDetails,
  DelegationListResponse,
  MeetingConstraints,
} from "@/types/delegation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Create a new delegation session
 */
export const createDelegationService = async (
  request: CreateDelegationRequest
): Promise<CreateDelegationResponse> => {
  const response = await fetch(`${API_BASE}/api/delegation/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create delegation");
  }

  return response.json();
};

/**
 * Get delegation details
 */
export const getDelegationDetailsService = async (
  delegationId: string
): Promise<DelegationDetails> => {
  const response = await fetch(`${API_BASE}/api/delegation/${delegationId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get delegation details");
  }

  return response.json();
};

/**
 * Revoke delegation session
 */
export const revokeDelegationService = async (
  delegationId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(
    `${API_BASE}/api/delegation/${delegationId}/revoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to revoke delegation");
  }

  return response.json();
};

/**
 * Send chat message to delegation (legacy non-streaming)
 */
export const sendDelegationChatService = async (
  request: DelegationChatRequest
): Promise<{
  response: string;
  delegationId: string;
  externalUserName?: string;
}> => {
  const response = await fetch(`${API_BASE}/api/delegation/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send chat message");
  }

  return response.json();
};

/**
 * Send chat message to delegation with streaming support
 */
export const sendDelegationChatStreamingService = async (
  request: DelegationChatRequest
): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch(`${API_BASE}/api/delegation/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to send chat message");
  }

  if (!response.body) {
    throw new Error("No response body received");
  }

  return response.body;
};

/**
 * List user's delegations
 */
export const listUserDelegationsService = async (
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<DelegationListResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append("status", status);
  }

  const response = await fetch(`${API_BASE}/api/user/delegations?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list delegations");
  }

  return response.json();
};

/**
 * Generate shareable URL for delegation
 */
export const generateShareableUrl = (
  delegationId: string,
  baseUrl: string = window.location.origin
): string => {
  return `${baseUrl}/talk-to-perin/${delegationId}`;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

/**
 * Share delegation link
 */
export const shareDelegationLink = async (
  shareableUrl: string,
  title: string = "Talk to My Perin"
): Promise<boolean> => {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        url: shareableUrl,
      });
      return true;
    } else {
      // Fallback to clipboard
      return await copyToClipboard(shareableUrl);
    }
  } catch (error) {
    console.error("Failed to share:", error);
    return false;
  }
};

/**
 * Validate meeting constraints
 */
export const validateConstraints = (
  constraints: Partial<MeetingConstraints>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (constraints.durationMinutes) {
    if (constraints.durationMinutes < 15 || constraints.durationMinutes > 480) {
      errors.push("Meeting duration must be between 15 minutes and 8 hours");
    }
  }

  if (constraints.maxNoticeHours && constraints.minNoticeHours) {
    if (constraints.maxNoticeHours < constraints.minNoticeHours) {
      errors.push("Maximum notice must be greater than minimum notice");
    }
  }

  if (constraints.maxNoticeHours && constraints.maxNoticeHours > 720) {
    errors.push("Maximum notice cannot exceed 30 days");
  }

  if (constraints.minNoticeHours && constraints.minNoticeHours < 0) {
    errors.push("Minimum notice cannot be negative");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
