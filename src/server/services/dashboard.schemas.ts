import { z } from "zod";

export const dashboardOverviewInput = z.object({
  activityLimit: z.number().int().min(1).max(50).default(10),
  activityCursor: z.string().optional(),
});

export type DashboardOverviewInput = z.infer<typeof dashboardOverviewInput>;
