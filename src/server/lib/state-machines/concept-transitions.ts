import type { ConceptStatus } from "@prisma/client";

/**
 * Concept state machine transition map.
 * Status changes ONLY go through the concept service — never direct prisma.update({ status }).
 *
 * Flow: ELABORATION → EVALUATION → APPROVED / REJECTED
 * REVISE sends back from EVALUATION → ELABORATION.
 */

export type ConceptTransitionGuardId = "HAS_PROBLEM_STATEMENT" | "HAS_PROPOSED_SOLUTION";

export interface ConceptTransitionGuardFailure {
  guard: ConceptTransitionGuardId;
  message: string;
}

const TRANSITION_GUARDS: Record<string, ConceptTransitionGuardId[]> = {
  "ELABORATION->EVALUATION": ["HAS_PROBLEM_STATEMENT", "HAS_PROPOSED_SOLUTION"],
};

const TRANSITION_MAP: Record<ConceptStatus, ConceptStatus[]> = {
  ELABORATION: ["EVALUATION"],
  EVALUATION: ["APPROVED", "REJECTED", "ELABORATION"],
  APPROVED: [],
  REJECTED: [],
};

export const CONCEPT_PHASE_ORDER: ConceptStatus[] = ["ELABORATION", "EVALUATION"];

export const CONCEPT_STATUS_LABELS: Record<ConceptStatus, string> = {
  ELABORATION: "Elaboration",
  EVALUATION: "Evaluation",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const CONCEPT_GUARD_FAILURE_MESSAGES: Record<ConceptTransitionGuardId, string> = {
  HAS_PROBLEM_STATEMENT: "A problem statement must be provided before advancing to Evaluation",
  HAS_PROPOSED_SOLUTION: "A proposed solution must be provided before advancing to Evaluation",
};

export function getValidConceptTransitions(currentStatus: ConceptStatus): ConceptStatus[] {
  return TRANSITION_MAP[currentStatus] ?? [];
}

export function isValidConceptTransition(
  currentStatus: ConceptStatus,
  targetStatus: ConceptStatus,
): boolean {
  const validTargets = getValidConceptTransitions(currentStatus);
  return validTargets.includes(targetStatus);
}

export function getConceptTransitionGuards(
  from: ConceptStatus,
  to: ConceptStatus,
): ConceptTransitionGuardId[] {
  const key = `${from}->${to}`;
  return TRANSITION_GUARDS[key] ?? [];
}
