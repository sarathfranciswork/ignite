import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  configureResidency,
  getResidencyConfig,
  getDataLocationReport,
} from "./data-residency.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    dataResidencyConfig: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    idea: { count: vi.fn() },
    user: { count: vi.fn() },
    comment: { count: vi.fn() },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
  },
}));

const { prisma } = await import("@/server/lib/prisma");

const configUpsert = prisma.dataResidencyConfig.upsert as unknown as Mock;
const configFindUnique = prisma.dataResidencyConfig.findUnique as unknown as Mock;
const ideaCount = prisma.idea.count as unknown as Mock;
const userCount = prisma.user.count as unknown as Mock;
const commentCount = prisma.comment.count as unknown as Mock;

const mockConfig = {
  id: "config1",
  spaceId: "space1",
  region: "EU",
  dataRetentionDays: 365,
  createdAt: new Date(),
  updatedAt: new Date(),
  space: { id: "space1", name: "Test Space" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("configureResidency", () => {
  it("creates or updates residency config", async () => {
    configUpsert.mockResolvedValue(mockConfig);

    const result = await configureResidency({
      spaceId: "space1",
      region: "EU",
      dataRetentionDays: 365,
    });

    expect(result.region).toBe("EU");
    expect(configUpsert).toHaveBeenCalledOnce();
  });
});

describe("getResidencyConfig", () => {
  it("returns config when it exists", async () => {
    configFindUnique.mockResolvedValue(mockConfig);

    const result = await getResidencyConfig({ spaceId: "space1" });

    expect(result?.region).toBe("EU");
  });

  it("returns null when no config", async () => {
    configFindUnique.mockResolvedValue(null);

    const result = await getResidencyConfig({ spaceId: "space1" });

    expect(result).toBeNull();
  });
});

describe("getDataLocationReport", () => {
  it("returns data location report", async () => {
    configFindUnique.mockResolvedValue(mockConfig);
    ideaCount.mockResolvedValue(100);
    userCount.mockResolvedValue(50);
    commentCount.mockResolvedValue(200);

    const result = await getDataLocationReport("space1");

    expect(result.region).toBe("EU");
    expect(result.stats.ideas).toBe(100);
    expect(result.stats.users).toBe(50);
    expect(result.stats.comments).toBe(200);
    expect(result.storageLocation).toBe("EU Data Center");
  });

  it("returns defaults when no config", async () => {
    configFindUnique.mockResolvedValue(null);
    ideaCount.mockResolvedValue(0);
    userCount.mockResolvedValue(0);
    commentCount.mockResolvedValue(0);

    const result = await getDataLocationReport("space1");

    expect(result.region).toBe("US");
    expect(result.dataRetentionDays).toBe(365);
    expect(result.storageLocation).toBe("US Data Center");
  });
});
