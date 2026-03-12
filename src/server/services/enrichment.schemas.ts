import { z } from "zod";

export const enrichIdeaInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  teaser: z.string().max(1000).optional(),
  description: z.string().max(50000).optional(),
  category: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
});

export type EnrichIdeaInput = z.infer<typeof enrichIdeaInput>;

export const copilotEventInput = z.object({
  ideaId: z.string().min(1).optional(),
  suggestionType: z.enum(["tag", "category", "description", "gap"]),
  suggestionValue: z.string().max(2000),
  action: z.enum(["accepted", "dismissed"]),
});

export type CopilotEventInput = z.infer<typeof copilotEventInput>;

export interface EnrichmentSuggestion {
  type: "tag" | "category" | "description" | "gap";
  value: string;
  confidence: "high" | "medium" | "low";
}

export interface EnrichmentResult {
  suggestedTags: string[];
  suggestedCategory: string | null;
  descriptionHints: string[];
  gaps: string[];
  aiPowered: boolean;
}
