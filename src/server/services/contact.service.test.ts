import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  markContactInvited,
  ContactServiceError,
  contactListInput,
  contactCreateInput,
  contactUpdateInput,
} from "./contact.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
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
const contactFindUnique = prisma.contact.findUnique as unknown as Mock;
const contactFindMany = prisma.contact.findMany as unknown as Mock;
const contactCreate = prisma.contact.create as unknown as Mock;
const contactUpdate = prisma.contact.update as unknown as Mock;
const contactUpdateMany = prisma.contact.updateMany as unknown as Mock;
const contactDelete = prisma.contact.delete as unknown as Mock;

const mockContact = {
  id: "contact-1",
  organizationId: "org-1",
  firstName: "John",
  lastName: "Doe",
  email: "john@acme.com",
  phone: "+1234567890",
  jobTitle: "CTO",
  linkedinUrl: null,
  isPrimary: true,
  notes: null,
  inviteStatus: "NOT_INVITED",
  invitedAt: null,
  invitedBy: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("contact.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Input Validation ───────────────────────────────────

  describe("contactListInput schema", () => {
    it("accepts valid list input", () => {
      expect(
        contactListInput.safeParse({
          organizationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          limit: 20,
        }).success,
      ).toBe(true);
    });

    it("requires organizationId", () => {
      expect(contactListInput.safeParse({ limit: 20 }).success).toBe(false);
    });
  });

  describe("contactCreateInput schema", () => {
    it("accepts valid create input", () => {
      expect(
        contactCreateInput.safeParse({
          organizationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          firstName: "John",
          lastName: "Doe",
        }).success,
      ).toBe(true);
    });

    it("rejects empty first name", () => {
      expect(
        contactCreateInput.safeParse({
          organizationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          firstName: "",
          lastName: "Doe",
        }).success,
      ).toBe(false);
    });

    it("validates email format", () => {
      expect(
        contactCreateInput.safeParse({
          organizationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          firstName: "John",
          lastName: "Doe",
          email: "not-an-email",
        }).success,
      ).toBe(false);
    });
  });

  describe("contactUpdateInput schema", () => {
    it("accepts valid update", () => {
      expect(
        contactUpdateInput.safeParse({
          id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
          firstName: "Jane",
        }).success,
      ).toBe(true);
    });
  });

  // ── listContacts ───────────────────────────────────────

  describe("listContacts", () => {
    it("returns paginated contacts for an organization", async () => {
      contactFindMany.mockResolvedValue([mockContact]);

      const result = await listContacts({
        organizationId: "org-1",
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.firstName).toBe("John");
    });

    it("filters by search term", async () => {
      contactFindMany.mockResolvedValue([]);

      await listContacts({
        organizationId: "org-1",
        limit: 20,
        search: "john",
      });

      expect(contactFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            OR: expect.arrayContaining([{ firstName: { contains: "john", mode: "insensitive" } }]),
          }),
        }),
      );
    });
  });

  // ── createContact ──────────────────────────────────────

  describe("createContact", () => {
    it("creates a new contact", async () => {
      orgFindUnique.mockResolvedValue({ id: "org-1" });
      contactCreate.mockResolvedValue(mockContact);

      const result = await createContact(
        {
          organizationId: "org-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@acme.com",
          isPrimary: false,
        },
        "user-1",
      );

      expect(result.id).toBe("contact-1");
      expect(result.firstName).toBe("John");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "organization.contactAdded",
        expect.objectContaining({ entityId: "contact-1" }),
      );
    });

    it("clears existing primary when creating new primary", async () => {
      orgFindUnique.mockResolvedValue({ id: "org-1" });
      contactUpdateMany.mockResolvedValue({ count: 1 });
      contactCreate.mockResolvedValue({ ...mockContact, isPrimary: true });

      await createContact(
        {
          organizationId: "org-1",
          firstName: "John",
          lastName: "Doe",
          isPrimary: true,
        },
        "user-1",
      );

      expect(contactUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1", isPrimary: true },
          data: { isPrimary: false },
        }),
      );
    });

    it("throws if organization not found", async () => {
      orgFindUnique.mockResolvedValue(null);

      await expect(
        createContact(
          {
            organizationId: "missing",
            firstName: "John",
            lastName: "Doe",
            isPrimary: false,
          },
          "user-1",
        ),
      ).rejects.toMatchObject({
        code: "ORGANIZATION_NOT_FOUND",
      });
    });
  });

  // ── updateContact ──────────────────────────────────────

  describe("updateContact", () => {
    it("updates contact fields", async () => {
      contactFindUnique.mockResolvedValue({
        id: "contact-1",
        organizationId: "org-1",
      });
      contactUpdate.mockResolvedValue({
        ...mockContact,
        firstName: "Jane",
      });

      const result = await updateContact({ id: "contact-1", firstName: "Jane" }, "user-1");

      expect(result.firstName).toBe("Jane");
      expect(eventBus.emit).toHaveBeenCalledWith("organization.contactUpdated", expect.anything());
    });

    it("throws if contact not found", async () => {
      contactFindUnique.mockResolvedValue(null);

      await expect(
        updateContact({ id: "missing", firstName: "Jane" }, "user-1"),
      ).rejects.toMatchObject({
        code: "CONTACT_NOT_FOUND",
      });
    });
  });

  // ── deleteContact ──────────────────────────────────────

  describe("deleteContact", () => {
    it("deletes a contact", async () => {
      contactFindUnique.mockResolvedValue({
        id: "contact-1",
        organizationId: "org-1",
        firstName: "John",
        lastName: "Doe",
      });
      contactDelete.mockResolvedValue(undefined);

      const result = await deleteContact("contact-1", "user-1");

      expect(result.id).toBe("contact-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "organization.contactRemoved",
        expect.objectContaining({ entityId: "contact-1" }),
      );
    });

    it("throws if contact not found", async () => {
      contactFindUnique.mockResolvedValue(null);

      await expect(deleteContact("missing", "user-1")).rejects.toMatchObject({
        code: "CONTACT_NOT_FOUND",
      });
    });
  });

  // ── markContactInvited ─────────────────────────────────

  describe("markContactInvited", () => {
    it("marks a contact as invited", async () => {
      contactFindUnique.mockResolvedValue({
        id: "contact-1",
        email: "john@acme.com",
        organizationId: "org-1",
        inviteStatus: "NOT_INVITED",
      });
      contactUpdate.mockResolvedValue({
        ...mockContact,
        inviteStatus: "INVITED",
        invitedAt: new Date(),
        invitedBy: "user-1",
      });

      const result = await markContactInvited("contact-1", "user-1");

      expect(result.inviteStatus).toBe("INVITED");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "organization.contactInvited",
        expect.objectContaining({ entityId: "contact-1" }),
      );
    });

    it("throws if contact has no email", async () => {
      contactFindUnique.mockResolvedValue({
        id: "contact-1",
        email: null,
        organizationId: "org-1",
        inviteStatus: "NOT_INVITED",
      });

      await expect(markContactInvited("contact-1", "user-1")).rejects.toThrow(ContactServiceError);
      await expect(markContactInvited("contact-1", "user-1")).rejects.toMatchObject({
        code: "CONTACT_NO_EMAIL",
      });
    });

    it("throws if contact not found", async () => {
      contactFindUnique.mockResolvedValue(null);

      await expect(markContactInvited("missing", "user-1")).rejects.toMatchObject({
        code: "CONTACT_NOT_FOUND",
      });
    });
  });
});
