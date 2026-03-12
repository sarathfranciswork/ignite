import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  conceptListInput,
  conceptCreateInput,
  conceptUpdateInput,
  conceptGetByIdInput,
  conceptDeleteInput,
  conceptTransitionInput,
  conceptSubmitDecisionInput,
  conceptAddTeamMemberInput,
  conceptRemoveTeamMemberInput,
  conceptConvertToProjectInput,
} from "@/server/services/concept.schemas";
import {
  listConcepts,
  getConceptById,
  createConcept,
  updateConcept,
  deleteConcept,
  transitionConcept,
  submitConceptDecision,
  addConceptTeamMember,
  removeConceptTeamMember,
  convertConceptToProject,
  ConceptServiceError,
} from "@/server/services/concept.service";

function handleConceptError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ConceptServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN"> = {
      CONCEPT_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      MEMBER_NOT_FOUND: "NOT_FOUND",
      PROCESS_DEFINITION_NOT_FOUND: "NOT_FOUND",
      MEMBER_ALREADY_EXISTS: "CONFLICT",
      CONCEPT_ALREADY_CONVERTED: "CONFLICT",
      INVALID_TRANSITION: "BAD_REQUEST",
      GUARD_FAILED: "BAD_REQUEST",
      INVALID_STATUS_FOR_DECISION: "BAD_REQUEST",
      INVALID_DECISION: "BAD_REQUEST",
      CONCEPT_NOT_APPROVED: "BAD_REQUEST",
      CONCEPT_TERMINAL_STATUS: "BAD_REQUEST",
      CANNOT_REMOVE_OWNER: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const conceptRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.CONCEPT_READ))
    .input(conceptListInput)
    .query(async ({ input }) => {
      return listConcepts(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.CONCEPT_READ))
    .input(conceptGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getConceptById(input.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.CONCEPT_CREATE))
    .input(conceptCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createConcept(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.CONCEPT_UPDATE))
    .input(conceptUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateConcept(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.CONCEPT_DELETE))
    .input(conceptDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteConcept(input.id, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  transition: protectedProcedure
    .use(requirePermission(Action.CONCEPT_UPDATE))
    .input(conceptTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionConcept(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  submitDecision: protectedProcedure
    .use(requirePermission(Action.CONCEPT_SUBMIT_DECISION))
    .input(conceptSubmitDecisionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitConceptDecision(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  addTeamMember: protectedProcedure
    .use(requirePermission(Action.CONCEPT_MANAGE_TEAM))
    .input(conceptAddTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await addConceptTeamMember(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  removeTeamMember: protectedProcedure
    .use(requirePermission(Action.CONCEPT_MANAGE_TEAM))
    .input(conceptRemoveTeamMemberInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeConceptTeamMember(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),

  convertToProject: protectedProcedure
    .use(requirePermission(Action.CONCEPT_CONVERT_TO_PROJECT))
    .input(conceptConvertToProjectInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await convertConceptToProject(input, ctx.session.user.id);
      } catch (error) {
        handleConceptError(error);
      }
    }),
});
