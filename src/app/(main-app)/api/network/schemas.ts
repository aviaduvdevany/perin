import { z } from "zod";

export const CreateConnectionSchema = z.object({
  targetUserId: z.string().min(1),
  scopes: z.array(z.string()).nonempty(),
  constraints: z
    .object({
      workingHours: z
        .object({
          start: z.string().optional(),
          end: z.string().optional(),
          timezone: z.string().optional(),
          weekdays: z.array(z.number().int().min(0).max(6)).optional(),
        })
        .optional(),
      minNoticeHours: z
        .number()
        .int()
        .min(0)
        .max(24 * 14)
        .optional(),
      meetingLengthMins: z
        .object({
          min: z.number().int().min(5),
          max: z.number().int().min(5),
          default: z.number().int().optional(),
        })
        .partial()
        .optional(),
      locationPreference: z.enum(["video", "phone", "in_person"]).optional(),
      maxMeetingsPerWeek: z.number().int().min(0).max(100).optional(),
      autoScheduling: z.boolean().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .partial()
    .optional(),
});

export const AcceptConnectionSchema = z.object({
  scopes: z.array(z.string()).nonempty(),
  constraints: CreateConnectionSchema.shape.constraints.optional(),
});

export const UpdateConnectionPermissionsSchema = z.object({
  scopes: z.array(z.string()).optional(),
  constraints: CreateConnectionSchema.shape.constraints.optional(),
});

export const StartNetworkSessionSchema = z.object({
  type: z.enum(["schedule_meeting", "proposal_only"]),
  counterpartUserId: z.string().min(1),
  connectionId: z.string().min(1),
  intent: z.enum(["schedule", "propose"]).optional(),
  meeting: z
    .object({
      durationMins: z.number().int().min(5).max(240),
      earliest: z.string().optional(),
      latest: z.string().optional(),
      tz: z.string(),
    })
    .optional(),
});

export const ProposalsSchema = z.object({
  durationMins: z.number().int().min(5).max(240),
  earliest: z.string().optional(),
  latest: z.string().optional(),
  tz: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export const ConfirmSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  tz: z.string().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
});

export type CreateConnectionPayload = z.infer<typeof CreateConnectionSchema>;
export type AcceptConnectionPayload = z.infer<typeof AcceptConnectionSchema>;
export type UpdateConnectionPermissionsPayload = z.infer<
  typeof UpdateConnectionPermissionsSchema
>;
export type StartNetworkSessionPayload = z.infer<
  typeof StartNetworkSessionSchema
>;
export type ProposalsPayload = z.infer<typeof ProposalsSchema>;
export type ConfirmPayload = z.infer<typeof ConfirmSchema>;

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const res = schema.safeParse(data);
  if (res.success) return { success: true, data: res.data };
  return {
    success: false,
    error: res.error.errors.map((e) => e.message).join("; "),
  };
}
