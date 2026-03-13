import { z } from "zod";

export const dataRegionEnum = z.enum(["US", "EU", "APAC"]);
export const gdprRequestTypeEnum = z.enum(["DATA_EXPORT", "DATA_ERASURE", "DATA_RECTIFICATION"]);
export const gdprRequestStatusEnum = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

export const configureResidencyInput = z.object({
  spaceId: z.string().min(1),
  region: dataRegionEnum,
  dataRetentionDays: z.number().int().min(30).max(3650).default(365),
});

export const getResidencyConfigInput = z.object({
  spaceId: z.string(),
});

export const gdprRequestExportInput = z.object({
  userId: z.string().min(1),
});

export const gdprRequestErasureInput = z.object({
  userId: z.string().min(1),
});

export const gdprGetStatusInput = z.object({
  requestId: z.string(),
});

export const gdprListRequestsInput = z.object({
  userId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const ipWhitelistAddInput = z.object({
  spaceId: z.string().min(1),
  cidr: z
    .string()
    .min(1)
    .refine(
      (val) => {
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^([0-9a-fA-F:]+)\/\d{1,3}$/;
        return cidrRegex.test(val);
      },
      { message: "Must be a valid CIDR notation (e.g., 10.0.0.0/8)" },
    ),
  description: z.string().max(500).optional(),
});

export const ipWhitelistRemoveInput = z.object({
  id: z.string(),
});

export const ipWhitelistListInput = z.object({
  spaceId: z.string(),
});

export const ipWhitelistToggleInput = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

export const ipCheckInput = z.object({
  spaceId: z.string(),
  ip: z.string(),
});

export type ConfigureResidencyInput = z.infer<typeof configureResidencyInput>;
export type GetResidencyConfigInput = z.infer<typeof getResidencyConfigInput>;
export type GdprRequestExportInput = z.infer<typeof gdprRequestExportInput>;
export type GdprRequestErasureInput = z.infer<typeof gdprRequestErasureInput>;
export type GdprGetStatusInput = z.infer<typeof gdprGetStatusInput>;
export type GdprListRequestsInput = z.infer<typeof gdprListRequestsInput>;
export type IpWhitelistAddInput = z.infer<typeof ipWhitelistAddInput>;
export type IpWhitelistRemoveInput = z.infer<typeof ipWhitelistRemoveInput>;
export type IpWhitelistListInput = z.infer<typeof ipWhitelistListInput>;
export type IpWhitelistToggleInput = z.infer<typeof ipWhitelistToggleInput>;
export type IpCheckInput = z.infer<typeof ipCheckInput>;
