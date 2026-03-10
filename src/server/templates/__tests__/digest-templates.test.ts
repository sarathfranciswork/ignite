import { describe, it, expect } from "vitest";
import { renderDigestSubject, renderDigestBody } from "../digest-templates";
import type { DigestData } from "../digest-templates";

describe("digest-templates", () => {
  const baseData: DigestData = {
    userName: "Alice",
    frequency: "daily",
    period: "Monday, March 10, 2026",
    groups: [
      {
        label: "Your Ideas",
        count: 3,
        items: [
          {
            title: "Idea got a new comment",
            body: "Great idea!",
            link: "https://app.test/ideas/1",
          },
          { title: "Idea status changed", link: "https://app.test/ideas/2" },
          { title: "New vote on your idea" },
        ],
      },
      {
        label: "Campaign Updates",
        count: 1,
        items: [
          {
            title: "Campaign moved to evaluation",
            link: "https://app.test/campaigns/1",
          },
        ],
      },
    ],
    totalCount: 4,
  };

  describe("renderDigestSubject", () => {
    it("renders daily digest subject with count", () => {
      const result = renderDigestSubject(baseData);
      expect(result).toBe(
        "Daily Digest: 4 notifications — Monday, March 10, 2026",
      );
    });

    it("renders weekly digest subject", () => {
      const weeklyData: DigestData = {
        ...baseData,
        frequency: "weekly",
        period: "Mar 3 – Mar 10",
      };
      const result = renderDigestSubject(weeklyData);
      expect(result).toBe("Weekly Digest: 4 notifications — Mar 3 – Mar 10");
    });

    it("handles singular notification count", () => {
      const singleData: DigestData = { ...baseData, totalCount: 1 };
      const result = renderDigestSubject(singleData);
      expect(result).toContain("1 notification —");
      expect(result).not.toContain("notifications");
    });
  });

  describe("renderDigestBody", () => {
    it("renders digest body with user name", () => {
      const result = renderDigestBody({
        ...baseData,
        appUrl: "https://app.test",
      });
      expect(result).toContain("Alice");
    });

    it("renders digest body with notification groups", () => {
      const result = renderDigestBody({
        ...baseData,
        appUrl: "https://app.test",
      });
      expect(result).toContain("Your Ideas");
      expect(result).toContain("Campaign Updates");
      expect(result).toContain("3"); // idea count
      expect(result).toContain("1"); // campaign count
    });

    it("renders links for items that have them", () => {
      const result = renderDigestBody({
        ...baseData,
        appUrl: "https://app.test",
      });
      expect(result).toContain("https://app.test/ideas/1");
      expect(result).toContain("https://app.test/campaigns/1");
    });

    it("renders view all notifications link", () => {
      const result = renderDigestBody({
        ...baseData,
        appUrl: "https://app.test",
      });
      expect(result).toContain("https://app.test/notifications");
      expect(result).toContain("View All Notifications");
    });

    it("uses correct greeting for daily digest", () => {
      const result = renderDigestBody({
        ...baseData,
        frequency: "daily",
        appUrl: "https://app.test",
      });
      expect(result).toContain("Good morning");
    });

    it("uses correct greeting for weekly digest", () => {
      const result = renderDigestBody({
        ...baseData,
        frequency: "weekly",
        appUrl: "https://app.test",
      });
      expect(result).toContain("weekly summary");
    });
  });
});
