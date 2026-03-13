import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  addIpRange,
  removeIpRange,
  listIpRanges,
  checkIp,
  toggleIpRange,
  isIpInCidr,
} from "./ip-whitelist.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    ipWhitelist: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const ipCreate = prisma.ipWhitelist.create as unknown as Mock;
const ipFindUnique = prisma.ipWhitelist.findUnique as unknown as Mock;
const ipFindFirst = prisma.ipWhitelist.findFirst as unknown as Mock;
const ipFindMany = prisma.ipWhitelist.findMany as unknown as Mock;
const ipUpdate = prisma.ipWhitelist.update as unknown as Mock;
const ipDelete = prisma.ipWhitelist.delete as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockEntry = {
  id: "ip1",
  spaceId: "space1",
  cidr: "10.0.0.0/8",
  description: "Private network",
  isActive: true,
  createdById: "user1",
  createdAt: new Date(),
  createdBy: { id: "user1", name: "Admin", email: "admin@test.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isIpInCidr", () => {
  it("matches IP in /8 range", () => {
    expect(isIpInCidr("10.1.2.3", "10.0.0.0/8")).toBe(true);
    expect(isIpInCidr("11.0.0.1", "10.0.0.0/8")).toBe(false);
  });

  it("matches IP in /24 range", () => {
    expect(isIpInCidr("192.168.1.100", "192.168.1.0/24")).toBe(true);
    expect(isIpInCidr("192.168.2.1", "192.168.1.0/24")).toBe(false);
  });

  it("matches IP in /32 range (single IP)", () => {
    expect(isIpInCidr("1.2.3.4", "1.2.3.4/32")).toBe(true);
    expect(isIpInCidr("1.2.3.5", "1.2.3.4/32")).toBe(false);
  });

  it("matches IP in /16 range", () => {
    expect(isIpInCidr("172.16.5.10", "172.16.0.0/16")).toBe(true);
    expect(isIpInCidr("172.17.0.1", "172.16.0.0/16")).toBe(false);
  });

  it("matches all IPs in /0 range", () => {
    expect(isIpInCidr("1.2.3.4", "0.0.0.0/0")).toBe(true);
    expect(isIpInCidr("255.255.255.255", "0.0.0.0/0")).toBe(true);
  });

  it("returns false for invalid CIDR", () => {
    expect(isIpInCidr("10.0.0.1", "invalid")).toBe(false);
  });

  it("returns false for invalid IP", () => {
    expect(isIpInCidr("not-an-ip", "10.0.0.0/8")).toBe(false);
  });
});

describe("addIpRange", () => {
  it("adds a new IP range", async () => {
    ipFindFirst.mockResolvedValue(null);
    ipCreate.mockResolvedValue(mockEntry);

    const result = await addIpRange(
      { spaceId: "space1", cidr: "10.0.0.0/8", description: "Private network" },
      "user1",
    );

    expect(result.cidr).toBe("10.0.0.0/8");
    expect(ipCreate).toHaveBeenCalledOnce();
    expect(mockEmit).toHaveBeenCalledWith(
      "ipWhitelist.updated",
      expect.objectContaining({ entity: "IpWhitelist" }),
    );
  });

  it("throws for invalid CIDR", async () => {
    await expect(addIpRange({ spaceId: "space1", cidr: "invalid" }, "user1")).rejects.toMatchObject(
      { code: "INVALID_CIDR" },
    );
  });

  it("throws for duplicate range", async () => {
    ipFindFirst.mockResolvedValue(mockEntry);

    await expect(
      addIpRange({ spaceId: "space1", cidr: "10.0.0.0/8" }, "user1"),
    ).rejects.toMatchObject({ code: "DUPLICATE_RANGE" });
  });
});

describe("removeIpRange", () => {
  it("removes an IP range", async () => {
    ipFindUnique.mockResolvedValue(mockEntry);
    ipDelete.mockResolvedValue(mockEntry);

    await removeIpRange("ip1", "user1");

    expect(ipDelete).toHaveBeenCalledWith({ where: { id: "ip1" } });
    expect(mockEmit).toHaveBeenCalledWith(
      "ipWhitelist.updated",
      expect.objectContaining({ metadata: expect.objectContaining({ action: "removed" }) }),
    );
  });

  it("throws for missing range", async () => {
    ipFindUnique.mockResolvedValue(null);

    await expect(removeIpRange("missing", "user1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("listIpRanges", () => {
  it("returns all ranges for a space", async () => {
    ipFindMany.mockResolvedValue([mockEntry]);

    const result = await listIpRanges({ spaceId: "space1" });

    expect(result.items).toHaveLength(1);
  });
});

describe("checkIp", () => {
  it("allows IP when in whitelist", async () => {
    ipFindMany.mockResolvedValue([{ cidr: "10.0.0.0/8" }]);

    const result = await checkIp("space1", "10.1.2.3");

    expect(result).toBe(true);
  });

  it("denies IP when not in whitelist", async () => {
    ipFindMany.mockResolvedValue([{ cidr: "10.0.0.0/8" }]);

    const result = await checkIp("space1", "192.168.1.1");

    expect(result).toBe(false);
  });

  it("allows all IPs when no whitelist entries", async () => {
    ipFindMany.mockResolvedValue([]);

    const result = await checkIp("space1", "1.2.3.4");

    expect(result).toBe(true);
  });

  it("checks multiple CIDR ranges", async () => {
    ipFindMany.mockResolvedValue([{ cidr: "10.0.0.0/8" }, { cidr: "192.168.0.0/16" }]);

    expect(await checkIp("space1", "10.1.2.3")).toBe(true);
    expect(await checkIp("space1", "192.168.1.1")).toBe(true);
    expect(await checkIp("space1", "172.16.0.1")).toBe(false);
  });
});

describe("toggleIpRange", () => {
  it("toggles an IP range", async () => {
    ipFindUnique.mockResolvedValue(mockEntry);
    ipUpdate.mockResolvedValue({ ...mockEntry, isActive: false });

    const result = await toggleIpRange({ id: "ip1", isActive: false }, "user1");

    expect(result.isActive).toBe(false);
    expect(ipUpdate).toHaveBeenCalledOnce();
  });

  it("throws for missing range", async () => {
    ipFindUnique.mockResolvedValue(null);

    await expect(toggleIpRange({ id: "missing", isActive: false }, "user1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
