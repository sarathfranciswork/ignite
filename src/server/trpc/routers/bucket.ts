import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  bucketCreateInput,
  bucketUpdateInput,
  bucketListInput,
  bucketGetByIdInput,
  bucketDeleteInput,
  bucketReorderInput,
  bucketAssignIdeaInput,
  bucketUnassignIdeaInput,
  bucketListIdeasInput,
  bucketSidebarInput,
} from "@/server/services/bucket.schemas";
import {
  listBuckets,
  getBucketById,
  createBucket,
  updateBucket,
  deleteBucket,
  reorderBuckets,
  assignIdeaToBucket,
  unassignIdeaFromBucket,
  listBucketIdeas,
  getBucketSidebar,
  BucketServiceError,
} from "@/server/services/bucket.service";

function handleBucketError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof BucketServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      BUCKET_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      IDEA_NOT_FOUND: "NOT_FOUND",
      ASSIGNMENT_NOT_FOUND: "NOT_FOUND",
      MISSING_FILTER_CRITERIA: "BAD_REQUEST",
      SMART_BUCKET_NO_MANUAL_ASSIGN: "BAD_REQUEST",
      SMART_BUCKET_NO_MANUAL_UNASSIGN: "BAD_REQUEST",
      CAMPAIGN_MISMATCH: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const bucketRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.BUCKET_READ, (input) => input.campaignId))
    .input(bucketListInput)
    .query(async ({ input }) => {
      return listBuckets(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.BUCKET_READ))
    .input(bucketGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getBucketById(input.id);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  create: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(Action.BUCKET_CREATE, (input) => input.campaignId),
    )
    .input(bucketCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createBucket(input, ctx.session.user.id);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.BUCKET_UPDATE))
    .input(bucketUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateBucket(input, ctx.session.user.id);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.BUCKET_DELETE))
    .input(bucketDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteBucket(input.id, ctx.session.user.id);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  reorder: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(Action.BUCKET_UPDATE, (input) => input.campaignId),
    )
    .input(bucketReorderInput)
    .mutation(async ({ ctx, input }) => {
      return reorderBuckets(input, ctx.session.user.id);
    }),

  assignIdea: protectedProcedure
    .use(requirePermission(Action.BUCKET_ASSIGN_IDEAS))
    .input(bucketAssignIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await assignIdeaToBucket(input, ctx.session.user.id);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  unassignIdea: protectedProcedure
    .use(requirePermission(Action.BUCKET_ASSIGN_IDEAS))
    .input(bucketUnassignIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unassignIdeaFromBucket(input, ctx.session.user.id);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  listIdeas: protectedProcedure
    .use(requirePermission(Action.BUCKET_READ))
    .input(bucketListIdeasInput)
    .query(async ({ input }) => {
      try {
        return await listBucketIdeas(input);
      } catch (error) {
        handleBucketError(error);
      }
    }),

  sidebar: protectedProcedure
    .use(requirePermission<{ campaignId: string }>(Action.BUCKET_READ, (input) => input.campaignId))
    .input(bucketSidebarInput)
    .query(async ({ input }) => {
      return getBucketSidebar(input);
    }),
});
