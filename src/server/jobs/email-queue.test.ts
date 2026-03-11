import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enqueueEmail, startDigestScheduler, stopDigestScheduler } from "./email-queue";

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

const mockProcessEmailJob = vi.fn().mockResolvedValue(true);
const mockProcessDigestJob = vi.fn().mockResolvedValue({ usersProcessed: 0, emailsSent: 0 });

vi.mock("./email.job", () => ({
  processEmailJob: (...args: unknown[]) => mockProcessEmailJob(...args),
  processDigestJob: (...args: unknown[]) => mockProcessDigestJob(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  stopDigestScheduler();
});

afterEach(() => {
  stopDigestScheduler();
});

describe("enqueueEmail", () => {
  it("calls processEmailJob asynchronously", async () => {
    const payload = {
      notificationId: "notif-1",
      userId: "user-1",
      type: "IDEA_SUBMITTED" as const,
      title: "Test",
      body: "Test body",
      entityType: "idea",
      entityId: "idea-1",
    };

    enqueueEmail(payload);

    // Wait for the async processing to complete
    await vi.waitFor(() => {
      expect(mockProcessEmailJob).toHaveBeenCalledWith(payload);
    });
  });

  it("handles errors without throwing", async () => {
    mockProcessEmailJob.mockRejectedValueOnce(new Error("Processing failed"));

    const payload = {
      notificationId: "notif-1",
      userId: "user-1",
      type: "IDEA_SUBMITTED" as const,
      title: "Test",
      body: "Test body",
      entityType: "idea",
      entityId: "idea-1",
    };

    expect(() => enqueueEmail(payload)).not.toThrow();

    await vi.waitFor(() => {
      expect(mockProcessEmailJob).toHaveBeenCalled();
    });
  });
});

describe("digest scheduler", () => {
  it("starts without error", () => {
    expect(() => startDigestScheduler()).not.toThrow();
  });

  it("stops without error", () => {
    startDigestScheduler();
    expect(() => stopDigestScheduler()).not.toThrow();
  });

  it("does not start twice", () => {
    startDigestScheduler();
    startDigestScheduler();
    stopDigestScheduler();
  });
});
