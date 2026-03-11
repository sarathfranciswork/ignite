import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { processEmailJob, processDigestJob } from "./email.job";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/lib/email-templates", () => ({
  renderImmediateEmail: vi.fn().mockReturnValue({
    subject: "Test Subject",
    html: "<p>Test</p>",
    text: "Test",
  }),
  renderDigestEmail: vi.fn().mockReturnValue({
    subject: "Digest Subject",
    html: "<p>Digest</p>",
    text: "Digest",
  }),
}));

const { prisma } = await import("@/server/lib/prisma");
const { sendEmail } = await import("@/server/lib/email");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userFindMany = prisma.user.findMany as unknown as Mock;
const notificationFindMany = prisma.notification.findMany as unknown as Mock;
const mockSendEmail = sendEmail as unknown as Mock;

const basePayload = {
  notificationId: "notif-1",
  userId: "user-1",
  type: "IDEA_SUBMITTED" as const,
  title: "New idea submitted",
  body: "An idea was submitted",
  entityType: "idea",
  entityId: "idea-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processEmailJob", () => {
  it("sends an immediate email when user has IMMEDIATE preference", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      notificationFrequency: "IMMEDIATE",
      isActive: true,
    });

    const result = await processEmailJob(basePayload);

    expect(result).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Test Subject",
      }),
    );
  });

  it("skips email when user prefers DAILY digest", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      notificationFrequency: "DAILY",
      isActive: true,
    });

    const result = await processEmailJob(basePayload);

    expect(result).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips email when user prefers WEEKLY digest", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      notificationFrequency: "WEEKLY",
      isActive: true,
    });

    const result = await processEmailJob(basePayload);

    expect(result).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips email when user is inactive", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      notificationFrequency: "IMMEDIATE",
      isActive: false,
    });

    const result = await processEmailJob(basePayload);

    expect(result).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips email when user is not found", async () => {
    userFindUnique.mockResolvedValue(null);

    const result = await processEmailJob(basePayload);

    expect(result).toBe(false);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("processDigestJob", () => {
  it("sends daily digest emails to users with DAILY preference", async () => {
    userFindMany.mockResolvedValue([
      { id: "user-1", email: "alice@example.com", name: "Alice" },
      { id: "user-2", email: "bob@example.com", name: "Bob" },
    ]);

    notificationFindMany
      .mockResolvedValueOnce([
        {
          id: "notif-1",
          type: "IDEA_SUBMITTED",
          title: "Idea submitted",
          body: "An idea was submitted",
          entityType: "idea",
          entityId: "idea-1",
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await processDigestJob("DAILY");

    expect(result.usersProcessed).toBe(2);
    expect(result.emailsSent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "alice@example.com" }),
    );
  });

  it("sends weekly digest emails to users with WEEKLY preference", async () => {
    userFindMany.mockResolvedValue([{ id: "user-1", email: "alice@example.com", name: "Alice" }]);

    notificationFindMany.mockResolvedValueOnce([
      {
        id: "notif-1",
        type: "CAMPAIGN_PHASE_CHANGE",
        title: "Phase changed",
        body: "Campaign moved",
        entityType: "campaign",
        entityId: "campaign-1",
      },
    ]);

    const result = await processDigestJob("WEEKLY");

    expect(result.usersProcessed).toBe(1);
    expect(result.emailsSent).toBe(1);
  });

  it("skips users with no notifications in the period", async () => {
    userFindMany.mockResolvedValue([{ id: "user-1", email: "alice@example.com", name: "Alice" }]);

    notificationFindMany.mockResolvedValueOnce([]);

    const result = await processDigestJob("DAILY");

    expect(result.usersProcessed).toBe(1);
    expect(result.emailsSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns zero when no users have the target frequency", async () => {
    userFindMany.mockResolvedValue([]);

    const result = await processDigestJob("DAILY");

    expect(result.usersProcessed).toBe(0);
    expect(result.emailsSent).toBe(0);
  });
});
