import { createTRPCRouter } from "../trpc";
import { activityRouter } from "./activity";
import { adhocEvaluationRouter } from "./adhoc-evaluation";
import { adminRouter } from "./admin";
import { aiRouter } from "./ai";
import { apiKeyRouter } from "./api-key";
import { authRouter } from "./auth";
import { bucketRouter } from "./bucket";
import { campaignComparisonRouter } from "./campaign-comparison";
import { campaignRouter } from "./campaign";
import { channelRouter } from "./channel";
import { conceptRouter } from "./concept";
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
import { portfolioAnalyzerRouter } from "./portfolio-analyzer";
import { processDefinitionRouter } from "./process-definition";
import { projectRouter } from "./project";
import { pushRouter } from "./push";
import { reportRouter } from "./report";
import { searchRouter } from "./search";
import { spaceRouter } from "./space";
import { submissionRouter } from "./submission";
import { ssoRouter } from "./sso";
import { scoutingBoardRouter } from "./scouting-board";
import { scoutingMissionRouter } from "./scouting-mission";
import { siaRouter } from "./sia";
import { technologyRouter } from "./technology";
import { trendRouter } from "./trend";
import { useCaseRouter } from "./use-case";
import { userRouter } from "./user";
import { webhookRouter } from "./webhook";
import { whiteLabelRouter } from "./white-label";

export const appRouter = createTRPCRouter({
  activity: activityRouter,
  adhocEvaluation: adhocEvaluationRouter,
  admin: adminRouter,
  ai: aiRouter,
  apiKey: apiKeyRouter,
  auth: authRouter,
  bucket: bucketRouter,
  campaignComparison: campaignComparisonRouter,
  campaign: campaignRouter,
  channel: channelRouter,
  comment: commentRouter,
  concept: conceptRouter,
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
  portfolioAnalyzer: portfolioAnalyzerRouter,
  processDefinition: processDefinitionRouter,
  project: projectRouter,
  push: pushRouter,
  report: reportRouter,
  search: searchRouter,
  scoutingBoard: scoutingBoardRouter,
  scoutingMission: scoutingMissionRouter,
  sia: siaRouter,
  technology: technologyRouter,
  trend: trendRouter,
  space: spaceRouter,
  sso: ssoRouter,
  submission: submissionRouter,
  useCase: useCaseRouter,
  user: userRouter,
  webhook: webhookRouter,
  whiteLabel: whiteLabelRouter,
});

export type AppRouter = typeof appRouter;
