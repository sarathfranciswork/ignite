import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { WhiteLabelUpdateInput } from "./white-label.schemas";

const log = logger.child({ service: "white-label" });

// ── Error Class ─────────────────────────────────────────────────

export class WhiteLabelServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "WhiteLabelServiceError";
    this.code = code;
  }
}

// ── Get Active Config ───────────────────────────────────────────

export async function getWhiteLabelConfig() {
  const config = await prisma.whiteLabelConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!config) {
    return getDefaultConfig();
  }

  return config;
}

// ── Get Public Config (no sensitive data, for client use) ───────

export async function getPublicWhiteLabelConfig() {
  const config = await getWhiteLabelConfig();

  return {
    platformName: config.platformName,
    logoUrl: config.logoUrl,
    logoSmallUrl: config.logoSmallUrl,
    faviconUrl: config.faviconUrl,
    loginBannerUrl: config.loginBannerUrl,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    accentColor: config.accentColor,
  };
}

// ── Get Email Theme Config ──────────────────────────────────────

export async function getEmailThemeConfig() {
  const config = await getWhiteLabelConfig();

  return {
    platformName: config.platformName,
    logoUrl: config.emailLogoUrl ?? config.logoUrl,
    primaryColor: config.emailPrimaryColor,
    footerText: config.emailFooterText,
  };
}

// ── Upsert Config ───────────────────────────────────────────────

export async function updateWhiteLabelConfig(input: WhiteLabelUpdateInput, actorId: string) {
  const existing = await prisma.whiteLabelConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (input.customDomain !== undefined && input.customDomain !== null) {
    const domainConflict = await prisma.whiteLabelConfig.findUnique({
      where: { customDomain: input.customDomain },
    });

    if (domainConflict && domainConflict.id !== existing?.id) {
      throw new WhiteLabelServiceError("This custom domain is already in use", "DOMAIN_CONFLICT");
    }
  }

  const data = {
    ...(input.platformName !== undefined && { platformName: input.platformName }),
    ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
    ...(input.logoSmallUrl !== undefined && { logoSmallUrl: input.logoSmallUrl }),
    ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl }),
    ...(input.loginBannerUrl !== undefined && { loginBannerUrl: input.loginBannerUrl }),
    ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
    ...(input.secondaryColor !== undefined && { secondaryColor: input.secondaryColor }),
    ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
    ...(input.customDomain !== undefined && { customDomain: input.customDomain }),
    ...(input.emailLogoUrl !== undefined && { emailLogoUrl: input.emailLogoUrl }),
    ...(input.emailPrimaryColor !== undefined && { emailPrimaryColor: input.emailPrimaryColor }),
    ...(input.emailFooterText !== undefined && { emailFooterText: input.emailFooterText }),
  };

  let config;

  if (existing) {
    config = await prisma.whiteLabelConfig.update({
      where: { id: existing.id },
      data,
    });
  } else {
    config = await prisma.whiteLabelConfig.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  log.info({ configId: config.id, actorId }, "White-label config updated");

  eventBus.emit("whiteLabel.updated", {
    entity: "WhiteLabelConfig",
    entityId: config.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { fields: Object.keys(data) },
  });

  return config;
}

// ── Reset to Defaults ───────────────────────────────────────────

export async function resetWhiteLabelConfig(actorId: string) {
  const existing = await prisma.whiteLabelConfig.findFirst({
    where: { isActive: true },
  });

  if (existing) {
    await prisma.whiteLabelConfig.delete({
      where: { id: existing.id },
    });
  }

  log.info({ actorId }, "White-label config reset to defaults");

  return getDefaultConfig();
}

// ── Default Config ──────────────────────────────────────────────

function getDefaultConfig() {
  return {
    id: "default",
    platformName: "Ignite",
    logoUrl: null,
    logoSmallUrl: null,
    faviconUrl: null,
    loginBannerUrl: null,
    primaryColor: "#6366F1",
    secondaryColor: "#8B5CF6",
    accentColor: "#EC4899",
    customDomain: null,
    emailLogoUrl: null,
    emailPrimaryColor: "#6366F1",
    emailFooterText: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
