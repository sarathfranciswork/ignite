import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  projectListInput,
  projectCreateInput,
  projectUpdateInput,
  projectGetByIdInput,
  projectDeleteInput,
  projectAddTeamMemberInput,
  projectRemoveTeamMemberInput,
  requestGateReviewInput,
  submitGateDecisionInput,
  getPhaseInstancesInput,
  updatePhaseDatesInput,
  listTaskAssignmentsInput,
  getTaskAssignmentInput,
  upsertTaskAssignmentInput,
  updateTaskStatusInput,
  listPhaseActivitiesInput,
} from "@/server/services/project.schemas";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  getPhaseInstances,
  requestGateReview,
  submitGateDecision,
  updatePhaseDates,
  listPhaseActivities,
  listTaskAssignments,
  getTaskAssignment,
  upsertTaskAssignment,
  updateTaskStatus,
  checkMandatoryTasksComplete,
  ProjectServiceError,
} from "@/server/services/project.service";

function handleProjectError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ProjectServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN"> = {
      PROJECT_NOT_FOUND: "NOT_FOUND",
      PROCESS_DEFINITION_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      MEMBER_NOT_FOUND: "NOT_FOUND",
      MEMBER_ALREADY_EXISTS: "CONFLICT",
      PHASE_INSTANCE_NOT_FOUND: "NOT_FOUND",
      INVALID_PROJECT_STATUS: "BAD_REQUEST",
      NO_CURRENT_PHASE: "BAD_REQUEST",
      INVALID_PHASE_STATUS: "BAD_REQUEST",
      PHASE_INSTANCE_MISMATCH: "BAD_REQUEST",
      NOT_A_GATEKEEPER: "FORBIDDEN",
      TASK_NOT_FOUND: "NOT_FOUND",
      TASK_ASSIGNMENT_NOT_FOUND: "NOT_FOUND",
      ASSIGNEE_NOT_TEAM_MEMBER: "BAD_REQUEST",
      PHASE_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const projectRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(projectListInput)
    .query(async ({ input }) => {
      return listProjects(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(projectGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getProjectById(input.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.PROJECT_CREATE))
    .input(projectCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createProject(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.PROJECT_UPDATE))
    .input(projectUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateProject(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.PROJECT_DELETE))
    .input(projectDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteProject(input.id, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  addTeamMember: protectedProcedure
    .use(requirePermission(Action.PROJECT_MANAGE_TEAM))
    .input(projectAddTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addTeamMember(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  removeTeamMember: protectedProcedure
    .use(requirePermission(Action.PROJECT_MANAGE_TEAM))
    .input(projectRemoveTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeTeamMember(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  getPhaseInstances: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(getPhaseInstancesInput)
    .query(async ({ input }) => {
      try {
        return await getPhaseInstances(input);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  requestGateReview: protectedProcedure
    .use(requirePermission(Action.PROJECT_REQUEST_GATE_REVIEW))
    .input(requestGateReviewInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await requestGateReview(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  submitGateDecision: protectedProcedure
    .use(requirePermission(Action.PROJECT_SUBMIT_GATE_DECISION))
    .input(submitGateDecisionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitGateDecision(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  updatePhaseDates: protectedProcedure
    .use(requirePermission(Action.PROJECT_UPDATE_PHASE_DATES))
    .input(updatePhaseDatesInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePhaseDates(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  listPhaseActivities: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(listPhaseActivitiesInput)
    .query(async ({ input }) => {
      try {
        return await listPhaseActivities(input);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  listTaskAssignments: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(listTaskAssignmentsInput)
    .query(async ({ input }) => {
      try {
        return await listTaskAssignments(input);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  getTaskAssignment: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(getTaskAssignmentInput)
    .query(async ({ input }) => {
      try {
        return await getTaskAssignment(input);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  upsertTaskAssignment: protectedProcedure
    .use(requirePermission(Action.PROJECT_MANAGE_TASKS))
    .input(upsertTaskAssignmentInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertTaskAssignment(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  updateTaskStatus: protectedProcedure
    .use(requirePermission(Action.PROJECT_MANAGE_TASKS))
    .input(updateTaskStatusInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateTaskStatus(input, ctx.session.user.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),

  checkMandatoryTasks: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(getPhaseInstancesInput)
    .query(async ({ input }) => {
      try {
        const project = await getProjectById(input.projectId);
        if (!project.currentPhase) {
          return { allComplete: true, totalMandatory: 0, completedMandatory: 0 };
        }
        return await checkMandatoryTasksComplete(input.projectId, project.currentPhase.id);
      } catch (error) {
        handleProjectError(error);
      }
    }),
});
