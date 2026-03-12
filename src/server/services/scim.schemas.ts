import { z } from "zod";

// ── SCIM Token Management Schemas ───────────────────────────────

export const scimTokenCreateInput = z.object({
  name: z.string().min(1, "Token name is required").max(200),
  expiresAt: z.string().datetime().optional(),
});

export const scimTokenRevokeInput = z.object({
  id: z.string().cuid(),
});

export const scimTokenListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

// ── SCIM Protocol Schemas (RFC 7643 / 7644) ────────────────────

export const scimNameSchema = z.object({
  formatted: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
});

export const scimEmailSchema = z.object({
  value: z.string().email(),
  type: z.string().optional(),
  primary: z.boolean().optional(),
});

export const scimUserSchema = z.object({
  schemas: z.array(z.string()).default(["urn:ietf:params:scim:schemas:core:2.0:User"]),
  externalId: z.string().optional(),
  userName: z.string().min(1, "userName is required"),
  name: scimNameSchema.optional(),
  displayName: z.string().optional(),
  emails: z.array(scimEmailSchema).optional(),
  active: z.boolean().default(true),
});

export const scimPatchOperationSchema = z.object({
  op: z.enum(["add", "remove", "replace"]),
  path: z.string().optional(),
  value: z.unknown().optional(),
});

export const scimPatchRequestSchema = z.object({
  schemas: z.array(z.string()).default(["urn:ietf:params:scim:api:messages:2.0:PatchOp"]),
  Operations: z.array(scimPatchOperationSchema).min(1),
});

export const scimGroupSchema = z.object({
  schemas: z.array(z.string()).default(["urn:ietf:params:scim:schemas:core:2.0:Group"]),
  externalId: z.string().optional(),
  displayName: z.string().min(1, "displayName is required"),
  members: z
    .array(
      z.object({
        value: z.string(),
        display: z.string().optional(),
      }),
    )
    .optional(),
});

export const scimListQuerySchema = z.object({
  filter: z.string().optional(),
  startIndex: z.coerce.number().int().min(1).default(1),
  count: z.coerce.number().int().min(1).max(200).default(100),
});

// ── Type Exports ──────────────────────────────────────────────────

export type ScimTokenCreateInput = z.infer<typeof scimTokenCreateInput>;
export type ScimTokenRevokeInput = z.infer<typeof scimTokenRevokeInput>;
export type ScimTokenListInput = z.infer<typeof scimTokenListInput>;
export type ScimUserPayload = z.infer<typeof scimUserSchema>;
export type ScimPatchRequest = z.infer<typeof scimPatchRequestSchema>;
export type ScimGroupPayload = z.infer<typeof scimGroupSchema>;
export type ScimListQuery = z.infer<typeof scimListQuerySchema>;
