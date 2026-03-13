import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { ConfigureResidencyInput, GetResidencyConfigInput } from "./compliance.schemas";

const childLogger = logger.child({ service: "data-residency" });

export class DataResidencyServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "DataResidencyServiceError";
  }
}

export async function configureResidency(input: ConfigureResidencyInput) {
  const config = await prisma.dataResidencyConfig.upsert({
    where: { spaceId: input.spaceId },
    update: {
      region: input.region,
      dataRetentionDays: input.dataRetentionDays,
    },
    create: {
      spaceId: input.spaceId,
      region: input.region,
      dataRetentionDays: input.dataRetentionDays,
    },
    include: {
      space: { select: { id: true, name: true } },
    },
  });

  childLogger.info(
    { spaceId: input.spaceId, region: input.region, retentionDays: input.dataRetentionDays },
    "Data residency configured",
  );

  return config;
}

export async function getResidencyConfig(input: GetResidencyConfigInput) {
  const config = await prisma.dataResidencyConfig.findUnique({
    where: { spaceId: input.spaceId },
    include: {
      space: { select: { id: true, name: true } },
    },
  });

  return config;
}

export async function getDataLocationReport(spaceId: string) {
  const config = await prisma.dataResidencyConfig.findUnique({
    where: { spaceId },
  });

  const [ideaCount, userCount, commentCount] = await Promise.all([
    prisma.idea.count(),
    prisma.user.count(),
    prisma.comment.count(),
  ]);

  return {
    spaceId,
    region: config?.region ?? "US",
    dataRetentionDays: config?.dataRetentionDays ?? 365,
    stats: {
      ideas: ideaCount,
      users: userCount,
      comments: commentCount,
    },
    storageLocation: config?.region === "EU" ? "EU Data Center" : "US Data Center",
    lastChecked: new Date().toISOString(),
  };
}
