import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma, IdeaStatus } from "@prisma/client";
import {
  isValidIdeaTransition,
  getValidIdeaTransitions,
  canArchiveIdea,
  canUnarchiveIdea,
  IDEA_STATUS_LABELS,
} from "@/server/lib/state-machines/idea-transitions";
import type {
  IdeaCreateInput,
  IdeaUpdateInput,
  IdeaListInput,
  IdeaTransitionInput,
  IdeaArchiveInput,
  IdeaUnarchiveInput,
  IdeaCoachQualifyInput,
  IdeaBoardListInput,
  IdeaSetConfidentialInput,
} from "./idea.schemas";

export {
  ideaCreateInput,
  ideaUpdateInput,
  ideaListInput,
  ideaGetByIdInput,
  ideaSubmitInput,
  ideaDeleteInput,
  ideaTransitionInput,
  ideaGetTransitionsInput,
  ideaArchiveInput,
  ideaUnarchiveInput,
  ideaCoachQualifyInput,
  ideaBoardListInput,
  ideaSetConfidentialInput,
} from "./idea.schemas";

export type {
  IdeaCreateInput,
  IdeaUpdateInput,
  IdeaListInput,
  IdeaTransitionInput,
  IdeaArchiveInput,
  IdeaUnarchiveInput,
  IdeaCoachQualifyInput,
  IdeaBoardListInput,
  IdeaSetConfidentialInput,
} from "./idea.schemas";

const childLogger = logger.child({ service: "idea" });

function serializeIdea(idea: {
  id: string;
  title: string;
  teaser: string | null;
  description: string | null;
  status: IdeaStatus;
  previousStatus: IdeaStatus | null;
  campaignId: string;
  contributorId: string;
  category: string | null;
  tags: string[];
  customFieldValues: Prisma.JsonValue;
  attachments: Prisma.JsonValue;
  isConfidential: boolean;
  inventionDisclosure: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contributor?: { id: string; name: string | null; email: string; image: string | null };
  coAuthors?: Array<{
    id: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }>;
  campaign?: { id: string; title: string; status: string };
}) {
  return {
    id: idea.id,
    title: idea.title,
    teaser: idea.teaser,
    description: idea.description,
    status: idea.status,
    previousStatus: idea.previousStatus,
    campaignId: idea.campaignId,
    contributorId: idea.contributorId,
    category: idea.category,
    tags: idea.tags,
    customFieldValues: idea.customFieldValues,
    attachments: idea.attachments,
    isConfidential: idea.isConfidential,
    inventionDisclosure: idea.inventionDisclosure,
    likesCount: idea.likesCount,
    commentsCount: idea.commentsCount,
    viewsCount: idea.viewsCount,
    submittedAt: idea.submittedAt?.toISOString() ?? null,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    contributor: idea.contributor,
    coAuthors: idea.coAuthors?.map((ca) => ca.user),
    campaign: idea.campaign,
  };
}

/**
 * List ideas for a campaign with cursor-based pagination and filters.
 */
export async function listIdeas(input: IdeaListInput) {
  const where: Prisma.IdeaWhereInput = {
    campaignId: input.campaignId,
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.tag) {
    where.tags = { has: input.tag };
  }

  if (input.category) {
    where.category = input.category;
  }

  if (input.isConfidential !== undefined) {
    where.isConfidential = input.isConfidential;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.idea.findMany({
    where,
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
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
    items: items.map(serializeIdea),
    nextCursor,
  };
}

/**
 * List ideas visible to a specific user, filtering out confidential ideas
 * that the user is not authorized to see.
 * Confidential ideas are only visible to:
 * - The idea contributor
 * - Co-authors
 * - Users with IDEA_READ_CONFIDENTIAL permission (managers, coaches, platform admins)
 */
export async function listIdeasWithConfidentialFilter(
  input: IdeaListInput,
  userId: string,
  canReadConfidential: boolean,
) {
  if (canReadConfidential) {
    return listIdeas(input);
  }

  const where: Prisma.IdeaWhereInput = {
    campaignId: input.campaignId,
    OR: [{ isConfidential: false }, { contributorId: userId }, { coAuthors: { some: { userId } } }],
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.tag) {
    where.tags = { has: input.tag };
  }

  if (input.category) {
    where.category = input.category;
  }

  if (input.isConfidential !== undefined) {
    if (input.isConfidential) {
      where.AND = [
        { isConfidential: true },
        {
          OR: [{ contributorId: userId }, { coAuthors: { some: { userId } } }],
        },
      ];
      delete where.OR;
    } else {
      where.isConfidential = false;
      delete where.OR;
    }
  }

  if (input.search) {
    const searchConditions: Prisma.IdeaWhereInput[] = [
      { title: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
    if (where.AND) {
      (where.AND as Prisma.IdeaWhereInput[]).push({ OR: searchConditions });
    } else {
      where.AND = [{ OR: searchConditions }];
    }
  }

  const items = await prisma.idea.findMany({
    where,
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
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
    items: items.map(serializeIdea),
    nextCursor,
  };
}

/**
 * Get a single idea by ID with full details.
 */
export async function getIdeaById(id: string) {
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      campaign: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  return serializeIdea(idea);
}

/**
 * Create a new idea in DRAFT or submitted status.
 */
export async function createIdea(input: IdeaCreateInput, contributorId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, status: true, title: true, isConfidentialAllowed: true },
  });

  if (!campaign) {
    throw new IdeaServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  if (input.isConfidential && !campaign.isConfidentialAllowed) {
    throw new IdeaServiceError(
      "Confidential ideas are not allowed in this campaign",
      "CONFIDENTIAL_NOT_ALLOWED",
    );
  }

  const submittableStatuses = ["SEEDING", "SUBMISSION"];
  if (!submittableStatuses.includes(campaign.status) && input.submitImmediately) {
    throw new IdeaServiceError("Campaign is not accepting submissions", "CAMPAIGN_NOT_ACCEPTING");
  }

  const initialStatus = input.submitImmediately ? "QUALIFICATION" : "DRAFT";

  const idea = await prisma.$transaction(async (tx) => {
    const newIdea = await tx.idea.create({
      data: {
        title: input.title,
        teaser: input.teaser,
        description: input.description,
        status: initialStatus,
        campaignId: input.campaignId,
        contributorId,
        category: input.category,
        tags: input.tags ?? [],
        // customFieldValues and attachments will be added when custom field UI is built
        isConfidential: input.isConfidential ?? false,
        inventionDisclosure: input.inventionDisclosure ?? false,
        submittedAt: input.submitImmediately ? new Date() : undefined,
      },
      include: {
        contributor: {
          select: { id: true, name: true, email: true, image: true },
        },
        coAuthors: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        campaign: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (input.coAuthorIds && input.coAuthorIds.length > 0) {
      const filteredCoAuthors = input.coAuthorIds.filter((id) => id !== contributorId);
      if (filteredCoAuthors.length > 0) {
        await tx.ideaCoAuthor.createMany({
          data: filteredCoAuthors.map((userId) => ({
            ideaId: newIdea.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      const updatedIdea = await tx.idea.findUnique({
        where: { id: newIdea.id },
        include: {
          contributor: {
            select: { id: true, name: true, email: true, image: true },
          },
          coAuthors: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          campaign: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      return updatedIdea!;
    }

    return newIdea;
  });

  const eventName = input.submitImmediately ? "idea.submitted" : "idea.created";
  eventBus.emit(eventName, {
    entity: "idea",
    entityId: idea.id,
    actor: contributorId,
    timestamp: new Date().toISOString(),
    metadata: {
      title: idea.title,
      campaignId: idea.campaignId,
      status: idea.status,
    },
  });

  childLogger.info(
    { ideaId: idea.id, campaignId: idea.campaignId, status: idea.status },
    "Idea created",
  );

  return serializeIdea(idea);
}

/**
 * Update an idea. Only the contributor or co-authors can update in DRAFT status.
 */
export async function updateIdea(input: IdeaUpdateInput, updatedById: string) {
  const existing = await prisma.idea.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      status: true,
      contributorId: true,
      coAuthors: { select: { userId: true } },
    },
  });

  if (!existing) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const isContributor = existing.contributorId === updatedById;
  const isCoAuthor = existing.coAuthors.some((ca) => ca.userId === updatedById);
  if (!isContributor && !isCoAuthor) {
    throw new IdeaServiceError("You can only update your own ideas", "NOT_AUTHORIZED");
  }

  const { id, coAuthorIds, ...updateData } = input;

  const data: Prisma.IdeaUpdateInput = {};

  if (updateData.title !== undefined) data.title = updateData.title;
  if (updateData.teaser !== undefined) data.teaser = updateData.teaser;
  if (updateData.description !== undefined) data.description = updateData.description;
  if (updateData.category !== undefined) data.category = updateData.category;
  if (updateData.tags !== undefined) data.tags = updateData.tags;
  if (updateData.isConfidential !== undefined) data.isConfidential = updateData.isConfidential;
  if (updateData.inventionDisclosure !== undefined)
    data.inventionDisclosure = updateData.inventionDisclosure;

  const idea = await prisma.$transaction(async (tx) => {
    const updated = await tx.idea.update({
      where: { id },
      data,
      include: {
        contributor: {
          select: { id: true, name: true, email: true, image: true },
        },
        coAuthors: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        campaign: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (coAuthorIds !== undefined) {
      await tx.ideaCoAuthor.deleteMany({ where: { ideaId: id } });
      const filteredCoAuthors = coAuthorIds.filter((userId) => userId !== existing.contributorId);
      if (filteredCoAuthors.length > 0) {
        await tx.ideaCoAuthor.createMany({
          data: filteredCoAuthors.map((userId) => ({
            ideaId: id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.idea.findUnique({
        where: { id },
        include: {
          contributor: {
            select: { id: true, name: true, email: true, image: true },
          },
          coAuthors: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          campaign: {
            select: { id: true, title: true, status: true },
          },
        },
      });
    }

    return updated;
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found after update", "IDEA_NOT_FOUND");
  }

  eventBus.emit("idea.updated", {
    entity: "idea",
    entityId: idea.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(updateData) },
  });

  childLogger.info({ ideaId: idea.id }, "Idea updated");

  return serializeIdea(idea);
}

/**
 * Submit a draft idea (transition from DRAFT to QUALIFICATION).
 * Status changes ONLY happen through this function for submissions.
 */
export async function submitIdea(ideaId: string, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      status: true,
      campaignId: true,
      campaign: { select: { status: true } },
    },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.status !== "DRAFT") {
    throw new IdeaServiceError("Only draft ideas can be submitted", "INVALID_STATUS");
  }

  const submittableStatuses = ["SEEDING", "SUBMISSION"];
  if (!submittableStatuses.includes(idea.campaign.status)) {
    throw new IdeaServiceError("Campaign is not accepting submissions", "CAMPAIGN_NOT_ACCEPTING");
  }

  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: "QUALIFICATION",
      previousStatus: "DRAFT",
      submittedAt: new Date(),
    },
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      campaign: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  eventBus.emit("idea.submitted", {
    entity: "idea",
    entityId: ideaId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: "DRAFT",
      newStatus: "QUALIFICATION",
    },
  });

  childLogger.info({ ideaId, campaignId: idea.campaignId }, "Idea submitted");

  return serializeIdea(updated);
}

/**
 * Delete an idea. Only the contributor can delete their own idea.
 */
export async function deleteIdea(ideaId: string, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, contributorId: true, campaignId: true, title: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.contributorId !== actor) {
    throw new IdeaServiceError("You can only delete your own ideas", "NOT_AUTHORIZED");
  }

  await prisma.idea.delete({ where: { id: ideaId } });

  eventBus.emit("idea.deleted", {
    entity: "idea",
    entityId: ideaId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      title: idea.title,
    },
  });

  childLogger.info({ ideaId, campaignId: idea.campaignId }, "Idea deleted");

  return { id: ideaId };
}

/**
 * Standard include for fetching idea with campaign feature toggles.
 */
const ideaWithCampaignToggles = {
  id: true,
  status: true,
  previousStatus: true,
  campaignId: true,
  contributorId: true,
  campaign: {
    select: {
      id: true,
      title: true,
      status: true,
      hasQualificationPhase: true,
      hasDiscussionPhase: true,
      hasIdeaCoach: true,
    },
  },
} as const;

/**
 * Standard include for full idea response.
 */
const ideaFullInclude = {
  contributor: {
    select: { id: true, name: true, email: true, image: true },
  },
  coAuthors: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  },
  campaign: {
    select: { id: true, title: true, status: true },
  },
} as const;

/**
 * Get valid transitions for an idea.
 */
export async function getIdeaValidTransitions(ideaId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: ideaWithCampaignToggles,
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const toggles = {
    hasQualificationPhase: idea.campaign.hasQualificationPhase,
    hasDiscussionPhase: idea.campaign.hasDiscussionPhase,
  };

  const transitions = getValidIdeaTransitions(idea.status, toggles, idea.campaign.status);

  return {
    ideaId: idea.id,
    currentStatus: idea.status,
    currentStatusLabel: IDEA_STATUS_LABELS[idea.status],
    validTransitions: transitions.map((status) => ({
      status,
      label: IDEA_STATUS_LABELS[status],
    })),
    canArchive: canArchiveIdea(idea.status),
    canUnarchive: canUnarchiveIdea(idea.status),
  };
}

/**
 * Transition an idea to a new status via the state machine.
 * Status changes ONLY go through this function — never direct prisma.update({ status }).
 */
export async function transitionIdea(input: IdeaTransitionInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: ideaWithCampaignToggles,
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const targetStatus = input.targetStatus as IdeaStatus;
  const toggles = {
    hasQualificationPhase: idea.campaign.hasQualificationPhase,
    hasDiscussionPhase: idea.campaign.hasDiscussionPhase,
  };

  const valid = isValidIdeaTransition(idea.status, targetStatus, toggles, idea.campaign.status);

  if (!valid) {
    throw new IdeaServiceError(
      `Cannot transition idea from ${IDEA_STATUS_LABELS[idea.status]} to ${IDEA_STATUS_LABELS[targetStatus]}`,
      "INVALID_TRANSITION",
    );
  }

  const updated = await prisma.idea.update({
    where: { id: input.id },
    data: {
      previousStatus: idea.status,
      status: targetStatus,
    },
    include: ideaFullInclude,
  });

  eventBus.emit("idea.transitioned", {
    entity: "idea",
    entityId: input.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: idea.status,
      newStatus: targetStatus,
    },
  });

  childLogger.info({ ideaId: input.id, from: idea.status, to: targetStatus }, "Idea transitioned");

  return serializeIdea(updated);
}

/**
 * Archive an idea with a reason. Can be done by Innovation Manager.
 */
export async function archiveIdea(input: IdeaArchiveInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, campaignId: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (!canArchiveIdea(idea.status)) {
    throw new IdeaServiceError(
      `Cannot archive idea in ${IDEA_STATUS_LABELS[idea.status]} status`,
      "INVALID_STATUS",
    );
  }

  const updated = await prisma.idea.update({
    where: { id: input.id },
    data: {
      previousStatus: idea.status,
      status: "ARCHIVED",
    },
    include: ideaFullInclude,
  });

  eventBus.emit("idea.archived", {
    entity: "idea",
    entityId: input.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: idea.status,
      reason: input.reason,
    },
  });

  childLogger.info(
    { ideaId: input.id, previousStatus: idea.status, reason: input.reason },
    "Idea archived",
  );

  return serializeIdea(updated);
}

/**
 * Unarchive an idea, restoring it to its previous status.
 */
export async function unarchiveIdea(input: IdeaUnarchiveInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, previousStatus: true, campaignId: true },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (!canUnarchiveIdea(idea.status)) {
    throw new IdeaServiceError("Only archived ideas can be unarchived", "INVALID_STATUS");
  }

  if (!idea.previousStatus) {
    throw new IdeaServiceError(
      "Cannot unarchive: no previous status recorded",
      "NO_PREVIOUS_STATUS",
    );
  }

  const restoreStatus = idea.previousStatus;

  const updated = await prisma.idea.update({
    where: { id: input.id },
    data: {
      previousStatus: "ARCHIVED",
      status: restoreStatus,
    },
    include: ideaFullInclude,
  });

  eventBus.emit("idea.unarchived", {
    entity: "idea",
    entityId: input.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      restoredStatus: restoreStatus,
    },
  });

  childLogger.info({ ideaId: input.id, restoredStatus: restoreStatus }, "Idea unarchived");

  return serializeIdea(updated);
}

/**
 * Coach qualification: approve, reject, or request changes on an idea in QUALIFICATION status.
 * Only available when the campaign has Idea Coach enabled (hasIdeaCoach).
 */
export async function coachQualifyIdea(input: IdeaCoachQualifyInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: ideaWithCampaignToggles,
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.status !== "QUALIFICATION") {
    throw new IdeaServiceError(
      "Coach qualification is only available for ideas in Qualification status",
      "INVALID_STATUS",
    );
  }

  if (!idea.campaign.hasIdeaCoach) {
    throw new IdeaServiceError("Idea Coach is not enabled for this campaign", "COACH_NOT_ENABLED");
  }

  const eventTimestamp = new Date().toISOString();
  const baseEventPayload = {
    entity: "idea" as const,
    entityId: input.id,
    actor,
    timestamp: eventTimestamp,
    metadata: {
      campaignId: idea.campaignId,
      decision: input.decision,
      feedback: input.feedback,
    },
  };

  switch (input.decision) {
    case "APPROVE": {
      // Determine next status based on campaign toggles
      const toggles = {
        hasQualificationPhase: idea.campaign.hasQualificationPhase,
        hasDiscussionPhase: idea.campaign.hasDiscussionPhase,
      };

      const nextStatuses = getValidIdeaTransitions("QUALIFICATION", toggles, idea.campaign.status);

      if (nextStatuses.length === 0) {
        throw new IdeaServiceError(
          "No valid transition available from Qualification status given current campaign phase",
          "NO_VALID_TRANSITION",
        );
      }

      // Prefer COMMUNITY_DISCUSSION if available, otherwise take the first valid status
      const targetStatus = nextStatuses.includes("COMMUNITY_DISCUSSION")
        ? "COMMUNITY_DISCUSSION"
        : nextStatuses[0]!;

      const updated = await prisma.idea.update({
        where: { id: input.id },
        data: {
          previousStatus: "QUALIFICATION",
          status: targetStatus,
        },
        include: ideaFullInclude,
      });

      eventBus.emit("idea.coachQualified", baseEventPayload);

      childLogger.info({ ideaId: input.id, targetStatus }, "Idea approved by coach");

      return serializeIdea(updated);
    }

    case "REJECT": {
      const updated = await prisma.idea.update({
        where: { id: input.id },
        data: {
          previousStatus: "QUALIFICATION",
          status: "ARCHIVED",
        },
        include: ideaFullInclude,
      });

      eventBus.emit("idea.coachRejected", baseEventPayload);

      childLogger.info({ ideaId: input.id }, "Idea rejected by coach");

      return serializeIdea(updated);
    }

    case "REQUEST_CHANGES": {
      // Idea stays in QUALIFICATION, feedback is communicated via the event
      const current = await prisma.idea.findUnique({
        where: { id: input.id },
        include: ideaFullInclude,
      });

      if (!current) {
        throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
      }

      eventBus.emit("idea.coachRequestedChanges", baseEventPayload);

      childLogger.info({ ideaId: input.id }, "Coach requested changes on idea");

      return serializeIdea(current);
    }
  }
}

/**
 * List ideas for a board view with configurable sorting and cursor-based pagination.
 */
export async function listIdeasForBoard(input: IdeaBoardListInput) {
  const where: Prisma.IdeaWhereInput = {
    campaignId: input.campaignId,
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.tag) {
    where.tags = { has: input.tag };
  }

  if (input.category) {
    where.category = input.category;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { teaser: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.IdeaOrderByWithRelationInput = {
    [input.sortField]: input.sortDirection,
  };

  const items = await prisma.idea.findMany({
    where,
    include: {
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
      coAuthors: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(serializeIdea),
    nextCursor,
  };
}

/**
 * Get an idea by ID with confidential access check.
 * Confidential ideas are only accessible to:
 * - The idea contributor or co-author
 * - Users with IDEA_READ_CONFIDENTIAL permission
 */
export async function getIdeaByIdWithConfidentialCheck(
  id: string,
  userId: string,
  canReadConfidential: boolean,
) {
  const idea = await getIdeaById(id);

  if (idea.isConfidential && !canReadConfidential) {
    const isContributor = idea.contributorId === userId;
    const isCoAuthor = idea.coAuthors?.some((ca) => ca.id === userId) ?? false;

    if (!isContributor && !isCoAuthor) {
      throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
    }
  }

  return idea;
}

/**
 * Set confidentiality on an idea.
 * Validates that the campaign allows confidential ideas.
 */
export async function setIdeaConfidential(input: IdeaSetConfidentialInput, actor: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      isConfidential: true,
      campaignId: true,
      campaign: { select: { isConfidentialAllowed: true } },
    },
  });

  if (!idea) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (input.isConfidential && !idea.campaign.isConfidentialAllowed) {
    throw new IdeaServiceError(
      "Confidential ideas are not allowed in this campaign",
      "CONFIDENTIAL_NOT_ALLOWED",
    );
  }

  if (idea.isConfidential === input.isConfidential) {
    const current = await prisma.idea.findUnique({
      where: { id: input.id },
      include: ideaFullInclude,
    });
    return serializeIdea(current!);
  }

  const updated = await prisma.idea.update({
    where: { id: input.id },
    data: { isConfidential: input.isConfidential },
    include: ideaFullInclude,
  });

  eventBus.emit("idea.confidentialityChanged", {
    entity: "idea",
    entityId: input.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      isConfidential: input.isConfidential,
    },
  });

  childLogger.info(
    { ideaId: input.id, isConfidential: input.isConfidential },
    "Idea confidentiality changed",
  );

  return serializeIdea(updated);
}

/**
 * Check if a user can access a confidential idea.
 * Returns true if user is contributor, co-author, or has read-confidential permission.
 */
export async function canAccessConfidentialIdea(ideaId: string, userId: string): Promise<boolean> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      contributorId: true,
      coAuthors: { select: { userId: true } },
    },
  });

  if (!idea) return false;

  return idea.contributorId === userId || idea.coAuthors.some((ca) => ca.userId === userId);
}

export class IdeaServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "IdeaServiceError";
  }
}
