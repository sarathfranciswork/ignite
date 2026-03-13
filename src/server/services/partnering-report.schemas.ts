import { z } from "zod";

export const useCasePipelineFunnelInput = z.object({
  organizationIds: z.array(z.string().cuid()).min(1).optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export const organizationActivityInput = z.object({
  organizationIds: z.array(z.string().cuid()).min(1).optional(),
  relationshipStatus: z
    .enum(["IDENTIFIED", "VERIFIED", "QUALIFIED", "EVALUATION", "PILOT", "PARTNERSHIP", "ARCHIVED"])
    .optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export type UseCasePipelineFunnelInput = z.infer<typeof useCasePipelineFunnelInput>;
export type OrganizationActivityInput = z.infer<typeof organizationActivityInput>;
