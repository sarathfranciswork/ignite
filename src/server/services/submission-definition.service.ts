import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import {
  SubmissionServiceError,
  type SubmissionDefinitionCreateInput,
  type SubmissionDefinitionUpdateInput,
  type SubmissionDefinitionListInput,
  type GenericSubmissionCreateInput,
  type GenericSubmissionUpdateInput,
  type GenericSubmissionReviewInput,
  type GenericSubmissionListInput,
} from "./submission-definition.schemas";
export { SubmissionServiceError } from "./submission-definition.schemas";

const childLogger = logger.child({ service: "submission-definition" });

// ── Create Submission Definition ────────────────────────────

export async function createSubmissionDefinition(
  input: SubmissionDefinitionCreateInput,
  createdById: string,
) {
  const existingSlug = await prisma.submissionDefinition.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new SubmissionServiceError(
      `A submission definition with slug "${input.slug}" already exists`,
      "SLUG_CONFLICT",
    );
  }

  if (input.campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { id: true },
    });
    if (!campaign) {
      throw new SubmissionServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
    }
  }

  const definition = await prisma.submissionDefinition.create({
    data: {
      name: input.name,
      description: input.description,
      slug: input.slug,
      campaignId: input.campaignId ?? null,
      isGlobal: input.isGlobal,
      createdById,
      fields: {
        create: input.fields.map((f, index) => ({
          label: f.label,
          fieldKey: f.fieldKey,
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          sortOrder: f.sortOrder ?? index,
          placeholder: f.placeholder,
          helpText: f.helpText,
          options: f.options as Prisma.InputJsonValue | undefined,
          validation: f.validation as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  eventBus.emit("submissionDefinition.created", {
    entity: "submissionDefinition",
    entityId: definition.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: { name: definition.name, slug: definition.slug },
  });

  childLogger.info(
    { definitionId: definition.id, slug: definition.slug },
    "Submission definition created",
  );

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    status: definition.status,
    slug: definition.slug,
    campaignId: definition.campaignId,
    isGlobal: definition.isGlobal,
    fieldCount: definition.fields.length,
    submissionCount: definition._count.submissions,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

// ── List Submission Definitions ─────────────────────────────

export async function listSubmissionDefinitions(input: SubmissionDefinitionListInput) {
  const where: Prisma.SubmissionDefinitionWhereInput = {};

  if (input.status) where.status = input.status;
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.isGlobal !== undefined) where.isGlobal = input.isGlobal;

  const items = await prisma.submissionDefinition.findMany({
    where,
    include: {
      _count: { select: { fields: true, submissions: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      status: d.status,
      slug: d.slug,
      campaignId: d.campaignId,
      isGlobal: d.isGlobal,
      fieldCount: d._count.fields,
      submissionCount: d._count.submissions,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

// ── Get Submission Definition By ID ─────────────────────────

export async function getSubmissionDefinitionById(id: string) {
  const definition = await prisma.submissionDefinition.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  if (!definition) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    status: definition.status,
    slug: definition.slug,
    campaignId: definition.campaignId,
    isGlobal: definition.isGlobal,
    createdById: definition.createdById,
    fields: definition.fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      sortOrder: f.sortOrder,
      placeholder: f.placeholder,
      helpText: f.helpText,
      options: f.options as Array<{ label: string; value: string }> | null,
      validation: f.validation as Record<string, unknown> | null,
    })),
    submissionCount: definition._count.submissions,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

// ── Get Submission Definition By Slug ───────────────────────

export async function getSubmissionDefinitionBySlug(slug: string) {
  const definition = await prisma.submissionDefinition.findUnique({
    where: { slug },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  if (!definition) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    status: definition.status,
    slug: definition.slug,
    campaignId: definition.campaignId,
    isGlobal: definition.isGlobal,
    createdById: definition.createdById,
    fields: definition.fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      sortOrder: f.sortOrder,
      placeholder: f.placeholder,
      helpText: f.helpText,
      options: f.options as Array<{ label: string; value: string }> | null,
      validation: f.validation as Record<string, unknown> | null,
    })),
    submissionCount: definition._count.submissions,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

// ── Update Submission Definition ────────────────────────────

export async function updateSubmissionDefinition(
  input: SubmissionDefinitionUpdateInput,
  updatedById: string,
) {
  const existing = await prisma.submissionDefinition.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  if (existing.status !== "DRAFT") {
    throw new SubmissionServiceError(
      "Only draft definitions can be updated",
      "DEFINITION_NOT_DRAFT",
    );
  }

  const data: Prisma.SubmissionDefinitionUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;

  if (input.fields) {
    await prisma.submissionField.deleteMany({
      where: { definitionId: input.id },
    });

    await prisma.submissionField.createMany({
      data: input.fields.map((f, index) => ({
        definitionId: input.id,
        label: f.label,
        fieldKey: f.fieldKey,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder ?? index,
        placeholder: f.placeholder,
        helpText: f.helpText,
        options: f.options as Prisma.InputJsonValue | undefined,
        validation: f.validation as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  const definition = await prisma.submissionDefinition.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { fields: true, submissions: true } },
    },
  });

  eventBus.emit("submissionDefinition.updated", {
    entity: "submissionDefinition",
    entityId: definition.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ definitionId: definition.id }, "Submission definition updated");

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    status: definition.status,
    slug: definition.slug,
    fieldCount: definition._count.fields,
    submissionCount: definition._count.submissions,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

// ── Delete Submission Definition ────────────────────────────

export async function deleteSubmissionDefinition(id: string, actor: string) {
  const definition = await prisma.submissionDefinition.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { submissions: true } } },
  });

  if (!definition) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  if (definition._count.submissions > 0) {
    throw new SubmissionServiceError(
      "Cannot delete a definition that has submissions. Archive it instead.",
      "HAS_SUBMISSIONS",
    );
  }

  await prisma.submissionDefinition.delete({ where: { id } });

  eventBus.emit("submissionDefinition.deleted", {
    entity: "submissionDefinition",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { name: definition.name },
  });

  childLogger.info({ definitionId: id }, "Submission definition deleted");

  return { success: true };
}

// ── Activate Submission Definition ──────────────────────────

export async function activateSubmissionDefinition(id: string, actor: string) {
  const definition = await prisma.submissionDefinition.findUnique({
    where: { id },
    include: { _count: { select: { fields: true } } },
  });

  if (!definition) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  if (definition.status !== "DRAFT") {
    throw new SubmissionServiceError(
      "Only draft definitions can be activated",
      "DEFINITION_NOT_DRAFT",
    );
  }

  if (definition._count.fields === 0) {
    throw new SubmissionServiceError("Definition must have at least one field", "NO_FIELDS");
  }

  const updated = await prisma.submissionDefinition.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  eventBus.emit("submissionDefinition.activated", {
    entity: "submissionDefinition",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ definitionId: id }, "Submission definition activated");

  return { id: updated.id, status: updated.status };
}

// ── Archive Submission Definition ───────────────────────────

export async function archiveSubmissionDefinition(id: string, actor: string) {
  const definition = await prisma.submissionDefinition.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!definition) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  if (definition.status === "ARCHIVED") {
    throw new SubmissionServiceError("Definition is already archived", "ALREADY_ARCHIVED");
  }

  const updated = await prisma.submissionDefinition.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  eventBus.emit("submissionDefinition.archived", {
    entity: "submissionDefinition",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ definitionId: id }, "Submission definition archived");

  return { id: updated.id, status: updated.status };
}

// ── Create Generic Submission ───────────────────────────────

export async function createGenericSubmission(
  input: GenericSubmissionCreateInput,
  submittedById: string,
) {
  const definition = await prisma.submissionDefinition.findUnique({
    where: { id: input.definitionId },
    include: { fields: true },
  });

  if (!definition) {
    throw new SubmissionServiceError("Submission definition not found", "DEFINITION_NOT_FOUND");
  }

  if (definition.status !== "ACTIVE") {
    throw new SubmissionServiceError(
      "Cannot submit to an inactive definition",
      "DEFINITION_NOT_ACTIVE",
    );
  }

  if (input.submitImmediately) {
    const requiredFields = definition.fields.filter((f) => f.isRequired);
    const providedFieldIds = new Set(input.fieldValues.map((fv) => fv.fieldId));
    const missingFields = requiredFields.filter((f) => !providedFieldIds.has(f.id));

    if (missingFields.length > 0) {
      throw new SubmissionServiceError(
        `Missing required fields: ${missingFields.map((f) => f.label).join(", ")}`,
        "MISSING_REQUIRED_FIELDS",
      );
    }
  }

  const now = new Date();
  const submission = await prisma.genericSubmission.create({
    data: {
      definitionId: input.definitionId,
      title: input.title,
      status: input.submitImmediately ? "SUBMITTED" : "DRAFT",
      submittedById,
      submittedAt: input.submitImmediately ? now : undefined,
      fieldValues: {
        create: input.fieldValues.map((fv) => ({
          fieldId: fv.fieldId,
          textValue: fv.textValue,
          numberValue: fv.numberValue,
          boolValue: fv.boolValue,
          dateValue: fv.dateValue ? new Date(fv.dateValue) : undefined,
          jsonValue: fv.jsonValue as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: {
      _count: { select: { fieldValues: true } },
    },
  });

  const eventName = input.submitImmediately
    ? "genericSubmission.submitted"
    : "genericSubmission.created";

  eventBus.emit(eventName, {
    entity: "genericSubmission",
    entityId: submission.id,
    actor: submittedById,
    timestamp: now.toISOString(),
    metadata: { definitionId: input.definitionId, title: submission.title },
  });

  childLogger.info(
    { submissionId: submission.id, definitionId: input.definitionId },
    "Generic submission created",
  );

  return {
    id: submission.id,
    definitionId: submission.definitionId,
    title: submission.title,
    status: submission.status,
    submittedById: submission.submittedById,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    fieldValueCount: submission._count.fieldValues,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}

// ── List Generic Submissions ────────────────────────────────

export async function listGenericSubmissions(input: GenericSubmissionListInput) {
  const where: Prisma.GenericSubmissionWhereInput = {
    definitionId: input.definitionId,
  };

  if (input.status) where.status = input.status;

  const items = await prisma.genericSubmission.findMany({
    where,
    include: {
      _count: { select: { fieldValues: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((s) => ({
      id: s.id,
      definitionId: s.definitionId,
      title: s.title,
      status: s.status,
      submittedById: s.submittedById,
      reviewedById: s.reviewedById,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      fieldValueCount: s._count.fieldValues,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

// ── Get Generic Submission By ID ────────────────────────────

export async function getGenericSubmissionById(id: string) {
  const submission = await prisma.genericSubmission.findUnique({
    where: { id },
    include: {
      fieldValues: {
        include: {
          field: {
            select: { id: true, label: true, fieldKey: true, fieldType: true },
          },
        },
      },
      definition: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!submission) {
    throw new SubmissionServiceError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  return {
    id: submission.id,
    definitionId: submission.definitionId,
    definition: {
      id: submission.definition.id,
      name: submission.definition.name,
      slug: submission.definition.slug,
    },
    title: submission.title,
    status: submission.status,
    submittedById: submission.submittedById,
    reviewedById: submission.reviewedById,
    reviewNote: submission.reviewNote,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    fieldValues: submission.fieldValues.map((fv) => ({
      id: fv.id,
      fieldId: fv.fieldId,
      field: {
        id: fv.field.id,
        label: fv.field.label,
        fieldKey: fv.field.fieldKey,
        fieldType: fv.field.fieldType,
      },
      textValue: fv.textValue,
      numberValue: fv.numberValue,
      boolValue: fv.boolValue,
      dateValue: fv.dateValue?.toISOString() ?? null,
      jsonValue: fv.jsonValue,
    })),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}

// ── Update Generic Submission ───────────────────────────────

export async function updateGenericSubmission(input: GenericSubmissionUpdateInput, userId: string) {
  const existing = await prisma.genericSubmission.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, submittedById: true },
  });

  if (!existing) {
    throw new SubmissionServiceError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  if (existing.submittedById !== userId) {
    throw new SubmissionServiceError("You can only edit your own submissions", "NOT_OWNER");
  }

  if (existing.status !== "DRAFT") {
    throw new SubmissionServiceError(
      "Only draft submissions can be updated",
      "SUBMISSION_NOT_DRAFT",
    );
  }

  const data: Prisma.GenericSubmissionUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;

  if (input.fieldValues) {
    await prisma.submissionFieldValue.deleteMany({
      where: { submissionId: input.id },
    });

    await prisma.submissionFieldValue.createMany({
      data: input.fieldValues.map((fv) => ({
        submissionId: input.id,
        fieldId: fv.fieldId,
        textValue: fv.textValue,
        numberValue: fv.numberValue,
        boolValue: fv.boolValue,
        dateValue: fv.dateValue ? new Date(fv.dateValue) : undefined,
        jsonValue: fv.jsonValue as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  const submission = await prisma.genericSubmission.update({
    where: { id: input.id },
    data,
  });

  childLogger.info({ submissionId: submission.id }, "Generic submission updated");

  return {
    id: submission.id,
    title: submission.title,
    status: submission.status,
    updatedAt: submission.updatedAt.toISOString(),
  };
}

// ── Submit Generic Submission ───────────────────────────────

export async function submitGenericSubmission(id: string, userId: string) {
  const submission = await prisma.genericSubmission.findUnique({
    where: { id },
    include: {
      definition: {
        include: { fields: { where: { isRequired: true } } },
      },
      fieldValues: { select: { fieldId: true } },
    },
  });

  if (!submission) {
    throw new SubmissionServiceError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  if (submission.submittedById !== userId) {
    throw new SubmissionServiceError("You can only submit your own submissions", "NOT_OWNER");
  }

  if (submission.status !== "DRAFT") {
    throw new SubmissionServiceError(
      "Only draft submissions can be submitted",
      "SUBMISSION_NOT_DRAFT",
    );
  }

  const providedFieldIds = new Set(submission.fieldValues.map((fv) => fv.fieldId));
  const missingFields = submission.definition.fields.filter((f) => !providedFieldIds.has(f.id));

  if (missingFields.length > 0) {
    throw new SubmissionServiceError(
      `Missing required fields: ${missingFields.map((f) => f.label).join(", ")}`,
      "MISSING_REQUIRED_FIELDS",
    );
  }

  const now = new Date();
  const updated = await prisma.genericSubmission.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: now },
  });

  eventBus.emit("genericSubmission.submitted", {
    entity: "genericSubmission",
    entityId: id,
    actor: userId,
    timestamp: now.toISOString(),
    metadata: { definitionId: submission.definitionId },
  });

  childLogger.info({ submissionId: id }, "Generic submission submitted");

  return { id: updated.id, status: updated.status, submittedAt: now.toISOString() };
}

// ── Review Generic Submission ───────────────────────────────

export async function reviewGenericSubmission(
  input: GenericSubmissionReviewInput,
  reviewerId: string,
) {
  const submission = await prisma.genericSubmission.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, definitionId: true },
  });

  if (!submission) {
    throw new SubmissionServiceError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  if (submission.status !== "SUBMITTED" && submission.status !== "UNDER_REVIEW") {
    throw new SubmissionServiceError(
      "Only submitted or under-review submissions can be reviewed",
      "INVALID_STATUS",
    );
  }

  const now = new Date();
  const updated = await prisma.genericSubmission.update({
    where: { id: input.id },
    data: {
      status: input.decision,
      reviewedById: reviewerId,
      reviewNote: input.reviewNote,
      reviewedAt: now,
    },
  });

  eventBus.emit("genericSubmission.reviewed", {
    entity: "genericSubmission",
    entityId: input.id,
    actor: reviewerId,
    timestamp: now.toISOString(),
    metadata: {
      definitionId: submission.definitionId,
      decision: input.decision,
    },
  });

  childLogger.info(
    { submissionId: input.id, decision: input.decision },
    "Generic submission reviewed",
  );

  return {
    id: updated.id,
    status: updated.status,
    reviewedById: updated.reviewedById,
    reviewNote: updated.reviewNote,
    reviewedAt: now.toISOString(),
  };
}

// ── Delete Generic Submission ───────────────────────────────

export async function deleteGenericSubmission(id: string, userId: string) {
  const submission = await prisma.genericSubmission.findUnique({
    where: { id },
    select: { id: true, status: true, submittedById: true },
  });

  if (!submission) {
    throw new SubmissionServiceError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  if (submission.submittedById !== userId) {
    throw new SubmissionServiceError("You can only delete your own submissions", "NOT_OWNER");
  }

  if (submission.status !== "DRAFT") {
    throw new SubmissionServiceError(
      "Only draft submissions can be deleted",
      "SUBMISSION_NOT_DRAFT",
    );
  }

  await prisma.genericSubmission.delete({ where: { id } });

  eventBus.emit("genericSubmission.deleted", {
    entity: "genericSubmission",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ submissionId: id }, "Generic submission deleted");

  return { success: true };
}
