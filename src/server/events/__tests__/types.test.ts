import { describe, it, expect } from "vitest";
import {
  NotificationType,
  NotificationCategory,
  NOTIFICATION_CATEGORY_MAP,
} from "../types";

describe("events/types", () => {
  describe("NotificationType", () => {
    it("defines all expected notification types", () => {
      expect(NotificationType.IDEA_SUBMITTED).toBe("IDEA_SUBMITTED");
      expect(NotificationType.IDEA_STATUS_CHANGED).toBe("IDEA_STATUS_CHANGED");
      expect(NotificationType.IDEA_HOT_GRADUATION).toBe("IDEA_HOT_GRADUATION");
      expect(NotificationType.COMMENT_ADDED).toBe("COMMENT_ADDED");
      expect(NotificationType.EVALUATION_REQUESTED).toBe(
        "EVALUATION_REQUESTED",
      );
      expect(NotificationType.EVALUATION_REMINDER).toBe("EVALUATION_REMINDER");
      expect(NotificationType.CAMPAIGN_PHASE_CHANGED).toBe(
        "CAMPAIGN_PHASE_CHANGED",
      );
      expect(NotificationType.MENTION).toBe("MENTION");
      expect(NotificationType.DRAFT_REMINDER).toBe("DRAFT_REMINDER");
    });
  });

  describe("NOTIFICATION_CATEGORY_MAP", () => {
    it("maps every NotificationType to a category", () => {
      for (const type of Object.values(NotificationType)) {
        expect(NOTIFICATION_CATEGORY_MAP[type]).toBeDefined();
        expect(
          Object.values(NotificationCategory).includes(
            NOTIFICATION_CATEGORY_MAP[type],
          ),
        ).toBe(true);
      }
    });

    it("maps idea-related types to IDEAS category", () => {
      expect(NOTIFICATION_CATEGORY_MAP[NotificationType.IDEA_SUBMITTED]).toBe(
        NotificationCategory.IDEAS,
      );
      expect(
        NOTIFICATION_CATEGORY_MAP[NotificationType.IDEA_STATUS_CHANGED],
      ).toBe(NotificationCategory.IDEAS);
      expect(
        NOTIFICATION_CATEGORY_MAP[NotificationType.IDEA_HOT_GRADUATION],
      ).toBe(NotificationCategory.IDEAS);
      expect(NOTIFICATION_CATEGORY_MAP[NotificationType.COMMENT_ADDED]).toBe(
        NotificationCategory.IDEAS,
      );
    });

    it("maps evaluation types to EVALUATIONS category", () => {
      expect(
        NOTIFICATION_CATEGORY_MAP[NotificationType.EVALUATION_REQUESTED],
      ).toBe(NotificationCategory.EVALUATIONS);
      expect(
        NOTIFICATION_CATEGORY_MAP[NotificationType.EVALUATION_REMINDER],
      ).toBe(NotificationCategory.EVALUATIONS);
    });

    it("maps campaign types to CAMPAIGNS category", () => {
      expect(
        NOTIFICATION_CATEGORY_MAP[NotificationType.CAMPAIGN_PHASE_CHANGED],
      ).toBe(NotificationCategory.CAMPAIGNS);
    });

    it("maps mention type to MENTIONS category", () => {
      expect(NOTIFICATION_CATEGORY_MAP[NotificationType.MENTION]).toBe(
        NotificationCategory.MENTIONS,
      );
    });
  });
});
