# 06 — DATA FLOWS, STATE MANAGEMENT & IMPLEMENTATION GUIDE

---

## 1. KEY DATA FLOWS

### Flow 1: Idea Submission

```
User clicks [Submit Idea] on campaign page
  │
  ▼
IdeaForm component (React Hook Form + Zod validation)
  ├─ Title (required)
  ├─ Description (TipTap rich text editor)
  ├─ Image upload (pre-signed S3 URL)
  ├─ Custom fields (dynamic, from campaign.customFields)
  ├─ Category selector (if categories configured)
  └─ Confidential toggle (if allowed)
  │
  ▼
Client: trpc.idea.create.mutate({ ... })
  │
  ▼
Server: idea.service.createIdea()
  ├─ Validate user is in campaign audience
  ├─ Create Idea record (status: DRAFT)
  ├─ Process custom field values
  ├─ Handle image upload confirmation
  └─ Return idea (still draft)
  │
  ▼
User clicks [Submit] (or auto-submit)
  │
  ▼
Server: idea.service.submitIdea()
  ├─ IF campaign has qualification phase:
  │     Set status → QUALIFICATION
  │     Assign idea coach (from campaign config)
  │     Notify coach
  ├─ ELSE:
  │     Set status → COMMUNITY_DISCUSSION
  │     Visible to all invitees
  │
  ├─ Queue: similarity.job (calculate similar ideas)
  ├─ Queue: notification.job (notify campaign managers)
  ├─ Create ActivityLog entry
  ├─ Emit socket event: "idea:submitted" (for live feed)
  └─ Increment campaign KPI counters
```

### Flow 2: Community Graduation (HOT! detection)

```
Triggered after: comment added, vote submitted, like added, page view recorded
  │
  ▼
Server: idea.service.checkGraduation(ideaId)
  │
  ├─ Fetch campaign graduation thresholds:
  │   { visitors: 10, commenters: 5, voters: 0, votingLevel: 0, likes: 0 }
  │
  ├─ Fetch current idea metrics:
  │   { viewCount, uniqueCommenters, uniqueVoters, avgVoteScore, likeCount }
  │
  ├─ Check ALL thresholds met:
  │   viewCount >= 10? ✓
  │   uniqueCommenters >= 5? ✓
  │   (voters threshold 0, skip)
  │
  ├─ IF all met AND idea.status === COMMUNITY_DISCUSSION:
  │     Set status → HOT
  │     Set isHot → true
  │     Set hotAt → now()
  │     Notify contributor: "Your idea is HOT! 🔥"
  │     Notify campaign managers
  │     Create ActivityLog entry
  │     Emit socket event: "idea:hot"
  │
  └─ ELSE: update graduation progress percentage (for UI display)
```

### Flow 3: Evaluation Session Lifecycle

```
SETUP:
  Manager creates session → SETUP status
  Adds criteria (form builder)
  Adds ideas from bucket
  Selects evaluation team
  │
  ▼
START SESSION:
  Manager clicks [Start Evaluation Session]
  │
  Server: evaluation.service.startSession(sessionId)
  ├─ For each idea × each evaluator:
  │     Create EvaluationResponse (status: PENDING)
  ├─ If autoForwardToEvaluation:
  │     Update each idea's status → EVALUATION
  ├─ Send invitation notifications to all evaluators
  ├─ Set session status → ACTIVE
  └─ Return
  │
  ▼
EVALUATORS COMPLETE FORMS:
  Each evaluator opens their pending evaluations
  Fills form per idea → saves fields → marks as COMPLETED
  │
  Manager can track progress (% complete per evaluator)
  Manager can send reminders to incomplete evaluators
  │
  ▼
STOP & ANALYZE:
  Manager clicks [Stop Evaluation Session]
  ├─ Deactivate incomplete evaluations
  ├─ Set session status → EVALUATION_ENDED
  │
  Results calculation:
  ├─ For each idea:
  │     Average score per criterion (across evaluators)
  │     Standard deviation per criterion
  │     Weighted score (based on manager-defined weights)
  │     Normalized rankings
  │
  Manager reviews results table/bubble chart
  Adds top ideas to shortlist (🏆)
  │
  ▼
CLOSE SESSION:
  Manager clicks [Close Session]
  ├─ Lock shortlist
  ├─ Set session status → FINISHED
  └─ Manager processes shortlisted ideas (select for implementation/concept/archive)
```

### Flow 4: Use Case Pipeline

```
Scout creates scouting board
  → Searches external DBs (Crunchbase/INNOSPOT)
  → Adds organizations to long list
  → Evaluates via custom columns
  → Selects short list candidates
  → Creates use case for selected org
  │
  ▼
UseCase created (status: IDENTIFIED)
  → Owner and team assigned
  → Summary: problem, solution, benefit
  │
  ▼
Status progression (manual, by owner):
  IDENTIFIED → QUALIFICATION → EVALUATION → PILOT → PARTNERSHIP
  │
  At each stage:
  ├─ Team updates tasks on Kanban board
  ├─ Records interactions (meetings, calls, emails)
  ├─ Uploads attachments
  ├─ Internal discussion thread
  └─ Organization's relationship status may sync with most advanced use case
```

### Flow 5: Project Phase-Gate

```
Portfolio Manager creates project from process template
  ├─ Assigns leader + team
  ├─ Sets phase timings
  └─ Starts project → Phase 1 (ELABORATION)
  │
  ▼
ELABORATION (team works):
  Team completes activity tasks (fills form fields, uploads docs)
  Leader monitors progress
  │
  ▼
FORWARD TO GATE:
  Leader clicks [Forward to Gate]
  ├─ Selects gatekeepers (or uses preselected)
  ├─ Phase moves to GATE status
  ├─ Tasks become read-only
  ├─ Gatekeepers notified
  │
  ▼
GATE DECISION (gatekeeper):
  Gatekeeper reviews completed activities
  Fills gate tasks (evaluation criteria)
  Makes decision:
  ├─ FORWARD → project moves to Phase 2 (ELABORATION)
  ├─ REWORK → project returns to Phase 1 (ELABORATION), team notified
  ├─ POSTPONE → project status: POSTPONED (can be continued later)
  └─ TERMINATE → project status: TERMINATED (archived)
  │
  Decision + message logged in ProjectHistory
  │
  ▼
Last phase gate → FORWARD → project status: COMPLETED
```

---

## 2. STATE MANAGEMENT ARCHITECTURE

### Server State (TanStack Query)

```typescript
// All server data fetched and cached via TanStack Query through tRPC

// Example: Campaign list with filters
const { data, isLoading } = trpc.campaign.list.useQuery({
  status: filterStatus,
  type: filterType,
  page: currentPage,
  limit: 20,
  sort: sortBy,
});

// Example: Idea detail with related data
const { data: idea } = trpc.idea.getById.useQuery({ id: ideaId });

// Mutations with optimistic updates
const likeMutation = trpc.idea.like.useMutation({
  onMutate: async ({ ideaId }) => {
    // Optimistic update
    await queryClient.cancelQueries(["idea", ideaId]);
    const prev = queryClient.getQueryData(["idea", ideaId]);
    queryClient.setQueryData(["idea", ideaId], (old) => ({
      ...old,
      likeCount: old.likeCount + 1,
      isLikedByMe: true,
    }));
    return { prev };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(["idea", vars.ideaId], context.prev);
  },
  onSettled: () => {
    queryClient.invalidateQueries(["idea", ideaId]);
  },
});
```

### Client State (Zustand)

```typescript
// UI state that doesn't come from server

// stores/ui.store.ts
interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  activeTab: Record<string, string>; // per-page tab state
  setActiveTab: (page: string, tab: string) => void;
}

// stores/filter.store.ts
interface FilterStore {
  campaignFilters: {
    status: CampaignStatus | null;
    type: SubmissionType | null;
    search: string;
    sort: string;
    view: 'grid' | 'list';
  };
  setCampaignFilter: (key, value) => void;
  resetCampaignFilters: () => void;

  ideaFilters: { ... };
  orgFilters: { ... };
}

// stores/ideaBoard.store.ts
interface IdeaBoardStore {
  selectedIdeaIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  activeBucketId: string | null;
  setActiveBucket: (id: string | null) => void;

  dualWindowMode: boolean;
  toggleDualWindow: () => void;

  visibleColumns: string[];
  setVisibleColumns: (cols: string[]) => void;
}
```

---

## 3. KEY TECHNICAL IMPLEMENTATION NOTES

### Permissions Middleware

```typescript
// server/lib/permissions.ts
export const requireRole = (roles: string[]) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const userRoles = await getUserRoles(ctx.session.user.id);
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx: { ...ctx, userRoles } });
  });
};

// Campaign-context permission check
export const requireCampaignAccess = (action: string) => {
  return middleware(async ({ ctx, rawInput, next }) => {
    const campaignId = (rawInput as any).campaignId;
    const canAccess = await checkCampaignPermission(
      ctx.session.user.id,
      campaignId,
      action,
    );
    if (!canAccess) throw new TRPCError({ code: "FORBIDDEN" });
    return next();
  });
};
```

### Full-Text Search

```sql
-- PostgreSQL full-text search setup
-- Add to migration:

ALTER TABLE "Idea" ADD COLUMN "searchVector" tsvector;

CREATE INDEX idea_search_idx ON "Idea" USING GIN ("searchVector");

-- Trigger to auto-update search vector
CREATE OR REPLACE FUNCTION idea_search_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER idea_search_trigger
  BEFORE INSERT OR UPDATE ON "Idea"
  FOR EACH ROW EXECUTE FUNCTION idea_search_update();
```

### Similarity Service

```typescript
// server/services/similarity.service.ts
// Phase 1: TF-IDF based (simple, no ML needed)
// Phase 2: Upgrade to embeddings (OpenAI/local model)

export async function calculateSimilarIdeas(campaignId: string) {
  const ideas = await prisma.idea.findMany({
    where: { campaignId, status: { not: "DRAFT" } },
    select: { id: true, title: true, description: true },
  });

  // Build TF-IDF vectors for all ideas
  const tfidf = new TfIdf();
  ideas.forEach((idea) => {
    tfidf.addDocument(`${idea.title} ${stripHtml(idea.description)}`);
  });

  // Calculate pairwise similarity
  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const score = cosineSimilarity(tfidf.documents[i], tfidf.documents[j]);
      if (score > 0.3) {
        // threshold
        await prisma.similarityScore.upsert({
          where: {
            sourceIdeaId_targetIdeaId: {
              sourceIdeaId: ideas[i].id,
              targetIdeaId: ideas[j].id,
            },
          },
          create: {
            sourceIdeaId: ideas[i].id,
            targetIdeaId: ideas[j].id,
            score: score * 100,
          },
          update: { score: score * 100, calculatedAt: new Date() },
        });
      }
    }
  }
}
```

### KPI Snapshot Worker

```typescript
// server/jobs/kpi.job.ts
// Runs daily via BullMQ repeatable job

export async function computeKpiSnapshots() {
  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      status: { in: ["SUBMISSION", "DISCUSSION_VOTING", "EVALUATION"] },
    },
  });

  for (const campaign of activeCampaigns) {
    const today = startOfDay(new Date());

    const metrics = await Promise.all([
      countUniqueVisitors(campaign.id, today),
      countParticipants(campaign.id, today),
      countIdeas(campaign.id, today),
      countComments(campaign.id, today),
      countVotes(campaign.id, today),
      countLikes(campaign.id, today),
    ]);

    const metricNames = [
      "visitors",
      "participants",
      "ideas",
      "comments",
      "votes",
      "likes",
    ];

    await prisma.kpiSnapshot.createMany({
      data: metricNames.map((name, i) => ({
        campaignId: campaign.id,
        date: today,
        metric: name,
        value: metrics[i],
        excludeTeam: false,
      })),
    });
  }
}
```

### Real-Time Notifications

```typescript
// server/services/notification.service.ts
export async function sendNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, any>;
}) {
  // 1. Create DB record
  const notification = await prisma.notification.create({ data: params });

  // 2. Emit via Socket.io (live in-app)
  io.to(`user:${params.userId}`).emit("notification", notification);

  // 3. Queue email (based on user preference)
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (user.emailFrequency === "IMMEDIATELY") {
    await emailQueue.add("send", {
      to: user.email,
      template: params.type,
      data: { notification, user },
    });
  }
  // DAILY/WEEKLY: handled by scheduled digest job
}
```

---

## 4. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/innoflow

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# File Storage
S3_BUCKET=innoflow-files
S3_REGION=us-east-1
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ENDPOINT=   # for MinIO: http://localhost:9000

# Email
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxx
EMAIL_FROM=noreply@innoflow.app

# External Integrations (optional)
CRUNCHBASE_API_KEY=
MS_TEAMS_WEBHOOK_URL=
DEEPL_API_KEY=
GOOGLE_TRANSLATE_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=InnoFlow
```

---

## 5. DOCKER COMPOSE (Development)

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://innoflow:innoflow@postgres:5432/innoflow
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - minio
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: innoflow
      POSTGRES_USER: innoflow
      POSTGRES_PASSWORD: innoflow
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

---

## 6. TESTING STRATEGY

```
Unit Tests:     Vitest — services, utilities, permission logic
Integration:    Vitest + Prisma test client — tRPC routers against test DB
E2E:            Playwright — critical user flows:
                  - Login → create campaign → submit idea → evaluate → shortlist
                  - Create organization → create use case → progress pipeline
                  - Create project → complete phase → gate decision
Component:      Storybook — all design system components documented
```

---

## 7. SEED DATA

```
Create seed script (prisma/seed.ts) with:
- 1 Platform Admin user
- 5 Innovation Manager users
- 20 Contributor users across 3 org units
- 3 External users
- User groups: Platform Admin, Innovation Manager, Contributor, Evaluator, External
- 2 Innovation Spaces
- 3 Strategic Innovation Areas
- 2 Active campaigns (one in submission, one in evaluation) with 15-30 ideas each
- 1 Closed campaign with results
- 1 Channel with 10 ideas
- 5 Organizations with 3 use cases
- 5 Trends, 3 Technologies, 8 Insights
- 1 Project in Phase 2
- Sample evaluation sessions with results
- Activity logs, comments, votes, likes
```
