import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  processDefinitionListInput,
  processDefinitionCreateInput,
  processDefinitionUpdateInput,
  processDefinitionGetByIdInput,
  processDefinitionDeleteInput,
  processDefinitionDuplicateInput,
} from "@/server/services/process-definition.schemas";
import {
  listProcessDefinitions,
  getProcessDefinitionById,
  createProcessDefinition,
  updateProcessDefinition,
  deleteProcessDefinition,
  duplicateProcessDefinition,
  ProcessDefinitionServiceError,
} from "@/server/services/process-definition.service";

function handleProcessDefinitionError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ProcessDefinitionServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      PROCESS_DEFINITION_NOT_FOUND: "NOT_FOUND",
      PROCESS_DEFINITION_IN_USE: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const processDefinitionRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.PROCESS_DEFINITION_READ))
    .input(processDefinitionListInput)
    .query(async ({ input }) => {
      return listProcessDefinitions(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.PROCESS_DEFINITION_READ))
    .input(processDefinitionGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getProcessDefinitionById(input.id);
      } catch (error) {
        handleProcessDefinitionError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.PROCESS_DEFINITION_CREATE))
    .input(processDefinitionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createProcessDefinition(input, ctx.session.user.id);
      } catch (error) {
        handleProcessDefinitionError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.PROCESS_DEFINITION_UPDATE))
    .input(processDefinitionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateProcessDefinition(input, ctx.session.user.id);
      } catch (error) {
        handleProcessDefinitionError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.PROCESS_DEFINITION_DELETE))
    .input(processDefinitionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteProcessDefinition(input.id, ctx.session.user.id);
      } catch (error) {
        handleProcessDefinitionError(error);
      }
    }),

  duplicate: protectedProcedure
    .use(requirePermission(Action.PROCESS_DEFINITION_CREATE))
    .input(processDefinitionDuplicateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await duplicateProcessDefinition(input, ctx.session.user.id);
      } catch (error) {
        handleProcessDefinitionError(error);
      }
    }),
});
