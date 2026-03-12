import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listNotificationTemplates,
  getNotificationTemplate,
  upsertNotificationTemplate,
  toggleNotificationTemplate,
  resetNotificationTemplate,
  previewNotificationTemplate,
  renderTemplate,
  getLoginCustomization,
  updateLoginCustomization,
} from "./notification-template.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    notificationTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    whiteLabelConfig: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { prisma } = await import("@/server/lib/prisma");

const templateFindMany = prisma.notificationTemplate.findMany as unknown as Mock;
const templateFindUnique = prisma.notificationTemplate.findUnique as unknown as Mock;
const templateUpsert = prisma.notificationTemplate.upsert as unknown as Mock;
const templateUpdate = prisma.notificationTemplate.update as unknown as Mock;
const templateCreate = prisma.notificationTemplate.create as unknown as Mock;
const templateDeleteMany = prisma.notificationTemplate.deleteMany as unknown as Mock;
const wlFindFirst = prisma.whiteLabelConfig.findFirst as unknown as Mock;
const wlUpdate = prisma.whiteLabelConfig.update as unknown as Mock;
const wlCreate = prisma.whiteLabelConfig.create as unknown as Mock;

const mockTemplate = {
  id: "tpl-1",
  type: "IDEA_SUBMITTED" as const,
  emailSubject: "Custom: {{ideaTitle}}",
  emailBody: "<p>Custom body for {{ideaTitle}}</p>",
  inAppTitle: "Custom title",
  inAppBody: "Custom in-app body",
  isActive: true,
  updatedBy: "user-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── renderTemplate ──────────────────────────────────────────

describe("renderTemplate", () => {
  it("replaces known placeholders", () => {
    const result = renderTemplate("Hello {{name}}, welcome to {{place}}!", {
      name: "Alice",
      place: "Ignite",
    });
    expect(result).toBe("Hello Alice, welcome to Ignite!");
  });

  it("leaves unknown placeholders intact", () => {
    const result = renderTemplate("Hello {{name}}, {{unknown}} here", {
      name: "Bob",
    });
    expect(result).toBe("Hello Bob, {{unknown}} here");
  });

  it("handles empty variables object", () => {
    const result = renderTemplate("No {{vars}} here", {});
    expect(result).toBe("No {{vars}} here");
  });

  it("handles template with no placeholders", () => {
    const result = renderTemplate("Plain text", { foo: "bar" });
    expect(result).toBe("Plain text");
  });
});

// ── listNotificationTemplates ───────────────────────────────

describe("listNotificationTemplates", () => {
  it("returns all 7 types with defaults when no custom templates exist", async () => {
    templateFindMany.mockResolvedValue([]);

    const result = await listNotificationTemplates();

    expect(result.items).toHaveLength(7);
    expect(result.items.every((t) => t.isCustomized === false)).toBe(true);
    expect(result.items.map((t) => t.type)).toEqual([
      "IDEA_SUBMITTED",
      "EVALUATION_REQUESTED",
      "STATUS_CHANGE",
      "HOT_GRADUATION",
      "CAMPAIGN_PHASE_CHANGE",
      "COMMENT_ON_FOLLOWED",
      "MENTION",
    ]);
  });

  it("marks custom templates as customized", async () => {
    templateFindMany.mockResolvedValue([mockTemplate]);

    const result = await listNotificationTemplates();

    const idea = result.items.find((t) => t.type === "IDEA_SUBMITTED");
    expect(idea?.isCustomized).toBe(true);
    expect(idea?.emailSubject).toBe("Custom: {{ideaTitle}}");

    const evalReq = result.items.find((t) => t.type === "EVALUATION_REQUESTED");
    expect(evalReq?.isCustomized).toBe(false);
  });
});

// ── getNotificationTemplate ─────────────────────────────────

describe("getNotificationTemplate", () => {
  it("returns custom template when it exists", async () => {
    templateFindUnique.mockResolvedValue(mockTemplate);

    const result = await getNotificationTemplate("IDEA_SUBMITTED");

    expect(result.isCustomized).toBe(true);
    expect(result.emailSubject).toBe("Custom: {{ideaTitle}}");
  });

  it("returns default template when no custom exists", async () => {
    templateFindUnique.mockResolvedValue(null);

    const result = await getNotificationTemplate("IDEA_SUBMITTED");

    expect(result.isCustomized).toBe(false);
    expect(result.emailSubject).toBe("New idea submitted: {{ideaTitle}}");
    expect(result.id).toBeNull();
  });
});

// ── upsertNotificationTemplate ──────────────────────────────

describe("upsertNotificationTemplate", () => {
  it("upserts and returns the template", async () => {
    const upsertedTemplate = { ...mockTemplate, updatedBy: "user-2" };
    templateUpsert.mockResolvedValue(upsertedTemplate);

    const result = await upsertNotificationTemplate(
      {
        type: "IDEA_SUBMITTED",
        emailSubject: "Custom: {{ideaTitle}}",
        emailBody: "<p>Custom body for {{ideaTitle}}</p>",
        inAppTitle: "Custom title",
        inAppBody: "Custom in-app body",
        isActive: true,
      },
      "user-2",
    );

    expect(result.isCustomized).toBe(true);
    expect(templateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: "IDEA_SUBMITTED" },
      }),
    );
  });
});

// ── toggleNotificationTemplate ──────────────────────────────

describe("toggleNotificationTemplate", () => {
  it("updates existing template", async () => {
    templateFindUnique.mockResolvedValue(mockTemplate);
    templateUpdate.mockResolvedValue({ ...mockTemplate, isActive: false });

    const result = await toggleNotificationTemplate("IDEA_SUBMITTED", false, "user-1");

    expect(result.isCustomized).toBe(true);
    expect(templateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: "IDEA_SUBMITTED" },
        data: { isActive: false, updatedBy: "user-1" },
      }),
    );
  });

  it("creates from defaults when no custom template exists", async () => {
    templateFindUnique.mockResolvedValue(null);
    templateCreate.mockResolvedValue({ ...mockTemplate, isActive: false });

    const result = await toggleNotificationTemplate("IDEA_SUBMITTED", false, "user-1");

    expect(result.isCustomized).toBe(true);
    expect(templateCreate).toHaveBeenCalled();
  });
});

// ── resetNotificationTemplate ───────────────────────────────

describe("resetNotificationTemplate", () => {
  it("deletes custom template and returns defaults", async () => {
    templateDeleteMany.mockResolvedValue({ count: 1 });

    const result = await resetNotificationTemplate("IDEA_SUBMITTED", "user-1");

    expect(result.isCustomized).toBe(false);
    expect(result.emailSubject).toBe("New idea submitted: {{ideaTitle}}");
    expect(templateDeleteMany).toHaveBeenCalledWith({
      where: { type: "IDEA_SUBMITTED" },
    });
  });
});

// ── previewNotificationTemplate ─────────────────────────────

describe("previewNotificationTemplate", () => {
  it("returns email preview with sample data", () => {
    const result = previewNotificationTemplate("IDEA_SUBMITTED", "email");

    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("body");
    expect(result.subject).toContain("[ideaTitle]");
    expect(result.body).toContain("[authorName]");
  });

  it("returns in-app preview with sample data", () => {
    const result = previewNotificationTemplate("IDEA_SUBMITTED", "inApp");

    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("body");
    expect(result.title).toContain("[ideaTitle]");
  });
});

// ── getLoginCustomization ───────────────────────────────────

describe("getLoginCustomization", () => {
  it("returns login customization from white label config", async () => {
    wlFindFirst.mockResolvedValue({
      loginBannerUrl: "https://example.com/banner.png",
      loginWelcomeTitle: "Welcome",
      loginWelcomeMessage: "Hello world",
    });

    const result = await getLoginCustomization();

    expect(result.loginBannerUrl).toBe("https://example.com/banner.png");
    expect(result.loginWelcomeTitle).toBe("Welcome");
    expect(result.loginWelcomeMessage).toBe("Hello world");
  });

  it("returns nulls when no config exists", async () => {
    wlFindFirst.mockResolvedValue(null);

    const result = await getLoginCustomization();

    expect(result.loginBannerUrl).toBeNull();
    expect(result.loginWelcomeTitle).toBeNull();
    expect(result.loginWelcomeMessage).toBeNull();
  });
});

// ── updateLoginCustomization ────────────────────────────────

describe("updateLoginCustomization", () => {
  it("updates existing config", async () => {
    wlFindFirst.mockResolvedValue({ id: "wl-1", isActive: true });
    wlUpdate.mockResolvedValue({
      loginBannerUrl: "https://example.com/new.png",
      loginWelcomeTitle: "New Title",
      loginWelcomeMessage: null,
    });

    const result = await updateLoginCustomization(
      {
        loginBannerUrl: "https://example.com/new.png",
        loginWelcomeTitle: "New Title",
      },
      "user-1",
    );

    expect(result.loginBannerUrl).toBe("https://example.com/new.png");
    expect(wlUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wl-1" },
      }),
    );
  });

  it("creates new config when none exists", async () => {
    wlFindFirst.mockResolvedValue(null);
    wlCreate.mockResolvedValue({
      loginBannerUrl: "https://example.com/banner.png",
      loginWelcomeTitle: "Welcome",
      loginWelcomeMessage: "Hello",
    });

    const result = await updateLoginCustomization(
      {
        loginBannerUrl: "https://example.com/banner.png",
        loginWelcomeTitle: "Welcome",
        loginWelcomeMessage: "Hello",
      },
      "user-1",
    );

    expect(result.loginBannerUrl).toBe("https://example.com/banner.png");
    expect(wlCreate).toHaveBeenCalled();
  });
});
