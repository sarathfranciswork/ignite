import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  technologyListInput,
  technologyCreateInput,
  technologyUpdateInput,
  technologyGetByIdInput,
  technologyDeleteInput,
  technologyArchiveInput,
  technologyLinkSiaInput,
  technologyUnlinkSiaInput,
  technologyLinkCampaignInput,
  technologyUnlinkCampaignInput,
  technologyLinkIdeaInput,
  technologyUnlinkIdeaInput,
} from "@/server/services/technology.schemas";
import {
  listTechnologies,
  getTechnologyById,
  createTechnology,
  updateTechnology,
  archiveTechnology,
  deleteTechnology,
  linkTechnologyToSia,
  unlinkTechnologyFromSia,
  linkTechnologyToCampaign,
  unlinkTechnologyFromCampaign,
  linkTechnologyToIdea,
  unlinkTechnologyFromIdea,
  TechnologyServiceError,
} from "@/server/services/technology.service";

function handleTechnologyError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof TechnologyServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      TECHNOLOGY_NOT_FOUND: "NOT_FOUND",
      SIA_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const technologyRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_READ))
    .input(technologyListInput)
    .query(async ({ input }) => {
      return listTechnologies(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_READ))
    .input(technologyGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getTechnologyById(input.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_CREATE))
    .input(technologyCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTechnology(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateTechnology(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveTechnology(input.id, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_DELETE))
    .input(technologyDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteTechnology(input.id, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  linkToSia: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyLinkSiaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkTechnologyToSia(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  unlinkSia: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyUnlinkSiaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkTechnologyFromSia(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  linkCampaign: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyLinkCampaignInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkTechnologyToCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  unlinkCampaign: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyUnlinkCampaignInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkTechnologyFromCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  linkIdea: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyLinkIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkTechnologyToIdea(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),

  unlinkIdea: protectedProcedure
    .use(requirePermission(Action.TECHNOLOGY_UPDATE))
    .input(technologyUnlinkIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkTechnologyFromIdea(input, ctx.session.user.id);
      } catch (error) {
        handleTechnologyError(error);
      }
    }),
});
