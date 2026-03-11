import { z } from "zod";

export const graduationProgressInput = z.object({
  ideaId: z.string().min(1),
});

export type GraduationProgressInput = z.infer<typeof graduationProgressInput>;
