import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  scoutingMissionListInput,
  scoutingMissionCreateInput,
  scoutingMissionUpdateInput,
  scoutingMissionGetByIdInput,
  scoutingMissionDeleteInput,
  scoutingMissionTransitionInput,
  scoutingMissionAssignScoutsInput,
  scoutingMissionRemoveScoutInput,
} from "@/server/services/scouting-mission.schemas";
import {
  listScoutingMissions,
  getScoutingMissionById,
  createScoutingMission,
  updateScoutingMission,
  deleteScoutingMission,
  transitionScoutingMission,
  assignScouts,
  removeScout,
  ScoutingMissionServiceError,
} from "@/server/services/scouting-mission.service";

function handleScoutingMissionError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ScoutingMissionServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      MISSION_NOT_FOUND: "NOT_FOUND",
      MISSION_ACCESS_DENIED: "FORBIDDEN",
      MISSION_NOT_OWNER: "FORBIDDEN",
      INVALID_TRANSITION: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const scoutingMissionRouter = createTRPCRouter({
  // ── Mission CRUD ──────────────────────────────────────────────

  list: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_READ))
    .input(scoutingMissionListInput)
    .query(async ({ ctx, input }) => {
      return listScoutingMissions(input, ctx.session.user.id);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_READ))
    .input(scoutingMissionGetByIdInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getScoutingMissionById(input.id, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_CREATE))
    .input(scoutingMissionCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createScoutingMission(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_UPDATE))
    .input(scoutingMissionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateScoutingMission(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_DELETE))
    .input(scoutingMissionDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteScoutingMission(input.id, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),

  // ── Status Transitions ──────────────────────────────────────

  transition: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_TRANSITION))
    .input(scoutingMissionTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionScoutingMission(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),

  // ── Scout Management ────────────────────────────────────────

  assignScouts: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_MANAGE_SCOUTS))
    .input(scoutingMissionAssignScoutsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await assignScouts(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),

  removeScout: protectedProcedure
    .use(requirePermission(Action.SCOUTING_MISSION_MANAGE_SCOUTS))
    .input(scoutingMissionRemoveScoutInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeScout(input, ctx.session.user.id);
      } catch (error) {
        handleScoutingMissionError(error);
      }
    }),
});
