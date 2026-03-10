---
project_name: "ignite"
user_name: "Cvsilab"
date: "2026-03-10"
sections_completed:
  [
    "technology_stack",
    "typescript_rules",
    "framework_rules",
    "testing_rules",
    "code_quality_style",
    "workflow_rules",
    "critical_rules",
    "usage_guidelines",
  ]
status: "complete"
rule_count: 127
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Category     | Technology               | Details                                              |
| ------------ | ------------------------ | ---------------------------------------------------- |
| Starter      | create-t3-app v7.40.0    | Next.js + tRPC + Prisma + Auth.js + Tailwind         |
| Framework    | Next.js 14+              | App Router (NOT Pages Router), Turbopack dev         |
| Language     | TypeScript               | strict: true, zero `any`, zero `@ts-ignore`          |
| API          | tRPC                     | Type-safe RPC, module-based routers                  |
| ORM          | Prisma                   | PostgreSQL provider, CUID IDs, auto-migrations       |
| Database     | PostgreSQL 15+           | pgvector extension, tsvector + GIN indexes           |
| Auth         | Auth.js v5 (NextAuth.js) | JWT httpOnly cookies, Redis session store            |
| Styling      | Tailwind CSS + shadcn/ui | cva for variants, Tailwind utility classes ONLY      |
| Server State | TanStack Query           | Via tRPC React hooks (trpc.\*.useQuery())            |
| Client State | Zustand                  | UI-only state, never cache server data               |
| Forms        | React Hook Form + Zod    | Shared schemas between client and server             |
| Rich Text    | TipTap                   | Idea descriptions (FR20)                             |
| Charts       | Recharts                 | KPI dashboards, bubble charts                        |
| Drag & Drop  | dnd-kit                  | Idea board, bucket management                        |
| Real-time    | Socket.io                | Redis adapter for horizontal scaling                 |
| Jobs         | BullMQ                   | On Redis — email, KPI, similarity, embeddings        |
| Cache        | Redis                    | RBAC cache (5-min TTL), sessions, Socket.io, BullMQ  |
| Storage      | S3-compatible (MinIO)    | Pre-signed URLs, 50MB max, type whitelist            |
| AI           | ONNX Runtime             | all-MiniLM-L6-v2 (384-dim), pgvector cosine distance |
| Dates        | date-fns                 | NO moment.js — date-fns exclusively                  |
| Toasts       | sonner                   | shadcn/ui default notification library               |
| Monitoring   | prom-client              | Prometheus-format metrics                            |
| Testing      | Vitest + Playwright      | Unit/integration + E2E                               |
| Runtime      | Node.js 20+              | Docker Compose: app, worker, redis, postgres, minio  |
| CI/CD        | GitHub Actions           | Lint, typecheck, tests on PR; Docker build on merge  |

## Critical Implementation Rules

### TypeScript Rules

- **Strict mode enforced** — `strict: true` in tsconfig. Zero `any`, zero `as any`, zero `@ts-ignore`, zero `@ts-expect-error`
- **Named exports only** — Exception: Next.js page/layout files require `export default`
- **No barrel exports** — Import directly from source file, never create `index.ts` re-export files
- **All props/params typed** — No implicit `any`, no untyped function parameters
- **Zod for all runtime validation** — Shared between client (React Hook Form) and server (tRPC input). Never validate manually
- **Enums as Prisma enums** — PascalCase name, SCREAMING_SNAKE values (`CampaignStatus.DISCUSSION_VOTING`)
- **CUIDs for all IDs** — `@default(cuid())` in Prisma. Never auto-increment integers for public-facing IDs
- **Dates as ISO 8601 strings** — UTC on server, user timezone on client. Use `date-fns` for formatting, never `moment.js`
- **Async/await everywhere** — No raw Promise chains. All async errors caught explicitly
- **Error handling** — Throw `TRPCError` with specific codes (FORBIDDEN, NOT_FOUND, BAD_REQUEST). Never swallow errors silently. Never expose stack traces to client
- **No `console.log`** — Use structured logger (`src/server/lib/logger.ts`) with correlationId, userId, procedure name
- **Import boundaries** — `src/server/` is server-only. Never import server code in client components. Client imports from `src/lib/`, `src/hooks/`, `src/stores/`, `src/components/`
- **Type definitions** — PascalCase, no `I` prefix (`CampaignDetail`, not `ICampaignDetail`). Shared types in `src/types/`
- **Constants** — SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE`). Defined in `src/lib/constants.ts`

### Framework Rules (Next.js + tRPC + Prisma)

**Next.js App Router:**

- Route groups: `(auth)/` for unauthenticated, `(platform)/` for authenticated routes
- React Server Components for data-heavy pages (campaign list, idea list)
- Client Components only where interactivity required (forms, voting, real-time feeds)
- Dynamic routes: `campaigns/[id]`, `ideas/[id]`, `campaigns/[id]/evaluate/[sessionId]`
- URL state via `searchParams` for filter/sort (shareable URLs)
- Image optimization via `next/image` component
- No custom API routes except: `api/trpc/[trpc]`, `api/health`, `api/metrics`, `api/auth/[...nextauth]`

**tRPC Architecture:**

- Root router merges module routers: auth, user, admin, campaign, channel, idea, evaluation, notification, search, upload
- Each router in `src/server/trpc/routers/[module].ts` — routers are THIN dispatch layers
- ALL business logic in `src/server/services/[module].service.ts` — never in routers
- `protectedProcedure` = authentication check (is user logged in?)
- `requirePermission(action)` = composable authorization middleware on EVERY data-access procedure
- List endpoints return `{ items: T[], nextCursor?: string }` — cursor-based pagination only
- Mutations return the created/updated entity
- No custom response wrappers — tRPC + TanStack Query handles loading/error states
- Input schemas: camelCase with suffix (`campaignCreateInput`, `ideaListInput`)

**Prisma:**

- Models: PascalCase singular (`Campaign`, `Idea`, `EvaluationSession`)
- Fields: camelCase (`campaignId`, `createdAt`, `isActive`)
- Relations: camelCase descriptive (`contributorId` -> `contributor`, `coAuthoredIdeas`)
- Let Prisma auto-generate index names — don't override
- Migrations: always forward-compatible, never modify existing migrations
- Auto-migration on Docker startup before app accepts traffic
- Prisma IS the repository — no repository pattern layer
- `searchVector` tsvector column on Idea, Campaign, Channel, User with GIN indexes

**State Management:**

- Server state: TanStack Query via tRPC React hooks (`trpc.campaign.list.useQuery()`)
- Client state: Zustand stores for UI-only state (sidebar, filters, selections) — NEVER cache server data in Zustand
- Form state: React Hook Form + Zod — validation on submit, not per-keystroke
- Zustand stores: small, focused, one per concern. Use `persist` middleware only for user preferences
- Optimistic updates on low-risk mutations (like, vote, follow) via TanStack Query

**Loading & Error States:**

- Skeleton loaders for initial page loads (shimmer animation) — no full-page spinners
- Inline spinners for mutations (button loading state)
- Error boundaries for unexpected crashes
- Toast notifications via sonner for mutation feedback
- Form errors displayed inline below fields, not in toasts

### Testing Rules

**Test Organization:**

- Unit tests: co-located as `[file].test.ts` next to source file
- Service integration tests: `src/server/services/__tests__/[module].service.test.ts`
- Test fixtures: `src/server/services/__tests__/fixtures/`
- E2E tests: `e2e/` directory at project root (Playwright)
- Test config: `vitest.config.ts` (unit/integration), `playwright.config.ts` (E2E)

**Test Structure:**

- Vitest for unit and integration tests
- Playwright for end-to-end tests
- 80%+ code coverage target (NFR38)
- Every new feature must include tests

**Unit Tests:**

- Test service functions in isolation
- Mock Prisma client, Redis, and external services
- Test state machine transitions: given state X, input Y -> expect state Z, effects [...]
- Test Zod schemas: valid input passes, invalid input throws with correct field errors
- Test permission checks: authorized user passes, unauthorized throws FORBIDDEN

**Integration Tests:**

- Test tRPC procedures end-to-end with test database
- Use fixtures for seed data (realistic campaign, idea, user scenarios)
- Test RBAC middleware with different role combinations
- Test event emission: action triggers expected events with correct payloads

**E2E Tests (Playwright):**

- Test critical user journeys: login, create campaign, submit idea, evaluate, vote
- Use page object model pattern
- Run against Docker Compose test environment

**Testing Anti-Patterns:**

- Never test implementation details — test behavior and outputs
- Never mock what you don't own (mock Prisma, not internal service functions)
- Never skip tests with `.skip` in committed code
- Never test third-party library behavior (shadcn/ui, TanStack Query)

### Code Quality & Style Rules

**Naming Conventions:**

- Components: PascalCase files matching component name (`CampaignCard.tsx`)
- Hooks: camelCase with `use` prefix (`useCampaignFilters.ts`)
- Utilities: camelCase (`formatters.ts`, `permissions.ts`)
- Zustand stores: camelCase with `.store.ts` suffix (`ui.store.ts`, `filter.store.ts`)
- Services: camelCase with `.service.ts` suffix (`campaign.service.ts`)
- tRPC routers: camelCase in `routers/` (`campaign.ts`, `idea.ts`)
- Router names: camelCase singular (`campaign`, `idea`, `evaluation`)
- Procedure names: camelCase verb-first (`getById`, `create`, `list`, `updateStatus`)
- No REST-style naming — tRPC procedures are function calls, not HTTP endpoints

**File Rules:**

- One component per file (exception: small helpers used only by parent)
- Max 300 lines per file — split if longer
- No unused imports or variables
- No barrel exports (`index.ts` re-exporting) — import directly from source

**Styling Rules:**

- Tailwind utility classes ONLY — no custom CSS classes
- shadcn/ui component variants via `cva` (class-variance-authority)
- No inline styles except rare dynamic cases (chart colors, banner gradients)
- Color references use design tokens (`text-primary-600`, not `text-indigo-600`)

**Code Organization:**

- Feature-based component organization: `src/components/campaigns/`, `src/components/ideas/`
- Shared UI primitives in `src/components/ui/` (shadcn/ui)
- Layout components in `src/components/layout/` (Shell, Sidebar, Header)
- Cross-feature shared components in `src/components/shared/` (RichTextEditor, FileUpload)
- Custom hooks in `src/hooks/`
- Zustand stores in `src/stores/`
- Shared types in `src/types/`

**Documentation:**

- No excessive comments — code should be self-documenting
- JSDoc only for complex utility functions or non-obvious logic
- No auto-generated documentation blocks on every function

### Development Workflow Rules

**Git Conventions:**

- Commit messages: conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`)
- One logical change per commit
- Run tests before committing
- Push after every commit — no dangling local commits
- Never commit `.env` files, credentials, secrets, `node_modules/`, or build artifacts

**CI/CD Pipeline:**

- On PR: lint + typecheck + unit tests + integration tests
- On merge to main: build Docker image, push to registry, run E2E tests
- Releases: semantic versioning, changelog generation, Docker tag
- CI blocks PRs with lint errors, type errors, or test failures

**Deployment:**

- Docker Compose with 5 services: app, worker, redis, postgres, minio
- All configuration via environment variables (12-factor app)
- `.env.example` documents all required env vars — never hardcode secrets
- Auto-migrations run on container startup before accepting traffic
- Multi-stage Dockerfile: deps > build > runtime
- Separate `Dockerfile.worker` for BullMQ job processor

**Environment Variables:**

- All config via `process.env` — no runtime config files
- Secrets never in source code or Docker image
- `AI_ENABLED=true` (default) for local AI, `OPENAI_API_KEY=sk-...` for OpenAI, `AI_ENABLED=false` to disable
- Database, Redis, S3 connection strings via env vars

### Critical Don't-Miss Rules

**Architecture Enforcement (MOST CRITICAL):**

- Status changes ONLY through `transitionCampaign()`/`transitionIdea()` — direct `prisma.update({ status })` is FORBIDDEN
- `requirePermission(action)` middleware on EVERY tRPC procedure that accesses data
- Business logic ONLY in services (`src/server/services/`) — NEVER in tRPC routers
- Events emitted via EventBus for ALL business events — never call notification/logging services directly
- Cursor-based pagination on ALL list endpoints — NEVER offset pagination
- Server code (`src/server/`) NEVER imported from client components

**State Machine Rules:**

- Campaign states: DRAFT > SEEDING > SUBMISSION > DISCUSSION_VOTING > EVALUATION > CLOSED
- Idea states: DRAFT > QUALIFICATION > COMMUNITY_DISCUSSION > HOT > EVALUATION > SELECTED_IMPLEMENTATION > IMPLEMENTED > ARCHIVED
- Transition maps in `src/server/lib/state-machines/` as `Record<Status, TransitionDef[]>`
- Each TransitionDef: `{ to, guard, effects }` — guards are async precondition validators, effects are EventBus event names
- Idea transitions coupled to campaign state — ideas can't advance past campaign's current phase

**Event System Rules:**

- Synchronous (EventEmitter): activity logging, graduation threshold checks, Socket.io emission
- Asynchronous (BullMQ): email notifications, AI embedding generation, similarity recalculation, KPI snapshots
- Event names: `entity.action` format (`idea.submitted`, `campaign.phaseChanged`)
- Event payloads always include: `{ entity, actor, timestamp, metadata? }`
- Services are fire-and-forget for async work — never await async effects
- All event types defined in `src/server/events/types.ts`

**RBAC Rules:**

- 3-level permission resolution: Global Role > Resource Role > Scope
- PLATFORM_ADMIN bypasses all checks
- `getResourceRole(userId, resourceId)` with Redis cache (5-min TTL)
- Permission definitions centralized in `src/server/lib/permissions.ts` as const map
- List endpoints use WHERE clause filtering (scope-based), not middleware blocking

**AI Provider Rules:**

- 3 providers behind `AIProvider` interface: LocalAIProvider (ONNX), OpenAIProvider, NullAIProvider
- AI accessed via singleton from `src/server/ai/factory.ts` — never instantiate directly
- `aiProvider.isAvailable()` checked by frontend to show/hide AI features
- All AI endpoints gracefully return empty results when provider is NullAIProvider
- NO feature is AI-dependent — every workflow works without AI
- OpenAI embeddings dimensionally reduced to 384 to match local model
- Embedding trigger: BullMQ job on idea submission/update (async, non-blocking)

**Real-time Rules:**

- Socket.io room naming: `campaign:{id}`, `idea:{id}`, `user:{userId}`
- Event naming: `entity:action` format (`idea:submitted`, `notification:new`)
- Payload includes only what client needs to update — not full entity
- Client joins rooms on page mount, leaves on unmount
- Server emits to rooms, never to individual sockets (except user notifications)

**Security Rules:**

- CSRF protection on all state-changing endpoints
- Rate limiting via Redis: 10 auth attempts/min/IP, configurable per-route
- Input sanitization via Zod schemas on every tRPC procedure
- File upload: type whitelist, 50MB max, content-type verification
- HTTPS enforcement in production with HSTS headers
- CSP headers via Next.js security headers config
- CORS restricted to configured allowed origins
- JWT in httpOnly, Secure, SameSite=Lax cookies

**Anti-Patterns to AVOID:**

- No `moment.js` — use `date-fns` exclusively
- No offset pagination — cursor-based only
- No repository pattern — Prisma IS the repository
- No global Zustand store — one small store per concern
- No Prisma middleware for business events — events belong in service layer
- No XState — custom transition maps (~150 lines, fully testable)
- No full-page loading spinners — always skeleton loaders
- No inline `style={}` — Tailwind utility classes only
- No `console.log` — structured logger only
- No `any` / `as any` / `@ts-ignore` — TypeScript strict mode

---

## Project Directory Structure

```
src/
  app/                    # Next.js App Router pages
    (auth)/               # Unauthenticated routes (login, register)
    (platform)/           # Authenticated routes (sidebar + header shell)
      campaigns/, channels/, ideas/, explore/, tasks/, reports/, admin/, profile/
    api/
      trpc/[trpc]/        # tRPC handler
      health/             # Health check endpoint
      metrics/            # Prometheus metrics
      auth/[...nextauth]/ # Auth.js handler
  server/                 # Server-side code (NEVER imported from client)
    trpc/routers/         # Module routers (thin dispatch)
    services/             # Business logic (thick services)
    lib/                  # Server utilities (auth, prisma, redis, permissions, s3, logger)
    lib/state-machines/   # Campaign + idea transition maps
    events/               # Event bus, types, listeners/
    jobs/                 # BullMQ job processors
    ai/                   # AI provider pattern (provider, local, openai, null, factory)
  components/
    ui/                   # shadcn/ui base components
    layout/               # PlatformShell, Sidebar, Header, Breadcrumb
    campaigns/            # CampaignCard, CampaignWizard, CampaignCockpit, etc.
    ideas/                # IdeaCard, IdeaForm, IdeaBoard, IdeaDiscussion, VotingWidget, etc.
    evaluation/           # ScorecardForm, PairwiseComparison, EvaluationResults, etc.
    shared/               # RichTextEditor, FileUpload, UserPicker, TagInput, DataTable, etc.
    charts/               # KpiCard, FunnelChart, ActivityChart, ProgressBar
  hooks/                  # usePermission, useDebounce, useIntersectionObserver, useSocket
  lib/                    # Client utilities (trpc client, utils, constants)
  stores/                 # Zustand stores (ui.store.ts, filter.store.ts, ideaBoard.store.ts)
  types/                  # Shared TypeScript types
prisma/
  schema.prisma           # Database schema
  migrations/             # Migration files
  seed.ts                 # Seed data
docker/
  Dockerfile              # Multi-stage build (deps > build > runtime)
  Dockerfile.worker       # BullMQ worker container
  docker-compose.yml      # app + worker + redis + postgres + minio
e2e/                      # Playwright E2E tests
```

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Reference architecture.md for detailed patterns and code examples

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review periodically for outdated rules
- Remove rules that become obvious over time

**Last Updated:** 2026-03-10
