import type { IdeaStatus, CampaignStatus } from "@prisma/client";

/**
 * Idea state machine transition map.
 * Status changes ONLY go through transitionIdea() — never direct prisma.update({ status }).
 *
 * Flow: DRAFT → QUALIFICATION → COMMUNITY_DISCUSSION → HOT → EVALUATION → SELECTED_IMPLEMENTATION → IMPLEMENTED → ARCHIVED
 * Some phases can be skipped based on campaign feature toggles.
 * ARCHIVED can be reached from any non-terminal state (with reason).
 */

export interface IdeaFeatureToggles {
  hasQualificationPhase: boolean;
  hasDiscussionPhase: boolean;
}

/**
 * Campaign statuses that constrain idea advancement.
 * Ideas cannot advance past the current campaign phase.
 */
const CAMPAIGN_PHASE_CEILING: Record<CampaignStatus, IdeaStatus[]> = {
  DRAFT: ["DRAFT"],
  SEEDING: ["DRAFT", "QUALIFICATION"],
  SUBMISSION: ["DRAFT", "QUALIFICATION"],
  DISCUSSION_VOTING: ["DRAFT", "QUALIFICATION", "COMMUNITY_DISCUSSION", "HOT"],
  EVALUATION: [
    "DRAFT",
    "QUALIFICATION",
    "COMMUNITY_DISCUSSION",
    "HOT",
    "EVALUATION",
    "SELECTED_IMPLEMENTATION",
  ],
  CLOSED: [
    "DRAFT",
    "QUALIFICATION",
    "COMMUNITY_DISCUSSION",
    "HOT",
    "EVALUATION",
    "SELECTED_IMPLEMENTATION",
    "IMPLEMENTED",
    "ARCHIVED",
  ],
};

/**
 * Forward transition map — the normal lifecycle flow.
 * ARCHIVED is handled separately via archiveIdea / unarchiveIdea.
 */
const TRANSITION_MAP: Record<IdeaStatus, IdeaStatus[]> = {
  DRAFT: ["QUALIFICATION"],
  QUALIFICATION: ["COMMUNITY_DISCUSSION", "EVALUATION"],
  COMMUNITY_DISCUSSION: ["HOT", "EVALUATION"],
  HOT: ["EVALUATION"],
  EVALUATION: ["SELECTED_IMPLEMENTATION"],
  SELECTED_IMPLEMENTATION: ["IMPLEMENTED"],
  IMPLEMENTED: [],
  ARCHIVED: [],
};

/**
 * Ordered list of all idea phases for display purposes.
 */
export const IDEA_PHASE_ORDER: IdeaStatus[] = [
  "DRAFT",
  "QUALIFICATION",
  "COMMUNITY_DISCUSSION",
  "HOT",
  "EVALUATION",
  "SELECTED_IMPLEMENTATION",
  "IMPLEMENTED",
  "ARCHIVED",
];

/**
 * Get valid next statuses for an idea given its current status, feature toggles,
 * and (optionally) the campaign's current phase.
 */
export function getValidIdeaTransitions(
  currentStatus: IdeaStatus,
  toggles: IdeaFeatureToggles,
  campaignStatus?: CampaignStatus,
): IdeaStatus[] {
  const rawTransitions = TRANSITION_MAP[currentStatus] ?? [];

  const filtered = rawTransitions.filter((target) => {
    // Skip qualification if campaign doesn't use it
    if (target === "QUALIFICATION" && !toggles.hasQualificationPhase) return false;
    // Skip community discussion if campaign doesn't use discussion phase
    if (target === "COMMUNITY_DISCUSSION" && !toggles.hasDiscussionPhase) return false;
    // Skip HOT if discussion is disabled (HOT is a sub-state of discussion)
    if (target === "HOT" && !toggles.hasDiscussionPhase) return false;
    return true;
  });

  // If campaign status is provided, restrict to allowed ceiling
  if (campaignStatus) {
    const allowedStatuses = CAMPAIGN_PHASE_CEILING[campaignStatus] ?? [];
    return filtered.filter((target) => allowedStatuses.includes(target));
  }

  return filtered;
}

/**
 * Check if a transition from currentStatus to targetStatus is valid.
 */
export function isValidIdeaTransition(
  currentStatus: IdeaStatus,
  targetStatus: IdeaStatus,
  toggles: IdeaFeatureToggles,
  campaignStatus?: CampaignStatus,
): boolean {
  const validTargets = getValidIdeaTransitions(currentStatus, toggles, campaignStatus);
  return validTargets.includes(targetStatus);
}

/**
 * Statuses from which an idea can be archived.
 * Ideas that are already IMPLEMENTED or ARCHIVED cannot be archived.
 */
const ARCHIVABLE_STATUSES: IdeaStatus[] = [
  "DRAFT",
  "QUALIFICATION",
  "COMMUNITY_DISCUSSION",
  "HOT",
  "EVALUATION",
  "SELECTED_IMPLEMENTATION",
];

/**
 * Check if an idea can be archived from its current status.
 */
export function canArchiveIdea(currentStatus: IdeaStatus): boolean {
  return ARCHIVABLE_STATUSES.includes(currentStatus);
}

/**
 * Check if an idea can be unarchived (restored to its previous status).
 */
export function canUnarchiveIdea(currentStatus: IdeaStatus): boolean {
  return currentStatus === "ARCHIVED";
}

/**
 * Human-readable labels for each idea status.
 */
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  DRAFT: "Draft",
  QUALIFICATION: "Qualification",
  COMMUNITY_DISCUSSION: "Community Discussion",
  HOT: "Hot",
  EVALUATION: "Evaluation",
  SELECTED_IMPLEMENTATION: "Selected for Implementation",
  IMPLEMENTED: "Implemented",
  ARCHIVED: "Archived",
};
