# 02 — DATABASE SCHEMA (Prisma)

## Complete Prisma Schema for InnoFlow

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "fullTextIndex"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// MODULE 1: USERS, ROLES, ORG UNITS
// ============================================================

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String?
  firstName         String
  lastName          String
  displayName       String?
  avatarUrl         String?
  bio               String?
  skills            String[]  @default([])
  preferredLanguage String    @default("en")
  contentLanguages  String[]  @default(["en"])
  timezone          String    @default("UTC")
  isInternal        Boolean   @default(true)
  isActive          Boolean   @default(true)
  lastLoginAt       DateTime?
  emailFrequency    EmailFrequency @default(IMMEDIATELY)
  privacySettings   Json      @default("{}")

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  orgUnitId         String?
  orgUnit           OrgUnit?  @relation(fields: [orgUnitId], references: [id])

  userGroups        UserGroupMembership[]
  campaignRoles     CampaignMember[]
  channelRoles      ChannelMember[]
  ideas             Idea[]              @relation("IdeaContributor")
  coAuthoredIdeas   IdeaCoAuthor[]
  comments          Comment[]
  votes             Vote[]
  likes             Like[]
  evaluatorSessions EvaluationTeamMember[]
  evaluationForms   EvaluationResponse[]
  projectRoles      ProjectMember[]
  orgManagerOf      OrganizationManager[]
  useCaseRoles      UseCaseMember[]
  scoutingBoards    ScoutingBoard[]
  notifications     Notification[]
  activityLogs      ActivityLog[]
  followedItems     Follow[]
  savedSearches     SavedSearch[]
  tasks             Task[]              @relation("TaskAssignee")
  createdTasks      Task[]              @relation("TaskCreator")

  @@index([email])
  @@index([orgUnitId])
}

enum EmailFrequency {
  IMMEDIATELY
  DAILY
  WEEKLY
  NEVER
}

model OrgUnit {
  id          String    @id @default(cuid())
  name        String
  code        String?   @unique
  description String?
  parentId    String?
  parent      OrgUnit?  @relation("OrgUnitHierarchy", fields: [parentId], references: [id])
  children    OrgUnit[] @relation("OrgUnitHierarchy")

  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  users       User[]

  @@index([parentId])
}

model UserGroup {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  description String?
  isSystem    Boolean   @default(false)  // system groups can't be deleted
  permissions String[]  @default([])

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  members     UserGroupMembership[]
}

model UserGroupMembership {
  id        String    @id @default(cuid())
  userId    String
  groupId   String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  group     UserGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  assignedAt DateTime @default(now())

  @@unique([userId, groupId])
}

model InnovationSpace {
  id          String    @id @default(cuid())
  name        String
  description String?
  parentId    String?
  parent      InnovationSpace? @relation("SpaceHierarchy", fields: [parentId], references: [id])
  children    InnovationSpace[] @relation("SpaceHierarchy")
  isActive    Boolean   @default(true)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  campaigns   Campaign[]
  channels    Channel[]
  sias        StrategicInnovationArea[]
}

// ============================================================
// MODULE 2: CAMPAIGNS
// ============================================================

model Campaign {
  id                  String          @id @default(cuid())
  title               String
  teaser              String?
  description         String?         // Rich text (HTML)
  bannerUrl           String?
  videoUrl            String?

  submissionType      SubmissionType  @default(CALL_FOR_IDEAS)
  setupType           SetupType       @default(ADVANCED)
  status              CampaignStatus  @default(DRAFT)

  // Timeline
  submissionCloseDate DateTime?
  votingCloseDate     DateTime?
  plannedCloseDate    DateTime?
  launchedAt          DateTime?
  closedAt            DateTime?

  // Settings
  hasQualificationPhase Boolean @default(false)
  hasCommunityGraduation Boolean @default(true)
  hasVoting             Boolean @default(false)
  hasLikes              Boolean @default(true)
  hasSeedingPhase       Boolean @default(true)
  hasDiscussionPhase    Boolean @default(true)
  isConfidentialAllowed Boolean @default(false)
  isInventionDisclosure Boolean @default(false)
  isInsightsEnabled     Boolean @default(false)
  isMobileEnabled       Boolean @default(true)
  isShowOnStartPage     Boolean @default(true)
  isFeatured            Boolean @default(false)

  // Community Graduation thresholds
  graduationVisitors      Int @default(10)
  graduationCommenters    Int @default(5)
  graduationLikes         Int @default(0)
  graduationVoters        Int @default(0)
  graduationVotingLevel   Float @default(0)
  graduationDaysInStatus  Int @default(0)

  // Audience
  audienceType          AudienceType @default(ALL_INTERNAL)
  inviteeCount          Int? // calculated or manual override

  // Voting criteria
  votingCriteria        Json? // [{name: "Feasibility", id: "crit_1"}, ...]

  // Call to action text
  callToActionText      String?
  emailFooter           String?

  // Custom submission form fields
  customFields          Json? // Array of field definitions

  // Default image for ideas
  defaultIdeaImageUrl   String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  innovationSpaceId     String?
  innovationSpace       InnovationSpace? @relation(fields: [innovationSpaceId], references: [id])

  siaId                 String?
  sia                   StrategicInnovationArea? @relation(fields: [siaId], references: [id])

  createdById           String

  members               CampaignMember[]
  ideas                 Idea[]
  evaluationSessions    EvaluationSession[]
  buckets               Bucket[]
  tags                  CampaignTag[]
  attachments           CampaignAttachment[]
  inspirations          CampaignInspiration[]
  audienceRules         CampaignAudienceRule[]
  communicationLogs     CommunicationLog[]
  kpiSnapshots          KpiSnapshot[]

  @@index([status])
  @@index([submissionType])
  @@index([innovationSpaceId])
}

enum SubmissionType {
  CALL_FOR_IDEAS
  CALL_FOR_PROPOSALS
  CALL_FOR_GENERIC
}

enum SetupType {
  SIMPLE
  ADVANCED
}

enum CampaignStatus {
  DRAFT
  SEEDING
  SUBMISSION
  DISCUSSION_VOTING
  EVALUATION
  CLOSED
}

enum AudienceType {
  ALL_INTERNAL
  SELECTED_INTERNAL
  ALL_EXTERNAL
  SELECTED_EXTERNAL
  MIXED
}

model CampaignMember {
  id         String       @id @default(cuid())
  campaignId String
  userId     String
  role       CampaignRole

  campaign   Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  assignedAt DateTime     @default(now())

  @@unique([campaignId, userId, role])
  @@index([campaignId])
  @@index([userId])
}

enum CampaignRole {
  MANAGER
  SPONSOR
  MODERATOR
  EVALUATOR
  SEEDING_TEAM
  IDEA_COACH
}

model CampaignAudienceRule {
  id         String    @id @default(cuid())
  campaignId String
  campaign   Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  ruleType   String    // "ORG_UNIT", "GROUP", "USER", "INNOVATION_SPACE"
  targetId   String    // The ID of the org unit, group, user, or space

  @@index([campaignId])
}

model CampaignTag {
  id         String   @id @default(cuid())
  campaignId String
  tagId      String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  tag        Tag      @relation(fields: [tagId], references: [id])

  @@unique([campaignId, tagId])
}

model CampaignAttachment {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  fileName   String
  fileUrl    String
  fileSize   Int
  mimeType   String
  createdAt  DateTime @default(now())
}

model CampaignInspiration {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  type       String   // "TREND", "TECHNOLOGY", "INSIGHT"
  targetId   String   // FK to trend, technology, or insight
  isEditorial Boolean @default(false) // added by manager vs community
  createdAt  DateTime @default(now())
}

model CommunicationLog {
  id         String   @id @default(cuid())
  campaignId String?
  channelId  String?
  campaign   Campaign? @relation(fields: [campaignId], references: [id])
  channel    Channel?  @relation(fields: [channelId], references: [id])

  type       String    // "EMAIL", "ACTIVITY_POST", "TEAMS"
  subject    String?
  body       String
  recipients Json?     // audience segment info
  sentAt     DateTime  @default(now())
  sentById   String
}

// ============================================================
// MODULE 3: CHANNELS
// ============================================================

model Channel {
  id                  String        @id @default(cuid())
  title               String
  teaser              String?
  description         String?
  bannerUrl           String?

  submissionType      SubmissionType @default(CALL_FOR_IDEAS)
  status              ChannelStatus  @default(DRAFT)

  // Settings (same as campaign minus timeline)
  hasQualificationPhase Boolean @default(false)
  hasCommunityGraduation Boolean @default(true)
  hasVoting             Boolean @default(false)
  hasLikes              Boolean @default(true)
  hasProblemDescription Boolean @default(false)
  isConfidentialAllowed Boolean @default(false)
  isInsightsEnabled     Boolean @default(false)
  isMobileEnabled       Boolean @default(true)
  isShowOnStartPage     Boolean @default(true)

  graduationVisitors    Int @default(10)
  graduationCommenters  Int @default(5)
  graduationLikes       Int @default(0)
  graduationVoters      Int @default(0)

  audienceType          AudienceType @default(ALL_INTERNAL)
  votingCriteria        Json?
  customFields          Json?
  callToActionText      String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  innovationSpaceId     String?
  innovationSpace       InnovationSpace? @relation(fields: [innovationSpaceId], references: [id])
  siaId                 String?
  sia                   StrategicInnovationArea? @relation(fields: [siaId], references: [id])
  createdById           String

  members               ChannelMember[]
  ideas                 Idea[]           @relation("ChannelIdeas")
  evaluationSessions    EvaluationSession[] @relation("ChannelEvalSessions")
  buckets               Bucket[]         @relation("ChannelBuckets")
  communicationLogs     CommunicationLog[]

  @@index([status])
}

enum ChannelStatus {
  DRAFT
  SUBMISSION
  CLOSED
}

model ChannelMember {
  id        String       @id @default(cuid())
  channelId String
  userId    String
  role      CampaignRole // reuse same roles
  channel   Channel      @relation(fields: [channelId], references: [id], onDelete: Cascade)
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignedAt DateTime    @default(now())

  @@unique([channelId, userId, role])
}

// ============================================================
// MODULE 4: IDEAS & SUBMISSIONS
// ============================================================

model Idea {
  id               String      @id @default(cuid())
  referenceNumber  String      @unique @default(cuid()) // I-2024-00001
  title            String
  description      String?     // Rich text
  problemDescription String?   // For channels with problem field
  imageUrl         String?

  status           IdeaStatus  @default(DRAFT)
  isConfidential   Boolean     @default(false)
  isInventionDisclosure Boolean @default(false)

  // Creation metadata
  creationType     IdeaCreationType @default(DIRECT)
  mergedFromIds    String[]    @default([])
  splitFromId      String?
  archiveReason    String?

  // Custom field values (matches campaign.customFields definitions)
  customFieldValues Json?

  // Community metrics (denormalized for performance)
  viewCount        Int         @default(0)
  commentCount     Int         @default(0)
  likeCount        Int         @default(0)
  voteCount        Int         @default(0)
  avgVoteScore     Float?
  isHot            Boolean     @default(false)  // community graduation
  hotAt            DateTime?

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  submittedAt      DateTime?

  // Relations
  contributorId    String
  contributor      User        @relation("IdeaContributor", fields: [contributorId], references: [id])

  campaignId       String?
  campaign         Campaign?   @relation(fields: [campaignId], references: [id])

  channelId        String?
  channel          Channel?    @relation("ChannelIdeas", fields: [channelId], references: [id])

  ideaCoachId      String?
  categoryId       String?
  category         IdeaCategory? @relation(fields: [categoryId], references: [id])

  coAuthors        IdeaCoAuthor[]
  comments         Comment[]
  votes            Vote[]
  likes            Like[]
  tags             IdeaTag[]
  attachments      IdeaAttachment[]
  bucketAssignments IdeaBucket[]
  evaluationItems  EvaluationItem[]
  relatedFrom      IdeaRelation[] @relation("RelatedFrom")
  relatedTo        IdeaRelation[] @relation("RelatedTo")
  concepts         Concept[]
  projects         ProjectIdeaLink[]
  implementations  Implementation[]
  inventionDisclosure InventionDisclosure?
  similarityScores SimilarityScore[] @relation("SourceIdea")

  @@index([campaignId])
  @@index([channelId])
  @@index([status])
  @@index([contributorId])
  @@index([isHot])
}

enum IdeaStatus {
  DRAFT
  QUALIFICATION
  COMMUNITY_DISCUSSION
  HOT
  EVALUATION
  SELECTED_CONCEPT
  SELECTED_IMPLEMENTATION
  IMPLEMENTED
  IMPLEMENTATION_CANCELED
  ARCHIVED
}

enum IdeaCreationType {
  DIRECT
  MERGED
  SPLIT
}

model IdeaCoAuthor {
  id     String @id @default(cuid())
  ideaId String
  userId String
  idea   Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([ideaId, userId])
}

model IdeaCategory {
  id         String  @id @default(cuid())
  name       String
  campaignId String?
  channelId  String?
  coachId    String? // default coach for this category
  isActive   Boolean @default(true)
  sortOrder  Int     @default(0)

  ideas      Idea[]
}

model IdeaRelation {
  id          String @id @default(cuid())
  fromIdeaId  String
  toIdeaId    String
  fromIdea    Idea   @relation("RelatedFrom", fields: [fromIdeaId], references: [id], onDelete: Cascade)
  toIdea      Idea   @relation("RelatedTo", fields: [toIdeaId], references: [id], onDelete: Cascade)

  @@unique([fromIdeaId, toIdeaId])
}

model IdeaAttachment {
  id       String   @id @default(cuid())
  ideaId   String
  idea     Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  fileName String
  fileUrl  String
  fileSize Int
  mimeType String
  createdAt DateTime @default(now())
}

model IdeaTag {
  id     String @id @default(cuid())
  ideaId String
  tagId  String
  idea   Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id])

  @@unique([ideaId, tagId])
}

model Tag {
  id        String       @id @default(cuid())
  name      String       @unique
  createdAt DateTime     @default(now())

  ideaTags      IdeaTag[]
  campaignTags  CampaignTag[]
}

model Comment {
  id        String    @id @default(cuid())
  content   String    // Rich text
  isPrivate Boolean   @default(false) // private = only coach + contributor + manager
  perspective String? // multi-perspective thinking role

  authorId  String
  author    User      @relation(fields: [authorId], references: [id])

  ideaId    String?
  idea      Idea?     @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  parentId  String?   // for threaded replies
  parent    Comment?  @relation("CommentThread", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentThread")

  isFlagged Boolean   @default(false)
  flagCount Int       @default(0)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // soft delete

  @@index([ideaId])
  @@index([parentId])
}

model Vote {
  id         String  @id @default(cuid())
  userId     String
  ideaId     String
  criterionId String? // links to voting criteria in campaign
  score      Float   // 1-5 star rating

  user       User    @relation(fields: [userId], references: [id])
  idea       Idea    @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, ideaId, criterionId])
  @@index([ideaId])
}

model Like {
  id     String @id @default(cuid())
  userId String
  ideaId String
  user   User   @relation(fields: [userId], references: [id])
  idea   Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, ideaId])
}

model SimilarityScore {
  id           String @id @default(cuid())
  sourceIdeaId String
  targetIdeaId String
  score        Float  // 0-100

  sourceIdea   Idea   @relation("SourceIdea", fields: [sourceIdeaId], references: [id], onDelete: Cascade)

  calculatedAt DateTime @default(now())

  @@unique([sourceIdeaId, targetIdeaId])
  @@index([sourceIdeaId])
}

model Implementation {
  id          String @id @default(cuid())
  ideaId      String
  idea        Idea   @relation(fields: [ideaId], references: [id])
  details     String?
  status      String @default("IN_PROGRESS") // IN_PROGRESS, COMPLETED, CANCELED
  responsibleId String?
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model InventionDisclosure {
  id             String @id @default(cuid())
  ideaId         String @unique
  idea           Idea   @relation(fields: [ideaId], references: [id])
  patentDetails  Json?
  disclosureStatus String @default("SUBMITTED") // SUBMITTED, IN_REVIEW, APPROVED, REJECTED
  reviewedById   String?
  reviewedAt     DateTime?
  createdAt      DateTime @default(now())
}

// ============================================================
// MODULE 5: EVALUATION ENGINE
// ============================================================

model EvaluationSession {
  id                String              @id @default(cuid())
  name              String
  type              EvalSessionType     @default(SCORECARD)
  status            EvalSessionStatus   @default(SETUP)

  evaluatorGuidance String?
  dueDate           DateTime?
  evaluationType    EvalTeamType        @default(INDIVIDUAL)

  // Template
  isTemplate        Boolean             @default(false)

  // Settings
  autoForwardToEvaluation Boolean       @default(true)
  evaluatorsMayReadAll    Boolean       @default(false)
  shareResultsScope       String        @default("ORGANIZER") // ORGANIZER, TEAM, INVITEES
  shareIndividualResults  Boolean       @default(false)

  // Pairwise-specific
  minComparisonsPerEvaluator Int?
  maxComparisonsPerEvaluator Int?

  // Meeting minutes (for one-team eval)
  meetingMinutes    String?

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  startedAt         DateTime?
  closedAt          DateTime?

  // Relations
  campaignId        String?
  campaign          Campaign?           @relation(fields: [campaignId], references: [id])
  channelId         String?
  channel           Channel?            @relation("ChannelEvalSessions", fields: [channelId], references: [id])
  organizerId       String

  criteria          EvaluationCriterion[]
  items             EvaluationItem[]
  teamMembers       EvaluationTeamMember[]
  responses         EvaluationResponse[]
  pairwiseComparisons PairwiseComparison[]
  shortlistedItems  ShortlistItem[]

  @@index([campaignId])
  @@index([status])
}

enum EvalSessionType {
  SCORECARD
  PAIRWISE
}

enum EvalSessionStatus {
  SETUP
  ACTIVE
  EVALUATION_ENDED
  FINISHED
}

enum EvalTeamType {
  INDIVIDUAL        // each evaluator fills own form
  ONE_TEAM          // team meets and fills together
  PER_BUCKET        // different evaluators per bucket
  PER_OBJECT        // explicit assignment per idea
}

model EvaluationCriterion {
  id           String    @id @default(cuid())
  sessionId    String
  session      EvaluationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  name         String
  description  String?
  fieldType    EvalFieldType @default(SELECTION_5)
  isMandatory  Boolean   @default(false)
  sortOrder    Int       @default(0)

  // For selection fields
  options      Json?     // [{value: 1, label: "Very Low"}, ...]
  higherIsBetter Boolean @default(true)

  // Visibility conditions
  visibilityConditions Json? // [{fieldId, values: [...]}]

  responses    EvaluationResponseField[]
}

enum EvalFieldType {
  SELECTION_5       // Very Low to Very High
  SELECTION_YES_NO
  TEXT_FIELD
  CHECKBOX
  KEYWORD_SINGLE
  KEYWORD_MULTI
}

model EvaluationItem {
  id        String @id @default(cuid())
  sessionId String
  session   EvaluationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  ideaId    String
  idea      Idea   @relation(fields: [ideaId], references: [id])

  @@unique([sessionId, ideaId])
  @@index([sessionId])
}

model EvaluationTeamMember {
  id          String @id @default(cuid())
  sessionId   String
  userId      String
  session     EvaluationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user        User   @relation(fields: [userId], references: [id])

  // For per-bucket assignment
  bucketId    String?

  @@unique([sessionId, userId])
}

model EvaluationResponse {
  id          String @id @default(cuid())
  sessionId   String
  session     EvaluationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  evaluatorId String
  evaluator   User   @relation(fields: [evaluatorId], references: [id])
  ideaId      String
  status      EvalResponseStatus @default(PENDING)

  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  fields      EvaluationResponseField[]

  @@unique([sessionId, evaluatorId, ideaId])
  @@index([sessionId, evaluatorId])
}

enum EvalResponseStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}

model EvaluationResponseField {
  id           String @id @default(cuid())
  responseId   String
  criterionId  String
  response     EvaluationResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  criterion    EvaluationCriterion @relation(fields: [criterionId], references: [id])

  numericValue Float?
  textValue    String?
  booleanValue Boolean?
  keywordValue String[]  @default([])

  @@unique([responseId, criterionId])
}

model PairwiseComparison {
  id          String @id @default(cuid())
  sessionId   String
  session     EvaluationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  evaluatorId String
  ideaAId     String
  ideaBId     String
  criterionId String

  // Score: -1 (A wins), 0 (tie), 1 (B wins), or continuous slider value
  score       Float
  isSkipped   Boolean @default(false)

  createdAt   DateTime @default(now())

  @@index([sessionId, evaluatorId])
}

model ShortlistItem {
  id        String @id @default(cuid())
  sessionId String
  ideaId    String
  session   EvaluationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  addedAt   DateTime @default(now())

  @@unique([sessionId, ideaId])
}

// ============================================================
// MODULE 5.5: BUCKETS (used in campaigns, channels, portfolios)
// ============================================================

model Bucket {
  id          String  @id @default(cuid())
  name        String
  color       String? @default("#6366F1")
  isSmart     Boolean @default(false)
  smartFilter Json?   // saved filter criteria for smart buckets

  campaignId  String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id])
  channelId   String?
  channel     Channel?  @relation("ChannelBuckets", fields: [channelId], references: [id])

  createdAt   DateTime @default(now())

  items       IdeaBucket[]
}

model IdeaBucket {
  id       String @id @default(cuid())
  ideaId   String
  bucketId String
  idea     Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  bucket   Bucket @relation(fields: [bucketId], references: [id], onDelete: Cascade)

  @@unique([ideaId, bucketId])
}

// ============================================================
// MODULE 6: PARTNER ENGAGEMENT
// ============================================================

model Organization {
  id                String   @id @default(cuid())
  name              String
  description       String?
  websiteUrl        String?
  logoUrl           String?
  industry          String?
  location          String?
  foundedYear       Int?
  employeeCount     String?  // range like "11-50"
  fundingStage      String?
  fundingTotal      String?

  relationshipStatus OrgRelationshipStatus @default(IDENTIFIED)
  ndaStatus          NdaStatus            @default(NONE)
  isConfidential     Boolean              @default(false)
  isArchived         Boolean              @default(false)

  // External IDs
  crunchbaseId      String?  @unique
  innospotId        String?

  // Custom fields
  customFields      Json?

  // Management team info (from Crunchbase)
  managementTeam    Json?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  managers          OrganizationManager[]
  contacts          Contact[]
  useCases          UseCaseOrganization[]
  attachments       OrgAttachment[]
  interactions      Interaction[]
  scoutingBoardItems ScoutingBoardItem[]
  trendFocus        OrgTrendFocus[]
  techFocus         OrgTechFocus[]

  @@index([relationshipStatus])
  @@index([name])
}

enum OrgRelationshipStatus {
  IDENTIFIED
  VERIFIED
  QUALIFIED
  EVALUATION
  PILOT
  PARTNERSHIP
  ARCHIVED
}

enum NdaStatus {
  NONE
  REQUESTED
  SIGNED
  EXPIRED
}

model OrganizationManager {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           String       @default("INTERNAL_MANAGER") // INTERNAL_MANAGER, EXTERNAL_PRIMARY
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
}

model Contact {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  firstName      String
  lastName       String
  email          String?
  phone          String?
  title          String?

  invitationStatus String    @default("NOT_INVITED") // NOT_INVITED, INVITED, REGISTERED
  linkedUserId   String?     // if they registered

  createdAt      DateTime    @default(now())
}

model UseCase {
  id              String        @id @default(cuid())
  title           String
  problemDescription String?
  suggestedSolution  String?
  benefit         String?

  status          UseCaseStatus @default(IDENTIFIED)

  ownerId         String

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  organizations   UseCaseOrganization[]
  teamMembers     UseCaseMember[]
  tasks           Task[]
  attachments     UseCaseAttachment[]
  interactions    Interaction[]  @relation("UseCaseInteractions")
  discussions     UseCaseDiscussion[]

  @@index([status])
}

enum UseCaseStatus {
  IDENTIFIED
  QUALIFICATION
  EVALUATION
  PILOT
  PARTNERSHIP
  ARCHIVED
}

model UseCaseOrganization {
  id             String       @id @default(cuid())
  useCaseId      String
  organizationId String
  useCase        UseCase      @relation(fields: [useCaseId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([useCaseId, organizationId])
}

model UseCaseMember {
  id        String  @id @default(cuid())
  useCaseId String
  userId    String
  role      String  @default("MEMBER") // OWNER, MEMBER
  useCase   UseCase @relation(fields: [useCaseId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id])

  @@unique([useCaseId, userId])
}

model UseCaseDiscussion {
  id        String   @id @default(cuid())
  useCaseId String
  useCase   UseCase  @relation(fields: [useCaseId], references: [id], onDelete: Cascade)
  authorId  String
  content   String
  parentId  String?
  createdAt DateTime @default(now())
}

model UseCaseAttachment {
  id        String   @id @default(cuid())
  useCaseId String
  useCase   UseCase  @relation(fields: [useCaseId], references: [id], onDelete: Cascade)
  fileName  String
  fileUrl   String
  fileSize  Int
  mimeType  String
  visibility String @default("INTERNAL") // PRIVATE, INTERNAL, PUBLIC
  createdAt DateTime @default(now())
}

model OrgAttachment {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  fileName       String
  fileUrl        String
  fileSize       Int
  mimeType       String
  visibility     String       @default("INTERNAL")
  createdAt      DateTime     @default(now())
}

model Interaction {
  id             String        @id @default(cuid())
  type           String        // "CALL", "MEETING", "EMAIL", "NOTE"
  subject        String?
  description    String?
  date           DateTime

  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  useCaseId      String?
  useCase        UseCase?      @relation("UseCaseInteractions", fields: [useCaseId], references: [id])

  createdById    String
  visibility     String        @default("INTERNAL")

  createdAt      DateTime      @default(now())
}

model ScoutingBoard {
  id          String   @id @default(cuid())
  name        String
  description String?
  creatorId   String
  creator     User     @relation(fields: [creatorId], references: [id])
  isShared    Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items       ScoutingBoardItem[]
  customColumns ScoutingBoardColumn[]
}

model ScoutingBoardItem {
  id             String        @id @default(cuid())
  boardId        String
  board          ScoutingBoard @relation(fields: [boardId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id])

  isArchived     Boolean       @default(false)
  sortOrder      Int           @default(0)
  customValues   Json?         // values for custom columns

  addedAt        DateTime      @default(now())

  @@unique([boardId, organizationId])
}

model ScoutingBoardColumn {
  id      String        @id @default(cuid())
  boardId String
  board   ScoutingBoard @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name    String
  type    String        @default("TEXT") // TEXT, NUMBER, SELECT, DATE
  groupName String?
  sortOrder Int         @default(0)
}

// ============================================================
// MODULE 7: STRATEGY
// ============================================================

model StrategicInnovationArea {
  id               String   @id @default(cuid())
  name             String
  description      String?
  imageUrl         String?
  isActive         Boolean  @default(true)

  innovationSpaceId String?
  innovationSpace  InnovationSpace? @relation(fields: [innovationSpaceId], references: [id])

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  campaigns        Campaign[]
  channels         Channel[]
  trends           TrendSiaLink[]
  technologies     TechSiaLink[]
}

model Trend {
  id              String   @id @default(cuid())
  title           String
  description     String?
  imageUrl        String?
  sourceUrl       String?

  type            TrendType @default(MICRO)
  isConfidential  Boolean  @default(false)
  isArchived      Boolean  @default(false)
  isCommunitySubmitted Boolean @default(false)

  // External
  trendOneId      String?
  businessRelevance Float?

  parentId        String?
  parent          Trend?   @relation("TrendHierarchy", fields: [parentId], references: [id])
  children        Trend[]  @relation("TrendHierarchy")

  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  sias            TrendSiaLink[]
  insights        TrendInsightLink[]
  orgFocus        OrgTrendFocus[]
}

enum TrendType {
  MEGA
  MACRO
  MICRO
}

model TrendSiaLink {
  id      String                  @id @default(cuid())
  trendId String
  siaId   String
  trend   Trend                   @relation(fields: [trendId], references: [id], onDelete: Cascade)
  sia     StrategicInnovationArea @relation(fields: [siaId], references: [id], onDelete: Cascade)
  @@unique([trendId, siaId])
}

model Technology {
  id              String   @id @default(cuid())
  title           String
  description     String?
  imageUrl        String?
  sourceUrl       String?
  maturityLevel   String?
  isConfidential  Boolean  @default(false)
  isArchived      Boolean  @default(false)

  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  sias            TechSiaLink[]
  orgFocus        OrgTechFocus[]
}

model TechSiaLink {
  id     String                  @id @default(cuid())
  techId String
  siaId  String
  tech   Technology              @relation(fields: [techId], references: [id], onDelete: Cascade)
  sia    StrategicInnovationArea @relation(fields: [siaId], references: [id], onDelete: Cascade)
  @@unique([techId, siaId])
}

model Insight {
  id          String   @id @default(cuid())
  title       String
  description String?
  imageUrl    String?
  sourceUrl   String?
  insightType String?

  createdById String
  campaignId  String?  // if submitted in a campaign context
  isEditorial Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  trendLinks  TrendInsightLink[]
}

model TrendInsightLink {
  id        String  @id @default(cuid())
  trendId   String
  insightId String
  trend     Trend   @relation(fields: [trendId], references: [id], onDelete: Cascade)
  insight   Insight @relation(fields: [insightId], references: [id], onDelete: Cascade)
  @@unique([trendId, insightId])
}

model OrgTrendFocus {
  id             String       @id @default(cuid())
  organizationId String
  trendId        String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  trend          Trend        @relation(fields: [trendId], references: [id], onDelete: Cascade)
  @@unique([organizationId, trendId])
}

model OrgTechFocus {
  id             String       @id @default(cuid())
  organizationId String
  techId         String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  tech           Technology   @relation(fields: [techId], references: [id], onDelete: Cascade)
  @@unique([organizationId, techId])
}

// ============================================================
// MODULE 8: PROJECTS & CONCEPTS
// ============================================================

model ProcessDefinition {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  phases      ProcessPhase[]
  projects    Project[]
}

model ProcessPhase {
  id               String @id @default(cuid())
  processId        String
  process          ProcessDefinition @relation(fields: [processId], references: [id], onDelete: Cascade)

  name             String
  description      String?
  goal             String?
  gatekeeperGuidance String?
  sortOrder        Int

  // Preselected gatekeepers
  preselectedGatekeeperIds String[] @default([])

  activities       ProcessActivity[]
  gateTasks        GateTask[]
}

model ProcessActivity {
  id       String       @id @default(cuid())
  phaseId  String
  phase    ProcessPhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)

  name     String
  isShared Boolean      @default(false) // can be reused across phases
  sortOrder Int

  tasks    ProcessTask[]
}

model ProcessTask {
  id         String          @id @default(cuid())
  activityId String
  activity   ProcessActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  name       String
  fieldType  String          // TEXT, NUMBER, KEYWORD_SINGLE, KEYWORD_MULTI, ATTACHMENT, DATE, USER
  isMandatory Boolean        @default(false)
  isShared   Boolean         @default(false)
  showOnDashboard Boolean    @default(false)
  options    Json?           // for keyword fields
  sortOrder  Int
}

model GateTask {
  id       String       @id @default(cuid())
  phaseId  String
  phase    ProcessPhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  name     String
  fieldType String
  options  Json?
  sortOrder Int
}

model Project {
  id               String        @id @default(cuid())
  name             String
  description      String?
  imageUrl         String?
  isConfidential   Boolean       @default(false)
  status           ProjectStatus @default(DRAFT)

  currentPhaseId   String?
  currentPhaseStatus PhaseStatus @default(ELABORATION)

  processId        String
  process          ProcessDefinition @relation(fields: [processId], references: [id])

  createdById      String // portfolio manager

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  members          ProjectMember[]
  phaseTimings     ProjectPhaseTiming[]
  taskValues       ProjectTaskValue[]
  gateDecisions    GateDecision[]
  ideaLinks        ProjectIdeaLink[]
  history          ProjectHistory[]

  @@index([status])
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  POSTPONED
  TERMINATED
  COMPLETED
}

enum PhaseStatus {
  ELABORATION
  GATE
}

model ProjectMember {
  id        String  @id @default(cuid())
  projectId String
  userId    String
  role      String  // LEADER, MEMBER, GATEKEEPER
  phaseId   String? // for gatekeepers: which phase

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id])

  @@unique([projectId, userId, role, phaseId])
}

model ProjectPhaseTiming {
  id           String   @id @default(cuid())
  projectId    String
  phaseId      String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  plannedStart DateTime?
  plannedEnd   DateTime?
  actualStart  DateTime?
  actualEnd    DateTime?
}

model ProjectTaskValue {
  id        String  @id @default(cuid())
  projectId String
  taskId    String  // references ProcessTask.id
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  textValue    String?
  numberValue  Float?
  dateValue    DateTime?
  keywordValue String[] @default([])
  fileUrl      String?
  assigneeId   String?
  isDone       Boolean  @default(false)

  updatedAt DateTime @updatedAt

  @@unique([projectId, taskId])
}

model GateDecision {
  id           String  @id @default(cuid())
  projectId    String
  phaseId      String
  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  decision     String  // FORWARD, REWORK, POSTPONE, TERMINATE
  message      String?
  decidedById  String
  decidedAt    DateTime @default(now())

  gateTaskValues Json? // gatekeeper's responses to gate tasks
}

model ProjectIdeaLink {
  id        String  @id @default(cuid())
  projectId String
  ideaId    String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  idea      Idea    @relation(fields: [ideaId], references: [id])
  @@unique([projectId, ideaId])
}

model ProjectHistory {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  action    String
  details   Json?
  actorId   String
  createdAt DateTime @default(now())
}

model Concept {
  id          String @id @default(cuid())
  ideaId      String
  idea        Idea   @relation(fields: [ideaId], references: [id])
  title       String
  objectives  String?
  description String?
  status      String @default("ELABORATION") // ELABORATION, EVALUATION, APPROVED, REJECTED

  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ============================================================
// MODULE 9: REPORTING & KPIs
// ============================================================

model KpiSnapshot {
  id          String   @id @default(cuid())
  campaignId  String?
  channelId   String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id])

  date        DateTime
  metric      String   // "visitors", "participants", "ideas", "comments", "votes", "likes"
  value       Int

  // Exclude team flag
  excludeTeam Boolean  @default(false)

  @@index([campaignId, date])
  @@index([metric])
}

// ============================================================
// MODULE 10: NOTIFICATIONS & ACTIVITY
// ============================================================

model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String   // "IDEA_SUBMITTED", "COMMENT_ADDED", "EVALUATION_REQUESTED", etc.
  title       String
  body        String?
  link        String?  // URL to navigate to

  isRead      Boolean  @default(false)
  isEmailed   Boolean  @default(false)

  metadata    Json?    // additional data for rendering

  createdAt   DateTime @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}

model NotificationTemplate {
  id          String  @id @default(cuid())
  eventType   String  @unique
  subject     String
  bodyHtml    String
  isActive    Boolean @default(true)
  isPushEnabled Boolean @default(false)

  updatedAt   DateTime @updatedAt
}

model ActivityLog {
  id          String   @id @default(cuid())
  actorId     String
  actor       User     @relation(fields: [actorId], references: [id])

  action      String   // "IDEA_CREATED", "COMMENT_ADDED", "STATUS_CHANGED", etc.
  objectType  String   // "IDEA", "CAMPAIGN", "ORGANIZATION", etc.
  objectId    String
  details     Json?

  campaignId  String?
  channelId   String?

  createdAt   DateTime @default(now())

  @@index([campaignId, createdAt])
  @@index([channelId, createdAt])
  @@index([objectType, objectId])
}

// ============================================================
// MODULE 11: SEARCH & FOLLOWS
// ============================================================

model Follow {
  id         String @id @default(cuid())
  userId     String
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  objectType String // "IDEA", "CAMPAIGN", "CHANNEL", "USER", "TAG"
  objectId   String

  createdAt  DateTime @default(now())

  @@unique([userId, objectType, objectId])
  @@index([userId])
}

model SavedSearch {
  id           String  @id @default(cuid())
  userId       String
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  query        String
  filters      Json?
  objectType   String  // "IDEA", "CAMPAIGN", "ORGANIZATION"
  isFavorite   Boolean @default(false)
  notifyOnNew  Boolean @default(false)

  createdAt    DateTime @default(now())
}

// ============================================================
// MODULE 12: TASKS (generic task system)
// ============================================================

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(OPEN)

  assigneeId  String?
  assignee    User?      @relation("TaskAssignee", fields: [assigneeId], references: [id])
  creatorId   String
  creator     User       @relation("TaskCreator", fields: [creatorId], references: [id])

  useCaseId   String?
  useCase     UseCase?   @relation(fields: [useCaseId], references: [id])

  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([assigneeId, status])
  @@index([useCaseId])
}

enum TaskStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
}
```

---

## Entity Relationship Summary

```
User ──┬── OrgUnit
       ├── UserGroup (many-to-many)
       ├── Campaign (as member: manager/sponsor/moderator/evaluator/coach)
       ├── Channel (as member)
       ├── Idea (as contributor/co-author/coach)
       ├── EvaluationSession (as team member)
       ├── EvaluationResponse (as evaluator)
       ├── Project (as leader/member/gatekeeper)
       ├── Organization (as manager)
       ├── UseCase (as owner/member)
       ├── ScoutingBoard (as creator)
       └── Notification / ActivityLog / Follow

Campaign ──┬── Ideas
           ├── Buckets ── IdeaBucket
           ├── EvaluationSessions ── Items + Criteria + Responses
           ├── CampaignMembers (roles)
           ├── AudienceRules
           ├── Tags, Attachments, Inspirations
           └── KpiSnapshots

Idea ──┬── Comments (threaded)
       ├── Votes (multi-criteria)
       ├── Likes
       ├── Tags
       ├── Attachments
       ├── BucketAssignments
       ├── EvaluationItems
       ├── RelatedIdeas
       ├── Concepts
       ├── ProjectLinks
       └── SimilarityScores

Organization ──┬── Contacts
               ├── UseCases (many-to-many)
               ├── Attachments / Interactions
               ├── Managers
               ├── ScoutingBoardItems
               └── TrendFocus / TechFocus

Project ──┬── ProcessDefinition ── Phases ── Activities ── Tasks
          ├── Members (leader/member/gatekeeper)
          ├── PhaseTimings
          ├── TaskValues
          ├── GateDecisions
          └── History
```
