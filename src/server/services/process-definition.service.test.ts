import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listProcessDefinitions,
  getProcessDefinitionById,
  createProcessDefinition,
  updateProcessDefinition,
  deleteProcessDefinition,
  duplicateProcessDefinition,
  ProcessDefinitionServiceError,
} from "./process-definition.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    processDefinition: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

const pdFindUnique = prisma.processDefinition.findUnique as unknown as Mock;
const pdFindMany = prisma.processDefinition.findMany as unknown as Mock;
const pdCreate = prisma.processDefinition.create as unknown as Mock;
const pdUpdate = prisma.processDefinition.update as unknown as Mock;
const pdDelete = prisma.processDefinition.delete as unknown as Mock;

const mockDefinition = {
  id: "pd-1",
  name: "Stage-Gate Standard",
  description: "A standard phase-gate process",
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
  createdBy: { id: "user-1", name: "Admin User", email: "admin@example.com" },
  _count: { phases: 3, projects: 1 },
  phases: [
    {
      id: "phase-1",
      name: "Discovery",
      description: "Initial research",
      plannedDurationDays: 30,
      position: 0,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      activities: [
        {
          id: "activity-1",
          name: "Market Analysis",
          description: "Analyze market opportunity",
          isMandatory: true,
          position: 0,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          tasks: [
            {
              id: "task-1",
              name: "Market size estimate",
              fieldType: "NUMBER",
              isMandatory: true,
              position: 0,
              createdAt: new Date("2026-01-01"),
              updatedAt: new Date("2026-01-01"),
            },
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listProcessDefinitions", () => {
  it("returns paginated list", async () => {
    const listItem = {
      ...mockDefinition,
      _count: { phases: 3, projects: 1 },
    };
    pdFindMany.mockResolvedValue([listItem]);

    const result = await listProcessDefinitions({ limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Stage-Gate Standard");
    expect(result.items[0]?.phaseCount).toBe(3);
    expect(result.nextCursor).toBeUndefined();
  });

  it("applies search filter", async () => {
    pdFindMany.mockResolvedValue([]);

    await listProcessDefinitions({ limit: 20, search: "agile" });

    const where = pdFindMany.mock.calls[0]?.[0]?.where;
    expect(where?.OR).toBeDefined();
  });

  it("returns nextCursor when more items exist", async () => {
    const items = [
      { ...mockDefinition, id: "pd-1", _count: { phases: 1, projects: 0 } },
      { ...mockDefinition, id: "pd-2", _count: { phases: 2, projects: 0 } },
    ];
    pdFindMany.mockResolvedValue(items);

    const result = await listProcessDefinitions({ limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe("pd-2");
  });
});

describe("getProcessDefinitionById", () => {
  it("returns full definition with nested phases", async () => {
    pdFindUnique.mockResolvedValue(mockDefinition);

    const result = await getProcessDefinitionById("pd-1");

    expect(result.id).toBe("pd-1");
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0]?.activities).toHaveLength(1);
    expect(result.phases[0]?.activities[0]?.tasks).toHaveLength(1);
  });

  it("throws when not found", async () => {
    pdFindUnique.mockResolvedValue(null);

    await expect(getProcessDefinitionById("nonexistent")).rejects.toThrow(
      ProcessDefinitionServiceError,
    );
  });
});

describe("createProcessDefinition", () => {
  it("creates with nested phases/activities/tasks", async () => {
    pdCreate.mockResolvedValue(mockDefinition);
    pdFindUnique.mockResolvedValue(mockDefinition);

    const result = await createProcessDefinition(
      {
        name: "Stage-Gate Standard",
        description: "A standard phase-gate process",
        phases: [
          {
            name: "Discovery",
            description: "Initial research",
            plannedDurationDays: 30,
            position: 0,
            activities: [
              {
                name: "Market Analysis",
                isMandatory: true,
                position: 0,
                tasks: [
                  {
                    name: "Market size estimate",
                    fieldType: "NUMBER",
                    isMandatory: true,
                    position: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
      "user-1",
    );

    expect(pdCreate).toHaveBeenCalledOnce();
    expect(result.name).toBe("Stage-Gate Standard");
    expect(eventBus.emit).toHaveBeenCalledWith("processDefinition.created", expect.any(Object));
  });
});

describe("updateProcessDefinition", () => {
  it("updates metadata", async () => {
    pdFindUnique.mockResolvedValueOnce(mockDefinition); // existing check
    pdUpdate.mockResolvedValue(mockDefinition);
    pdFindUnique.mockResolvedValueOnce(mockDefinition); // reload

    const result = await updateProcessDefinition({ id: "pd-1", name: "Updated Name" }, "user-1");

    expect(pdUpdate).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith("processDefinition.updated", expect.any(Object));
  });

  it("throws when not found", async () => {
    pdFindUnique.mockResolvedValue(null);

    await expect(
      updateProcessDefinition({ id: "nonexistent", name: "Foo" }, "user-1"),
    ).rejects.toThrow(ProcessDefinitionServiceError);
  });
});

describe("deleteProcessDefinition", () => {
  it("deletes unused definition", async () => {
    pdFindUnique.mockResolvedValue({ ...mockDefinition, _count: { projects: 0 } });
    pdDelete.mockResolvedValue(mockDefinition);

    const result = await deleteProcessDefinition("pd-1", "user-1");

    expect(pdDelete).toHaveBeenCalledOnce();
    expect(result.id).toBe("pd-1");
    expect(eventBus.emit).toHaveBeenCalledWith("processDefinition.deleted", expect.any(Object));
  });

  it("throws when definition is in use", async () => {
    pdFindUnique.mockResolvedValue({ ...mockDefinition, _count: { projects: 2 } });

    await expect(deleteProcessDefinition("pd-1", "user-1")).rejects.toThrow(
      "Cannot delete process definition",
    );
  });

  it("throws when not found", async () => {
    pdFindUnique.mockResolvedValue(null);

    await expect(deleteProcessDefinition("nonexistent", "user-1")).rejects.toThrow(
      ProcessDefinitionServiceError,
    );
  });
});

describe("duplicateProcessDefinition", () => {
  it("creates a copy with '(Copy)' suffix", async () => {
    const duplicated = { ...mockDefinition, id: "pd-2", name: "Stage-Gate Standard (Copy)" };

    pdFindUnique.mockResolvedValueOnce(mockDefinition); // original lookup
    pdCreate.mockResolvedValue(duplicated);
    pdFindUnique.mockResolvedValueOnce(duplicated); // reload after create

    const result = await duplicateProcessDefinition({ id: "pd-1" }, "user-1");

    expect(pdCreate).toHaveBeenCalledOnce();
    const createArgs = pdCreate.mock.calls[0]?.[0]?.data;
    expect(createArgs?.name).toBe("Stage-Gate Standard (Copy)");
    expect(eventBus.emit).toHaveBeenCalledWith("processDefinition.duplicated", expect.any(Object));
  });

  it("throws when source not found", async () => {
    pdFindUnique.mockResolvedValue(null);

    await expect(duplicateProcessDefinition({ id: "nonexistent" }, "user-1")).rejects.toThrow(
      ProcessDefinitionServiceError,
    );
  });
});
