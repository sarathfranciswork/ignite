import type { NotificationType } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { createChildLogger } from "@/server/lib/logger";
import {
  TEMPLATE_VARIABLES,
  type LoginCustomizationUpdateInput,
} from "./notification-template.schemas";

const log = createChildLogger({ service: "notification-template" });

// ── Error Class ────────────────────────────────────────────────

type NotificationTemplateErrorCode =
  | "TEMPLATE_NOT_FOUND"
  | "INVALID_VARIABLES"
  | "WHITE_LABEL_NOT_FOUND";

export class NotificationTemplateServiceError extends Error {
  constructor(
    public readonly code: NotificationTemplateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "NotificationTemplateServiceError";
  }
}

// ── Default Templates ──────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<
  string,
  { emailSubject: string; emailBody: string; inAppTitle: string; inAppBody: string }
> = {
  IDEA_SUBMITTED: {
    emailSubject: "New idea submitted: {{ideaTitle}}",
    emailBody:
      "<p>A new idea <strong>{{ideaTitle}}</strong> has been submitted to <strong>{{campaignTitle}}</strong> by {{authorName}}.</p>",
    inAppTitle: "New idea: {{ideaTitle}}",
    inAppBody: "{{authorName}} submitted a new idea to {{campaignTitle}}",
  },
  EVALUATION_REQUESTED: {
    emailSubject: "Evaluation requested: {{sessionTitle}}",
    emailBody:
      "<p>You have been invited to evaluate ideas in <strong>{{sessionTitle}}</strong> for campaign <strong>{{campaignTitle}}</strong>.</p><p>Please complete your evaluation by {{dueDate}}.</p>",
    inAppTitle: "Evaluation requested",
    inAppBody: "You've been invited to evaluate {{sessionTitle}} in {{campaignTitle}}",
  },
  STATUS_CHANGE: {
    emailSubject: "Status updated: {{entityTitle}}",
    emailBody:
      "<p>The status of <strong>{{entityTitle}}</strong> has been changed from <em>{{oldStatus}}</em> to <em>{{newStatus}}</em> by {{changedBy}}.</p>",
    inAppTitle: "Status changed: {{entityTitle}}",
    inAppBody: "{{entityTitle}} moved from {{oldStatus}} to {{newStatus}}",
  },
  HOT_GRADUATION: {
    emailSubject: "Idea graduated to HOT: {{ideaTitle}}",
    emailBody:
      "<p>Congratulations! The idea <strong>{{ideaTitle}}</strong> in <strong>{{campaignTitle}}</strong> has reached HOT status with a score of {{score}}.</p>",
    inAppTitle: "HOT! {{ideaTitle}}",
    inAppBody: "{{ideaTitle}} in {{campaignTitle}} is now HOT (score: {{score}})",
  },
  CAMPAIGN_PHASE_CHANGE: {
    emailSubject: "Campaign phase changed: {{campaignTitle}}",
    emailBody:
      "<p>The campaign <strong>{{campaignTitle}}</strong> has moved from <em>{{oldPhase}}</em> to <em>{{newPhase}}</em>.</p>",
    inAppTitle: "Phase change: {{campaignTitle}}",
    inAppBody: "{{campaignTitle}} moved to {{newPhase}}",
  },
  COMMENT_ON_FOLLOWED: {
    emailSubject: "New comment on {{ideaTitle}}",
    emailBody:
      "<p><strong>{{commenterName}}</strong> commented on <strong>{{ideaTitle}}</strong>:</p><blockquote>{{commentPreview}}</blockquote>",
    inAppTitle: "New comment on {{ideaTitle}}",
    inAppBody: "{{commenterName}}: {{commentPreview}}",
  },
  MENTION: {
    emailSubject: "You were mentioned by {{mentionedBy}}",
    emailBody:
      "<p><strong>{{mentionedBy}}</strong> mentioned you in <strong>{{entityTitle}}</strong>:</p><blockquote>{{contextPreview}}</blockquote>",
    inAppTitle: "Mentioned by {{mentionedBy}}",
    inAppBody: "{{mentionedBy}} mentioned you in {{entityTitle}}",
  },
};

// ── Template CRUD ──────────────────────────────────────────────

export async function listNotificationTemplates() {
  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { type: "asc" },
  });

  // Merge with defaults for types that don't have a custom template
  const templateMap = new Map(templates.map((t) => [t.type, t]));
  const allTypes = Object.keys(DEFAULT_TEMPLATES) as NotificationType[];

  const merged = allTypes.map((type) => {
    const custom = templateMap.get(type);
    if (custom) {
      return { ...custom, isCustomized: true };
    }
    const defaults = DEFAULT_TEMPLATES[type];
    return {
      id: null,
      type,
      emailSubject: defaults.emailSubject,
      emailBody: defaults.emailBody,
      inAppTitle: defaults.inAppTitle,
      inAppBody: defaults.inAppBody,
      isActive: true,
      isCustomized: false,
      updatedBy: null,
      createdAt: null,
      updatedAt: null,
    };
  });

  return { items: merged };
}

export async function getNotificationTemplate(type: NotificationType) {
  const template = await prisma.notificationTemplate.findUnique({
    where: { type },
  });

  if (template) {
    return { ...template, isCustomized: true };
  }

  const defaults = DEFAULT_TEMPLATES[type];
  if (!defaults) {
    throw new NotificationTemplateServiceError(
      "TEMPLATE_NOT_FOUND",
      `No template found for type ${type}`,
    );
  }

  return {
    id: null,
    type,
    emailSubject: defaults.emailSubject,
    emailBody: defaults.emailBody,
    inAppTitle: defaults.inAppTitle,
    inAppBody: defaults.inAppBody,
    isActive: true,
    isCustomized: false,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function upsertNotificationTemplate(
  input: {
    type: NotificationType;
    emailSubject: string;
    emailBody: string;
    inAppTitle: string;
    inAppBody: string;
    isActive: boolean;
  },
  userId: string,
) {
  const template = await prisma.notificationTemplate.upsert({
    where: { type: input.type },
    update: {
      emailSubject: input.emailSubject,
      emailBody: input.emailBody,
      inAppTitle: input.inAppTitle,
      inAppBody: input.inAppBody,
      isActive: input.isActive,
      updatedBy: userId,
    },
    create: {
      type: input.type,
      emailSubject: input.emailSubject,
      emailBody: input.emailBody,
      inAppTitle: input.inAppTitle,
      inAppBody: input.inAppBody,
      isActive: input.isActive,
      updatedBy: userId,
    },
  });

  log.info({ type: input.type, userId }, "Notification template updated");
  return { ...template, isCustomized: true };
}

export async function toggleNotificationTemplate(
  type: NotificationType,
  isActive: boolean,
  userId: string,
) {
  const existing = await prisma.notificationTemplate.findUnique({ where: { type } });

  if (existing) {
    const updated = await prisma.notificationTemplate.update({
      where: { type },
      data: { isActive, updatedBy: userId },
    });
    return { ...updated, isCustomized: true };
  }

  // Create from defaults with the toggled state
  const defaults = DEFAULT_TEMPLATES[type];
  if (!defaults) {
    throw new NotificationTemplateServiceError(
      "TEMPLATE_NOT_FOUND",
      `No default template for type ${type}`,
    );
  }

  const created = await prisma.notificationTemplate.create({
    data: {
      type,
      ...defaults,
      isActive,
      updatedBy: userId,
    },
  });

  log.info({ type, isActive, userId }, "Notification template toggled");
  return { ...created, isCustomized: true };
}

export async function resetNotificationTemplate(type: NotificationType, userId: string) {
  await prisma.notificationTemplate.deleteMany({ where: { type } });

  log.info({ type, userId }, "Notification template reset to defaults");

  const defaults = DEFAULT_TEMPLATES[type];
  if (!defaults) {
    throw new NotificationTemplateServiceError(
      "TEMPLATE_NOT_FOUND",
      `No default template for type ${type}`,
    );
  }

  return {
    id: null,
    type,
    ...defaults,
    isActive: true,
    isCustomized: false,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  };
}

export function previewNotificationTemplate(
  type: NotificationType,
  channel: "email" | "inApp",
  template?: { emailSubject: string; emailBody: string; inAppTitle: string; inAppBody: string },
) {
  const tpl = template ?? DEFAULT_TEMPLATES[type];
  if (!tpl) {
    throw new NotificationTemplateServiceError(
      "TEMPLATE_NOT_FOUND",
      `No template for type ${type}`,
    );
  }

  const variables = TEMPLATE_VARIABLES[type] ?? [];
  const sampleData: Record<string, string> = {};
  for (const v of variables) {
    sampleData[v] = `[${v}]`;
  }

  if (channel === "email") {
    return {
      subject: renderTemplate(tpl.emailSubject, sampleData),
      body: renderTemplate(tpl.emailBody, sampleData),
    };
  }

  return {
    title: renderTemplate(tpl.inAppTitle, sampleData),
    body: renderTemplate(tpl.inAppBody, sampleData),
  };
}

// ── Template Rendering ─────────────────────────────────────────

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

// ── Login Customization ────────────────────────────────────────

export async function getLoginCustomization() {
  const config = await prisma.whiteLabelConfig.findFirst({
    where: { isActive: true },
    select: {
      loginBannerUrl: true,
      loginWelcomeTitle: true,
      loginWelcomeMessage: true,
    },
  });

  return {
    loginBannerUrl: config?.loginBannerUrl ?? null,
    loginWelcomeTitle: config?.loginWelcomeTitle ?? null,
    loginWelcomeMessage: config?.loginWelcomeMessage ?? null,
  };
}

export async function updateLoginCustomization(
  input: LoginCustomizationUpdateInput,
  userId: string,
) {
  // Get or create the white label config
  const existing = await prisma.whiteLabelConfig.findFirst({
    where: { isActive: true },
  });

  if (existing) {
    const updated = await prisma.whiteLabelConfig.update({
      where: { id: existing.id },
      data: {
        ...(input.loginBannerUrl !== undefined && { loginBannerUrl: input.loginBannerUrl }),
        ...(input.loginWelcomeTitle !== undefined && {
          loginWelcomeTitle: input.loginWelcomeTitle,
        }),
        ...(input.loginWelcomeMessage !== undefined && {
          loginWelcomeMessage: input.loginWelcomeMessage,
        }),
      },
      select: {
        loginBannerUrl: true,
        loginWelcomeTitle: true,
        loginWelcomeMessage: true,
      },
    });

    log.info({ userId }, "Login customization updated");
    return updated;
  }

  // Create new config with login customization
  const created = await prisma.whiteLabelConfig.create({
    data: {
      loginBannerUrl: input.loginBannerUrl,
      loginWelcomeTitle: input.loginWelcomeTitle,
      loginWelcomeMessage: input.loginWelcomeMessage,
    },
    select: {
      loginBannerUrl: true,
      loginWelcomeTitle: true,
      loginWelcomeMessage: true,
    },
  });

  log.info({ userId }, "Login customization created");
  return created;
}
