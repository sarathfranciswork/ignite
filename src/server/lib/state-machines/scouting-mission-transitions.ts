import type { ScoutingMissionStatus } from "@prisma/client";

/**
 * Scouting mission state machine transition map.
 * Status changes ONLY go through transitionScoutingMission() — never direct prisma.update({ status }).
 *
 * Flow: OPEN → IN_PROGRESS → COMPLETED
 */

const TRANSITION_MAP: Record<ScoutingMissionStatus, ScoutingMissionStatus[]> = {
  OPEN: ["IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["COMPLETED", "OPEN"],
  COMPLETED: ["OPEN"],
};

export const SCOUTING_MISSION_PHASE_ORDER: ScoutingMissionStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
];

/**
 * Get valid next statuses for a scouting mission given its current status.
 */
export function getValidScoutingMissionTransitions(
  currentStatus: ScoutingMissionStatus,
): ScoutingMissionStatus[] {
  return TRANSITION_MAP[currentStatus] ?? [];
}

/**
 * Check if a transition from currentStatus to targetStatus is valid.
 */
export function isValidScoutingMissionTransition(
  currentStatus: ScoutingMissionStatus,
  targetStatus: ScoutingMissionStatus,
): boolean {
  const validTargets = getValidScoutingMissionTransitions(currentStatus);
  return validTargets.includes(targetStatus);
}

/**
 * Human-readable labels for each scouting mission status.
 */
export const SCOUTING_MISSION_STATUS_LABELS: Record<ScoutingMissionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};
