import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import { checkPermission } from "@/server/services/rbac.service";
import {
  organizationListInput,
  organizationCreateInput,
  organizationUpdateInput,
  organizationGetByIdInput,
  organizationDeleteInput,
  organizationSetConfidentialInput,
  checkDuplicateByUrlInput,
  checkDuplicateByCrunchbaseIdInput,
} from "@/server/services/organization.schemas";
import {
  listOrganizationsWithConfidentialFilter,
  getOrganizationByIdWithConfidentialCheck,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  setOrganizationConfidential,
  checkDuplicateOrganization,
  checkDuplicateByUrl,
  checkDuplicateByCrunchbaseId,
  getDistinctIndustries,
  getDistinctLocations,
  OrganizationServiceError,
} from "@/server/services/organization.service";
import {
  contactListInput,
  contactCreateInput,
  contactUpdateInput,
  contactDeleteInput,
  contactInviteInput,
} from "@/server/services/contact.schemas";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  markContactInvited,
  ContactServiceError,
} from "@/server/services/contact.service";
import {
  crunchbaseSearchInput,
  crunchbaseImportSingleInput,
  crunchbaseImportBatchInput,
  crunchbasePreviewInput,
} from "@/server/services/crunchbase-import.schemas";
import {
  searchCrunchbase,
  importSingle as crunchbaseImportSingle,
  importBatch as crunchbaseImportBatch,
  previewImport as crunchbasePreviewImport,
  getCrunchbaseStatus,
  CrunchbaseImportError,
} from "@/server/services/crunchbase-import.service";
import { z } from "zod";

function handleOrganizationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof OrganizationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT"> = {
      ORGANIZATION_NOT_FOUND: "NOT_FOUND",
      DUPLICATE_CRUNCHBASE_ID: "CONFLICT",
      DUPLICATE_WEBSITE_URL: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof CrunchbaseImportError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR"> = {
      API_KEY_MISSING: "BAD_REQUEST",
      ORG_NOT_FOUND: "NOT_FOUND",
      API_ERROR: "INTERNAL_SERVER_ERROR",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  if (error instanceof ContactServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      CONTACT_NOT_FOUND: "NOT_FOUND",
      ORGANIZATION_NOT_FOUND: "NOT_FOUND",
      CONTACT_NO_EMAIL: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const organizationRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .input(organizationListInput)
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const canReadConfidential = await checkPermission(
          userId,
          Action.ORGANIZATION_READ_CONFIDENTIAL,
        );
        return await listOrganizationsWithConfidentialFilter(input, userId, canReadConfidential);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .input(organizationGetByIdInput)
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const canReadConfidential = await checkPermission(
          userId,
          Action.ORGANIZATION_READ_CONFIDENTIAL,
        );
        return await getOrganizationByIdWithConfidentialCheck(
          input.id,
          userId,
          canReadConfidential,
        );
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_CREATE))
    .input(organizationCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createOrganization(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_UPDATE))
    .input(organizationUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateOrganization(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_DELETE))
    .input(organizationDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteOrganization(input.id, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  setConfidential: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_SET_CONFIDENTIAL))
    .input(organizationSetConfidentialInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await setOrganizationConfidential(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  checkDuplicate: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .input(
      z.object({
        name: z.string().min(1),
        excludeId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ input }) => {
      return checkDuplicateOrganization(input.name, input.excludeId);
    }),

  checkDuplicateByUrl: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .input(checkDuplicateByUrlInput)
    .query(async ({ input }) => {
      return checkDuplicateByUrl(input);
    }),

  checkDuplicateByCrunchbaseId: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .input(checkDuplicateByCrunchbaseIdInput)
    .query(async ({ input }) => {
      return checkDuplicateByCrunchbaseId(input);
    }),

  distinctIndustries: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .query(async () => {
      return getDistinctIndustries();
    }),

  distinctLocations: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .query(async () => {
      return getDistinctLocations();
    }),

  // Contact sub-procedures
  listContacts: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .input(contactListInput)
    .query(async ({ input }) => {
      return listContacts(input);
    }),

  createContact: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_MANAGE_CONTACTS))
    .input(contactCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createContact(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  updateContact: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_MANAGE_CONTACTS))
    .input(contactUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateContact(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  deleteContact: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_MANAGE_CONTACTS))
    .input(contactDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteContact(input.id, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  inviteContact: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_MANAGE_CONTACTS))
    .input(contactInviteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await markContactInvited(input.id, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  // Crunchbase import procedures
  crunchbaseStatus: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_READ))
    .query(async () => {
      return getCrunchbaseStatus();
    }),

  crunchbaseSearch: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_IMPORT))
    .input(crunchbaseSearchInput)
    .query(async ({ input }) => {
      try {
        return await searchCrunchbase(input);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  crunchbasePreview: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_IMPORT))
    .input(crunchbasePreviewInput)
    .query(async ({ input }) => {
      try {
        return await crunchbasePreviewImport(input);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  crunchbaseImport: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_IMPORT))
    .input(crunchbaseImportSingleInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await crunchbaseImportSingle(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),

  crunchbaseImportBatch: protectedProcedure
    .use(requirePermission(Action.ORGANIZATION_IMPORT))
    .input(crunchbaseImportBatchInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await crunchbaseImportBatch(input, ctx.session.user.id);
      } catch (error) {
        handleOrganizationError(error);
      }
    }),
});
