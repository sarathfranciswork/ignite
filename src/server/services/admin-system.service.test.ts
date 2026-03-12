import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
    },
    campaign: {
      count: vi.fn(),
    },
    idea: {
      count: vi.fn(),
    },
    channel: {
      count: vi.fn(),
    },
    evaluationSession: {
      count: vi.fn(),
    },
  },
}));

// Mock Redis
vi.mock("@/server/lib/redis", () => ({
  isRedisAvailable: vi.fn(() => false),
}));

// Mock health service
vi.mock("@/server/services/health.service", () => ({
  performHealthCheck: vi.fn(() =>
    Promise.resolve({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: 1000,
      version: "0.1.0",
      response_time_ms: 5,
      memory: {
        heap_used_bytes: 50_000_000,
        heap_total_bytes: 100_000_000,
        rss_bytes: 150_000_000,
        heap_used_mb: 50,
        heap_total_mb: 100,
      },
      cpu: { user_ms: 100, system_ms: 50 },
      checks: {
        database: { status: "ok", latency_ms: 2 },
        redis: { status: "skipped" },
        s3: { status: "skipped" },
      },
    }),
  ),
}));

// Mock logger
vi.mock("@/server/lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { prisma } from "@/server/lib/prisma";
import {
  getSystemStats,
  getSmtpStatus,
  getStorageStatus,
  getSystemOverview,
  getTerminology,
  updateTerminology,
  resetTerminology,
} from "./admin-system.service";

describe("admin-system.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset terminology to defaults
    resetTerminology();
  });

  describe("getSystemStats", () => {
    it("returns aggregated stats from prisma", async () => {
      const mockCount = vi.mocked(prisma.user.count);
      mockCount
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(90) // active users
        .mockResolvedValueOnce(5) // admin users
        .mockResolvedValueOnce(10); // manager users

      vi.mocked(prisma.campaign.count)
        .mockResolvedValueOnce(20) // total campaigns
        .mockResolvedValueOnce(8); // active campaigns

      vi.mocked(prisma.idea.count).mockResolvedValueOnce(500);
      vi.mocked(prisma.channel.count).mockResolvedValueOnce(15);
      vi.mocked(prisma.evaluationSession.count).mockResolvedValueOnce(30);

      const stats = await getSystemStats();

      expect(stats.users.total).toBe(100);
      expect(stats.users.active).toBe(90);
      expect(stats.users.inactive).toBe(10);
      expect(stats.users.admins).toBe(5);
      expect(stats.users.managers).toBe(10);
      expect(stats.users.members).toBe(85);
      expect(stats.campaigns.total).toBe(20);
      expect(stats.campaigns.active).toBe(8);
      expect(stats.ideas.total).toBe(500);
      expect(stats.channels.total).toBe(15);
      expect(stats.evaluationSessions.total).toBe(30);
    });
  });

  describe("getSmtpStatus", () => {
    it("returns not configured when no env vars set", () => {
      delete process.env.SMTP_HOST;
      delete process.env.EMAIL_SERVER_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.EMAIL_SERVER_PORT;
      delete process.env.EMAIL_FROM;
      delete process.env.SMTP_FROM;

      const status = getSmtpStatus();
      expect(status.configured).toBe(false);
      expect(status.host).toBeNull();
    });

    it("returns configured when SMTP_HOST is set", () => {
      process.env.SMTP_HOST = "https://smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.EMAIL_FROM = "noreply@example.com";

      const status = getSmtpStatus();
      expect(status.configured).toBe(true);
      expect(status.host).toBe("https://smtp.example.com");
      expect(status.port).toBe(587);
      expect(status.fromAddress).toBe("noreply@example.com");

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.EMAIL_FROM;
    });
  });

  describe("getStorageStatus", () => {
    it("returns not configured when no env vars set", () => {
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_BUCKET;

      const status = getStorageStatus();
      expect(status.configured).toBe(false);
    });

    it("returns configured when S3 vars are set", () => {
      process.env.S3_ENDPOINT = "http://minio:9000";
      process.env.S3_BUCKET = "ignite-uploads";
      process.env.S3_REGION = "us-east-1";

      const status = getStorageStatus();
      expect(status.configured).toBe(true);
      expect(status.bucket).toBe("ignite-uploads");
      expect(status.region).toBe("us-east-1");

      delete process.env.S3_ENDPOINT;
      delete process.env.S3_BUCKET;
      delete process.env.S3_REGION;
    });
  });

  describe("getSystemOverview", () => {
    it("combines stats, health, smtp, storage, and redis info", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.campaign.count).mockResolvedValue(0);
      vi.mocked(prisma.idea.count).mockResolvedValue(0);
      vi.mocked(prisma.channel.count).mockResolvedValue(0);
      vi.mocked(prisma.evaluationSession.count).mockResolvedValue(0);

      const overview = await getSystemOverview();

      expect(overview).toHaveProperty("stats");
      expect(overview).toHaveProperty("health");
      expect(overview).toHaveProperty("smtp");
      expect(overview).toHaveProperty("storage");
      expect(overview).toHaveProperty("redis");
      expect(overview.health.status).toBe("ok");
    });
  });

  describe("terminology", () => {
    it("returns default terminology", () => {
      const term = getTerminology();
      expect(term.campaign).toBe("Campaign");
      expect(term.idea).toBe("Idea");
      expect(term.channel).toBe("Channel");
      expect(term.evaluation).toBe("Evaluation");
      expect(term.bucket).toBe("Bucket");
    });

    it("updates terminology", () => {
      const updated = updateTerminology({
        campaign: "Challenge",
        idea: "Proposal",
      });

      expect(updated.campaign).toBe("Challenge");
      expect(updated.idea).toBe("Proposal");
      expect(updated.channel).toBe("Channel"); // unchanged
    });

    it("resets terminology to defaults", () => {
      updateTerminology({ campaign: "Contest" });
      const reset = resetTerminology();

      expect(reset.campaign).toBe("Campaign");
    });

    it("does not mutate returned object", () => {
      const term1 = getTerminology();
      term1.campaign = "Mutated";

      const term2 = getTerminology();
      expect(term2.campaign).toBe("Campaign");
    });
  });
});
