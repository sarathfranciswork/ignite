import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAndQueueDigest,
  groupNotificationsByCategory,
  formatPeriod,
} from "../digest.service";
import { NotificationType, NotificationCategory } from "../../events/types";

// Mock the queue module
vi.mock("../../jobs/queues", () => {
  const mockAdd = vi.fn().mockResolvedValue(undefined);
  return {
    getEmailQueue: vi.fn(() => ({
      add: mockAdd,
    })),
  };
});

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://app.test");
  vi.stubEnv("APP_NAME", "TestApp");
  vi.stubEnv("EMAIL_FROM", "test@test.com");
  vi.clearAllMocks();
});

describe("digest.service", () => {
  describe("groupNotificationsByCategory", () => {
    it("groups notifications by their category", () => {
      const notifications = [
        {
          id: "1",
          type: NotificationType.IDEA_SUBMITTED,
          title: "New idea",
          body: null,
          link: null,
        },
        {
          id: "2",
          type: NotificationType.COMMENT_ADDED,
          title: "New comment",
          body: null,
          link: null,
        },
        {
          id: "3",
          type: NotificationType.EVALUATION_REQUESTED,
          title: "Eval request",
          body: null,
          link: null,
        },
        {
          id: "4",
          type: NotificationType.CAMPAIGN_PHASE_CHANGED,
          title: "Campaign update",
          body: null,
          link: null,
        },
      ];

      const groups = groupNotificationsByCategory(notifications);

      expect(groups).toHaveLength(3); // IDEAS(2), EVALUATIONS(1), CAMPAIGNS(1)

      const ideasGroup = groups.find((g) => g.label === "Your Ideas");
      expect(ideasGroup).toBeDefined();
      expect(ideasGroup?.count).toBe(2);

      const evalGroup = groups.find((g) => g.label === "Evaluation Tasks");
      expect(evalGroup).toBeDefined();
      expect(evalGroup?.count).toBe(1);

      const campaignGroup = groups.find((g) => g.label === "Campaign Updates");
      expect(campaignGroup).toBeDefined();
      expect(campaignGroup?.count).toBe(1);
    });

    it("sorts groups by count descending", () => {
      const notifications = [
        {
          id: "1",
          type: NotificationType.IDEA_SUBMITTED,
          title: "Idea 1",
          body: null,
          link: null,
        },
        {
          id: "2",
          type: NotificationType.IDEA_STATUS_CHANGED,
          title: "Idea 2",
          body: null,
          link: null,
        },
        {
          id: "3",
          type: NotificationType.IDEA_HOT_GRADUATION,
          title: "Idea 3",
          body: null,
          link: null,
        },
        {
          id: "4",
          type: NotificationType.EVALUATION_REQUESTED,
          title: "Eval",
          body: null,
          link: null,
        },
      ];

      const groups = groupNotificationsByCategory(notifications);
      expect(groups[0].count).toBeGreaterThanOrEqual(groups[1].count);
    });

    it("returns empty array for empty notifications", () => {
      const groups = groupNotificationsByCategory([]);
      expect(groups).toEqual([]);
    });
  });

  describe("formatPeriod", () => {
    it("formats daily period as a date string", () => {
      const result = formatPeriod("DAILY");
      // Should be a readable date like "Monday, March 10, 2026"
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(5);
    });

    it("formats weekly period as a date range", () => {
      const result = formatPeriod("WEEKLY");
      // Should contain a dash/en-dash separating two dates
      expect(result).toContain("–");
    });
  });

  describe("buildAndQueueDigest", () => {
    const user = {
      id: "user-1",
      email: "alice@test.com",
      firstName: "Alice",
      emailFrequency: "DAILY" as const,
    };

    it("returns false when no notifications", async () => {
      const result = await buildAndQueueDigest(user, []);
      expect(result).toBe(false);

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("queues a digest email when notifications exist", async () => {
      const notifications = [
        {
          id: "n1",
          type: NotificationType.IDEA_SUBMITTED,
          title: "New idea submitted",
          body: null,
          link: "https://app.test/ideas/1",
        },
        {
          id: "n2",
          type: NotificationType.COMMENT_ADDED,
          title: "Comment on your idea",
          body: "Looks great!",
          link: null,
        },
      ];

      const result = await buildAndQueueDigest(user, notifications);
      expect(result).toBe(true);

      const { getEmailQueue } = await import("../../jobs/queues");
      const queue = getEmailQueue();
      expect(queue.add).toHaveBeenCalledWith(
        "send-digest",
        expect.objectContaining({
          to: "alice@test.com",
          subject: expect.stringContaining("Daily Digest"),
          html: expect.stringContaining("Alice"),
        }),
        expect.objectContaining({
          jobId: expect.stringContaining("digest-user-1-daily"),
        }),
      );
    });
  });
});
