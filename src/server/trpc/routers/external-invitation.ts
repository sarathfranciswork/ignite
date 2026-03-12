import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  externalInvitationCreateInput,
  externalInvitationAcceptInput,
  externalInvitationRevokeInput,
  externalInvitationListInput,
  externalInvitationRevokeAccessInput,
} from "@/server/services/external-invitation.schemas";
import {
  createInvitation,
  acceptInvitation,
  revokeInvitation,
  listInvitations,
  revokeUserAccess,
  ExternalInvitationServiceError,
} from "@/server/services/external-invitation.service";

function handleServiceError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ExternalInvitationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      INVITATION_NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      DUPLICATE_INVITATION: "CONFLICT",
      INVITATION_REVOKED: "BAD_REQUEST",
      INVITATION_ALREADY_ACCEPTED: "BAD_REQUEST",
      INVITATION_EXPIRED: "BAD_REQUEST",
      INVALID_STATUS: "BAD_REQUEST",
      NOT_EXTERNAL_USER: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const externalInvitationRouter = createTRPCRouter({
  create: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_INVITATION_CREATE))
    .input(externalInvitationCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createInvitation({
          ...input,
          inviterUserId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  accept: publicProcedure.input(externalInvitationAcceptInput).mutation(async ({ input }) => {
    try {
      return await acceptInvitation(input);
    } catch (error) {
      handleServiceError(error);
    }
  }),

  revoke: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_INVITATION_REVOKE))
    .input(externalInvitationRevokeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeInvitation({
          ...input,
          revokedBy: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_INVITATION_LIST))
    .input(externalInvitationListInput)
    .query(async ({ input }) => {
      try {
        return await listInvitations(input);
      } catch (error) {
        handleServiceError(error);
      }
    }),

  revokeAccess: protectedProcedure
    .use(requirePermission(Action.EXTERNAL_INVITATION_REVOKE_ACCESS))
    .input(externalInvitationRevokeAccessInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeUserAccess({
          ...input,
          revokedBy: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
