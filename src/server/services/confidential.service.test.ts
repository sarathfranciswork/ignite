import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  setIdeaConfidential,
  getIdeaByIdWithConfidentialCheck,
  listIdeasWithConfidentialFilter,
  canAccessConfidentialIdea,
} from "./idea.service";
import {
  setOrganizationConfidential,
  getOrganizationByIdWithConfidentialCheck,
} from "./organization.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const ideaFindMany = prisma.idea.findMany as unknown as Mock;
const ideaUpdate = prisma.idea.update as unknown as Mock;
const orgFindUnique = prisma.organization.findUnique as unknown as Mock;
const orgUpdate = prisma.organization.update as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const baseIdea = {
  id: "idea-1",
  title: "Test Idea",
  teaser: "Teaser",
  description: "Description",
  status: "DRAFT" as const,
  previousStatus: null,
  campaignId: "campaign-1",
  contributorId: "user-1",
  category: null,
  tags: [],
  customFieldValues: null,
  attachments: null,
  isConfidential: false,
  inventionDisclosure: false,
  likesCount: 0,
  commentsCount: 0,
  viewsCount: 0,
  submittedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  contributor: { id: "user-1", name: "Test User", email: "test@test.com", image: null },
  coAuthors: [],
  campaign: { id: "campaign-1", title: "Campaign", status: "SUBMISSION" },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("setIdeaConfidential", () => {
  it("should set idea as confidential when campaign allows it", async () => {
    ideaFindUnique
      .mockResolvedValueOnce({
        id: "idea-1",
        isConfidential: false,
        campaignId: "campaign-1",
        campaign: { isConfidentialAllowed: true },
      })
      .mockResolvedValueOnce(undefined); // second call won't happen since idea changes

    ideaUpdate.mockResolvedValueOnce({ ...baseIdea, isConfidential: true });

    const result = await setIdeaConfidential({ id: "idea-1", isConfidential: true }, "user-1");

    expect(result.isConfidential).toBe(true);
    expect(ideaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "idea-1" },
        data: { isConfidential: true },
      }),
    );
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.confidentialityChanged",
      expect.objectContaining({
        entity: "idea",
        entityId: "idea-1",
        metadata: expect.objectContaining({ isConfidential: true }),
      }),
    );
  });

  it("should throw when campaign does not allow confidential ideas", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      id: "idea-1",
      isConfidential: false,
      campaignId: "campaign-1",
      campaign: { isConfidentialAllowed: false },
    });

    await expect(
      setIdeaConfidential({ id: "idea-1", isConfidential: true }, "user-1"),
    ).rejects.toThrow("Confidential ideas are not allowed in this campaign");
  });

  it("should throw when idea not found", async () => {
    ideaFindUnique.mockResolvedValueOnce(null);

    await expect(
      setIdeaConfidential({ id: "idea-missing", isConfidential: true }, "user-1"),
    ).rejects.toThrow("Idea not found");
  });

  it("should return existing idea when confidentiality not changed", async () => {
    ideaFindUnique
      .mockResolvedValueOnce({
        id: "idea-1",
        isConfidential: true,
        campaignId: "campaign-1",
        campaign: { isConfidentialAllowed: true },
      })
      .mockResolvedValueOnce(baseIdea);

    const result = await setIdeaConfidential({ id: "idea-1", isConfidential: true }, "user-1");

    expect(ideaUpdate).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
    expect(result.id).toBe("idea-1");
  });
});

describe("getIdeaByIdWithConfidentialCheck", () => {
  it("should return idea when not confidential", async () => {
    ideaFindUnique.mockResolvedValueOnce(baseIdea);

    const result = await getIdeaByIdWithConfidentialCheck("idea-1", "user-2", false);
    expect(result.id).toBe("idea-1");
  });

  it("should return confidential idea to contributor", async () => {
    ideaFindUnique.mockResolvedValueOnce({ ...baseIdea, isConfidential: true });

    const result = await getIdeaByIdWithConfidentialCheck("idea-1", "user-1", false);
    expect(result.id).toBe("idea-1");
  });

  it("should return confidential idea when user has read-confidential permission", async () => {
    ideaFindUnique.mockResolvedValueOnce({ ...baseIdea, isConfidential: true });

    const result = await getIdeaByIdWithConfidentialCheck("idea-1", "user-2", true);
    expect(result.id).toBe("idea-1");
  });

  it("should throw for non-contributor accessing confidential idea without permission", async () => {
    ideaFindUnique.mockResolvedValueOnce({ ...baseIdea, isConfidential: true });

    await expect(getIdeaByIdWithConfidentialCheck("idea-1", "user-2", false)).rejects.toThrow(
      "Idea not found",
    );
  });

  it("should return confidential idea to co-author", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      isConfidential: true,
      coAuthors: [
        { id: "ca-1", user: { id: "user-2", name: "Co", email: "co@t.com", image: null } },
      ],
    });

    const result = await getIdeaByIdWithConfidentialCheck("idea-1", "user-2", false);
    expect(result.id).toBe("idea-1");
  });
});

describe("canAccessConfidentialIdea", () => {
  it("should return true for contributor", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      contributorId: "user-1",
      coAuthors: [],
    });

    const result = await canAccessConfidentialIdea("idea-1", "user-1");
    expect(result).toBe(true);
  });

  it("should return true for co-author", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      contributorId: "user-1",
      coAuthors: [{ userId: "user-2" }],
    });

    const result = await canAccessConfidentialIdea("idea-1", "user-2");
    expect(result).toBe(true);
  });

  it("should return false for non-contributor, non-co-author", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      contributorId: "user-1",
      coAuthors: [],
    });

    const result = await canAccessConfidentialIdea("idea-1", "user-3");
    expect(result).toBe(false);
  });

  it("should return false when idea not found", async () => {
    ideaFindUnique.mockResolvedValueOnce(null);

    const result = await canAccessConfidentialIdea("idea-missing", "user-1");
    expect(result).toBe(false);
  });
});

describe("listIdeasWithConfidentialFilter", () => {
  it("should return all ideas when user can read confidential", async () => {
    ideaFindMany.mockResolvedValueOnce([baseIdea]);

    const result = await listIdeasWithConfidentialFilter(
      { campaignId: "campaign-1", limit: 20 },
      "user-1",
      true,
    );

    expect(result.items).toHaveLength(1);
  });

  it("should filter confidential ideas for non-privileged users", async () => {
    ideaFindMany.mockResolvedValueOnce([baseIdea]);

    await listIdeasWithConfidentialFilter({ campaignId: "campaign-1", limit: 20 }, "user-2", false);

    const whereArg = ideaFindMany.mock.calls[0]?.[0]?.where;
    expect(whereArg.OR).toEqual(
      expect.arrayContaining([
        { isConfidential: false },
        { contributorId: "user-2" },
        { coAuthors: { some: { userId: "user-2" } } },
      ]),
    );
  });
});

describe("setOrganizationConfidential", () => {
  const baseOrg = {
    id: "org-1",
    name: "Test Org",
    description: null,
    websiteUrl: null,
    logoUrl: null,
    industry: null,
    location: null,
    foundedYear: null,
    employeeCount: null,
    fundingStage: null,
    fundingTotal: null,
    relationshipStatus: "IDENTIFIED" as const,
    ndaStatus: "NONE" as const,
    isConfidential: false,
    isArchived: false,
    crunchbaseId: null,
    innospotId: null,
    customFields: null,
    managementTeam: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { contacts: 0 },
    managers: [],
  };

  it("should set organization as confidential", async () => {
    orgFindUnique.mockResolvedValueOnce({
      id: "org-1",
      name: "Test Org",
      isConfidential: false,
    });
    orgUpdate.mockResolvedValueOnce({ ...baseOrg, isConfidential: true });

    const result = await setOrganizationConfidential(
      { id: "org-1", isConfidential: true },
      "user-1",
    );

    expect(result.isConfidential).toBe(true);
    expect(orgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: { isConfidential: true },
      }),
    );
    expect(mockEmit).toHaveBeenCalledWith(
      "organization.confidentialityChanged",
      expect.objectContaining({
        entity: "organization",
        entityId: "org-1",
      }),
    );
  });

  it("should throw when organization not found", async () => {
    orgFindUnique.mockResolvedValueOnce(null);

    await expect(
      setOrganizationConfidential({ id: "org-missing", isConfidential: true }, "user-1"),
    ).rejects.toThrow("Organization not found");
  });
});

describe("getOrganizationByIdWithConfidentialCheck", () => {
  const orgWithContacts = {
    id: "org-1",
    name: "Test Org",
    description: null,
    websiteUrl: null,
    logoUrl: null,
    industry: null,
    location: null,
    foundedYear: null,
    employeeCount: null,
    fundingStage: null,
    fundingTotal: null,
    relationshipStatus: "IDENTIFIED" as const,
    ndaStatus: "NONE" as const,
    isConfidential: true,
    isArchived: false,
    crunchbaseId: null,
    innospotId: null,
    customFields: null,
    managementTeam: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { contacts: 0 },
    managers: [
      {
        id: "mgr-1",
        role: "INTERNAL_MANAGER",
        assignedAt: new Date(),
        user: { id: "user-1", name: "Manager", email: "mgr@test.com" },
      },
    ],
    contacts: [],
  };

  it("should return confidential org to its manager", async () => {
    orgFindUnique.mockResolvedValueOnce(orgWithContacts);

    const result = await getOrganizationByIdWithConfidentialCheck("org-1", "user-1", false);
    expect(result.id).toBe("org-1");
  });

  it("should return confidential org when user has read-confidential permission", async () => {
    orgFindUnique.mockResolvedValueOnce(orgWithContacts);

    const result = await getOrganizationByIdWithConfidentialCheck("org-1", "user-2", true);
    expect(result.id).toBe("org-1");
  });

  it("should throw for non-manager accessing confidential org without permission", async () => {
    orgFindUnique.mockResolvedValueOnce(orgWithContacts);

    await expect(
      getOrganizationByIdWithConfidentialCheck("org-1", "user-2", false),
    ).rejects.toThrow("Organization not found");
  });
});
