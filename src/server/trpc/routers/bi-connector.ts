import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  biConnectorConfigureInput,
  biConnectorListInput,
  biConnectorByIdInput,
  biConnectorRefreshInput,
  biConnectorDeleteInput,
  biConnectorGetEndpointsInput,
} from "@/server/services/bi-connector.schemas";
import {
  configureConnector,
  listConnectors,
  getConnectorById,
  refreshDataset,
  deleteConnector,
  getEndpoints,
  BiConnectorServiceError,
} from "@/server/services/bi-connector.service";

function handleBiConnectorError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof BiConnectorServiceError) {
    const codeMap: Record<
      string,
      "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR" | "TOO_MANY_REQUESTS"
    > = {
      NOT_FOUND: "NOT_FOUND",
      INACTIVE: "BAD_REQUEST",
      RATE_LIMITED: "TOO_MANY_REQUESTS",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

export const biConnectorRouter = createTRPCRouter({
  configure: protectedProcedure
    .use(requirePermission(Action.BI_CONNECTOR_CREATE))
    .input(biConnectorConfigureInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await configureConnector(input, ctx.session.user.id);
      } catch (error) {
        handleBiConnectorError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.BI_CONNECTOR_READ))
    .input(biConnectorListInput)
    .query(async ({ input }) => {
      try {
        return await listConnectors(input);
      } catch (error) {
        handleBiConnectorError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.BI_CONNECTOR_READ))
    .input(biConnectorByIdInput)
    .query(async ({ input }) => {
      try {
        return await getConnectorById(input.id);
      } catch (error) {
        handleBiConnectorError(error);
      }
    }),

  refresh: protectedProcedure
    .use(requirePermission(Action.BI_CONNECTOR_UPDATE))
    .input(biConnectorRefreshInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await refreshDataset(input, ctx.session.user.id);
      } catch (error) {
        handleBiConnectorError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.BI_CONNECTOR_DELETE))
    .input(biConnectorDeleteInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await deleteConnector(input, ctx.session.user.id);
      } catch (error) {
        handleBiConnectorError(error);
      }
    }),

  getEndpoints: protectedProcedure
    .use(requirePermission(Action.BI_CONNECTOR_READ))
    .input(biConnectorGetEndpointsInput)
    .query(({ input }) => {
      return getEndpoints(input);
    }),
});
