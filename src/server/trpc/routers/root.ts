import { createTRPCRouter } from "../trpc";
import { activityRouter } from "./activity";
import { adminRouter } from "./admin";
import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { bucketRouter } from "./bucket";
import { campaignRouter } from "./campaign";
import { channelRouter } from "./channel";
import { dashboardRouter } from "./dashboard";
import { commentRouter } from "./comment";
import { communicationRouter } from "./communication";
import { engagementRouter } from "./engagement";
import { externalInvitationRouter } from "./external-invitation";
import { evaluationRouter } from "./evaluation";
import { ideaRouter } from "./idea";
import { insightRouter } from "./insight";
import { notificationRouter } from "./notification";
import { organizationRouter } from "./organization";
import { portfolioRouter } from "./portfolio";
import { processDefinitionRouter } from "./process-definition";
import { projectRouter } from "./project";
import { pushRouter } from "./push";
import { searchRouter } from "./search";
import { spaceRouter } from "./space";
import { ssoRouter } from "./sso";
import { scoutingBoardRouter } from "./scouting-board";
import { scoutingMissionRouter } from "./scouting-mission";
import { siaRouter } from "./sia";
import { technologyRouter } from "./technology";
import { trendRouter } from "./trend";
import { useCaseRouter } from "./use-case";
import { userRouter } from "./user";
import { whiteLabelRouter } from "./white-label";

export const appRouter = createTRPCRouter({
  activity: activityRouter,
  admin: adminRouter,
  ai: aiRouter,
  auth: authRouter,
  bucket: bucketRouter,
  campaign: campaignRouter,
  channel: channelRouter,
  comment: commentRouter,
  communication: communicationRouter,
  dashboard: dashboardRouter,
  engagement: engagementRouter,
  evaluation: evaluationRouter,
  externalInvitation: externalInvitationRouter,
  idea: ideaRouter,
  insight: insightRouter,
  notification: notificationRouter,
  organization: organizationRouter,
  portfolio: portfolioRouter,
  processDefinition: processDefinitionRouter,
  project: projectRouter,
  push: pushRouter,
  search: searchRouter,
  scoutingBoard: scoutingBoardRouter,
  scoutingMission: scoutingMissionRouter,
  sia: siaRouter,
  technology: technologyRouter,
  trend: trendRouter,
  space: spaceRouter,
  sso: ssoRouter,
  useCase: useCaseRouter,
  user: userRouter,
  whiteLabel: whiteLabelRouter,
});

export type AppRouter = typeof appRouter;
