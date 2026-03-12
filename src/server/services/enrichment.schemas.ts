import { z } from "zod";

export const enrichIdeaInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  teaser: z.string().max(1000).optional(),
  description: z.string().max(50000).optional(),
  category: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
});

export type EnrichIdeaInput = z.infer<typeof enrichIdeaInput>;

export interface EnrichmentSuggestion {
  type: "description" | "tags" | "missing_info" | "title";
  label: string;
  suggestion: string;
}

export interface EnrichmentResult {
  suggestions: EnrichmentSuggestion[];
  available: boolean;
}
