import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createInvitation,
  acceptInvitation,
  revokeInvitation,
  listInvitations,
  revokeUserAccess,
  ExternalInvitationServiceError,
} from "./external-invitation.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    externalInvitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    campaignMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
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

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock("date-fns", () => ({
  addDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const invitationFindFirst = prisma.externalInvitation.findFirst as unknown as Mock;
const invitationFindUnique = prisma.externalInvitation.findUnique as unknown as Mock;
const invitationFindMany = prisma.externalInvitation.findMany as unknown as Mock;
const invitationCreate = prisma.externalInvitation.create as unknown as Mock;
const invitationUpdate = prisma.externalInvitation.update as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userCreate = prisma.user.create as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const campaignMemberFindFirst = prisma.campaignMember.findFirst as unknown as Mock;
const campaignMemberCreate = prisma.campaignMember.create as unknown as Mock;
const campaignMemberDeleteMany = prisma.campaignMember.deleteMany as unknown as Mock;
const _eventBusEmit = eventBus.emit as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInvitation", () => {
  it("should create an invitation successfully", async () => {
    invitationFindFirst.mockResolvedValue(null);
    campaignFindUnique.mockResolvedValue({ id: "camp1" });

    const mockInvitation = {
      id: "inv1",
      email: "guest@example.com",
      inviterUserId: "user1",
      token: "tok1",
      status: "PENDING",
      campaignIds: ["camp1"],
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    invitationCreate.mockResolvedValue(mockInvitation);

    const result = await createInvitation({
      email: "guest@example.com",
      campaignIds: ["camp1"],
      inviterUserId: "user1",
    });

    expect(result).toEqual(mockInvitation);
    expect(invitationCreate).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "externalUser.invited",
      expect.objectContaining({
        entity: "externalInvitation",
        entityId: "inv1",
      }),
    );
  });

  it("should throw on duplicate pending invitation", async () => {
    invitationFindFirst.mockResolvedValue({ id: "existing" });

    await expect(
      createInvitation({
        email: "guest@example.com",
        campaignIds: ["camp1"],
        inviterUserId: "user1",
      }),
    ).rejects.toThrow(ExternalInvitationServiceError);
  });

  it("should throw if campaign not found", async () => {
    invitationFindFirst.mockResolvedValue(null);
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      createInvitation({
        email: "guest@example.com",
        campaignIds: ["nonexistent"],
        inviterUserId: "user1",
      }),
    ).rejects.toThrow("Campaign nonexistent not found");
  });
});

describe("acceptInvitation", () => {
  it("should accept invitation and create new user", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      email: "guest@example.com",
      inviterUserId: "user1",
      token: "tok1",
      status: "PENDING",
      campaignIds: ["camp1"],
      expiresAt: futureDate,
    });

    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue({
      id: "newuser1",
      email: "guest@example.com",
    });
    campaignMemberFindFirst.mockResolvedValue(null);
    campaignMemberCreate.mockResolvedValue({});
    invitationUpdate.mockResolvedValue({});

    const result = await acceptInvitation({ token: "tok1" });

    expect(result.userId).toBe("newuser1");
    expect(result.campaignIds).toEqual(["camp1"]);
    expect(userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "guest@example.com",
        globalRole: "EXTERNAL",
      }),
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "externalUser.accepted",
      expect.objectContaining({
        entity: "externalInvitation",
      }),
    );
  });

  it("should accept invitation and update existing user", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      email: "guest@example.com",
      inviterUserId: "user1",
      token: "tok1",
      status: "PENDING",
      campaignIds: ["camp2"],
      expiresAt: futureDate,
    });

    userFindUnique.mockResolvedValue({
      id: "existinguser",
      externalCampaignIds: ["camp1"],
    });
    userUpdate.mockResolvedValue({});
    campaignMemberFindFirst.mockResolvedValue(null);
    campaignMemberCreate.mockResolvedValue({});
    invitationUpdate.mockResolvedValue({});

    const result = await acceptInvitation({ token: "tok1" });

    expect(result.userId).toBe("existinguser");
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "existinguser" },
      data: {
        globalRole: "EXTERNAL",
        externalCampaignIds: ["camp1", "camp2"],
      },
    });
  });

  it("should throw if invitation not found", async () => {
    invitationFindUnique.mockResolvedValue(null);

    await expect(acceptInvitation({ token: "bad" })).rejects.toThrow("Invitation not found");
  });

  it("should throw if invitation is revoked", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      status: "REVOKED",
    });

    await expect(acceptInvitation({ token: "tok1" })).rejects.toThrow("revoked");
  });

  it("should throw if invitation is already accepted", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      status: "ACCEPTED",
    });

    await expect(acceptInvitation({ token: "tok1" })).rejects.toThrow("already been accepted");
  });

  it("should throw and mark as expired if token is expired", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      status: "PENDING",
      expiresAt: pastDate,
    });
    invitationUpdate.mockResolvedValue({});

    await expect(acceptInvitation({ token: "tok1" })).rejects.toThrow("expired");
    expect(invitationUpdate).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { status: "EXPIRED" },
    });
  });
});

describe("revokeInvitation", () => {
  it("should revoke a pending invitation", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      status: "PENDING",
    });

    const updated = { id: "inv1", status: "REVOKED" };
    invitationUpdate.mockResolvedValue(updated);

    const result = await revokeInvitation({ id: "inv1", revokedBy: "user1" });

    expect(result).toEqual(updated);
    expect(invitationUpdate).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { status: "REVOKED" },
    });
  });

  it("should throw if invitation not found", async () => {
    invitationFindUnique.mockResolvedValue(null);

    await expect(revokeInvitation({ id: "nonexistent", revokedBy: "user1" })).rejects.toThrow(
      "Invitation not found",
    );
  });

  it("should throw if invitation is not pending", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      status: "ACCEPTED",
    });

    await expect(revokeInvitation({ id: "inv1", revokedBy: "user1" })).rejects.toThrow(
      "Only pending invitations can be revoked",
    );
  });
});

describe("listInvitations", () => {
  it("should list invitations with cursor pagination", async () => {
    const mockItems = [
      {
        id: "inv1",
        email: "a@test.com",
        inviter: { id: "u1", name: "Admin", email: "admin@test.com" },
      },
      {
        id: "inv2",
        email: "b@test.com",
        inviter: { id: "u1", name: "Admin", email: "admin@test.com" },
      },
    ];
    invitationFindMany.mockResolvedValue(mockItems);

    const result = await listInvitations({ limit: 50 });

    expect(result.items).toEqual(mockItems);
    expect(result.nextCursor).toBeUndefined();
  });

  it("should filter by campaignId", async () => {
    invitationFindMany.mockResolvedValue([]);

    await listInvitations({ campaignId: "camp1", limit: 50 });

    expect(invitationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignIds: { has: "camp1" } },
      }),
    );
  });

  it("should return nextCursor when more items exist", async () => {
    const mockItems = Array.from({ length: 4 }, (_, i) => ({
      id: `inv${i}`,
      email: `${i}@test.com`,
    }));
    invitationFindMany.mockResolvedValue(mockItems);

    const result = await listInvitations({ limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBe("inv3");
  });
});

describe("revokeUserAccess", () => {
  it("should revoke access for an external user", async () => {
    userFindUnique.mockResolvedValue({
      id: "user1",
      globalRole: "EXTERNAL",
      externalCampaignIds: ["camp1", "camp2"],
    });
    userUpdate.mockResolvedValue({});
    campaignMemberDeleteMany.mockResolvedValue({ count: 1 });

    const result = await revokeUserAccess({
      userId: "user1",
      campaignId: "camp1",
      revokedBy: "admin1",
    });

    expect(result.remainingCampaignIds).toEqual(["camp2"]);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { externalCampaignIds: ["camp2"] },
    });
    expect(campaignMemberDeleteMany).toHaveBeenCalledWith({
      where: { campaignId: "camp1", userId: "user1" },
    });
  });

  it("should throw if user not found", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(
      revokeUserAccess({ userId: "nonexistent", campaignId: "camp1", revokedBy: "admin1" }),
    ).rejects.toThrow("User not found");
  });

  it("should throw if user is not external", async () => {
    userFindUnique.mockResolvedValue({
      id: "user1",
      globalRole: "MEMBER",
      externalCampaignIds: [],
    });

    await expect(
      revokeUserAccess({ userId: "user1", campaignId: "camp1", revokedBy: "admin1" }),
    ).rejects.toThrow("not an external user");
  });
});
