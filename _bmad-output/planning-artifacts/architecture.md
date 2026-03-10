---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-ignite-2026-03-09.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-09-2020.md
  - docs/00-FEATURE-LIST.md
  - docs/01-SYSTEM-ARCHITECTURE.md
  - docs/02-DATABASE-SCHEMA.md
  - docs/03-API-DESIGN.md
  - docs/04-UI-DESIGN-SYSTEM.md
  - docs/05-PAGE-SPECIFICATIONS.md
  - docs/06-DATA-FLOWS-AND-IMPLEMENTATION.md
  - docs/06-DATA-FLOWS-AND-IMPLEMENTATION_1.md
  - docs/InnoFlow-UI-Design.jsx
  - docs/HYPE_Feature_List_for_Claude_Code.md
  - docs/README.md
workflowType: "architecture"
lastStep: 8
status: "complete"
completedAt: "2026-03-09"
project_name: "ignite"
user_name: "Cvsilab"
date: "2026-03-09"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
75 FRs across 12 capability areas. The architecturally significant FRs are:

- **FR5 (RBAC):** Contextual role-based access control resolving Global Role > Resource Role > Scope. Touches every API endpoint — must be middleware, not per-route logic.
- **FR14 (Campaign Lifecycle):** 6-state machine with conditional transitions, auto-transitions on date, and manual fast-track. Requires explicit state machine pattern.
- **FR26 (Idea Lifecycle):** 10+ status transitions with access rules per status. Coupled to campaign state (ideas can't advance past campaign's current phase).
- **FR27 (Community Graduation):** Event-driven threshold checking after every comment, vote, like, and view. Requires efficient metric aggregation.
- **FR43-FR54 (Evaluation Engine):** Scorecard + pairwise sessions with weighted scoring, standard deviation, and Bradley-Terry ranking. Mathematical correctness is critical.
- **FR62-FR65 (AI Layer):** Semantic similarity via embeddings, idea enrichment co-pilot, smart summarization. Must be optional — platform functions fully without it.
- **FR71-FR75 (Deployment):** Docker Compose deployment, env var configuration, auto-migrations, health/metrics endpoints.

**Non-Functional Requirements:**
48 NFRs across 7 categories driving key architectural decisions:

- **Performance:** 200ms p95 API, 1s KPI dashboards, 500 concurrent users on 4vCPU/8GB (NFR1-NFR8)
- **Security:** bcrypt auth, JWT httpOnly cookies, CSRF, rate limiting, RBAC on every endpoint (NFR9-NFR19)
- **Scalability:** 100K ideas/instance, Redis Socket.io adapter, async AI jobs, cursor pagination (NFR20-NFR25)
- **Accessibility:** WCAG 2.1 AA, Lighthouse 90+, keyboard navigation (NFR26-NFR32)
- **Reliability:** Zero data loss, graceful error handling, job retry with backoff (NFR33-NFR37)
- **Maintainability:** 80%+ test coverage, TypeScript strict mode, CI pipeline, ADRs (NFR38-NFR44)
- **Observability:** Health endpoint, Prometheus metrics, structured JSON logging (NFR45-NFR48)

**Scale & Complexity:**

- Primary domain: Full-stack B2B SaaS (self-hosted-first)
- Complexity level: High
- Estimated architectural components: 15+ (auth, RBAC middleware, campaign engine, idea engine, evaluation engine, notification service, search service, AI service, KPI aggregation, file storage, real-time events, background jobs, admin module, deployment infrastructure, monitoring)

### Technical Constraints & Dependencies

**Existing tech stack decisions (confirmed in PRD):**

- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand
- Backend: tRPC, Prisma, PostgreSQL 15+, Redis, BullMQ
- Real-time: Socket.io with Redis adapter
- Storage: S3-compatible (MinIO for self-hosted)
- Auth: NextAuth.js v5
- AI: pgvector for embeddings, local model (sentence-transformers/ONNX) as default

**Deployment constraints:**

- Must work as single Docker Compose command
- All configuration via environment variables (12-factor app)
- Auto-migrations on startup
- No external AI API keys required for core functionality (local model default)
- Target hardware: 4 vCPU, 8GB RAM, managed PostgreSQL

**Open-core constraint:**

- Community Edition (AGPLv3) must be self-contained — no phone-home, no feature-gating via external license server
- Enterprise features (Phase 4) isolated behind feature flags checked at build time or env var

### Cross-Cutting Concerns Identified

1. **RBAC Middleware** — Every tRPC procedure must check permissions via checkAccess(user, resource, action). Permission resolution: Global Role > Campaign/Channel membership > Org Unit/Audience scope. Must handle 12 role types with context-based permissions.

2. **State Machine Management** — Campaign and Idea lifecycles require explicit state machines with transition guards, side effects (notifications, KPI updates), and rollback capability. Consider XState or a lightweight custom pattern.

3. **Activity Logging** — Every significant action creates an ActivityLog entry for activity feeds, audit trail, and KPI computation. Must be non-blocking (async via event emitter or BullMQ).

4. **Notification Dispatch** — Events trigger multi-channel notifications (in-app + email). Notification frequency respects user preferences (immediate/daily/weekly). Must be decoupled from business logic via event system.

5. **Search Indexing** — PostgreSQL tsvector for full-text search. Search vectors auto-updated via database triggers. Ideas, campaigns, channels, and users are searchable.

6. **AI Embedding Pipeline** — Idea submissions trigger async embedding generation (BullMQ job). Embeddings stored in pgvector column. Similarity queries use vector distance. Entire pipeline is optional with fallback to tsvector search.

7. **KPI Aggregation** — Campaign cockpit metrics computed via scheduled BullMQ jobs (daily snapshots) plus real-time counters for lightweight metrics. Pre-aggregated data avoids expensive real-time queries.

8. **File Upload Management** — S3 pre-signed URLs for upload, file metadata in PostgreSQL. File type/size validation. Organized by entity type (campaigns/ideas/users).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript web application (B2B SaaS, self-hosted-first) based on project requirements. The PRD specifies: Next.js 14+, TypeScript, tRPC, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui, NextAuth.js v5.

### Starter Options Considered

| Option            | Stars       | Stack Match | Notes                                                                                             |
| ----------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------- |
| **create-t3-app** | ~28,500     | Exact match | Next.js + tRPC + Prisma + Auth.js + Tailwind. Modular CLI.                                        |
| create-next-app   | Official    | Partial     | Next.js + Tailwind only. Would need manual tRPC/Prisma/Auth setup.                                |
| Supastarter       | Paid ($349) | Good        | Multi-tenancy, RBAC, i18n built-in. But paid/proprietary — conflicts with AGPLv3 open-core model. |
| ChadNext          | ~2K         | Good        | Next.js + shadcn/ui + Prisma + Auth. Smaller community.                                           |
| Custom scaffold   | N/A         | Exact       | Full control but significant setup time for tRPC, Prisma, auth, Docker.                           |

### Selected Starter: create-t3-app (T3 Stack v7.40.0)

**Rationale for Selection:**

1. **Exact stack match** — T3 includes the full PRD-specified stack: Next.js (App Router), TypeScript, tRPC, Prisma, Auth.js v5, and Tailwind CSS
2. **Modular CLI** — Opt-in to each piece independently; we select exactly what we need
3. **End-to-end type safety** — Change a Prisma field, tRPC procedures auto-reflect, frontend gets compile-time errors
4. **Community & maintenance** — 28,500+ stars, actively maintained, MIT licensed (compatible with AGPLv3)
5. **Proven at scale** — Used by production apps with similar complexity profiles

**Initialization Command:**

```bash
npx create-t3-app@latest ignite \
  --trpc \
  --prisma \
  --nextAuth \
  --tailwind \
  --dbProvider postgresql \
  --appRouter \
  --CI
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- TypeScript strict mode (tsconfig with strict: true)
- Next.js App Router (not Pages Router)
- Node.js 20+ runtime

**Styling Solution:**

- Tailwind CSS with PostCSS configuration
- shadcn/ui added manually post-scaffold (compatible, not included in T3 CLI)

**Build Tooling:**

- Next.js built-in bundler (Turbopack for dev, Webpack for production)
- PostCSS for Tailwind processing
- TypeScript compilation via Next.js

**Testing Framework:**

- Not included by T3 — we add: Vitest (unit/integration), Playwright (E2E), per NFR38-NFR39

**Code Organization:**

- src/app/ for Next.js App Router pages
- src/server/ for tRPC routers and server-side logic
- src/lib/ for shared utilities
- prisma/ for schema and migrations

**Development Experience:**

- Hot reloading via Next.js dev server (Turbopack)
- tRPC type inference from server to client
- Prisma Studio for database exploration
- TypeScript language server for full IDE support

### What T3 Does NOT Provide (We Add)

| Component         | Solution                  | Rationale                               |
| ----------------- | ------------------------- | --------------------------------------- |
| Component library | shadcn/ui                 | PRD design system spec, Tailwind-based  |
| State management  | Zustand                   | Client-side UI state (sidebar, filters) |
| Server state      | TanStack Query (via tRPC) | Included in tRPC React integration      |
| Rich text editor  | TipTap                    | FR20 idea descriptions                  |
| Charts            | Recharts                  | FR51 bubble charts, FR16 KPI dashboards |
| Drag & drop       | dnd-kit                   | FR42 idea board, bucket management      |
| Real-time         | Socket.io + Redis adapter | FR55 notifications, activity feeds      |
| Background jobs   | BullMQ on Redis           | Async: email, KPI, similarity           |
| File storage      | S3 SDK (MinIO compatible) | FR20 file attachments                   |
| AI/Embeddings     | pgvector + ONNX Runtime   | FR62-FR65 semantic similarity           |
| Testing           | Vitest + Playwright       | NFR38-NFR39                             |
| Docker            | Docker Compose            | FR71 deployment                         |
| Monitoring        | prom-client               | NFR46 Prometheus metrics                |

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

1. RBAC middleware pattern (tRPC wrapper with 3-level resolution)
2. State machine implementation (custom transition map pattern)
3. Event system architecture (EventEmitter + BullMQ split)
4. AI service abstraction (provider pattern with 3 implementations)
5. Database schema approach (adopt existing with targeted refinements)

**Already Decided (Starter + PRD + Existing Docs):**

- Database: PostgreSQL 15+ with Prisma ORM
- Auth: NextAuth.js v5 (email/password + magic link)
- API: tRPC (type-safe RPC, no REST/GraphQL)
- Frontend state: TanStack Query (server) + Zustand (client)
- Styling: Tailwind CSS + shadcn/ui
- Real-time: Socket.io with Redis adapter
- Background jobs: BullMQ on Redis
- File storage: S3-compatible (MinIO for self-hosted)
- Deployment: Docker Compose
- Search: PostgreSQL tsvector with GIN indexes
- AI embeddings: pgvector + local ONNX model (sentence-transformers)

**Deferred Decisions (Post-MVP):**

- Multi-tenancy isolation strategy (Phase 4 — Innovation Spaces)
- SSO/SAML provider integration (Phase 4)
- BI connector architecture (Phase 4)
- Horizontal scaling strategy (when traffic warrants)
- CDN and edge caching strategy (when geographic distribution needed)

### Data Architecture

**Database:** PostgreSQL 15+ via Prisma ORM (decided by starter + PRD)

**Schema Approach:** Adopt existing docs/02-DATABASE-SCHEMA.md with targeted refinements:

- Add searchVector tsvector column to Idea, Campaign, Channel, User with GIN indexes and auto-update triggers
- Add embedding vector(384) column to Idea for pgvector (requires enabling pgvector extension)
- Add previousStatus field to Campaign and Idea for fast-track revert capability (FR14)
- Keep Campaign and Channel as separate models (explicit, avoids polymorphism) but share service-layer logic
- Add composite indexes for hot query paths: Idea(campaignId, status), Vote(ideaId, criterionId), EvaluationResponse(sessionId, evaluatorId, status), Notification(userId, isRead, createdAt)

**Caching Strategy:** Redis for session-scoped caching

- Permission resolution cache: 5-minute TTL per user-resource pair (avoids per-request DB queries for RBAC)
- KPI snapshots: daily BullMQ job writes pre-aggregated data to KpiSnapshot table (avoids real-time aggregation)
- No application-level query cache for MVP — Prisma + PostgreSQL connection pooling is sufficient at target scale (500 concurrent users)

**Migration Approach:** Prisma Migrate with auto-migration on startup

- Migrations run automatically during Docker container startup (before app accepts traffic)
- All migrations are forward-compatible — no destructive changes without explicit migration path
- Schema changes create new migration files (prisma migrate dev), never modify existing migrations

### Authentication & Security

**Authentication:** NextAuth.js v5 (Auth.js) — decided by starter

**Session Management:**

- JWT stored in httpOnly, Secure, SameSite=Lax cookies
- Redis-backed session store for server-side validation
- Session payload includes: userId, globalRoles[], orgUnitId

**Authorization Pattern:** tRPC middleware wrapper with 3-level resolution

```
Level 1: Global Role -> PLATFORM_ADMIN bypasses all checks
Level 2: Resource Role -> getResourceRole(userId, resourceId) with Redis cache (5-min TTL)
Level 3: Scope -> org unit membership, campaign audience, innovation space membership
```

**Implementation:**

- protectedProcedure = base middleware checking authentication (is user logged in?)
- requirePermission(action) = composable middleware checking authorization (can user do this action?)
- Permission definitions centralized in permissions.ts as a const map
- List endpoints use WHERE clause filtering (scope-based), not middleware blocking

**Security Middleware Stack:**

- CSRF protection on all state-changing endpoints (Next.js built-in)
- Rate limiting via Redis: 10 auth attempts/min/IP, configurable per-route API limits
- Input sanitization via Zod schemas on every tRPC procedure (type-safe by design)
- File upload validation: type whitelist, 50MB max, content-type verification
- HTTPS enforcement in production with HSTS headers
- CSP headers configured via Next.js security headers
- CORS restricted to configured allowed origins

### API & Communication Patterns

**API Layer:** tRPC with module-based router organization (decided by starter)

- Root router merges module routers: auth, user, admin, campaign, channel, idea, evaluation, notification, search, upload
- Each module router lives in src/server/trpc/routers/[module].ts
- Business logic extracted to service layer: src/server/services/[module].service.ts
- tRPC procedures call service functions — routers are thin dispatch layers

**Error Handling Standard:**

- Business errors: throw TRPCError with appropriate code (FORBIDDEN, NOT_FOUND, BAD_REQUEST)
- Validation errors: Zod schemas throw automatically with structured error details
- Unexpected errors: caught by tRPC error handler, logged with correlation ID, return generic 500 to client
- All errors logged as structured JSON with: correlationId, userId, procedure, error message, stack (dev only)

**Event System:** In-process EventEmitter + BullMQ async split

Synchronous (in-process EventEmitter):

- Activity logging (one DB insert, fast)
- Community graduation threshold checks (read cached metrics, compare)
- Real-time Socket.io event emission (in-memory, instant)

Asynchronous (BullMQ queues):

- Email notifications (rendering, SMTP delivery)
- AI embedding generation (CPU-intensive ONNX inference)
- Similarity recalculation (batch vector comparisons)
- KPI snapshot computation (daily scheduled job)

Event Type Safety:

- Typed EventMap interface defining all business events and their payloads
- Events named as entity.action: idea.submitted, campaign.phaseChanged, evaluation.requested
- Listeners registered at app startup in src/server/events/ directory

Why not Prisma middleware: Business events (idea submitted vs. idea status changed) require different side effects, but at the Prisma level both are update({ status }). Business events belong in the service layer, not the ORM layer.

### Frontend Architecture

**Component Architecture:**

- shadcn/ui as base design system (Tailwind-based, copy-paste, fully customizable)
- Feature-based component organization: src/components/campaigns/, src/components/ideas/, etc.
- Shared UI primitives in src/components/ui/ (shadcn/ui components)
- Layout components in src/components/layout/ (Shell, Sidebar, Header)

**State Management:**

- Server state: TanStack Query via tRPC React hooks (trpc.campaign.list.useQuery())
- Client state: Zustand stores for UI-only state (sidebar collapsed, active filters, idea board selection)
- Form state: React Hook Form + Zod for all forms (campaign wizard, idea submission, evaluation forms)
- URL state: Next.js App Router searchParams for filter/sort state (shareable URLs)

**Routing Strategy:** Next.js App Router with route groups

- (auth)/ — login, register (unauthenticated layout)
- (platform)/ — all authenticated routes (platform shell with sidebar + header)
- Dynamic routes: campaigns/[id], ideas/[id], campaigns/[id]/evaluate/[sessionId]
- Parallel routes for modals (idea detail overlay)

**Performance:**

- React Server Components for data-heavy pages (campaign list, idea list)
- Client Components only where interactivity required (forms, voting, real-time feeds)
- Optimistic updates on mutations (like, vote, comment) via TanStack Query
- Cursor-based pagination on all list views (infinite scroll with intersection observer)
- Image optimization via Next.js Image component

### Infrastructure & Deployment

**Deployment:** Docker Compose (primary), Kubernetes Helm chart (Phase 2)

**Docker Compose Services:**

- app — Next.js application (web + API + tRPC)
- worker — BullMQ job processor (email, KPI, similarity)
- redis — Cache, sessions, job queues, Socket.io adapter
- postgres — Database (optional — supports external managed PostgreSQL)
- minio — S3-compatible file storage (optional — supports external S3)

**Configuration:** 12-factor app via environment variables

- All config in .env file, documented in .env.example
- No runtime config files — everything via process.env
- Secrets never in source code or Docker image

**CI/CD:** GitHub Actions

- On PR: lint, typecheck, unit tests, integration tests
- On merge to main: build Docker image, push to registry, run E2E tests
- Releases: semantic versioning, changelog generation, Docker tag

**Monitoring:**

- /api/health — health check endpoint (DB, Redis, S3 connectivity)
- /api/metrics — Prometheus-format metrics (request latency, error rates, queue depths, active connections)
- Structured JSON logging to stdout (12-factor) — aggregated by whatever log system the operator uses
- Correlation IDs on all requests for distributed tracing

**Scaling Strategy (Post-MVP):**

- Horizontal: Run multiple app containers behind load balancer (Socket.io uses Redis adapter, sessions in Redis)
- Database: Read replicas for heavy read queries (KPI dashboards, idea lists)
- Jobs: Multiple worker containers processing BullMQ queues concurrently
- Not needed at MVP scale (500 concurrent users on single instance)

### AI Architecture

**Provider Pattern:** Three implementations behind AIProvider interface

| Provider        | When Used                    | Config                    |
| --------------- | ---------------------------- | ------------------------- |
| LocalAIProvider | Default — no API key needed  | AI_ENABLED=true (default) |
| OpenAIProvider  | Better quality, requires key | OPENAI_API_KEY=sk-...     |
| NullAIProvider  | AI fully disabled            | AI_ENABLED=false          |

**Embedding Pipeline:**

- Model: all-MiniLM-L6-v2 via ONNX Runtime (384-dimensional vectors)
- Storage: pgvector vector(384) column on Idea table
- Similarity: cosine distance via pgvector <=> operator
- Fallback: PostgreSQL tsvector full-text search when embeddings unavailable
- Trigger: BullMQ job on idea submission/update (async, non-blocking)
- OpenAI embeddings dimensionally reduced to 384 to match local model

**AI Feature Gating:**

- aiProvider.isAvailable() checked by frontend to show/hide AI features
- All AI endpoints gracefully return empty results when provider is NullAIProvider
- No feature is AI-dependent — every workflow works without AI, just with degraded capability

### State Machine Architecture

**Pattern:** Custom transition map with guards and side effects

**Campaign States:** DRAFT > SEEDING > SUBMISSION > DISCUSSION_VOTING > EVALUATION > CLOSED

**Idea States:** DRAFT > QUALIFICATION > COMMUNITY_DISCUSSION > HOT > EVALUATION > SELECTED_IMPLEMENTATION > IMPLEMENTED > ARCHIVED

**Implementation:**

- Transition maps defined as Record<Status, TransitionDef[]> in src/server/lib/state-machines/
- Each TransitionDef specifies: { to, guard, effects }
- Guards are async functions that validate preconditions
- Effects are event names emitted via EventBus after successful transition
- transitionCampaign() and transitionIdea() are the only functions that can change status — never direct prisma.update({ status })
- Idea transitions coupled to campaign state (ideas can't advance past campaign's current phase)

Why not XState: Adds ~50KB bundle, requires learning XState API, visual debugger not essential. Custom pattern is ~150 lines, fully testable with simple unit tests (given state X, input Y -> expect state Z, effects [...]), immediately understandable to any TypeScript developer.

### Decision Impact Analysis

**Implementation Sequence:**

1. Auth + RBAC middleware (Week 1-2) — blocks everything else
2. Prisma schema with refinements + pgvector setup (Week 1-2) — parallel with auth
3. State machine library (Week 3) — needed before campaign CRUD
4. Event bus + BullMQ worker setup (Week 3) — needed before any side effects
5. AI provider abstraction (Week 18-19) — after core features, before AI features
6. Docker Compose orchestration (Week 1, refined Week 20) — needed from Day 1

**Cross-Component Dependencies:**

- RBAC middleware -> used by every tRPC router
- State machines -> used by campaign service, idea service
- Event bus -> used by state machines (effects), services (activity logging), notification service
- AI provider -> used by similarity service, enrichment service, summarization service
- BullMQ worker -> processes events from notification queue, similarity queue, KPI queue
- Redis -> used by RBAC cache, Socket.io adapter, BullMQ, session store

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 8 areas where AI agents could make different choices if not specified.

### Naming Patterns

**Database Naming (Prisma conventions):**

- Models: PascalCase singular (Campaign, Idea, EvaluationSession)
- Fields: camelCase (campaignId, createdAt, isActive)
- Relations: camelCase with descriptive names (contributorId -> contributor, coAuthoredIdeas)
- Enums: PascalCase name, SCREAMING_SNAKE values (CampaignStatus.DISCUSSION_VOTING)
- Indexes: Prisma auto-generates names — don't override unless custom composite
- Example: @@index([campaignId, status]) not @@index([campaignId, status], name: "idx_idea_campaign_status")

**tRPC API Naming:**

- Router names: camelCase singular (campaign, idea, evaluation)
- Procedure names: camelCase verb-first (getById, create, list, updateStatus)
- Nested routers: dot notation (partner.orgs.list, partner.useCases.create)
- Input schemas: camelCase with descriptive suffix (campaignCreateInput, ideaListInput)
- No REST-style naming — tRPC procedures are function calls, not HTTP endpoints

**Code Naming:**

- Components: PascalCase (CampaignCard, IdeaBoardTable, EvaluationScorecard)
- Component files: PascalCase matching component name (CampaignCard.tsx)
- Hooks: camelCase with use prefix (useCampaignFilters, useIdeaBoard)
- Utilities: camelCase (formatDate, calculateWeightedScore)
- Utility files: camelCase (formatters.ts, permissions.ts)
- Constants: SCREAMING_SNAKE (MAX_FILE_SIZE, DEFAULT_PAGE_SIZE)
- Types/Interfaces: PascalCase with no prefix (CampaignDetail, not ICampaignDetail)
- Zustand stores: camelCase with .store.ts suffix (ui.store.ts, filter.store.ts)
- Service files: camelCase with .service.ts suffix (campaign.service.ts)
- tRPC routers: camelCase with .ts in routers/ (campaign.ts, idea.ts)

**CSS/Styling:**

- No custom CSS classes — Tailwind utility classes only
- shadcn/ui component variants via cva (class-variance-authority)
- No inline styles except in rare dynamic cases (chart colors, banner gradients)
- Color references always use design tokens (text-primary-600, not text-indigo-600)

### Structure Patterns

**Project Organization:**

```
src/
  app/                    # Next.js App Router pages
    (auth)/               # Unauthenticated routes
    (platform)/           # Authenticated routes (sidebar + header shell)
      campaigns/
      ideas/
      ...
    api/
      trpc/[trpc]/        # tRPC handler
      health/             # Health check endpoint
      metrics/            # Prometheus metrics
  server/                 # Server-side code (NEVER imported from client)
    trpc/
      router.ts           # Root router
      context.ts          # tRPC context
      routers/            # Module routers (thin dispatch)
    services/             # Business logic (thick services)
    lib/                  # Server utilities (auth, prisma, redis, permissions, s3)
    events/               # Event listeners and event bus
    jobs/                 # BullMQ job processors
  components/             # React components
    ui/                   # shadcn/ui base components
    layout/               # Shell, Sidebar, Header
    campaigns/            # Campaign-specific components
    ideas/                # Idea-specific components
    evaluation/           # Evaluation-specific components
    shared/               # Cross-feature components (RichTextEditor, FileUpload)
  hooks/                  # Custom React hooks
  lib/                    # Client utilities (trpc client, utils, constants)
  stores/                 # Zustand stores
  types/                  # Shared TypeScript types
prisma/
  schema.prisma           # Database schema
  migrations/             # Migration files
  seed.ts                 # Seed data
```

**Test Organization:** Co-located with source

- Unit tests: [file].test.ts next to source file
- Integration tests: src/server/services/**tests**/campaign.service.test.ts
- E2E tests: e2e/ directory at project root
- Test fixtures: src/server/services/**tests**/fixtures/

**File Rules:**

- One component per file (exception: small helper components used only by parent)
- Max 300 lines per file — split if longer
- Named exports preferred (exception: Next.js page/layout default exports)
- No barrel exports (index.ts re-exporting everything) — import directly from source

### Format Patterns

**tRPC Response Format:**

- Queries return data directly (TanStack Query wraps with loading/error states)
- Mutations return the created/updated entity
- List queries return: { items: T[], nextCursor?: string } for cursor pagination
- No custom response wrappers — tRPC + TanStack Query handles this
- Errors thrown as TRPCError with appropriate code

**Error Format (tRPC errors):**

- Never expose stack traces to client
- Use specific codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR
- Zod validation errors automatically formatted by tRPC with field-level details

**Date Handling:**

- Store as DateTime in Prisma (PostgreSQL timestamptz)
- Transport as ISO 8601 strings in tRPC responses
- Display using date-fns for formatting (lightweight, tree-shakeable)
- All dates in UTC on server; convert to user timezone on client
- No moment.js — use date-fns exclusively

**ID Format:**

- Prisma @default(cuid()) for all entity IDs
- CUIDs are URL-safe, sortable, and globally unique
- Never use auto-increment integers for public-facing IDs

### Communication Patterns

**Event System:**

- Event names: entity.action format (idea.submitted, campaign.phaseChanged)
- Event payloads: always include { entity, actor, timestamp, metadata? }
- Events are fire-and-forget for async work — service layer doesn't await async effects
- Synchronous effects (activity log, graduation check) complete before returning to caller
- All event types defined in src/server/events/types.ts

**Real-time (Socket.io):**

- Room naming: campaign:{id}, idea:{id}, user:{userId}
- Event naming: entity:action format (idea:submitted, notification:new)
- Payload includes only what the client needs to update (not full entity)
- Client joins rooms on page mount, leaves on unmount
- Server emits to rooms, never to individual sockets (except user notifications)

**State Management (Zustand):**

- Stores contain only client-side UI state — never cache server data (that's TanStack Query's job)
- Action names: verb-first camelCase (toggleSidebar, setActiveFilter, clearSelection)
- Stores are small and focused — one store per concern, not one global store
- Use persist middleware only for user preferences (sidebar state, view mode)

### Process Patterns

**Error Handling:**

- Server: catch in service layer, throw TRPCError. Never swallow errors silently.
- Client: TanStack Query onError callbacks for mutation feedback. Error boundaries for unexpected crashes.
- User-facing errors: toast notifications via sonner (shadcn/ui default)
- Logged errors: structured JSON with correlationId, userId, procedure name

**Loading States:**

- Use TanStack Query's isLoading, isFetching, isError — don't create custom loading state
- Skeleton loaders for initial page loads (shimmer animation)
- Inline spinners for mutations (button loading state)
- Optimistic updates for low-risk mutations (like, vote, follow)
- No full-page loading spinners — always show skeleton of the target layout

**Form Handling:**

- React Hook Form + Zod schema for all forms
- Validation schema shared between client and server (import Zod schema in both)
- Client-side validation runs on submit (not on every keystroke)
- Server-side validation always runs (never trust client)
- Form errors displayed inline below fields, not in toasts

**Pagination:**

- Cursor-based pagination on all list endpoints
- Page size default: 20, configurable per-endpoint
- Infinite scroll with intersection observer for idea lists
- Traditional page numbers for admin tables (users, org units)
- Cursor is the id of the last item (CUID is sortable)

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow the naming conventions exactly — PascalCase components, camelCase functions, SCREAMING_SNAKE constants
2. Put business logic in services (src/server/services/), never in tRPC routers
3. Use requirePermission() middleware on every tRPC procedure that accesses data
4. Use transitionCampaign()/transitionIdea() for status changes — never direct prisma.update({ status })
5. Emit events via EventBus for all business events — never call notification/logging services directly from routers
6. Use Zod schemas for all input validation — never validate manually
7. Return cursor-paginated results from list endpoints — never offset pagination
8. Use TypeScript strict mode — zero any, zero @ts-ignore

**Pattern Enforcement:**

- ESLint rules enforce naming conventions and import restrictions
- TypeScript strict mode catches type violations at compile time
- CI pipeline blocks PRs with lint errors, type errors, or test failures
- Code review (human or AI) checks pattern compliance before merge

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ignite/
├── .github/workflows/
│   ├── ci.yml                        # Lint, typecheck, unit/integration tests on PR
│   ├── e2e.yml                       # Playwright E2E tests on merge to main
│   └── release.yml                   # Docker build, tag, changelog on release
├── docker/
│   ├── Dockerfile                    # Multi-stage build (deps > build > runtime)
│   ├── Dockerfile.worker             # BullMQ worker container
│   └── docker-compose.yml            # app + worker + redis + postgres + minio
├── e2e/
│   ├── campaigns.spec.ts
│   ├── ideas.spec.ts
│   ├── auth.spec.ts
│   └── fixtures/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/assets/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (platform)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── board/page.tsx
│   │   │   │       └── evaluate/[sessionId]/page.tsx
│   │   │   ├── channels/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── ideas/[id]/page.tsx
│   │   │   ├── explore/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── users/page.tsx
│   │   │   │   ├── org-units/page.tsx
│   │   │   │   ├── groups/page.tsx
│   │   │   │   ├── notifications/page.tsx
│   │   │   │   ├── customization/page.tsx
│   │   │   │   └── system/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── api/
│   │       ├── trpc/[trpc]/route.ts
│   │       ├── health/route.ts
│   │       ├── metrics/route.ts
│   │       └── auth/[...nextauth]/route.ts
│   ├── server/
│   │   ├── trpc/
│   │   │   ├── router.ts
│   │   │   ├── context.ts
│   │   │   ├── trpc.ts
│   │   │   └── routers/
│   │   │       ├── auth.ts
│   │   │       ├── user.ts
│   │   │       ├── admin.ts
│   │   │       ├── campaign.ts
│   │   │       ├── channel.ts
│   │   │       ├── idea.ts
│   │   │       ├── evaluation.ts
│   │   │       ├── notification.ts
│   │   │       ├── search.ts
│   │   │       └── upload.ts
│   │   ├── services/
│   │   │   ├── campaign.service.ts
│   │   │   ├── channel.service.ts
│   │   │   ├── idea.service.ts
│   │   │   ├── evaluation.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── kpi.service.ts
│   │   │   ├── similarity.service.ts
│   │   │   ├── ai.service.ts
│   │   │   └── __tests__/
│   │   │       ├── campaign.service.test.ts
│   │   │       ├── idea.service.test.ts
│   │   │       ├── evaluation.service.test.ts
│   │   │       └── fixtures/
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── redis.ts
│   │   │   ├── auth.ts
│   │   │   ├── permissions.ts
│   │   │   ├── s3.ts
│   │   │   ├── socket.ts
│   │   │   └── logger.ts
│   │   ├── lib/state-machines/
│   │   │   ├── campaign-transitions.ts
│   │   │   ├── idea-transitions.ts
│   │   │   └── transition-engine.ts
│   │   ├── events/
│   │   │   ├── event-bus.ts
│   │   │   ├── types.ts
│   │   │   └── listeners/
│   │   │       ├── activity.listener.ts
│   │   │       ├── notification.listener.ts
│   │   │       ├── graduation.listener.ts
│   │   │       └── kpi.listener.ts
│   │   ├── jobs/
│   │   │   ├── worker.ts
│   │   │   ├── email.job.ts
│   │   │   ├── similarity.job.ts
│   │   │   ├── kpi-snapshot.job.ts
│   │   │   └── queues.ts
│   │   └── ai/
│   │       ├── provider.ts
│   │       ├── local.provider.ts
│   │       ├── openai.provider.ts
│   │       ├── null.provider.ts
│   │       └── factory.ts
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base
│   │   ├── layout/
│   │   │   ├── PlatformShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignWizard.tsx
│   │   │   ├── CampaignCockpit.tsx
│   │   │   ├── CampaignHeader.tsx
│   │   │   └── CampaignLifecycleBar.tsx
│   │   ├── ideas/
│   │   │   ├── IdeaCard.tsx
│   │   │   ├── IdeaForm.tsx
│   │   │   ├── IdeaDetail.tsx
│   │   │   ├── IdeaBoard.tsx
│   │   │   ├── IdeaDiscussion.tsx
│   │   │   ├── VotingWidget.tsx
│   │   │   └── GraduationProgress.tsx
│   │   ├── evaluation/
│   │   │   ├── ScorecardForm.tsx
│   │   │   ├── PairwiseComparison.tsx
│   │   │   ├── EvaluationResults.tsx
│   │   │   ├── BubbleChart.tsx
│   │   │   └── ShortlistManager.tsx
│   │   ├── shared/
│   │   │   ├── RichTextEditor.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── UserPicker.tsx
│   │   │   ├── TagInput.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── SkeletonLoader.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── charts/
│   │       ├── KpiCard.tsx
│   │       ├── FunnelChart.tsx
│   │       ├── ActivityChart.tsx
│   │       └── ProgressBar.tsx
│   ├── hooks/
│   │   ├── usePermission.ts
│   │   ├── useDebounce.ts
│   │   ├── useIntersectionObserver.ts
│   │   └── useSocket.ts
│   ├── lib/
│   │   ├── trpc.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── stores/
│   │   ├── ui.store.ts
│   │   ├── filter.store.ts
│   │   └── ideaBoard.store.ts
│   └── types/
│       ├── campaign.ts
│       ├── idea.ts
│       ├── evaluation.ts
│       └── index.ts
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── package.json
└── README.md
```

### Architectural Boundaries

**API Boundary:**

- All client-server communication goes through tRPC (src/app/api/trpc/[trpc]/route.ts)
- No direct Prisma calls from client components — always through tRPC procedures
- No server code imported in client components — src/server/ is server-only
- File uploads go through pre-signed S3 URLs (client to S3 direct, not through API)

**Service Boundary:**

- tRPC routers are thin dispatch — validate input, check permissions, call service, return result
- Services contain all business logic — no business logic in routers or components
- Services call Prisma directly — no repository pattern (Prisma IS the repository)
- Services emit events via EventBus — never call notification/logging directly

**State Machine Boundary:**

- Status changes ONLY through transitionCampaign()/transitionIdea() functions
- Direct prisma.update({ status }) is FORBIDDEN — always go through state machine
- State machines live in src/server/lib/state-machines/ — imported by services only

**Event Boundary:**

- EventBus is the single point of cross-cutting concern dispatch
- Listeners in src/server/events/listeners/ handle activity logging, notifications, graduation, KPI
- BullMQ queues handle async work — listeners add jobs, worker processes them

**AI Boundary:**

- AI provider accessed via singleton from factory.ts — never instantiate directly
- AI calls are always async and non-blocking (via BullMQ for embeddings, inline for co-pilot)
- Frontend checks aiProvider.isAvailable() to conditionally render AI features
- AI failure never breaks core platform functionality

### Requirements to Structure Mapping

| FR Category               | tRPC Router                | Service                              | Components                         | Key Files                                 |
| ------------------------- | -------------------------- | ------------------------------------ | ---------------------------------- | ----------------------------------------- |
| User Management (FR1-FR7) | auth.ts, user.ts, admin.ts | (NextAuth handles)                   | layout/Header, admin/users         | lib/auth.ts, lib/permissions.ts           |
| Campaigns (FR8-FR17)      | campaign.ts                | campaign.service.ts                  | campaigns/\*                       | state-machines/campaign-transitions.ts    |
| Channels (FR18-FR19)      | channel.ts                 | channel.service.ts                   | (shares campaign components)       |                                           |
| Ideas (FR20-FR28)         | idea.ts                    | idea.service.ts                      | ideas/\*                           | state-machines/idea-transitions.ts        |
| Community (FR29-FR35)     | idea.ts (nested)           | idea.service.ts                      | ideas/IdeaDiscussion, VotingWidget |                                           |
| Idea Board (FR36-FR42)    | idea.ts (nested)           | idea.service.ts                      | ideas/IdeaBoard                    | stores/ideaBoard.store.ts                 |
| Evaluation (FR43-FR54)    | evaluation.ts              | evaluation.service.ts                | evaluation/\*                      |                                           |
| Notifications (FR55-FR58) | notification.ts            | notification.service.ts              | layout/Header (bell)               | events/listeners/notification.listener.ts |
| Search (FR59-FR61)        | search.ts                  | search.service.ts                    | layout/Header (Cmd+K)              |                                           |
| AI (FR62-FR65)            | (internal)                 | ai.service.ts, similarity.service.ts | ideas/IdeaForm (co-pilot)          | ai/\*.provider.ts, jobs/similarity.job.ts |
| Admin (FR66-FR70)         | admin.ts                   |                                      | admin/\*                           |                                           |
| Deployment (FR71-FR75)    |                            |                                      |                                    | docker/\*, api/health, api/metrics        |

### Cross-Cutting Concerns Mapping

| Concern              | Location                                             | Triggered By                       |
| -------------------- | ---------------------------------------------------- | ---------------------------------- |
| RBAC                 | src/server/lib/permissions.ts                        | tRPC middleware on every procedure |
| Activity Logging     | src/server/events/listeners/activity.listener.ts     | EventBus on business events        |
| Notifications        | src/server/events/listeners/notification.listener.ts | EventBus to BullMQ email queue     |
| Community Graduation | src/server/events/listeners/graduation.listener.ts   | EventBus on comment/vote/like/view |
| KPI Snapshots        | src/server/jobs/kpi-snapshot.job.ts                  | BullMQ daily cron job              |
| Search Indexing      | PostgreSQL triggers (auto-update tsvector)           | Database-level on insert/update    |
| AI Embeddings        | src/server/jobs/similarity.job.ts                    | BullMQ on idea create/update       |
| Real-time Events     | src/server/events/listeners/\*.ts                    | EventBus to Socket.io emit         |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices proven together in T3 Stack ecosystem (28,500+ stars). PostgreSQL + pgvector, Redis + BullMQ + Socket.io, Prisma + tsvector, ONNX Runtime + Node.js — all verified compatible. No version conflicts.

**Pattern Consistency:** Naming conventions align with T3/Prisma/Next.js defaults. tRPC middleware for RBAC is idiomatic. EventEmitter + BullMQ split follows Node.js best practices. Custom state machine is simpler than XState but follows same conceptual model. No contradictory patterns.

**Structure Alignment:** Directory structure matches T3 scaffold with additions for services, events, jobs, AI, state machines. Server/client boundary enforced by src/server/ separation. Feature-based components align with App Router co-location.

### Requirements Coverage Validation

**Functional Requirements:** 75/75 FRs architecturally supported. Zero gaps. Every FR mapped to specific tRPC router, service, and component directory.

**Non-Functional Requirements:** 48/48 NFRs architecturally supported. Zero gaps. Performance (caching, pagination, async jobs), Security (RBAC, CSRF, rate limiting), Scalability (Redis adapter, cursor pagination), Accessibility (Radix-based shadcn/ui), Reliability (Prisma transactions, job retry), Maintainability (Vitest, TypeScript strict, CI), Observability (health, Prometheus, structured logging).

### Implementation Readiness Validation

**Decision Completeness:** 5 critical decisions documented with code patterns. All versions verified. Starter command ready. Implementation sequence defined.

**Structure Completeness:** 80+ files explicitly defined. Every router, service, component, and utility named. Test organization specified. Docker and CI/CD defined.

**Pattern Completeness:** 8 naming areas, 8 enforcement guidelines, good/bad code examples, anti-patterns documented.

### Gap Analysis Results

**Critical Gaps:** 0

**Important Gaps (non-blocking):**

1. Bradley-Terry pairwise ranking algorithm implementation reference — address in Week 12
2. Email template rendering approach (React Email vs MJML vs plain text) — address in Week 16
3. Seed data structure matching demo scenarios — address in Week 20

**Nice-to-Have (defer to post-MVP):**

1. OpenAPI documentation generation from tRPC
2. Storybook component documentation
3. Database migration CI safety checks

### Architecture Completeness Checklist

- [x] Project context thoroughly analyzed (75 FRs, 48 NFRs, 12 capability areas)
- [x] Scale and complexity assessed (High)
- [x] Technical constraints identified (self-hosted, Docker, env vars, optional AI)
- [x] Cross-cutting concerns mapped (8 concerns with locations and triggers)
- [x] Critical decisions documented with code patterns (RBAC, state machines, events, AI, schema)
- [x] Technology stack fully specified with verified versions
- [x] Integration patterns defined (tRPC, EventBus, BullMQ, Socket.io)
- [x] Performance considerations addressed (caching, pagination, async jobs, KPI snapshots)
- [x] Naming conventions established (database, API, code, CSS)
- [x] Structure patterns defined (project organization, test co-location, file rules)
- [x] Communication patterns specified (events, Socket.io rooms, state management)
- [x] Process patterns documented (error handling, loading states, forms, pagination)
- [x] Complete directory structure defined (80+ files)
- [x] Component boundaries established (API, service, state machine, event, AI)
- [x] Integration points mapped (cross-cutting concerns table)
- [x] Requirements to structure mapping complete (FR-to-directory table)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** High
**FR Coverage:** 75/75 (100%)
**NFR Coverage:** 48/48 (100%)
**Critical Gaps:** 0

**First Implementation Step:**

```bash
npx create-t3-app@latest ignite --trpc --prisma --nextAuth --tailwind --dbProvider postgresql --appRouter --CI
```

Then: Auth + RBAC middleware (Week 1-2) > State machines + Event bus (Week 3) > Campaign CRUD (Week 4-7)
