/**
 * Centralized permission definitions for RBAC.
 *
 * 3-level resolution:
 *   Level 1: Global Role — PLATFORM_ADMIN bypasses all checks
 *   Level 2: Resource Role — campaign/channel membership role
 *   Level 3: Scope — org unit, audience, or ownership
 */

export const Action = {
  // User management
  USER_READ_OWN: "user.read.own",
  USER_UPDATE_OWN: "user.update.own",
  USER_READ_ANY: "user.read.any",
  USER_UPDATE_ANY: "user.update.any",
  USER_DEACTIVATE: "user.deactivate",
  USER_CHANGE_ROLE: "user.changeRole",

  // Campaign management
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_READ: "campaign.read",
  CAMPAIGN_UPDATE: "campaign.update",
  CAMPAIGN_DELETE: "campaign.delete",
  CAMPAIGN_MANAGE: "campaign.manage",
  CAMPAIGN_TRANSITION: "campaign.transition",
  CAMPAIGN_ASSIGN_ROLES: "campaign.assignRoles",
  CAMPAIGN_COPY: "campaign.copy",
  CAMPAIGN_SPONSOR_VIEW: "campaign.sponsorView",
  CAMPAIGN_SPONSOR_COMMENT: "campaign.sponsorComment",
  CAMPAIGN_SPONSOR_APPROVE: "campaign.sponsorApprove",

  // Channel management
  CHANNEL_CREATE: "channel.create",
  CHANNEL_READ: "channel.read",
  CHANNEL_UPDATE: "channel.update",
  CHANNEL_DELETE: "channel.delete",
  CHANNEL_MANAGE: "channel.manage",

  // Idea management
  IDEA_CREATE: "idea.create",
  IDEA_READ: "idea.read",
  IDEA_UPDATE_OWN: "idea.update.own",
  IDEA_UPDATE_ANY: "idea.update.any",
  IDEA_DELETE_OWN: "idea.delete.own",
  IDEA_DELETE_ANY: "idea.delete.any",
  IDEA_TRANSITION: "idea.transition",
  IDEA_MODERATE: "idea.moderate",
  IDEA_SPLIT: "idea.split",
  IDEA_MERGE: "idea.merge",
  IDEA_BULK_ACTION: "idea.bulkAction",
  IDEA_SET_CONFIDENTIAL: "idea.setConfidential",
  IDEA_READ_CONFIDENTIAL: "idea.readConfidential",
  IDEA_LIKE: "idea.like",
  IDEA_VOTE: "idea.vote",
  IDEA_FOLLOW: "idea.follow",

  // Comments
  COMMENT_CREATE: "comment.create",
  COMMENT_READ: "comment.read",
  COMMENT_UPDATE_OWN: "comment.update.own",
  COMMENT_DELETE_OWN: "comment.delete.own",
  COMMENT_DELETE_ANY: "comment.delete.any",
  COMMENT_MODERATE: "comment.moderate",

  // Evaluation
  EVALUATION_CREATE: "evaluation.create",
  EVALUATION_UPDATE: "evaluation.update",
  EVALUATION_DELETE: "evaluation.delete",
  EVALUATION_PARTICIPATE: "evaluation.participate",
  EVALUATION_VIEW_RESULTS: "evaluation.viewResults",
  EVALUATION_MANAGE_EVALUATORS: "evaluation.manageEvaluators",
  EVALUATION_MANAGE_IDEAS: "evaluation.manageIdeas",

  // Notifications
  NOTIFICATION_READ_OWN: "notification.read.own",
  NOTIFICATION_SEND_BULK: "notification.sendBulk",

  // Communication Hub
  COMMUNICATION_CREATE: "communication.create",
  COMMUNICATION_READ: "communication.read",
  COMMUNICATION_SEND: "communication.send",
  COMMUNICATION_DELETE: "communication.delete",

  // Admin
  ADMIN_ACCESS: "admin.access",
  ADMIN_MANAGE_USERS: "admin.manageUsers",
  ADMIN_MANAGE_ORG_UNITS: "admin.manageOrgUnits",
  ADMIN_MANAGE_GROUPS: "admin.manageGroups",
  ADMIN_VIEW_METRICS: "admin.viewMetrics",
  ADMIN_MANAGE_SPACES: "admin.manageSpaces",
  ADMIN_MANAGE_SSO: "admin.manageSso",
  ADMIN_MANAGE_SCIM: "admin.manageScim",

  // Organization (partner) management
  ORGANIZATION_CREATE: "organization.create",
  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_UPDATE: "organization.update",
  ORGANIZATION_DELETE: "organization.delete",
  ORGANIZATION_MANAGE_CONTACTS: "organization.manageContacts",
  ORGANIZATION_SET_CONFIDENTIAL: "organization.setConfidential",
  ORGANIZATION_READ_CONFIDENTIAL: "organization.readConfidential",

  // Search
  SEARCH_GLOBAL: "search.global",
  SEARCH_SAVE: "search.save",
  SEARCH_DELETE_OWN: "search.delete.own",

  // Scouting board management
  SCOUTING_BOARD_CREATE: "scoutingBoard.create",
  SCOUTING_BOARD_READ: "scoutingBoard.read",
  SCOUTING_BOARD_UPDATE: "scoutingBoard.update",
  SCOUTING_BOARD_DELETE: "scoutingBoard.delete",
  SCOUTING_BOARD_SHARE: "scoutingBoard.share",

  // Scouting mission management
  SCOUTING_MISSION_CREATE: "scoutingMission.create",
  SCOUTING_MISSION_READ: "scoutingMission.read",
  SCOUTING_MISSION_UPDATE: "scoutingMission.update",
  SCOUTING_MISSION_DELETE: "scoutingMission.delete",
  SCOUTING_MISSION_TRANSITION: "scoutingMission.transition",
  SCOUTING_MISSION_MANAGE_SCOUTS: "scoutingMission.manageScouts",

  // Bucket management
  BUCKET_CREATE: "bucket.create",
  BUCKET_READ: "bucket.read",
  BUCKET_UPDATE: "bucket.update",
  BUCKET_DELETE: "bucket.delete",
  BUCKET_ASSIGN_IDEAS: "bucket.assignIdeas",

  // AI features
  AI_VIEW_STATUS: "ai.viewStatus",
  AI_FIND_SIMILAR: "ai.findSimilar",
  AI_ENRICH_IDEA: "ai.enrichIdea",
  AI_SUMMARIZE: "ai.summarize",

  // External invitations
  EXTERNAL_INVITATION_CREATE: "externalInvitation.create",
  EXTERNAL_INVITATION_LIST: "externalInvitation.list",
  EXTERNAL_INVITATION_REVOKE: "externalInvitation.revoke",
  EXTERNAL_INVITATION_REVOKE_ACCESS: "externalInvitation.revokeAccess",
  EXTERNAL_INVITATION_MANAGE: "externalInvitation.manage",

  // Push notifications
  PUSH_SUBSCRIBE: "push.subscribe",
  PUSH_READ_OWN: "push.read.own",

  // White-label management
  WHITE_LABEL_READ: "whiteLabel.read",
  WHITE_LABEL_UPDATE: "whiteLabel.update",

  // Strategic Innovation Areas
  SIA_CREATE: "sia.create",
  SIA_READ: "sia.read",
  SIA_UPDATE: "sia.update",
  SIA_DELETE: "sia.delete",

  // Trends
  TREND_CREATE: "trend.create",
  TREND_READ: "trend.read",
  TREND_UPDATE: "trend.update",
  TREND_DELETE: "trend.delete",

  // Technologies
  TECHNOLOGY_CREATE: "technology.create",
  TECHNOLOGY_READ: "technology.read",
  TECHNOLOGY_UPDATE: "technology.update",
  TECHNOLOGY_DELETE: "technology.delete",

  // Community Insights
  INSIGHT_CREATE: "insight.create",
  INSIGHT_READ: "insight.read",
  INSIGHT_UPDATE: "insight.update",
  INSIGHT_DELETE: "insight.delete",

  // Innovation Portfolios
  PORTFOLIO_CREATE: "portfolio.create",
  PORTFOLIO_READ: "portfolio.read",
  PORTFOLIO_UPDATE: "portfolio.update",
  PORTFOLIO_DELETE: "portfolio.delete",

  // Process definition management
  PROCESS_DEFINITION_CREATE: "processDefinition.create",
  PROCESS_DEFINITION_READ: "processDefinition.read",
  PROCESS_DEFINITION_UPDATE: "processDefinition.update",
  PROCESS_DEFINITION_DELETE: "processDefinition.delete",

  // Project management
  PROJECT_CREATE: "project.create",
  PROJECT_READ: "project.read",
  PROJECT_UPDATE: "project.update",
  PROJECT_DELETE: "project.delete",
  PROJECT_MANAGE_TEAM: "project.manageTeam",
  PROJECT_REQUEST_GATE_REVIEW: "project.requestGateReview",
  PROJECT_SUBMIT_GATE_DECISION: "project.submitGateDecision",
  PROJECT_UPDATE_PHASE_DATES: "project.updatePhaseDates",

  // Use case pipeline management
  USE_CASE_CREATE: "useCase.create",
  USE_CASE_READ: "useCase.read",
  USE_CASE_UPDATE: "useCase.update",
  USE_CASE_DELETE: "useCase.delete",
  USE_CASE_TRANSITION: "useCase.transition",
  USE_CASE_MANAGE_TEAM: "useCase.manageTeam",
  USE_CASE_MANAGE_TASKS: "useCase.manageTasks",
} as const;

export type ActionType = (typeof Action)[keyof typeof Action];

type GlobalRoleName = "PLATFORM_ADMIN" | "INNOVATION_MANAGER" | "MEMBER" | "EXTERNAL";
type ResourceRoleName =
  | "CAMPAIGN_MANAGER"
  | "CAMPAIGN_COACH"
  | "CAMPAIGN_CONTRIBUTOR"
  | "CAMPAIGN_MODERATOR"
  | "CAMPAIGN_EVALUATOR"
  | "CAMPAIGN_SEEDER"
  | "CAMPAIGN_SPONSOR"
  | "CHANNEL_MANAGER"
  | "CHANNEL_CONTRIBUTOR";

/**
 * Global role permissions — what each global role can do without any resource context.
 * PLATFORM_ADMIN bypasses all checks (handled in middleware).
 */
export const GLOBAL_ROLE_PERMISSIONS: Record<GlobalRoleName, readonly ActionType[]> = {
  PLATFORM_ADMIN: [], // bypass — never checked
  INNOVATION_MANAGER: [
    Action.USER_READ_OWN,
    Action.USER_UPDATE_OWN,
    Action.USER_READ_ANY,
    Action.CAMPAIGN_CREATE,
    Action.CAMPAIGN_READ,
    Action.CAMPAIGN_COPY,
    Action.CHANNEL_CREATE,
    Action.CHANNEL_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.IDEA_SET_CONFIDENTIAL,
    Action.IDEA_READ_CONFIDENTIAL,
    Action.IDEA_SPLIT,
    Action.IDEA_MERGE,
    Action.IDEA_BULK_ACTION,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_OWN,
    Action.IDEA_LIKE,
    Action.IDEA_VOTE,
    Action.IDEA_FOLLOW,
    Action.EVALUATION_CREATE,
    Action.EVALUATION_UPDATE,
    Action.EVALUATION_DELETE,
    Action.EVALUATION_VIEW_RESULTS,
    Action.EVALUATION_MANAGE_EVALUATORS,
    Action.EVALUATION_MANAGE_IDEAS,
    Action.NOTIFICATION_READ_OWN,
    Action.COMMUNICATION_CREATE,
    Action.COMMUNICATION_READ,
    Action.COMMUNICATION_SEND,
    Action.COMMUNICATION_DELETE,
    Action.PUSH_SUBSCRIBE,
    Action.PUSH_READ_OWN,
    Action.ORGANIZATION_CREATE,
    Action.ORGANIZATION_READ,
    Action.ORGANIZATION_UPDATE,
    Action.ORGANIZATION_DELETE,
    Action.ORGANIZATION_MANAGE_CONTACTS,
    Action.ORGANIZATION_SET_CONFIDENTIAL,
    Action.ORGANIZATION_READ_CONFIDENTIAL,
    Action.SCOUTING_BOARD_CREATE,
    Action.SCOUTING_BOARD_READ,
    Action.SCOUTING_BOARD_UPDATE,
    Action.SCOUTING_BOARD_DELETE,
    Action.SCOUTING_BOARD_SHARE,
    Action.SCOUTING_MISSION_CREATE,
    Action.SCOUTING_MISSION_READ,
    Action.SCOUTING_MISSION_UPDATE,
    Action.SCOUTING_MISSION_DELETE,
    Action.SCOUTING_MISSION_TRANSITION,
    Action.SCOUTING_MISSION_MANAGE_SCOUTS,
    Action.USE_CASE_CREATE,
    Action.USE_CASE_READ,
    Action.USE_CASE_UPDATE,
    Action.USE_CASE_DELETE,
    Action.USE_CASE_TRANSITION,
    Action.USE_CASE_MANAGE_TEAM,
    Action.USE_CASE_MANAGE_TASKS,
    Action.BUCKET_CREATE,
    Action.BUCKET_READ,
    Action.BUCKET_UPDATE,
    Action.BUCKET_DELETE,
    Action.BUCKET_ASSIGN_IDEAS,
    Action.SEARCH_GLOBAL,
    Action.SEARCH_SAVE,
    Action.SEARCH_DELETE_OWN,
    Action.AI_VIEW_STATUS,
    Action.AI_FIND_SIMILAR,
    Action.AI_ENRICH_IDEA,
    Action.AI_SUMMARIZE,
    Action.SIA_CREATE,
    Action.SIA_READ,
    Action.SIA_UPDATE,
    Action.SIA_DELETE,
    Action.TREND_CREATE,
    Action.TREND_READ,
    Action.TREND_UPDATE,
    Action.TREND_DELETE,
    Action.TECHNOLOGY_CREATE,
    Action.TECHNOLOGY_READ,
    Action.TECHNOLOGY_UPDATE,
    Action.TECHNOLOGY_DELETE,
    Action.INSIGHT_CREATE,
    Action.INSIGHT_READ,
    Action.INSIGHT_UPDATE,
    Action.INSIGHT_DELETE,
    Action.PORTFOLIO_CREATE,
    Action.PORTFOLIO_READ,
    Action.PORTFOLIO_UPDATE,
    Action.PORTFOLIO_DELETE,
    Action.PROCESS_DEFINITION_CREATE,
    Action.PROCESS_DEFINITION_READ,
    Action.PROCESS_DEFINITION_UPDATE,
    Action.PROCESS_DEFINITION_DELETE,
    Action.PROJECT_CREATE,
    Action.PROJECT_READ,
    Action.PROJECT_UPDATE,
    Action.PROJECT_DELETE,
    Action.PROJECT_MANAGE_TEAM,
    Action.PROJECT_REQUEST_GATE_REVIEW,
    Action.PROJECT_SUBMIT_GATE_DECISION,
    Action.PROJECT_UPDATE_PHASE_DATES,
    Action.EXTERNAL_INVITATION_CREATE,
    Action.EXTERNAL_INVITATION_LIST,
    Action.EXTERNAL_INVITATION_REVOKE,
    Action.EXTERNAL_INVITATION_REVOKE_ACCESS,
    Action.EXTERNAL_INVITATION_MANAGE,
  ],
  MEMBER: [
    Action.USER_READ_OWN,
    Action.USER_UPDATE_OWN,
    Action.CAMPAIGN_READ,
    Action.CHANNEL_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_OWN,
    Action.IDEA_LIKE,
    Action.IDEA_VOTE,
    Action.IDEA_FOLLOW,
    Action.EVALUATION_PARTICIPATE,
    Action.NOTIFICATION_READ_OWN,
    Action.COMMUNICATION_READ,
    Action.PUSH_SUBSCRIBE,
    Action.PUSH_READ_OWN,
    Action.BUCKET_READ,
    Action.ORGANIZATION_READ,
    Action.SCOUTING_BOARD_CREATE,
    Action.SCOUTING_BOARD_READ,
    Action.SCOUTING_BOARD_UPDATE,
    Action.SCOUTING_BOARD_DELETE,
    Action.SCOUTING_BOARD_SHARE,
    Action.SCOUTING_MISSION_READ,
    Action.USE_CASE_READ,
    Action.SEARCH_GLOBAL,
    Action.SEARCH_SAVE,
    Action.SEARCH_DELETE_OWN,
    Action.AI_VIEW_STATUS,
    Action.AI_FIND_SIMILAR,
    Action.AI_ENRICH_IDEA,
    Action.AI_SUMMARIZE,
    Action.SIA_READ,
    Action.TREND_READ,
    Action.TECHNOLOGY_READ,
    Action.INSIGHT_CREATE,
    Action.INSIGHT_READ,
    Action.PORTFOLIO_READ,
    Action.PROCESS_DEFINITION_READ,
    Action.PROJECT_READ,
  ],
  EXTERNAL: [
    Action.USER_READ_OWN,
    Action.USER_UPDATE_OWN,
    Action.CAMPAIGN_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_OWN,
    Action.NOTIFICATION_READ_OWN,
  ],
} as const;

/**
 * Resource role permissions — what each resource-level role grants on that specific resource.
 */
export const RESOURCE_ROLE_PERMISSIONS: Record<ResourceRoleName, readonly ActionType[]> = {
  CAMPAIGN_MANAGER: [
    Action.CAMPAIGN_READ,
    Action.CAMPAIGN_UPDATE,
    Action.CAMPAIGN_MANAGE,
    Action.CAMPAIGN_TRANSITION,
    Action.CAMPAIGN_ASSIGN_ROLES,
    Action.CAMPAIGN_COPY,
    Action.IDEA_READ,
    Action.IDEA_READ_CONFIDENTIAL,
    Action.IDEA_SET_CONFIDENTIAL,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_DELETE_ANY,
    Action.IDEA_TRANSITION,
    Action.IDEA_MODERATE,
    Action.IDEA_SPLIT,
    Action.IDEA_MERGE,
    Action.IDEA_BULK_ACTION,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_ANY,
    Action.COMMENT_MODERATE,
    Action.EVALUATION_CREATE,
    Action.EVALUATION_UPDATE,
    Action.EVALUATION_DELETE,
    Action.EVALUATION_VIEW_RESULTS,
    Action.EVALUATION_MANAGE_EVALUATORS,
    Action.EVALUATION_MANAGE_IDEAS,
    Action.BUCKET_CREATE,
    Action.BUCKET_READ,
    Action.BUCKET_UPDATE,
    Action.BUCKET_DELETE,
    Action.BUCKET_ASSIGN_IDEAS,
    Action.COMMUNICATION_CREATE,
    Action.COMMUNICATION_READ,
    Action.COMMUNICATION_SEND,
    Action.COMMUNICATION_DELETE,
  ],
  CAMPAIGN_COACH: [
    Action.CAMPAIGN_READ,
    Action.IDEA_READ,
    Action.IDEA_READ_CONFIDENTIAL,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_TRANSITION,
    Action.IDEA_MODERATE,
    Action.IDEA_SPLIT,
    Action.IDEA_MERGE,
    Action.IDEA_BULK_ACTION,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_OWN,
    Action.COMMENT_MODERATE,
    Action.EVALUATION_PARTICIPATE,
    Action.EVALUATION_VIEW_RESULTS,
    Action.BUCKET_READ,
    Action.BUCKET_CREATE,
    Action.BUCKET_UPDATE,
    Action.BUCKET_ASSIGN_IDEAS,
  ],
  CAMPAIGN_CONTRIBUTOR: [
    Action.CAMPAIGN_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
    Action.IDEA_LIKE,
    Action.IDEA_VOTE,
    Action.IDEA_FOLLOW,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_OWN,
    Action.EVALUATION_PARTICIPATE,
    Action.BUCKET_READ,
  ],
  CAMPAIGN_MODERATOR: [
    Action.CAMPAIGN_READ,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_MODERATE,
    Action.COMMENT_READ,
    Action.COMMENT_DELETE_ANY,
    Action.COMMENT_MODERATE,
  ],
  CAMPAIGN_EVALUATOR: [
    Action.CAMPAIGN_READ,
    Action.IDEA_READ,
    Action.COMMENT_READ,
    Action.EVALUATION_CREATE,
    Action.EVALUATION_PARTICIPATE,
    Action.EVALUATION_VIEW_RESULTS,
  ],
  CAMPAIGN_SEEDER: [
    Action.CAMPAIGN_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_LIKE,
    Action.IDEA_FOLLOW,
    Action.COMMENT_CREATE,
    Action.COMMENT_READ,
    Action.COMMENT_UPDATE_OWN,
    Action.COMMENT_DELETE_OWN,
  ],
  CAMPAIGN_SPONSOR: [
    Action.CAMPAIGN_READ,
    Action.CAMPAIGN_SPONSOR_VIEW,
    Action.CAMPAIGN_SPONSOR_COMMENT,
    Action.CAMPAIGN_SPONSOR_APPROVE,
    Action.IDEA_READ,
    Action.COMMENT_READ,
    Action.EVALUATION_VIEW_RESULTS,
  ],
  CHANNEL_MANAGER: [
    Action.CHANNEL_READ,
    Action.CHANNEL_UPDATE,
    Action.CHANNEL_MANAGE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_ANY,
    Action.IDEA_MODERATE,
  ],
  CHANNEL_CONTRIBUTOR: [
    Action.CHANNEL_READ,
    Action.IDEA_CREATE,
    Action.IDEA_READ,
    Action.IDEA_UPDATE_OWN,
    Action.IDEA_DELETE_OWN,
  ],
} as const;

/**
 * Check whether a global role grants a specific action.
 */
export function globalRoleHasPermission(role: GlobalRoleName, action: ActionType): boolean {
  if (role === "PLATFORM_ADMIN") return true;
  const permissions = GLOBAL_ROLE_PERMISSIONS[role];
  return permissions.includes(action);
}

/**
 * Check whether a resource role grants a specific action.
 */
export function resourceRoleHasPermission(role: ResourceRoleName, action: ActionType): boolean {
  const permissions = RESOURCE_ROLE_PERMISSIONS[role];
  return permissions.includes(action);
}
