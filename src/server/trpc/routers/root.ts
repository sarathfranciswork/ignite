import { createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { campaignRouter } from "./campaign";
import { channelRouter } from "./channel";
import { commentRouter } from "./comment";
import { engagementRouter } from "./engagement";
import { ideaRouter } from "./idea";
import { notificationRouter } from "./notification";
import { organizationRouter } from "./organization";
import { searchRouter } from "./search";
import { spaceRouter } from "./space";
import { ssoRouter } from "./sso";
import { scoutingBoardRouter } from "./scouting-board";
import { useCaseRouter } from "./use-case";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  campaign: campaignRouter,
  channel: channelRouter,
  comment: commentRouter,
  engagement: engagementRouter,
  idea: ideaRouter,
  notification: notificationRouter,
  organization: organizationRouter,
  search: searchRouter,
  scoutingBoard: scoutingBoardRouter,
  space: spaceRouter,
  sso: ssoRouter,
  useCase: useCaseRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
