import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSubmissionDefinition,
  listSubmissionDefinitions,
  getSubmissionDefinitionById,
  updateSubmissionDefinition,
  deleteSubmissionDefinition,
  activateSubmissionDefinition,
  archiveSubmissionDefinition,
  createGenericSubmission,
  submitGenericSubmission,
  reviewGenericSubmission,
  deleteGenericSubmission,
} from "./submission-definition.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    submissionDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    submissionField: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    genericSubmission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    submissionFieldValue: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const mockPrisma = prisma as unknown as {
  submissionDefinition: { [key: string]: ReturnType<typeof vi.fn> };
  submissionField: { [key: string]: ReturnType<typeof vi.fn> };
  genericSubmission: { [key: string]: ReturnType<typeof vi.fn> };
  submissionFieldValue: { [key: string]: ReturnType<typeof vi.fn> };
  campaign: { [key: string]: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSubmissionDefinition", () => {
  it("creates a submission definition", async () => {
    const now = new Date();
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue(null);
    mockPrisma.submissionDefinition.create.mockResolvedValue({
      id: "def-1",
      name: "Bug Report",
      description: "Submit bug reports",
      status: "DRAFT",
      slug: "bug-report",
      campaignId: null,
      isGlobal: true,
      createdById: "user-1",
      createdAt: now,
      updatedAt: now,
      fields: [
        { id: "f1", label: "Summary", fieldKey: "summary", fieldType: "TEXT", sortOrder: 0 },
      ],
      _count: { submissions: 0 },
    });

    const result = await createSubmissionDefinition(
      {
        name: "Bug Report",
        description: "Submit bug reports",
        slug: "bug-report",
        isGlobal: true,
        fields: [
          {
            label: "Summary",
            fieldKey: "summary",
            fieldType: "TEXT",
            isRequired: true,
            sortOrder: 0,
          },
        ],
      },
      "user-1",
    );

    expect(result.id).toBe("def-1");
    expect(result.slug).toBe("bug-report");
    expect(result.fieldCount).toBe(1);
  });

  it("rejects duplicate slugs", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      createSubmissionDefinition(
        {
          name: "Test",
          slug: "existing-slug",
          isGlobal: false,
          fields: [
            {
              label: "Field",
              fieldKey: "field",
              fieldType: "TEXT",
              isRequired: false,
              sortOrder: 0,
            },
          ],
        },
        "user-1",
      ),
    ).rejects.toThrow("already exists");
  });
});

describe("listSubmissionDefinitions", () => {
  it("returns filtered definitions", async () => {
    const now = new Date();
    mockPrisma.submissionDefinition.findMany.mockResolvedValue([
      {
        id: "def-1",
        name: "Test",
        description: null,
        status: "ACTIVE",
        slug: "test",
        campaignId: null,
        isGlobal: true,
        createdAt: now,
        updatedAt: now,
        _count: { fields: 2, submissions: 5 },
      },
    ]);

    const result = await listSubmissionDefinitions({ limit: 20, status: "ACTIVE" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("ACTIVE");
  });
});

describe("getSubmissionDefinitionById", () => {
  it("throws for non-existent definition", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue(null);

    await expect(getSubmissionDefinitionById("nope")).rejects.toThrow("not found");
  });
});

describe("updateSubmissionDefinition", () => {
  it("rejects updates to non-draft definitions", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      status: "ACTIVE",
    });

    await expect(
      updateSubmissionDefinition({ id: "def-1", name: "Updated" }, "user-1"),
    ).rejects.toThrow("Only draft definitions");
  });
});

describe("deleteSubmissionDefinition", () => {
  it("rejects deletion of definitions with submissions", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      name: "Test",
      _count: { submissions: 3 },
    });

    await expect(deleteSubmissionDefinition("def-1", "user-1")).rejects.toThrow("Cannot delete");
  });

  it("deletes a definition with no submissions", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      name: "Test",
      _count: { submissions: 0 },
    });
    mockPrisma.submissionDefinition.delete.mockResolvedValue({});

    const result = await deleteSubmissionDefinition("def-1", "user-1");
    expect(result.success).toBe(true);
  });
});

describe("activateSubmissionDefinition", () => {
  it("rejects activation with no fields", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      status: "DRAFT",
      _count: { fields: 0 },
    });

    await expect(activateSubmissionDefinition("def-1", "user-1")).rejects.toThrow(
      "at least one field",
    );
  });

  it("activates a valid draft definition", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      status: "DRAFT",
      _count: { fields: 2 },
    });
    mockPrisma.submissionDefinition.update.mockResolvedValue({
      id: "def-1",
      status: "ACTIVE",
    });

    const result = await activateSubmissionDefinition("def-1", "user-1");
    expect(result.status).toBe("ACTIVE");
  });
});

describe("archiveSubmissionDefinition", () => {
  it("rejects if already archived", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      status: "ARCHIVED",
    });

    await expect(archiveSubmissionDefinition("def-1", "user-1")).rejects.toThrow(
      "already archived",
    );
  });
});

describe("createGenericSubmission", () => {
  it("creates a draft submission", async () => {
    const now = new Date();
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      status: "ACTIVE",
      fields: [{ id: "f1", isRequired: true, label: "Title" }],
    });
    mockPrisma.genericSubmission.create.mockResolvedValue({
      id: "sub-1",
      definitionId: "def-1",
      title: "My Submission",
      status: "DRAFT",
      submittedById: "user-1",
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
      _count: { fieldValues: 1 },
    });

    const result = await createGenericSubmission(
      {
        definitionId: "def-1",
        title: "My Submission",
        fieldValues: [{ fieldId: "f1", textValue: "Hello" }],
        submitImmediately: false,
      },
      "user-1",
    );

    expect(result.status).toBe("DRAFT");
  });

  it("rejects submission to inactive definition", async () => {
    mockPrisma.submissionDefinition.findUnique.mockResolvedValue({
      id: "def-1",
      status: "DRAFT",
      fields: [],
    });

    await expect(
      createGenericSubmission(
        {
          definitionId: "def-1",
          title: "Test",
          fieldValues: [],
          submitImmediately: false,
        },
        "user-1",
      ),
    ).rejects.toThrow("inactive definition");
  });
});

describe("submitGenericSubmission", () => {
  it("rejects if missing required fields", async () => {
    mockPrisma.genericSubmission.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      submittedById: "user-1",
      definitionId: "def-1",
      definition: {
        fields: [{ id: "f1", isRequired: true, label: "Required Field" }],
      },
      fieldValues: [],
    });

    await expect(submitGenericSubmission("sub-1", "user-1")).rejects.toThrow(
      "Missing required fields",
    );
  });

  it("rejects non-owner submissions", async () => {
    mockPrisma.genericSubmission.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      submittedById: "user-1",
      definitionId: "def-1",
      definition: { fields: [] },
      fieldValues: [],
    });

    await expect(submitGenericSubmission("sub-1", "user-2")).rejects.toThrow(
      "only submit your own",
    );
  });
});

describe("reviewGenericSubmission", () => {
  it("approves a submitted submission", async () => {
    const now = new Date();
    mockPrisma.genericSubmission.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "SUBMITTED",
      definitionId: "def-1",
    });
    mockPrisma.genericSubmission.update.mockResolvedValue({
      id: "sub-1",
      status: "APPROVED",
      reviewedById: "reviewer-1",
      reviewNote: "Looks good",
      reviewedAt: now,
    });

    const result = await reviewGenericSubmission(
      { id: "sub-1", decision: "APPROVED", reviewNote: "Looks good" },
      "reviewer-1",
    );

    expect(result.status).toBe("APPROVED");
  });

  it("rejects review of draft submissions", async () => {
    mockPrisma.genericSubmission.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      definitionId: "def-1",
    });

    await expect(
      reviewGenericSubmission({ id: "sub-1", decision: "APPROVED" }, "reviewer-1"),
    ).rejects.toThrow("Only submitted");
  });
});

describe("deleteGenericSubmission", () => {
  it("rejects deletion by non-owner", async () => {
    mockPrisma.genericSubmission.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      submittedById: "user-1",
    });

    await expect(deleteGenericSubmission("sub-1", "user-2")).rejects.toThrow(
      "only delete your own",
    );
  });

  it("rejects deletion of submitted submissions", async () => {
    mockPrisma.genericSubmission.findUnique.mockResolvedValue({
      id: "sub-1",
      status: "SUBMITTED",
      submittedById: "user-1",
    });

    await expect(deleteGenericSubmission("sub-1", "user-1")).rejects.toThrow(
      "Only draft submissions",
    );
  });
});
