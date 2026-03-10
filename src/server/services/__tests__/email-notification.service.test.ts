import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dispatchNotificationEmail,
  queueImmediateEmail,
} from "../email-notification.service";
import { NotificationType } from "../../events/types";

// Mock the queue module
vi.mock("../../jobs/queues", () => {
  const mockAdd = vi.fn().mockResolvedValue(undefined);
  return {
    getEmailQueue: vi.fn(() => ({
      add: mockAdd,
    })),
  };
});

// Set env vars
beforeEach(() => {
  vi.stubEnv("APP_URL", "https://app.test");
  vi.stubEnv("APP_NAME", "TestApp");
  vi.stubEnv("EMAIL_FROM", "test@test.com");
  vi.clearAllMocks();
});

describe("email-notification.service", () => {
  describe("dispatchNotificationEmail", () => {
    const notification = {
      id: "notif-1",
      type: NotificationType.IDEA_SUBMITTED,
      title: "Test Idea",
      body: "A test idea body",
      link: "https://app.test/ideas/1",
      metadata: null,
    };

    it("queues email for IMMEDIATELY preference", async () => {
      const user = {
        id: "user-1",
        email: "alice@test.com",
        emailFrequency: "IMMEDIATELY" as const,
      };

      await dispatchNotificationEmail(user, notification);

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).toHaveBeenCalledWith(
        "send-notification",
        expect.objectContaining({
          to: "alice@test.com",
          notificationId: "notif-1",
        }),
        expect.objectContaining({
          jobId: "email-notif-1",
        }),
      );
    });

    it("skips email for NEVER preference", async () => {
      const user = {
        id: "user-2",
        email: "bob@test.com",
        emailFrequency: "NEVER" as const,
      };

      await dispatchNotificationEmail(user, notification);

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("skips email for DAILY preference (handled by digest)", async () => {
      const user = {
        id: "user-3",
        email: "charlie@test.com",
        emailFrequency: "DAILY" as const,
      };

      await dispatchNotificationEmail(user, notification);

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("skips email for WEEKLY preference (handled by digest)", async () => {
      const user = {
        id: "user-4",
        email: "dave@test.com",
        emailFrequency: "WEEKLY" as const,
      };

      await dispatchNotificationEmail(user, notification);

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe("queueImmediateEmail", () => {
    it("queues an email job with rendered content", async () => {
      await queueImmediateEmail(
        {
          userId: "user-1",
          type: NotificationType.COMMENT_ADDED,
          title: "New comment on your idea",
          body: "Great work!",
          link: "https://app.test/ideas/1",
        },
        "notif-123",
        "alice@test.com",
      );

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).toHaveBeenCalledWith(
        "send-notification",
        expect.objectContaining({
          to: "alice@test.com",
          notificationId: "notif-123",
          subject: expect.stringContaining("New comment"),
          html: expect.stringContaining("<!DOCTYPE html>"),
        }),
        expect.objectContaining({
          jobId: "email-notif-123",
        }),
      );
    });
  });
});
