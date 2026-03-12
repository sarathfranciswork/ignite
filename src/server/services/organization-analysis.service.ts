import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { OrganizationAnalysisInput } from "./campaign-comparison.schemas";
import type { OrganizationAnalysisResult } from "./campaign-comparison.types";

const childLogger = logger.child({ service: "organization-analysis" });

export async function getOrganizationAnalysis(
  input: OrganizationAnalysisInput,
): Promise<OrganizationAnalysisResult> {
  const orgUnitWhere: Record<string, unknown> = { isActive: true };
  if (input.orgUnitIds && input.orgUnitIds.length > 0) {
    orgUnitWhere.id = { in: input.orgUnitIds };
  }

  const orgUnits = await prisma.orgUnit.findMany({
    where: orgUnitWhere,
    select: {
      id: true,
      name: true,
      userAssignments: {
        select: { userId: true },
      },
    },
  });

  const dateFilter =
    input.dateRange?.from || input.dateRange?.to
      ? {
          createdAt: {
            ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
            ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
          },
        }
      : {};

  const orgUnitActivities = await Promise.all(
    orgUnits.map(async (orgUnit) => {
      const userIds = orgUnit.userAssignments.map((a) => a.userId);

      if (userIds.length === 0) {
        return {
          orgUnitId: orgUnit.id,
          orgUnitName: orgUnit.name,
          memberCount: 0,
          ideasSubmitted: 0,
          commentsContributed: 0,
          votesParticipated: 0,
          likesGiven: 0,
          campaignsParticipated: 0,
        };
      }

      const [ideaCount, commentCount, voteCount, likeCount, campaignCount] = await Promise.all([
        prisma.idea.count({
          where: {
            contributorId: { in: userIds },
            ...dateFilter,
          },
        }),
        prisma.comment.count({
          where: {
            authorId: { in: userIds },
            ...dateFilter,
          },
        }),
        prisma.ideaVote.count({
          where: {
            userId: { in: userIds },
            ...dateFilter,
          },
        }),
        prisma.ideaLike.count({
          where: {
            userId: { in: userIds },
            ...dateFilter,
          },
        }),
        prisma.campaignMember.count({
          where: {
            userId: { in: userIds },
            ...(input.dateRange?.from || input.dateRange?.to
              ? {
                  assignedAt: {
                    ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
                    ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
                  },
                }
              : {}),
          },
        }),
      ]);

      return {
        orgUnitId: orgUnit.id,
        orgUnitName: orgUnit.name,
        memberCount: userIds.length,
        ideasSubmitted: ideaCount,
        commentsContributed: commentCount,
        votesParticipated: voteCount,
        likesGiven: likeCount,
        campaignsParticipated: campaignCount,
      };
    }),
  );

  const totals = {
    totalOrgUnits: orgUnitActivities.length,
    totalMembers: orgUnitActivities.reduce((sum, o) => sum + o.memberCount, 0),
    totalIdeas: orgUnitActivities.reduce((sum, o) => sum + o.ideasSubmitted, 0),
    totalComments: orgUnitActivities.reduce((sum, o) => sum + o.commentsContributed, 0),
    totalVotes: orgUnitActivities.reduce((sum, o) => sum + o.votesParticipated, 0),
  };

  childLogger.info({ orgUnitCount: orgUnitActivities.length }, "Organization analysis generated");

  return {
    orgUnits: orgUnitActivities,
    totals,
    analyzedAt: new Date().toISOString(),
  };
}
