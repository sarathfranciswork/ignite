import { z } from "zod";

export const biConnectorProviderEnum = z.enum(["TABLEAU", "POWER_BI"]);

export const biConnectorConfigureInput = z.object({
  spaceId: z.string().min(1),
  provider: biConnectorProviderEnum,
  name: z.string().min(1).max(100),
  datasetConfig: z.object({
    ideas: z.boolean(),
    campaigns: z.boolean(),
    evaluations: z.boolean(),
    projects: z.boolean(),
  }),
});

export const biConnectorListInput = z.object({
  spaceId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const biConnectorByIdInput = z.object({
  id: z.string().min(1),
});

export const biConnectorRefreshInput = z.object({
  id: z.string().min(1),
});

export const biConnectorDeleteInput = z.object({
  id: z.string().min(1),
});

export const biConnectorGetEndpointsInput = z.object({
  id: z.string().min(1),
});

export const biDatasetQueryInput = z.object({
  connectorId: z.string().min(1),
  limit: z.number().min(1).max(10000).default(1000),
  offset: z.number().min(0).default(0),
  format: z.enum(["json", "csv"]).default("json"),
});

export type BiConnectorConfigureInput = z.infer<typeof biConnectorConfigureInput>;
export type BiConnectorListInput = z.infer<typeof biConnectorListInput>;
export type BiConnectorByIdInput = z.infer<typeof biConnectorByIdInput>;
export type BiConnectorRefreshInput = z.infer<typeof biConnectorRefreshInput>;
export type BiConnectorDeleteInput = z.infer<typeof biConnectorDeleteInput>;
export type BiConnectorGetEndpointsInput = z.infer<typeof biConnectorGetEndpointsInput>;
export type BiDatasetQueryInput = z.infer<typeof biDatasetQueryInput>;
