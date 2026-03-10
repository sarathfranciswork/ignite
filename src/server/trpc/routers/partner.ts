import { router, publicProcedure } from "../trpc";
import {
  ListOrgsInputSchema,
  GetOrgByIdInputSchema,
  CreateOrgInputSchema,
  UpdateOrgInputSchema,
  ArchiveOrgInputSchema,
  SearchExternalInputSchema,
  ImportExternalInputSchema,
} from "@/types/partner";
import {
  listOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  archiveOrganization,
  searchExternalOrganizations,
  importExternalOrganization,
} from "../../services/partner.service";

const orgsRouter = router({
  list: publicProcedure.input(ListOrgsInputSchema).query(({ input }) => {
    return listOrganizations(input);
  }),

  getById: publicProcedure.input(GetOrgByIdInputSchema).query(({ input }) => {
    return getOrganizationById(input.id);
  }),

  create: publicProcedure.input(CreateOrgInputSchema).mutation(({ input }) => {
    return createOrganization(input);
  }),

  update: publicProcedure.input(UpdateOrgInputSchema).mutation(({ input }) => {
    return updateOrganization(input.id, input.data);
  }),

  archive: publicProcedure
    .input(ArchiveOrgInputSchema)
    .mutation(({ input }) => {
      return archiveOrganization(input.id);
    }),

  searchExternal: publicProcedure
    .input(SearchExternalInputSchema)
    .query(({ input }) => {
      return searchExternalOrganizations(input.query, input.source);
    }),

  importExternal: publicProcedure
    .input(ImportExternalInputSchema)
    .mutation(({ input }) => {
      return importExternalOrganization(input.externalId, input.source);
    }),
});

export const partnerRouter = router({
  orgs: orgsRouter,
});
