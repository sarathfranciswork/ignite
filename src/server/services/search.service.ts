import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type {
  GlobalSearchInput,
  ExploreListInput,
  SavedSearchCreateInput,
  SearchEntityType,
} from "./search.schemas";

const childLogger = logger.child({ service: "search" });

interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  description: string | null;
  status: string | null;
  url: string;
  metadata: Record<string, unknown>;
}

interface ExploreItem {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export async function globalSearch(input: GlobalSearchInput): Promise<SearchResultItem[]> {
  const { query, entityTypes, limit } = input;
  const types = entityTypes ?? ["idea", "campaign", "channel", "user"];
  const results: SearchResultItem[] = [];
  const perTypeLimit = Math.max(3, Math.ceil(limit / types.length));

  const searchPromises: Promise<void>[] = [];

  if (types.includes("idea")) {
    searchPromises.push(
      searchIdeas(query, perTypeLimit).then((items) => {
        results.push(...items);
      }),
    );
  }

  if (types.includes("campaign")) {
    searchPromises.push(
      searchCampaigns(query, perTypeLimit).then((items) => {
        results.push(...items);
      }),
    );
  }

  if (types.includes("channel")) {
    searchPromises.push(
      searchChannels(query, perTypeLimit).then((items) => {
        results.push(...items);
      }),
    );
  }

  if (types.includes("user")) {
    searchPromises.push(
      searchUsers(query, perTypeLimit).then((items) => {
        results.push(...items);
      }),
    );
  }

  await Promise.all(searchPromises);

  childLogger.info({ query, resultCount: results.length }, "Global search completed");

  return results.slice(0, limit);
}

async function searchIdeas(query: string, limit: number): Promise<SearchResultItem[]> {
  const ideas = await prisma.idea.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { teaser: { contains: query, mode: "insensitive" } },
        { tags: { hasSome: [query] } },
      ],
    },
    select: {
      id: true,
      title: true,
      teaser: true,
      status: true,
      likesCount: true,
      commentsCount: true,
      campaignId: true,
      contributor: { select: { id: true, name: true } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return ideas.map((idea) => ({
    id: idea.id,
    type: "idea" as const,
    title: idea.title,
    description: idea.teaser,
    status: idea.status,
    url: `/campaigns/${idea.campaignId}/ideas/${idea.id}`,
    metadata: {
      likesCount: idea.likesCount,
      commentsCount: idea.commentsCount,
      contributor: idea.contributor,
    },
  }));
}

async function searchCampaigns(query: string, limit: number): Promise<SearchResultItem[]> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { teaser: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      teaser: true,
      status: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { ideas: true, members: true } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    type: "campaign" as const,
    title: campaign.title,
    description: campaign.teaser,
    status: campaign.status,
    url: `/campaigns/${campaign.id}`,
    metadata: {
      ideaCount: campaign._count.ideas,
      memberCount: campaign._count.members,
      createdBy: campaign.createdBy,
    },
  }));
}

async function searchChannels(query: string, limit: number): Promise<SearchResultItem[]> {
  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { teaser: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      teaser: true,
      status: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return channels.map((channel) => ({
    id: channel.id,
    type: "channel" as const,
    title: channel.title,
    description: channel.teaser,
    status: channel.status,
    url: `/channels/${channel.id}`,
    metadata: {
      memberCount: channel._count.members,
      createdBy: channel.createdBy,
    },
  }));
}

async function searchUsers(query: string, limit: number): Promise<SearchResultItem[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      skills: true,
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  return users.map((user) => ({
    id: user.id,
    type: "user" as const,
    title: user.name ?? user.email,
    description: user.bio,
    status: null,
    url: `/profile/${user.id}`,
    metadata: {
      email: user.email,
      image: user.image,
      skills: user.skills,
    },
  }));
}

export async function exploreList(input: ExploreListInput) {
  const { entityType, cursor, limit, search, sortBy, sortOrder, status } = input;

  switch (entityType) {
    case "campaign":
      return exploreCampaigns({ cursor, limit, search, sortBy, sortOrder, status });
    case "channel":
      return exploreChannels({ cursor, limit, search, sortBy, sortOrder, status });
    case "idea":
      return exploreIdeas({ cursor, limit, search, sortBy, sortOrder, status, tags: input.tags });
    case "user":
      return exploreUsers({ cursor, limit, search, sortBy, sortOrder });
    default:
      return { items: [] as ExploreItem[], nextCursor: undefined };
  }
}

interface ExplorePaginationParams {
  cursor?: string;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status?: string;
  tags?: string[];
}

async function exploreCampaigns(params: ExplorePaginationParams) {
  const where: Prisma.CampaignWhereInput = {};

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { teaser: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.status) {
    where.status = params.status as Prisma.EnumCampaignStatusFilter;
  }

  const orderBy = getCampaignOrderBy(params.sortBy, params.sortOrder);

  const items = await prisma.campaign.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { ideas: true, members: true } },
    },
    take: params.limit + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > params.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.teaser,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      metadata: {
        bannerUrl: c.bannerUrl,
        submissionType: c.submissionType,
        ideaCount: c._count.ideas,
        memberCount: c._count.members,
        createdBy: c.createdBy,
        submissionCloseDate: c.submissionCloseDate?.toISOString() ?? null,
      },
    })),
    nextCursor,
  };
}

function getCampaignOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.CampaignOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { title: sortOrder };
    case "status":
      return { status: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function exploreChannels(params: ExplorePaginationParams) {
  const where: Prisma.ChannelWhereInput = {};

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { teaser: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.status) {
    where.status = params.status as Prisma.EnumChannelStatusFilter;
  }

  const orderBy = getChannelOrderBy(params.sortBy, params.sortOrder);

  const items = await prisma.channel.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { members: true } },
    },
    take: params.limit + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > params.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.teaser,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      metadata: {
        bannerUrl: c.bannerUrl,
        problemStatement: c.problemStatement,
        memberCount: c._count.members,
        createdBy: c.createdBy,
      },
    })),
    nextCursor,
  };
}

function getChannelOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.ChannelOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { title: sortOrder };
    case "status":
      return { status: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function exploreIdeas(params: ExplorePaginationParams) {
  const where: Prisma.IdeaWhereInput = {};

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { teaser: { contains: params.search, mode: "insensitive" } },
      { tags: { hasSome: [params.search] } },
    ];
  }

  if (params.status) {
    where.status = params.status as Prisma.EnumIdeaStatusFilter;
  }

  if (params.tags?.length) {
    where.tags = { hasSome: params.tags };
  }

  const orderBy = getIdeaOrderBy(params.sortBy, params.sortOrder);

  const items = await prisma.idea.findMany({
    where,
    include: {
      contributor: { select: { id: true, name: true, email: true, image: true } },
      campaign: { select: { id: true, title: true } },
    },
    take: params.limit + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > params.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.teaser,
      status: idea.status,
      createdAt: idea.createdAt.toISOString(),
      metadata: {
        likesCount: idea.likesCount,
        commentsCount: idea.commentsCount,
        viewsCount: idea.viewsCount,
        tags: idea.tags,
        contributor: idea.contributor,
        campaign: idea.campaign,
        campaignId: idea.campaignId,
      },
    })),
    nextCursor,
  };
}

function getIdeaOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.IdeaOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { title: sortOrder };
    case "comments":
      return { commentsCount: sortOrder };
    case "votes":
      return { likesCount: sortOrder };
    case "status":
      return { status: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function exploreUsers(params: Omit<ExplorePaginationParams, "status" | "tags">) {
  const where: Prisma.UserWhereInput = { isActive: true };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.UserOrderByWithRelationInput =
    params.sortBy === "name" ? { name: params.sortOrder } : { createdAt: params.sortOrder };

  const items = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      skills: true,
      createdAt: true,
    },
    take: params.limit + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > params.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((user) => ({
      id: user.id,
      title: user.name ?? user.email,
      description: user.bio,
      status: null,
      createdAt: user.createdAt.toISOString(),
      metadata: {
        email: user.email,
        image: user.image,
        skills: user.skills,
      },
    })),
    nextCursor,
  };
}

export async function listSavedSearches(userId: string) {
  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return searches.map((s) => ({
    id: s.id,
    name: s.name,
    query: s.query,
    filters: s.filters as Record<string, unknown> | null,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function createSavedSearch(input: SavedSearchCreateInput, userId: string) {
  const saved = await prisma.savedSearch.create({
    data: {
      name: input.name,
      query: input.query,
      filters: input.filters as Prisma.InputJsonValue | undefined,
      userId,
    },
  });

  eventBus.emit("search.saved", {
    entity: "savedSearch",
    entityId: saved.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: saved.name, query: saved.query },
  });

  childLogger.info({ savedSearchId: saved.id }, "Saved search created");

  return {
    id: saved.id,
    name: saved.name,
    query: saved.query,
    filters: saved.filters as Record<string, unknown> | null,
    createdAt: saved.createdAt.toISOString(),
  };
}

export async function deleteSavedSearch(id: string, userId: string) {
  const existing = await prisma.savedSearch.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing) {
    throw new SearchServiceError("Saved search not found", "SAVED_SEARCH_NOT_FOUND");
  }

  if (existing.userId !== userId) {
    throw new SearchServiceError("You can only delete your own saved searches", "NOT_OWNER");
  }

  await prisma.savedSearch.delete({ where: { id } });

  eventBus.emit("search.deleted", {
    entity: "savedSearch",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ savedSearchId: id }, "Saved search deleted");

  return { success: true };
}

export class SearchServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SearchServiceError";
  }
}
