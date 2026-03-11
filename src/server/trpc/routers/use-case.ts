import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  useCaseListInput,
  useCaseCreateInput,
  useCaseUpdateInput,
  useCaseGetByIdInput,
  useCaseDeleteInput,
  useCaseTransitionInput,
  useCaseTeamMemberInput,
  useCaseTeamMemberRemoveInput,
  useCaseOrganizationLinkInput,
  useCaseOrganizationUnlinkInput,
  useCaseTaskCreateInput,
  useCaseTaskUpdateInput,
  useCaseTaskDeleteInput,
  useCaseTaskListInput,
  useCaseFunnelInput,
} from "@/server/services/use-case.schemas";
import {
  listUseCases,
  getUseCaseById,
  createUseCase,
  updateUseCase,
  transitionUseCase,
  getUseCaseTransitions,
  deleteUseCase,
  addTeamMember,
  removeTeamMember,
  linkOrganization,
  unlinkOrganization,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getUseCaseFunnel,
  UseCaseServiceError,
} from "@/server/services/use-case.service";

function handleUseCaseError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof UseCaseServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      USE_CASE_NOT_FOUND: "NOT_FOUND",
      TASK_NOT_FOUND: "NOT_FOUND",
      TEAM_MEMBER_NOT_FOUND: "NOT_FOUND",
      ORGANIZATION_NOT_FOUND: "NOT_FOUND",
      ORGANIZATION_LINK_NOT_FOUND: "NOT_FOUND",
      INVALID_TRANSITION: "BAD_REQUEST",
      GUARD_FAILED: "BAD_REQUEST",
      DUPLICATE_TEAM_MEMBER: "CONFLICT",
      DUPLICATE_ORGANIZATION_LINK: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const useCaseRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseListInput)
    .query(async ({ input }) => {
      return listUseCases(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getUseCaseById(input.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.USE_CASE_CREATE))
    .input(useCaseCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createUseCase(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUseCase(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  transition: protectedProcedure
    .use(requirePermission(Action.USE_CASE_TRANSITION))
    .input(useCaseTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionUseCase(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  getTransitions: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getUseCaseTransitions(input.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.USE_CASE_DELETE))
    .input(useCaseDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteUseCase(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // Team member operations
  addTeamMember: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TEAM))
    .input(useCaseTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addTeamMember(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  removeTeamMember: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TEAM))
    .input(useCaseTeamMemberRemoveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeTeamMember(input.useCaseId, input.userId, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // Organization link operations
  linkOrganization: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseOrganizationLinkInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkOrganization(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  unlinkOrganization: protectedProcedure
    .use(requirePermission(Action.USE_CASE_UPDATE))
    .input(useCaseOrganizationUnlinkInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkOrganization(input.useCaseId, input.organizationId, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // Task operations
  listTasks: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseTaskListInput)
    .query(async ({ input }) => {
      return listTasks(input);
    }),

  createTask: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TASKS))
    .input(useCaseTaskCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTask(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  updateTask: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TASKS))
    .input(useCaseTaskUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateTask(input, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  deleteTask: protectedProcedure
    .use(requirePermission(Action.USE_CASE_MANAGE_TASKS))
    .input(useCaseTaskDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteTask(input.id, ctx.session.user.id);
      } catch (error) {
        handleUseCaseError(error);
      }
    }),

  // Funnel stats
  funnel: protectedProcedure
    .use(requirePermission(Action.USE_CASE_READ))
    .input(useCaseFunnelInput)
    .query(async ({ input }) => {
      return getUseCaseFunnel(input);
    }),
});
