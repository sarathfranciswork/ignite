import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  checkDuplicateOrganization,
  OrganizationServiceError,
  organizationListInput,
  organizationCreateInput,
  organizationUpdateInput,
} from "./organization.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
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

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const orgFindUnique = prisma.organization.findUnique as unknown as Mock;
const orgFindFirst = prisma.organization.findFirst as unknown as Mock;
const orgFindMany = prisma.organization.findMany as unknown as Mock;
const orgCreate = prisma.organization.create as unknown as Mock;
const orgUpdate = prisma.organization.update as unknown as Mock;
const orgDelete = prisma.organization.delete as unknown as Mock;

const mockOrg = {
  id: "org-1",
  name: "Acme Corp",
  description: "A test organization",
  website: "https://acme.com",
  logoUrl: null,
  industry: "Technology",
  location: "San Francisco, CA",
  fundingInfo: "Series B",
  relationshipStatus: "PROSPECT",
  ndaStatus: "NONE",
  isConfidential: false,
  tags: ["fintech", "AI"],
  notes: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { contacts: 3 },
  createdBy: { id: "user-1", name: "Test User", email: "test@example.com" },
};

describe("organization.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Input Validation ───────────────────────────────────

  describe("organizationListInput schema", () => {
    it("accepts valid list input", () => {
      expect(organizationListInput.safeParse({ limit: 20 }).success).toBe(true);
    });

    it("accepts empty input", () => {
      expect(organizationListInput.safeParse({}).success).toBe(true);
    });

    it("accepts relationship status filter", () => {
      expect(organizationListInput.safeParse({ relationshipStatus: "ACTIVE" }).success).toBe(true);
      expect(organizationListInput.safeParse({ relationshipStatus: "PROSPECT" }).success).toBe(
        true,
      );
    });

    it("rejects invalid status", () => {
      expect(organizationListInput.safeParse({ relationshipStatus: "INVALID" }).success).toBe(
        false,
      );
    });
  });

  describe("organizationCreateInput schema", () => {
    it("accepts valid create input", () => {
      expect(
        organizationCreateInput.safeParse({
          name: "Test Org",
          industry: "Technology",
        }).success,
      ).toBe(true);
    });

    it("rejects empty name", () => {
      expect(organizationCreateInput.safeParse({ name: "" }).success).toBe(false);
    });

    it("accepts optional website URL", () => {
      expect(
        organizationCreateInput.safeParse({
          name: "Test",
          website: "https://example.com",
        }).success,
      ).toBe(true);
    });

    it("rejects invalid website URL", () => {
      expect(
        organizationCreateInput.safeParse({
          name: "Test",
          website: "not-a-url",
        }).success,
      ).toBe(false);
    });
  });

  describe("organizationUpdateInput schema", () => {
    it("accepts valid update", () => {
      expect(
        organizationUpdateInput.safeParse({
          id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          name: "Updated",
        }).success,
      ).toBe(true);
    });

    it("allows nullable fields", () => {
      expect(
        organizationUpdateInput.safeParse({
          id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          description: null,
          website: null,
        }).success,
      ).toBe(true);
    });
  });

  // ── listOrganizations ──────────────────────────────────

  describe("listOrganizations", () => {
    it("returns paginated organization list", async () => {
      orgFindMany.mockResolvedValue([mockOrg]);

      const result = await listOrganizations({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.contactCount).toBe(3);
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockOrg,
        id: `org-${i}`,
      }));
      orgFindMany.mockResolvedValue(items);

      const result = await listOrganizations({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("org-2");
    });

    it("filters by search term", async () => {
      orgFindMany.mockResolvedValue([]);

      await listOrganizations({ limit: 20, search: "acme" });

      expect(orgFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ name: { contains: "acme", mode: "insensitive" } }]),
          }),
        }),
      );
    });

    it("filters by relationship status", async () => {
      orgFindMany.mockResolvedValue([]);

      await listOrganizations({ limit: 20, relationshipStatus: "ACTIVE" });

      expect(orgFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relationshipStatus: "ACTIVE",
          }),
        }),
      );
    });

    it("filters by confidentiality", async () => {
      orgFindMany.mockResolvedValue([]);

      await listOrganizations({ limit: 20, isConfidential: true });

      expect(orgFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isConfidential: true,
          }),
        }),
      );
    });
  });

  // ── getOrganizationById ────────────────────────────────

  describe("getOrganizationById", () => {
    it("returns organization with contacts", async () => {
      orgFindUnique.mockResolvedValue({
        ...mockOrg,
        contacts: [
          {
            id: "contact-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@acme.com",
            phone: null,
            jobTitle: "CTO",
            linkedinUrl: null,
            isPrimary: true,
            notes: null,
            inviteStatus: "NOT_INVITED",
            invitedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await getOrganizationById("org-1");

      expect(result.name).toBe("Acme Corp");
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0]?.firstName).toBe("John");
    });

    it("throws if organization not found", async () => {
      orgFindUnique.mockResolvedValue(null);

      await expect(getOrganizationById("missing")).rejects.toThrow(OrganizationServiceError);
      await expect(getOrganizationById("missing")).rejects.toMatchObject({
        code: "ORGANIZATION_NOT_FOUND",
      });
    });
  });

  // ── createOrganization ─────────────────────────────────

  describe("createOrganization", () => {
    it("creates a new organization", async () => {
      orgCreate.mockResolvedValue(mockOrg);

      const result = await createOrganization(
        {
          name: "Acme Corp",
          industry: "Technology",
          location: "San Francisco, CA",
          relationshipStatus: "PROSPECT",
          ndaStatus: "NONE",
          isConfidential: false,
          tags: ["fintech", "AI"],
        },
        "user-1",
      );

      expect(result.id).toBe("org-1");
      expect(result.name).toBe("Acme Corp");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "organization.created",
        expect.objectContaining({ entityId: "org-1" }),
      );
    });
  });

  // ── updateOrganization ─────────────────────────────────

  describe("updateOrganization", () => {
    it("updates organization name", async () => {
      orgFindUnique.mockResolvedValue({ id: "org-1" });
      orgUpdate.mockResolvedValue({
        ...mockOrg,
        name: "Updated Corp",
      });

      const result = await updateOrganization({ id: "org-1", name: "Updated Corp" }, "user-1");

      expect(result.name).toBe("Updated Corp");
      expect(eventBus.emit).toHaveBeenCalledWith("organization.updated", expect.anything());
    });

    it("throws if organization not found", async () => {
      orgFindUnique.mockResolvedValue(null);

      await expect(
        updateOrganization({ id: "missing", name: "X" }, "user-1"),
      ).rejects.toMatchObject({
        code: "ORGANIZATION_NOT_FOUND",
      });
    });
  });

  // ── deleteOrganization ─────────────────────────────────

  describe("deleteOrganization", () => {
    it("deletes an organization", async () => {
      orgFindUnique.mockResolvedValue({ id: "org-1", name: "Acme Corp" });
      orgDelete.mockResolvedValue(undefined);

      const result = await deleteOrganization("org-1", "user-1");

      expect(result.id).toBe("org-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "organization.deleted",
        expect.objectContaining({ entityId: "org-1" }),
      );
    });

    it("throws if organization not found", async () => {
      orgFindUnique.mockResolvedValue(null);

      await expect(deleteOrganization("missing", "user-1")).rejects.toMatchObject({
        code: "ORGANIZATION_NOT_FOUND",
      });
    });
  });

  // ── checkDuplicateOrganization ─────────────────────────

  describe("checkDuplicateOrganization", () => {
    it("returns isDuplicate false when no match", async () => {
      orgFindFirst.mockResolvedValue(null);

      const result = await checkDuplicateOrganization("New Corp");

      expect(result.isDuplicate).toBe(false);
    });

    it("returns isDuplicate true when match found", async () => {
      orgFindFirst.mockResolvedValue({ id: "org-1", name: "Acme Corp" });

      const result = await checkDuplicateOrganization("Acme Corp");

      expect(result.isDuplicate).toBe(true);
      expect(result.existingId).toBe("org-1");
    });
  });
});
