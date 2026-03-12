// ── Campaign Comparison Types ────────────────────────────────

export class CampaignComparisonServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CampaignComparisonServiceError";
  }
}

export interface CampaignMetrics {
  campaignId: string;
  title: string;
  status: string;
  createdAt: string;
  launchedAt: string | null;
  closedAt: string | null;
  durationDays: number | null;
  memberCount: number;
  ideaCount: number;
  ideaStatusBreakdown: Record<string, number>;
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
    totalViews: number;
    uniqueVisitors: number;
  };
  configuration: {
    hasSeedingPhase: boolean;
    hasDiscussionPhase: boolean;
    hasCommunityGraduation: boolean;
    hasQualificationPhase: boolean;
    hasVoting: boolean;
    hasLikes: boolean;
    hasIdeaCoach: boolean;
  };
  kpiTimeSeries: Array<{
    date: string;
    ideasSubmitted: number;
    totalComments: number;
    totalVotes: number;
    totalLikes: number;
  }>;
}

export interface CampaignComparisonResult {
  campaigns: CampaignMetrics[];
  comparedAt: string;
}

export interface SuccessFactorEntry {
  campaignId: string;
  title: string;
  status: string;
  configuration: {
    durationDays: number | null;
    phaseCount: number;
    hasVoting: boolean;
    hasLikes: boolean;
    hasSeedingPhase: boolean;
    hasDiscussionPhase: boolean;
    hasCommunityGraduation: boolean;
    hasQualificationPhase: boolean;
    hasIdeaCoach: boolean;
  };
  outcomes: {
    totalIdeas: number;
    hotIdeas: number;
    evaluatedIdeas: number;
    selectedIdeas: number;
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
    memberCount: number;
    ideasPerMember: number;
  };
  successScore: number;
}

export interface SuccessFactorResult {
  entries: SuccessFactorEntry[];
  averages: {
    avgDurationDays: number | null;
    avgIdeasPerMember: number;
    avgSuccessScore: number;
  };
  analyzedAt: string;
}

export interface OrgUnitActivity {
  orgUnitId: string;
  orgUnitName: string;
  memberCount: number;
  ideasSubmitted: number;
  commentsContributed: number;
  votesParticipated: number;
  likesGiven: number;
  campaignsParticipated: number;
}

export interface OrganizationAnalysisResult {
  orgUnits: OrgUnitActivity[];
  totals: {
    totalOrgUnits: number;
    totalMembers: number;
    totalIdeas: number;
    totalComments: number;
    totalVotes: number;
  };
  analyzedAt: string;
}
