import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { createDelegationSession } from "@/lib/queries/delegation";
import {
  calculateTTLExpiration,
  generateShareableUrl,
  generateQRCodeData,
  validateMeetingConstraints,
  mergeConstraintsWithDefaults,
} from "@/lib/delegation/session-manager";
import { withErrorHandler } from "@/lib/utils/error-handlers";

// Validation schema for delegation creation
const createDelegationSchema = z.object({
  ttlHours: z.number().min(0.1).max(720), // 6 minutes to 30 days
  constraints: z
    .object({
      durationMinutes: z.number().min(15).max(480).optional(),
      timezone: z.string().optional(),
      location: z.string().max(500).optional(),
      meetingType: z.enum(["video", "phone", "in_person"]).optional(),
      preferredTimes: z.array(z.string()).max(10).optional(),
      maxNoticeHours: z.number().min(0).max(720).optional(),
      minNoticeHours: z.number().min(0).max(720).optional(),
    })
    .optional(),
  externalUserName: z.string().max(100).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = createDelegationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: validation.error.errors },
      { status: 400 }
    );
  }

  const { ttlHours, constraints, externalUserName } = validation.data;

  // Validate constraints if provided
  if (constraints) {
    const mergedConstraints = mergeConstraintsWithDefaults(constraints);
    const validation = validateMeetingConstraints(mergedConstraints);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid meeting constraints", details: validation.errors },
        { status: 400 }
      );
    }
  }

  // Calculate expiration
  const ttlExpiresAt = calculateTTLExpiration(ttlHours);

  // Create delegation session
  const delegation = await createDelegationSession(
    session.user.id,
    ttlExpiresAt,
    constraints ? mergeConstraintsWithDefaults(constraints) : undefined,
    externalUserName
  );

  // Generate shareable URL and QR code
  const shareableUrl = generateShareableUrl(delegation.id);
  const qrCodeData = generateQRCodeData(shareableUrl);

  return NextResponse.json({
    delegationId: delegation.id,
    shareableUrl,
    qrCodeData,
    expiresAt: delegation.ttlExpiresAt,
    constraints: delegation.constraints,
  });
});
