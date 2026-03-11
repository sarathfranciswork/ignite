import type { UseCaseStatus } from "@prisma/client";

/**
 * Use Case pipeline state machine transition map.
 * Status changes ONLY go through transitionUseCase() — never direct prisma.update({ status }).
 *
 * Flow: IDENTIFIED → QUALIFICATION → EVALUATION → PILOT → PARTNERSHIP
 * ARCHIVED is reachable from any non-terminal state.
 */

export type UseCaseTransitionGuardId =
  | "HAS_LINKED_ORGANIZATION"
  | "HAS_TEAM_ASSIGNED"
  | "HAS_EVALUATION_NOTES";

export interface UseCaseTransitionGuardFailure {
  guard: UseCaseTransitionGuardId;
  message: string;
}

const TRANSITION_GUARDS: Record<string, UseCaseTransitionGuardId[]> = {
  "IDENTIFIED->QUALIFICATION": ["HAS_LINKED_ORGANIZATION"],
  "QUALIFICATION->EVALUATION": ["HAS_TEAM_ASSIGNED"],
};

const TRANSITION_MAP: Record<UseCaseStatus, UseCaseStatus[]> = {
  IDENTIFIED: ["QUALIFICATION", "ARCHIVED"],
  QUALIFICATION: ["EVALUATION", "ARCHIVED"],
  EVALUATION: ["PILOT", "ARCHIVED"],
  PILOT: ["PARTNERSHIP", "ARCHIVED"],
  PARTNERSHIP: ["ARCHIVED"],
  ARCHIVED: ["IDENTIFIED"],
};

export const USE_CASE_PHASE_ORDER: UseCaseStatus[] = [
  "IDENTIFIED",
  "QUALIFICATION",
  "EVALUATION",
  "PILOT",
  "PARTNERSHIP",
];

export const USE_CASE_STATUS_LABELS: Record<UseCaseStatus, string> = {
  IDENTIFIED: "Identified",
  QUALIFICATION: "Qualification",
  EVALUATION: "Evaluation",
  PILOT: "Pilot",
  PARTNERSHIP: "Partnership",
  ARCHIVED: "Archived",
};

export const USE_CASE_GUARD_FAILURE_MESSAGES: Record<UseCaseTransitionGuardId, string> = {
  HAS_LINKED_ORGANIZATION:
    "At least one organization must be linked before advancing to Qualification",
  HAS_TEAM_ASSIGNED: "A team must be assigned before advancing to Evaluation",
  HAS_EVALUATION_NOTES: "Evaluation notes are required before advancing",
};

export function getValidUseCaseTransitions(currentStatus: UseCaseStatus): UseCaseStatus[] {
  return TRANSITION_MAP[currentStatus] ?? [];
}

export function isValidUseCaseTransition(
  currentStatus: UseCaseStatus,
  targetStatus: UseCaseStatus,
): boolean {
  const validTargets = getValidUseCaseTransitions(currentStatus);
  return validTargets.includes(targetStatus);
}

export function getUseCaseTransitionGuards(
  from: UseCaseStatus,
  to: UseCaseStatus,
): UseCaseTransitionGuardId[] {
  const key = `${from}->${to}`;
  return TRANSITION_GUARDS[key] ?? [];
}
