import { randomUUID } from "crypto";
import { createHmac } from "crypto";
import type { DelegationSession, MeetingConstraints } from "@/types/delegation";
import {
  getDelegationSession,
  updateDelegationAccess,
} from "@/lib/queries/delegation";

const DELEGATION_SECRET =
  process.env.DELEGATION_SECRET || "default-secret-change-in-production";

/**
 * Generate a secure delegation ID
 */
export const generateDelegationId = (): string => {
  return randomUUID();
};

/**
 * Generate HMAC signature for delegation link integrity
 */
export const generateDelegationSignature = (delegationId: string): string => {
  const hmac = createHmac("sha256", DELEGATION_SECRET);
  hmac.update(delegationId);
  return hmac.digest("hex");
};

/**
 * Validate delegation link signature
 */
export const validateDelegationSignature = (
  delegationId: string,
  signature: string
): boolean => {
  const expectedSignature = generateDelegationSignature(delegationId);
  return signature === expectedSignature;
};

/**
 * Generate shareable URL for delegation
 */
export const generateShareableUrl = (
  delegationId: string,
  baseUrl: string = process.env.NEXTAUTH_URL || "http://localhost:3000"
): string => {
  const signature = generateDelegationSignature(delegationId);
  return `${baseUrl}/talk-to-perin/${delegationId}?sig=${signature}`;
};

/**
 * Generate QR code data for delegation
 */
export const generateQRCodeData = (shareableUrl: string): string => {
  return shareableUrl;
};

/**
 * Validate delegation session and update access
 */
export const validateAndAccessDelegation = async (
  delegationId: string,
  signature?: string
): Promise<{ session: DelegationSession | null; error?: string }> => {
  try {
    // Get delegation session
    const session = await getDelegationSession(delegationId);

    if (!session) {
      return { session: null, error: "Delegation not found" };
    }

    // Check if session is active
    if (session.status !== "active") {
      return {
        session: null,
        error:
          session.status === "expired"
            ? "This delegation link has expired"
            : "This delegation link has been revoked",
      };
    }

    // Check if session has expired
    if (session.ttlExpiresAt < new Date()) {
      return { session: null, error: "This delegation link has expired" };
    }

    // Validate signature if provided
    if (signature && !validateDelegationSignature(delegationId, signature)) {
      return { session: null, error: "Invalid delegation link" };
    }

    // Update access count and timestamp
    await updateDelegationAccess(delegationId);

    return { session };
  } catch (error) {
    console.error("Error validating delegation:", error);
    return { session: null, error: "Failed to validate delegation" };
  }
};

/**
 * Calculate TTL expiration date
 */
export const calculateTTLExpiration = (ttlHours: number): Date => {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + ttlHours);
  return expiration;
};

/**
 * Format TTL for display
 */
export const formatTTL = (ttlHours: number): string => {
  if (ttlHours < 1) {
    return `${Math.round(ttlHours * 60)} minutes`;
  } else if (ttlHours < 24) {
    return `${ttlHours} hour${ttlHours === 1 ? "" : "s"}`;
  } else if (ttlHours < 168) {
    // 7 days
    const days = Math.round(ttlHours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
  } else {
    const weeks = Math.round(ttlHours / 168);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
};

/**
 * Validate meeting constraints
 */
export const validateMeetingConstraints = (
  constraints: MeetingConstraints
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
    // 30 days
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

/**
 * Get default meeting constraints
 */
export const getDefaultMeetingConstraints = (): MeetingConstraints => {
  return {
    durationMinutes: 30,
    meetingType: "video",
    maxNoticeHours: 168, // 1 week
    minNoticeHours: 1, // 1 hour
  };
};

/**
 * Merge constraints with defaults
 */
export const mergeConstraintsWithDefaults = (
  userConstraints: Partial<MeetingConstraints>
): MeetingConstraints => {
  const defaults = getDefaultMeetingConstraints();
  return {
    ...defaults,
    ...userConstraints,
  };
};
