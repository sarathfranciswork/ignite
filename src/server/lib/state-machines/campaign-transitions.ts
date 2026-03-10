import type { CampaignStatus } from "@prisma/client";
import type { EventName } from "@/server/events/types";

export interface TransitionDef {
  to: CampaignStatus;
  guard?: (context: TransitionContext) => Promise<boolean>;
  effects: EventName[];
}

export interface TransitionContext {
  campaignId: string;
  actorId: string;
  hasIdeas?: boolean;
  hasEvaluationSessions?: boolean;
}

/**
 * Campaign state machine transition map.
 * Each status maps to an array of valid transitions.
 * Guards are async precondition validators.
 * Effects are event names emitted via EventBus after successful transition.
 */
export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, TransitionDef[]> = {
  DRAFT: [
    {
      to: "SEEDING",
      effects: ["campaign.phaseChanged"],
    },
    {
      to: "SUBMISSION",
      effects: ["campaign.phaseChanged"],
    },
  ],
  SEEDING: [
    {
      to: "SUBMISSION",
      effects: ["campaign.phaseChanged"],
    },
    {
      to: "DRAFT",
      effects: ["campaign.phaseChanged"],
    },
  ],
  SUBMISSION: [
    {
      to: "DISCUSSION_VOTING",
      effects: ["campaign.phaseChanged"],
    },
    {
      to: "SEEDING",
      effects: ["campaign.phaseChanged"],
    },
  ],
  DISCUSSION_VOTING: [
    {
      to: "EVALUATION",
      effects: ["campaign.phaseChanged"],
    },
    {
      to: "SUBMISSION",
      effects: ["campaign.phaseChanged"],
    },
  ],
  EVALUATION: [
    {
      to: "CLOSED",
      effects: ["campaign.phaseChanged"],
    },
    {
      to: "DISCUSSION_VOTING",
      effects: ["campaign.phaseChanged"],
    },
  ],
  CLOSED: [
    {
      to: "EVALUATION",
      effects: ["campaign.phaseChanged"],
    },
  ],
};

/**
 * Get valid transitions for the given campaign status.
 */
export function getValidTransitions(status: CampaignStatus): TransitionDef[] {
  return CAMPAIGN_TRANSITIONS[status] ?? [];
}

/**
 * Check whether a transition from `from` to `to` is valid.
 */
export function isValidTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  const transitions = getValidTransitions(from);
  return transitions.some((t) => t.to === to);
}

/**
 * Get the transition definition for a specific from -> to transition.
 */
export function getTransitionDef(
  from: CampaignStatus,
  to: CampaignStatus,
): TransitionDef | undefined {
  const transitions = getValidTransitions(from);
  return transitions.find((t) => t.to === to);
}
