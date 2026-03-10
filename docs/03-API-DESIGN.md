# 03 — API DESIGN (tRPC Routers)

## Router Structure

All APIs are type-safe via tRPC. Each module has its own router merged into the root.

```typescript
// server/trpc/router.ts
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  admin: adminRouter,
  campaign: campaignRouter,
  channel: channelRouter,
  idea: ideaRouter,
  evaluation: evaluationRouter,
  partner: partnerRouter,
  strategy: strategyRouter,
  project: projectRouter,
  report: reportRouter,
  notification: notificationRouter,
  search: searchRouter,
  upload: uploadRouter,
});
```

---

## AUTH ROUTER

```
auth.login              POST   { email, password }             → { session }
auth.register           POST   { email, password, firstName, lastName } → { user }
auth.logout             POST   {}                              → void
auth.forgotPassword     POST   { email }                       → void
auth.resetPassword      POST   { token, newPassword }          → void
auth.getSession         GET    {}                              → { user, roles }
auth.ssoCallback        POST   { provider, token }             → { session }
```

## USER ROUTER

```
user.getProfile         GET    {}                              → UserProfile
user.updateProfile      PUT    { firstName, lastName, bio, skills, avatar, ... }
user.getPreferences     GET    {}                              → NotificationPrefs
user.updatePreferences  PUT    { emailFrequency, contentLanguages, timezone }
user.getMyTasks         GET    { filter? }                     → TaskList
user.getMyDashboard     GET    {}                              → DashboardData
user.getFollowing       GET    { type? }                       → FollowList
user.follow             POST   { objectType, objectId }        → void
user.unfollow           DELETE { objectType, objectId }        → void
```

## ADMIN ROUTER

```
admin.users.list         GET    { search?, page, limit, groupId?, orgUnitId? } → PaginatedUsers
admin.users.getById      GET    { id }                         → UserDetail
admin.users.update       PUT    { id, data }                   → User
admin.users.deactivate   PUT    { id }                         → void
admin.users.bulkAction   POST   { userIds, action }            → void

admin.groups.list        GET    {}                             → UserGroup[]
admin.groups.create      POST   { name, permissions }          → UserGroup
admin.groups.update      PUT    { id, data }                   → UserGroup
admin.groups.addMembers  POST   { groupId, userIds }           → void
admin.groups.removeMembers POST { groupId, userIds }           → void

admin.orgUnits.list      GET    {}                             → OrgUnit[] (tree)
admin.orgUnits.create    POST   { name, parentId? }            → OrgUnit
admin.orgUnits.update    PUT    { id, data }                   → OrgUnit
admin.orgUnits.delete    DELETE { id }                         → void

admin.spaces.list        GET    {}                             → InnovationSpace[]
admin.spaces.create      POST   { name, parentId? }            → InnovationSpace
admin.spaces.update      PUT    { id, data }                   → InnovationSpace

admin.notifications.listTemplates  GET    {}                   → NotificationTemplate[]
admin.notifications.updateTemplate PUT    { id, subject, body } → void

admin.customization.getSettings    GET    {}                   → PlatformSettings
admin.customization.updateSettings PUT    { settings }         → void
```

## CAMPAIGN ROUTER

```
campaign.list            GET    { status?, type?, spaceId?, page, limit, sort } → PaginatedCampaigns
campaign.getById         GET    { id }                         → CampaignDetail
campaign.create          POST   { ...CampaignCreateInput }     → Campaign
campaign.update          PUT    { id, ...CampaignUpdateInput }  → Campaign
campaign.delete          DELETE { id }                         → void
campaign.copy            POST   { sourceId }                   → Campaign

// Lifecycle
campaign.startSeeding    POST   { id }                         → Campaign
campaign.launch          POST   { id, publishToTeams? }        → Campaign
campaign.closeSubmission POST   { id }                         → Campaign
campaign.closeVoting     POST   { id }                         → Campaign
campaign.moveToEvaluation POST  { id }                         → Campaign
campaign.close           POST   { id, archiveRemaining? }      → Campaign
campaign.revertStatus    POST   { id, targetStatus }           → Campaign

// Team
campaign.addMember       POST   { campaignId, userId, role }   → void
campaign.removeMember    DELETE { campaignId, userId, role }    → void
campaign.getMembers      GET    { campaignId }                 → CampaignMember[]

// Audience
campaign.setAudience     PUT    { campaignId, rules }          → void
campaign.getInviteeCount GET    { campaignId }                 → number

// Communication
campaign.sendEmail       POST   { campaignId, segment, subject, body } → void
campaign.postActivity    POST   { campaignId, message }        → void
campaign.publishToTeams  POST   { campaignId, message }        → void
campaign.getCommunicationLog GET { campaignId }                → CommunicationLog[]

// Cockpit
campaign.getCockpit      GET    { campaignId }                 → CockpitData
campaign.getActivityKpis GET    { campaignId, dateRange }      → ActivityKpiData
campaign.getProcessKpis  GET    { campaignId }                 → ProcessKpiData

// Promotions
campaign.updatePromotion PUT    { campaignId, isShowOnStart, isFeatured } → void
```

## CHANNEL ROUTER

```
channel.list             GET    { status?, type?, page, limit } → PaginatedChannels
channel.getById          GET    { id }                          → ChannelDetail
channel.create           POST   { ...ChannelCreateInput }       → Channel
channel.update           PUT    { id, data }                    → Channel
channel.launch           POST   { id }                          → Channel
channel.close            POST   { id }                          → Channel
channel.addMember        POST   { channelId, userId, role }     → void
channel.removeMember     DELETE { channelId, userId, role }     → void
```

## IDEA ROUTER

```
idea.list                GET    { campaignId?, channelId?, status?, search?, page, limit, sort }
idea.getById             GET    { id }                          → IdeaDetail
idea.create              POST   { title, description, campaignId?, channelId?, customFieldValues?, image? }
idea.update              PUT    { id, data }                    → Idea
idea.submit              POST   { id }                          → Idea  // move from draft to submitted
idea.delete              DELETE { id }                          → void  // only drafts

// Status changes
idea.moveToQualification POST   { id }                         → Idea
idea.publishToCommunity  POST   { id }                         → Idea  // from qualification
idea.moveToHot           POST   { id }                         → Idea  // manual graduation
idea.moveToEvaluation    POST   { id }                         → Idea
idea.selectForConcept    POST   { id }                         → Idea
idea.selectForImplementation POST { id }                       → Idea
idea.archive             POST   { id, reason? }                → Idea
idea.unarchive           POST   { id }                         → Idea
idea.setConfidential     POST   { id, isConfidential }         → Idea

// Interactions
idea.addComment          POST   { ideaId, content, parentId?, isPrivate?, perspective? }
idea.updateComment       PUT    { commentId, content }          → Comment
idea.deleteComment       DELETE { commentId }                   → void
idea.flagComment         POST   { commentId }                   → void
idea.vote                POST   { ideaId, criterionId, score }  → Vote
idea.removeVote          DELETE { ideaId, criterionId }         → void
idea.like                POST   { ideaId }                      → void
idea.unlike              DELETE { ideaId }                       → void

// Idea Board operations
idea.merge               POST   { ideaIds, campaignId }         → Idea (new merged)
idea.split               POST   { ideaId }                      → Idea[] (new splits)
idea.assignBucket        POST   { ideaId, bucketId }            → void
idea.removeBucket        POST   { ideaId, bucketId }            → void
idea.getSimilar          GET    { ideaId, limit? }              → SimilarIdea[]
idea.calculateSimilarity POST   { campaignId }                  → void (async job)
idea.bulkArchive         POST   { ideaIds, reason? }            → void
idea.bulkAssignBucket    POST   { ideaIds, bucketId }           → void
idea.exportToExcel       GET    { campaignId?, filters? }       → FileUrl

// Tags
idea.addTag              POST   { ideaId, tagName }             → void
idea.removeTag           DELETE { ideaId, tagId }               → void
idea.getSuggestedTags    GET    { ideaId }                      → string[]

// Attachments
idea.addAttachment       POST   { ideaId, file }                → Attachment
idea.removeAttachment    DELETE { attachmentId }                 → void

// Relations
idea.linkRelated         POST   { fromIdeaId, toIdeaId }        → void
idea.unlinkRelated       DELETE { fromIdeaId, toIdeaId }        → void
```

## EVALUATION ROUTER

```
evaluation.listSessions    GET    { campaignId?, channelId?, status? } → EvalSession[]
evaluation.getSession      GET    { id }                        → EvalSessionDetail
evaluation.createSession   POST   { name, type, campaignId?, channelId?, templateId? }
evaluation.updateSession   PUT    { id, data }                  → EvalSession
evaluation.deleteSession   DELETE { id }                        → void

// Criteria
evaluation.addCriterion    POST   { sessionId, criterion }      → EvalCriterion
evaluation.updateCriterion PUT    { criterionId, data }         → EvalCriterion
evaluation.removeCriterion DELETE { criterionId }               → void
evaluation.reorderCriteria PUT    { sessionId, criterionIds }   → void

// Items
evaluation.addItems        POST   { sessionId, ideaIds }        → void
evaluation.removeItem      DELETE { sessionId, ideaId }         → void

// Team
evaluation.setTeam         POST   { sessionId, userIds, type }  → void
evaluation.assignPerBucket POST   { sessionId, assignments }    → void
evaluation.assignPerObject POST   { sessionId, assignments }    → void

// Lifecycle
evaluation.startSession    POST   { sessionId }                 → void (sends invitations)
evaluation.stopSession     POST   { sessionId }                 → void
evaluation.closeSession    POST   { sessionId }                 → void
evaluation.reopenSession   POST   { sessionId }                 → void

// Evaluator actions
evaluation.getMyPendingEvals   GET  {}                          → PendingEval[]
evaluation.getEvalForm         GET  { sessionId, ideaId }       → EvalForm
evaluation.submitEvaluation    POST { sessionId, ideaId, fields } → void
evaluation.updateEvaluation    PUT  { responseId, fields }      → void
evaluation.markAsDone          POST { responseId }              → void

// Pairwise
evaluation.getNextPair         GET  { sessionId }               → { ideaA, ideaB, criterionId }
evaluation.submitPairwise      POST { sessionId, ideaAId, ideaBId, criterionId, score }
evaluation.skipPair            POST { sessionId, ideaAId, ideaBId }

// Results
evaluation.getProgress         GET  { sessionId }               → EvalProgress
evaluation.getResults          GET  { sessionId, weighting? }   → EvalResults
evaluation.addToShortlist      POST { sessionId, ideaId }       → void
evaluation.removeFromShortlist DELETE { sessionId, ideaId }     → void
evaluation.getShortlist        GET  { campaignId }              → ShortlistIdea[]

// Templates
evaluation.markAsTemplate      POST { sessionId }               → void
evaluation.listTemplates       GET  {}                          → EvalSessionTemplate[]

// Send reminders
evaluation.sendReminder        POST { sessionId, userIds? }     → void
```

## PARTNER ROUTER

```
// Organizations
partner.orgs.list          GET    { search?, status?, industry?, page, limit }
partner.orgs.getById       GET    { id }                        → OrgDetail
partner.orgs.create        POST   { name, website?, ... }       → Organization
partner.orgs.update        PUT    { id, data }                  → Organization
partner.orgs.archive       POST   { id }                        → void
partner.orgs.unarchive     POST   { id }                        → void
partner.orgs.setManagers   PUT    { orgId, userIds }            → void
partner.orgs.searchExternal GET   { query, source }             → ExternalOrg[] (Crunchbase/INNOSPOT)
partner.orgs.importExternal POST  { externalId, source }        → Organization

// Contacts
partner.contacts.list      GET    { orgId }                     → Contact[]
partner.contacts.create    POST   { orgId, data }               → Contact
partner.contacts.update    PUT    { contactId, data }           → Contact
partner.contacts.invite    POST   { contactId }                 → void
partner.contacts.delete    DELETE { contactId }                 → void

// Use Cases
partner.useCases.list      GET    { orgId?, status?, page, limit }
partner.useCases.getById   GET    { id }                        → UseCaseDetail
partner.useCases.create    POST   { title, orgIds, ... }        → UseCase
partner.useCases.update    PUT    { id, data }                  → UseCase
partner.useCases.changeStatus POST { id, newStatus }            → UseCase
partner.useCases.archive   POST   { id }                        → void
partner.useCases.setTeam   PUT    { useCaseId, userIds }        → void
partner.useCases.getPipeline GET  { filters? }                  → PipelineData

// Use Case Tasks
partner.tasks.list         GET    { useCaseId }                 → Task[]
partner.tasks.create       POST   { useCaseId, data }           → Task
partner.tasks.update       PUT    { taskId, data }              → Task
partner.tasks.changeStatus POST   { taskId, status }            → Task

// Interactions & Attachments
partner.interactions.create POST  { orgId?, useCaseId?, data }  → Interaction
partner.interactions.list   GET   { orgId?, useCaseId? }        → Interaction[]
partner.attachments.add     POST  { orgId?, useCaseId?, file }  → Attachment
partner.attachments.list    GET   { orgId?, useCaseId? }        → Attachment[]

// Scouting Boards
partner.scouting.listBoards   GET    {}                         → ScoutingBoard[]
partner.scouting.createBoard  POST   { name }                   → ScoutingBoard
partner.scouting.getBoard     GET    { boardId }                → ScoutingBoardDetail
partner.scouting.updateBoard  PUT    { boardId, data }          → void
partner.scouting.deleteBoard  DELETE { boardId }                → void
partner.scouting.shareBoard   POST   { boardId, userIds }       → void
partner.scouting.addItem      POST   { boardId, orgId }         → void
partner.scouting.removeItem   DELETE { boardId, orgId }         → void
partner.scouting.archiveItem  POST   { boardId, orgId }         → void
partner.scouting.addColumn    POST   { boardId, column }        → void
partner.scouting.updateColumn PUT    { columnId, data }         → void
partner.scouting.updateItemValues PUT { itemId, values }        → void
partner.scouting.reorderItems PUT    { boardId, itemIds }       → void

// Missions
partner.missions.list      GET    {}                            → Mission[]
partner.missions.create    POST   { data }                      → Mission
partner.missions.update    PUT    { id, data }                  → Mission
```

## STRATEGY ROUTER

```
// Strategic Innovation Areas
strategy.sias.list         GET    { spaceId? }                  → SIA[]
strategy.sias.create       POST   { name, description? }        → SIA
strategy.sias.update       PUT    { id, data }                  → SIA
strategy.sias.delete       DELETE { id }                        → void

// Trends
strategy.trends.list       GET    { type?, siaId?, search?, page, limit }
strategy.trends.getById    GET    { id }                        → TrendDetail
strategy.trends.create     POST   { title, description?, type } → Trend
strategy.trends.update     PUT    { id, data }                  → Trend
strategy.trends.archive    POST   { id }                        → void
strategy.trends.linkToSia  POST   { trendId, siaId }           → void
strategy.trends.unlinkSia  DELETE { trendId, siaId }            → void
strategy.trends.getRelatedInsights GET { trendId }              → Insight[]

// Technologies
strategy.tech.list         GET    { siaId?, search?, page, limit }
strategy.tech.getById      GET    { id }                        → TechnologyDetail
strategy.tech.create       POST   { title, description? }       → Technology
strategy.tech.update       PUT    { id, data }                  → Technology
strategy.tech.archive      POST   { id }                        → void

// Insights
strategy.insights.list     GET    { campaignId?, trendId?, page, limit }
strategy.insights.create   POST   { title, description?, sourceUrl?, trendId?, campaignId? }
strategy.insights.update   PUT    { id, data }                  → Insight
strategy.insights.delete   DELETE { id }                        → void

// Web Clipper
strategy.clipper.clip      POST   { url, type, title?, description?, imageUrl? }  → Trend|Tech|Insight
```

## PROJECT ROUTER

```
// Process definitions
project.processes.list       GET    {}                          → ProcessDefinition[]
project.processes.create     POST   { name, phases }            → ProcessDefinition
project.processes.update     PUT    { id, data }                → ProcessDefinition
project.processes.getById    GET    { id }                      → ProcessDefinitionDetail

// Projects
project.list                 GET    { status?, processId?, page, limit }
project.getById              GET    { id }                      → ProjectDetail
project.create               POST   { name, description?, processId, leaderId }
project.update               PUT    { id, data }                → Project
project.delete               DELETE { id }                      → void  // drafts only

// Team
project.setMembers           PUT    { projectId, members }      → void
project.assignGatekeepers    PUT    { projectId, phaseId, userIds } → void

// Phase management
project.startProject         POST   { id }                      → Project
project.forwardToGate        POST   { projectId }               → Project
project.makeGateDecision     POST   { projectId, decision, message?, gateTaskValues? }
project.setPhaseTiming       PUT    { projectId, phaseId, dates } → void

// Task values
project.getTaskValues        GET    { projectId, phaseId }      → TaskValue[]
project.updateTaskValue      PUT    { projectId, taskId, value } → void
project.markTaskDone         POST   { projectId, taskId }       → void
project.setTaskAssignee      PUT    { projectId, taskId, userId } → void

// History
project.getHistory           GET    { projectId }               → ProjectHistory[]

// Portfolio
project.getPortfolioAnalysis GET    { processId?, filters? }    → PortfolioData
```

## REPORT ROUTER

```
report.ideation.campaignOverview    GET { campaignId }          → CampaignReport
report.ideation.compareCampaigns    GET { campaignIds }         → ComparisonReport
report.ideation.orgAnalysis         GET { dateRange, orgUnitId? }
report.ideation.successFactors      GET { campaignIds? }        → SuccessFactorReport
report.ideation.ideaFunnel          GET { campaignId }          → FunnelData
report.ideation.inventionDisclosures GET { dateRange? }         → DisclosureReport
report.ideation.userEngagement      GET { dateRange, campaignId? }

report.partnering.pipeline          GET { filters? }            → PipelineReport
report.partnering.orgActivity       GET { dateRange? }          → OrgActivityReport

report.custom.generate              POST { config }             → ReportUrl (async, returns Excel)
report.custom.list                  GET  {}                     → SavedReport[]

report.export.campaignToExcel       GET { campaignId }          → FileUrl
report.export.ideasToExcel          GET { campaignId, filters? } → FileUrl
report.export.orgsToExcel           GET { filters? }            → FileUrl
```

## NOTIFICATION ROUTER

```
notification.list             GET    { page, limit, unreadOnly? } → PaginatedNotifications
notification.markAsRead       PUT    { id }                       → void
notification.markAllAsRead    PUT    {}                           → void
notification.getUnreadCount   GET    {}                           → number
notification.subscribe        POST   { objectType, objectId }     → void
notification.unsubscribe      DELETE { objectType, objectId }     → void
```

## SEARCH ROUTER

```
search.global                 GET    { query, types?, page, limit } → SearchResults
search.ideas                  GET    { query, filters, page, limit }
search.campaigns              GET    { query, filters }
search.organizations          GET    { query, filters }
search.trends                 GET    { query, filters }
search.users                  GET    { query, groupId? }
```

## UPLOAD ROUTER

```
upload.getPresignedUrl        POST   { fileName, mimeType, context } → { uploadUrl, fileUrl }
upload.confirmUpload          POST   { fileUrl }                      → void
```

## BUCKET ROUTER (nested under campaign/channel)

```
// Accessed via campaign.buckets.* or channel.buckets.*
buckets.list                  GET    { campaignId | channelId }     → Bucket[]
buckets.create                POST   { name, color?, campaignId | channelId }
buckets.update                PUT    { bucketId, name?, color? }    → Bucket
buckets.delete                DELETE { bucketId }                   → void
buckets.createSmart           POST   { name, filter, campaignId }   → Bucket
buckets.getItems              GET    { bucketId }                   → Idea[]
```
