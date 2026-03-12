import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createScimUser,
  getScimUser,
  listScimUsers,
  updateScimUser,
  patchScimUser,
  deleteScimUser,
  createScimGroup,
  getScimGroup,
  listScimGroups,
  updateScimGroup,
  patchScimGroup,
  deleteScimGroup,
  createScimToken,
  listScimTokens,
  revokeScimToken,
  validateScimToken,
  getScimStats,
  getServiceProviderConfig,
  getSchemas,
  getResourceTypes,
  ScimServiceError,
} from "./scim.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    scimToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    userGroup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    userGroupMembership: {
      createMany: vi.fn(),
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
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("$2a$12$hashed_token"),
  compare: vi.fn(),
}));

vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue("a".repeat(64)),
    }),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const bcryptjs = await import("bcryptjs");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const userFindMany = prisma.user.findMany as unknown as Mock;
const userCreate = prisma.user.create as unknown as Mock;
const userUpdate = prisma.user.update as unknown as Mock;
const userCount = prisma.user.count as unknown as Mock;
const sessionDeleteMany = prisma.session.deleteMany as unknown as Mock;
const scimTokenCreate = prisma.scimToken.create as unknown as Mock;
const scimTokenFindUnique = prisma.scimToken.findUnique as unknown as Mock;
const scimTokenFindMany = prisma.scimToken.findMany as unknown as Mock;
const scimTokenFindFirst = prisma.scimToken.findFirst as unknown as Mock;
const scimTokenUpdate = prisma.scimToken.update as unknown as Mock;
const scimTokenCount = prisma.scimToken.count as unknown as Mock;
const groupFindUnique = prisma.userGroup.findUnique as unknown as Mock;
const groupFindMany = prisma.userGroup.findMany as unknown as Mock;
const groupCreate = prisma.userGroup.create as unknown as Mock;
const groupUpdate = prisma.userGroup.update as unknown as Mock;
const groupDelete = prisma.userGroup.delete as unknown as Mock;
const groupCount = prisma.userGroup.count as unknown as Mock;
const membershipCreateMany = prisma.userGroupMembership.createMany as unknown as Mock;
const membershipDeleteMany = prisma.userGroupMembership.deleteMany as unknown as Mock;

const mockUser = {
  id: "user1",
  email: "john@example.com",
  name: "John Doe",
  isActive: true,
  scimExternalId: "ext-123",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

const mockGroup = {
  id: "group1",
  name: "Engineering",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
  members: [
    {
      user: { id: "user1", email: "john@example.com", name: "John Doe" },
    },
  ],
};

describe("scim.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Token Management ──────────────────────────────────────────

  describe("createScimToken", () => {
    it("creates a token and returns plaintext", async () => {
      scimTokenCreate.mockResolvedValue({
        id: "token1",
        name: "Azure AD",
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      });

      const result = await createScimToken({ name: "Azure AD" }, "admin1");

      expect(scimTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Azure AD",
            createdById: "admin1",
          }),
        }),
      );
      expect(result.plainToken).toContain("scim_");
    });
  });

  describe("listScimTokens", () => {
    it("returns paginated tokens", async () => {
      const tokens = [
        {
          id: "t1",
          name: "Token 1",
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          createdBy: { id: "u1", name: "Admin", email: "admin@test.com" },
        },
      ];
      scimTokenFindMany.mockResolvedValue(tokens);

      const result = await listScimTokens({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("revokeScimToken", () => {
    it("revokes an active token", async () => {
      scimTokenFindUnique.mockResolvedValue({ id: "token1" });
      scimTokenUpdate.mockResolvedValue({ id: "token1", isActive: false });

      const result = await revokeScimToken("token1");
      expect(result.success).toBe(true);
    });

    it("throws when token not found", async () => {
      scimTokenFindUnique.mockResolvedValue(null);

      await expect(revokeScimToken("nonexistent")).rejects.toThrow(ScimServiceError);
    });
  });

  describe("validateScimToken", () => {
    it("validates a correct token", async () => {
      scimTokenFindMany.mockResolvedValue([
        { id: "t1", tokenHash: "$2a$12$hashed", expiresAt: null },
      ]);
      (bcryptjs.compare as unknown as Mock).mockResolvedValue(true);
      scimTokenUpdate.mockResolvedValue({});

      const result = await validateScimToken("scim_test_token");
      expect(result).toBe(true);
    });

    it("rejects an invalid token", async () => {
      scimTokenFindMany.mockResolvedValue([
        { id: "t1", tokenHash: "$2a$12$hashed", expiresAt: null },
      ]);
      (bcryptjs.compare as unknown as Mock).mockResolvedValue(false);

      const result = await validateScimToken("scim_wrong_token");
      expect(result).toBe(false);
    });

    it("skips expired tokens", async () => {
      scimTokenFindMany.mockResolvedValue([
        { id: "t1", tokenHash: "$2a$12$hashed", expiresAt: new Date("2020-01-01") },
      ]);

      const result = await validateScimToken("scim_test_token");
      expect(result).toBe(false);
    });
  });

  describe("getScimStats", () => {
    it("returns aggregated stats", async () => {
      scimTokenCount.mockResolvedValue(2);
      userCount.mockResolvedValue(10);
      scimTokenFindFirst.mockResolvedValue({ lastUsedAt: new Date("2026-03-01") });

      const result = await getScimStats();
      expect(result.activeTokens).toBe(2);
      expect(result.provisionedUsers).toBe(10);
      expect(result.lastSyncAt).toBeTruthy();
    });
  });

  // ── SCIM User Operations ──────────────────────────────────────

  describe("createScimUser", () => {
    it("creates a user from SCIM payload", async () => {
      userFindUnique.mockResolvedValue(null);
      userCreate.mockResolvedValue(mockUser);

      const result = await createScimUser({
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
        userName: "john@example.com",
        displayName: "John Doe",
        externalId: "ext-123",
        active: true,
      });

      expect(result.schemas).toContain("urn:ietf:params:scim:schemas:core:2.0:User");
      expect(result.userName).toBe("john@example.com");
      expect(result.id).toBe("user1");
      expect(eventBus.emit).toHaveBeenCalledWith("scim.userProvisioned", expect.anything());
    });

    it("throws when user already exists", async () => {
      userFindUnique.mockResolvedValue(mockUser);

      await expect(
        createScimUser({
          schemas: [],
          userName: "john@example.com",
          active: true,
        }),
      ).rejects.toThrow(ScimServiceError);
    });
  });

  describe("getScimUser", () => {
    it("returns a SCIM-formatted user", async () => {
      userFindUnique.mockResolvedValue(mockUser);

      const result = await getScimUser("user1");
      expect(result.id).toBe("user1");
      expect(result.userName).toBe("john@example.com");
    });

    it("throws when user not found", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(getScimUser("nonexistent")).rejects.toThrow(ScimServiceError);
    });
  });

  describe("listScimUsers", () => {
    it("returns paginated SCIM user list", async () => {
      userFindMany.mockResolvedValue([mockUser]);
      userCount.mockResolvedValue(1);

      const result = await listScimUsers({ startIndex: 1, count: 100 });
      expect(result.totalResults).toBe(1);
      expect(result.Resources).toHaveLength(1);
    });

    it("supports userName eq filter", async () => {
      userFindMany.mockResolvedValue([mockUser]);
      userCount.mockResolvedValue(1);

      await listScimUsers({
        filter: 'userName eq "john@example.com"',
        startIndex: 1,
        count: 100,
      });

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "john@example.com" },
        }),
      );
    });

    it("throws on unsupported filter field", async () => {
      await expect(
        listScimUsers({
          filter: 'unsupported eq "val"',
          startIndex: 1,
          count: 100,
        }),
      ).rejects.toThrow(ScimServiceError);
    });
  });

  describe("updateScimUser", () => {
    it("replaces user attributes", async () => {
      userFindUnique.mockResolvedValue(mockUser);
      userUpdate.mockResolvedValue(mockUser);

      const result = await updateScimUser("user1", {
        schemas: [],
        userName: "john@example.com",
        displayName: "John Updated",
        active: true,
      });

      expect(result.id).toBe("user1");
    });

    it("throws when user not found", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(
        updateScimUser("nonexistent", {
          schemas: [],
          userName: "test@example.com",
          active: true,
        }),
      ).rejects.toThrow(ScimServiceError);
    });
  });

  describe("patchScimUser", () => {
    it("patches active to false and invalidates sessions", async () => {
      userFindUnique.mockResolvedValueOnce({ ...mockUser, isActive: true });
      userUpdate.mockResolvedValue({ ...mockUser, isActive: false });

      await patchScimUser("user1", {
        schemas: [],
        Operations: [{ op: "replace", path: "active", value: false }],
      });

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user1" } });
      expect(eventBus.emit).toHaveBeenCalledWith("scim.userDeprovisioned", expect.anything());
    });

    it("returns user unchanged when no operations apply", async () => {
      userFindUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(mockUser);

      const result = await patchScimUser("user1", {
        schemas: [],
        Operations: [{ op: "remove", path: "unknownField" }],
      });

      expect(result.id).toBe("user1");
    });
  });

  describe("deleteScimUser", () => {
    it("deactivates user and clears sessions", async () => {
      userFindUnique.mockResolvedValue(mockUser);
      userUpdate.mockResolvedValue({ ...mockUser, isActive: false });
      sessionDeleteMany.mockResolvedValue({ count: 1 });

      await deleteScimUser("user1");

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
      expect(sessionDeleteMany).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith("scim.userDeprovisioned", expect.anything());
    });
  });

  // ── SCIM Group Operations ─────────────────────────────────────

  describe("createScimGroup", () => {
    it("creates a group from SCIM payload", async () => {
      groupFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockGroup);
      groupCreate.mockResolvedValue(mockGroup);

      const result = await createScimGroup({
        schemas: [],
        displayName: "Engineering",
      });

      expect(result.displayName).toBe("Engineering");
      expect(eventBus.emit).toHaveBeenCalledWith("scim.groupSynced", expect.anything());
    });

    it("throws when group already exists", async () => {
      groupFindUnique.mockResolvedValue(mockGroup);

      await expect(createScimGroup({ schemas: [], displayName: "Engineering" })).rejects.toThrow(
        ScimServiceError,
      );
    });
  });

  describe("getScimGroup", () => {
    it("returns a SCIM-formatted group", async () => {
      groupFindUnique.mockResolvedValue(mockGroup);

      const result = await getScimGroup("group1");
      expect(result.displayName).toBe("Engineering");
      expect(result.members).toHaveLength(1);
    });

    it("throws when group not found", async () => {
      groupFindUnique.mockResolvedValue(null);

      await expect(getScimGroup("nonexistent")).rejects.toThrow(ScimServiceError);
    });
  });

  describe("listScimGroups", () => {
    it("returns paginated SCIM group list", async () => {
      groupFindMany.mockResolvedValue([mockGroup]);
      groupCount.mockResolvedValue(1);

      const result = await listScimGroups({ startIndex: 1, count: 100 });
      expect(result.totalResults).toBe(1);
      expect(result.Resources).toHaveLength(1);
    });
  });

  describe("updateScimGroup", () => {
    it("replaces group attributes and members", async () => {
      groupFindUnique.mockResolvedValueOnce(mockGroup).mockResolvedValueOnce(mockGroup);
      groupUpdate.mockResolvedValue(mockGroup);
      membershipDeleteMany.mockResolvedValue({ count: 0 });
      membershipCreateMany.mockResolvedValue({ count: 1 });

      const result = await updateScimGroup("group1", {
        schemas: [],
        displayName: "Engineering",
        members: [{ value: "user1" }],
      });

      expect(result.displayName).toBe("Engineering");
      expect(eventBus.emit).toHaveBeenCalledWith("scim.groupSynced", expect.anything());
    });
  });

  describe("patchScimGroup", () => {
    it("adds members via patch", async () => {
      groupFindUnique.mockResolvedValueOnce(mockGroup).mockResolvedValueOnce(mockGroup);
      membershipCreateMany.mockResolvedValue({ count: 1 });

      await patchScimGroup("group1", {
        schemas: [],
        Operations: [{ op: "add", path: "members", value: [{ value: "user2" }] }],
      });

      expect(membershipCreateMany).toHaveBeenCalled();
    });

    it("removes members via patch filter path", async () => {
      groupFindUnique.mockResolvedValueOnce(mockGroup).mockResolvedValueOnce(mockGroup);
      membershipDeleteMany.mockResolvedValue({ count: 1 });

      await patchScimGroup("group1", {
        schemas: [],
        Operations: [{ op: "remove", path: 'members[value eq "user1"]' }],
      });

      expect(membershipDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: "group1", userId: "user1" },
        }),
      );
    });
  });

  describe("deleteScimGroup", () => {
    it("deletes a group", async () => {
      groupFindUnique.mockResolvedValue(mockGroup);
      groupDelete.mockResolvedValue(mockGroup);

      await deleteScimGroup("group1");
      expect(groupDelete).toHaveBeenCalledWith({ where: { id: "group1" } });
    });
  });

  // ── Discovery Endpoints ───────────────────────────────────────

  describe("getServiceProviderConfig", () => {
    it("returns config with patch support", () => {
      const config = getServiceProviderConfig();
      expect(config.patch.supported).toBe(true);
      expect(config.filter.supported).toBe(true);
    });
  });

  describe("getSchemas", () => {
    it("returns User and Group schemas", () => {
      const schemas = getSchemas();
      expect(schemas.totalResults).toBe(2);
    });
  });

  describe("getResourceTypes", () => {
    it("returns User and Group resource types", () => {
      const types = getResourceTypes();
      expect(types.totalResults).toBe(2);
    });
  });
});
