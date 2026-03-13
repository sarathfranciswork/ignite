import { createTRPCRouter } from "../trpc";
import { activityRouter } from "./activity";
import { adhocEvaluationRouter } from "./adhoc-evaluation";
import { auditLogRouter } from "./audit-log";
import { adminRouter } from "./admin";
import { aiRouter } from "./ai";
import { apiKeyRouter } from "./api-key";
import { authRouter } from "./auth";
import { biConnectorRouter } from "./bi-connector";
import { bucketRouter } from "./bucket";
import { campaignComparisonRouter } from "./campaign-comparison";
import { campaignRouter } from "./campaign";
import { channelRouter } from "./channel";
import { clipRouter } from "./clip";
import { complianceRouter } from "./compliance";
import { conceptRouter } from "./concept";
import { dashboardRouter } from "./dashboard";
import { commentRouter } from "./comment";
import { communicationRouter } from "./communication";
import { engagementRouter } from "./engagement";
import { externalInvitationRouter } from "./external-invitation";
import { evaluationRouter } from "./evaluation";
import { exportRouter } from "./export";
import { externalSyncRouter } from "./external-sync";
import { gamificationRouter } from "./gamification";
import { ideaRouter } from "./idea";
import { insightRouter } from "./insight";
import { notificationRouter } from "./notification";
import { organizationRouter } from "./organization";
import { partneringReportRouter } from "./partnering-report";
import { portfolioRouter } from "./portfolio";
import { portfolioAnalyzerRouter } from "./portfolio-analyzer";
import { processDefinitionRouter } from "./process-definition";
import { projectRouter } from "./project";
import { pushRouter } from "./push";
import { reportRouter } from "./report";
import { searchRouter } from "./search";
import { securityRouter } from "./security";
import { spaceRouter } from "./space";
import { submissionRouter } from "./submission";
import { ssoRouter } from "./sso";
import { scoutingBoardRouter } from "./scouting-board";
import { scoutingMissionRouter } from "./scouting-mission";
import { siaRouter } from "./sia";
import { slackIntegrationRouter } from "./slack-integration";
import { teamsRouter } from "./teams";
import { technologyRouter } from "./technology";
import { translationRouter } from "./translation";
import { trendRouter } from "./trend";
import { useCaseRouter } from "./use-case";
import { userRouter } from "./user";
import { webhookRouter } from "./webhook";
import { whiteLabelRouter } from "./white-label";

export const appRouter = createTRPCRouter({
  activity: activityRouter,
  adhocEvaluation: adhocEvaluationRouter,
  auditLog: auditLogRouter,
  admin: adminRouter,
  ai: aiRouter,
  apiKey: apiKeyRouter,
  auth: authRouter,
  biConnector: biConnectorRouter,
  bucket: bucketRouter,
  campaign: campaignRouter,
  campaignComparison: campaignComparisonRouter,
  channel: channelRouter,
  clip: clipRouter,
  comment: commentRouter,
  compliance: complianceRouter,
  concept: conceptRouter,
  communication: communicationRouter,
  dashboard: dashboardRouter,
  engagement: engagementRouter,
  evaluation: evaluationRouter,
  export: exportRouter,
  externalInvitation: externalInvitationRouter,
  externalSync: externalSyncRouter,
  gamification: gamificationRouter,
  idea: ideaRouter,
  insight: insightRouter,
  notification: notificationRouter,
  organization: organizationRouter,
  partneringReport: partneringReportRouter,
  portfolio: portfolioRouter,
  portfolioAnalyzer: portfolioAnalyzerRouter,
  processDefinition: processDefinitionRouter,
  project: projectRouter,
  push: pushRouter,
  report: reportRouter,
  search: searchRouter,
  security: securityRouter,
  scoutingBoard: scoutingBoardRouter,
  scoutingMission: scoutingMissionRouter,
  sia: siaRouter,
  slackIntegration: slackIntegrationRouter,
  teams: teamsRouter,
  technology: technologyRouter,
  translation: translationRouter,
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
