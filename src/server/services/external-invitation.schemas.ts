import { z } from "zod";

export const externalInvitationCreateInput = z.object({
  email: z.string().email("Must be a valid email address"),
  campaignIds: z.array(z.string().min(1)).min(1, "At least one campaign is required"),
});

export const externalInvitationAcceptInput = z.object({
  token: z.string().min(1, "Token is required"),
});

export const externalInvitationRevokeInput = z.object({
  id: z.string().min(1, "Invitation ID is required"),
});

export const externalInvitationListInput = z.object({
  campaignId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export const externalInvitationRevokeAccessInput = z.object({
  userId: z.string().min(1, "User ID is required"),
  campaignId: z.string().min(1, "Campaign ID is required"),
});
