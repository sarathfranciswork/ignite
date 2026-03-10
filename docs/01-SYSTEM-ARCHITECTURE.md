# 01 — SYSTEM ARCHITECTURE

## Project Name: InnoFlow (Innovation Management Platform)

---

## 1. TECH STACK

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React 18+
- **Styling**: Tailwind CSS + CSS variables for theming
- **Component Library**: shadcn/ui as base, heavily customized
- **State Management**: Zustand (global) + React Query/TanStack Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Rich Text Editor**: TipTap (for idea descriptions, comments)
- **Charts**: Recharts (KPI dashboards, funnel charts, bubble charts)
- **Drag & Drop**: dnd-kit (Kanban boards, bucket management, idea boards)
- **Real-time**: Socket.io client (live notifications, activity feeds)
- **File Upload**: uploadthing or S3-presigned URLs

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes + tRPC (type-safe API layer)
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Search**: PostgreSQL full-text search (pg_trgm + tsvector) — migrate to Meilisearch/Typesense at scale
- **Caching**: Redis (sessions, rate limiting, notification queues)
- **Job Queue**: BullMQ on Redis (email sending, KPI computation, similarity calculations)
- **File Storage**: S3-compatible (AWS S3 / MinIO for self-hosted)
- **Email**: Resend or Nodemailer + SMTP
- **Auth**: NextAuth.js v5 (credentials, LDAP/SAML SSO, magic link)

### Infrastructure

- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: OpenTelemetry + Grafana (or Sentry for errors)
- **Deployment**: Vercel (frontend) + Railway/Fly.io (API + DB) OR self-hosted on K8s

---

## 2. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Web App      │  │  Mobile PWA  │  │  Browser Extensions      │  │
│  │  (Next.js)    │  │  (Next.js)   │  │  (Web Clipper)           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                  │                        │                │
└─────────┼──────────────────┼────────────────────────┼───────────────┘
          │                  │                        │
          ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes + tRPC Router                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │   │
│  │  │ Auth     │ │ Ideation │ │ Partner  │ │ Strategy      │  │   │
│  │  │ Module   │ │ Module   │ │ Module   │ │ Module        │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │   │
│  │  │ Eval     │ │ Project  │ │ Report   │ │ Notification  │  │   │
│  │  │ Module   │ │ Module   │ │ Module   │ │ Module        │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Middleware   │  │  Rate Limiter │  │  File Upload Handler    │  │
│  │  (Auth/RBAC)  │  │  (Redis)     │  │  (S3 Pre-signed)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │                  │                        │
          ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL   │  │  Redis       │  │  S3 / MinIO              │  │
│  │  (Primary DB) │  │  (Cache/     │  │  (File Storage)          │  │
│  │              │  │  Queue/       │  │                          │  │
│  │              │  │  Sessions)    │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  BullMQ Workers                                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────────────┐  │   │
│  │  │ Email      │ │ KPI        │ │ Similarity Calculator   │  │   │
│  │  │ Worker     │ │ Worker     │ │ (TF-IDF / Embeddings)   │  │   │
│  │  └────────────┘ └────────────┘ └─────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL INTEGRATIONS                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ MS Teams │ │Crunchbase│ │ LDAP/SSO │ │ DeepL/   │ │ Outlook  │ │
│  │ Webhook  │ │ API      │ │ Provider │ │ Google   │ │ Add-in   │ │
│  │          │ │          │ │          │ │ Translate │ │ API      │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. DIRECTORY STRUCTURE

```
innoflow/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Migration files
│   └── seed.ts                    # Seed data
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── sso/
│   │   ├── (platform)/            # Authenticated platform routes
│   │   │   ├── layout.tsx         # Platform shell (sidebar + header)
│   │   │   ├── dashboard/         # User dashboard
│   │   │   ├── campaigns/         # Campaign CRUD + detail pages
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── ideas/
│   │   │   │   │   ├── evaluate/
│   │   │   │   │   ├── cockpit/
│   │   │   │   │   └── settings/
│   │   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   ├── channels/
│   │   │   ├── ideas/
│   │   │   │   └── [id]/
│   │   │   ├── partners/
│   │   │   │   ├── organizations/
│   │   │   │   ├── use-cases/
│   │   │   │   ├── scouting/
│   │   │   │   └── missions/
│   │   │   ├── strategy/
│   │   │   │   ├── trends/
│   │   │   │   ├── technologies/
│   │   │   │   ├── insights/
│   │   │   │   └── portfolios/
│   │   │   ├── projects/
│   │   │   │   └── [id]/
│   │   │   ├── reports/
│   │   │   ├── explore/
│   │   │   ├── tasks/
│   │   │   ├── admin/
│   │   │   │   ├── users/
│   │   │   │   ├── org-units/
│   │   │   │   ├── groups/
│   │   │   │   ├── notifications/
│   │   │   │   ├── customization/
│   │   │   │   └── settings/
│   │   │   └── profile/
│   │   └── api/
│   │       └── trpc/[trpc]/       # tRPC handler
│   ├── server/                    # Server-side code
│   │   ├── trpc/
│   │   │   ├── router.ts          # Root router
│   │   │   ├── context.ts         # tRPC context
│   │   │   └── routers/           # Module routers
│   │   │       ├── auth.ts
│   │   │       ├── campaign.ts
│   │   │       ├── channel.ts
│   │   │       ├── idea.ts
│   │   │       ├── evaluation.ts
│   │   │       ├── partner.ts
│   │   │       ├── strategy.ts
│   │   │       ├── project.ts
│   │   │       ├── report.ts
│   │   │       ├── notification.ts
│   │   │       ├── user.ts
│   │   │       └── admin.ts
│   │   ├── services/              # Business logic
│   │   │   ├── campaign.service.ts
│   │   │   ├── idea.service.ts
│   │   │   ├── evaluation.service.ts
│   │   │   ├── similarity.service.ts
│   │   │   ├── partner.service.ts
│   │   │   ├── project.service.ts
│   │   │   ├── kpi.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── search.service.ts
│   │   ├── jobs/                  # BullMQ job processors
│   │   │   ├── email.job.ts
│   │   │   ├── kpi.job.ts
│   │   │   └── similarity.job.ts
│   │   └── lib/                   # Server utilities
│   │       ├── auth.ts
│   │       ├── prisma.ts
│   │       ├── redis.ts
│   │       ├── s3.ts
│   │       └── permissions.ts
│   ├── components/                # Shared UI components
│   │   ├── ui/                    # Base design system (shadcn-derived)
│   │   ├── layout/                # Shell, sidebar, header, footer
│   │   ├── campaigns/             # Campaign-specific components
│   │   ├── ideas/                 # Idea card, form, board, etc.
│   │   ├── evaluation/            # Eval forms, scorecard, pairwise
│   │   ├── partners/              # Organization card, scouting board
│   │   ├── strategy/              # Trend card, portfolio view
│   │   ├── projects/              # Phase gate, kanban, timeline
│   │   ├── reports/               # Charts, KPI widgets
│   │   └── shared/                # Rich text editor, file upload, etc.
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Client utilities
│   │   ├── trpc.ts                # tRPC client
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── stores/                    # Zustand stores
│   │   ├── ui.store.ts
│   │   └── filter.store.ts
│   └── types/                     # Shared TypeScript types
│       ├── campaign.ts
│       ├── idea.ts
│       ├── evaluation.ts
│       ├── partner.ts
│       └── index.ts
├── public/
│   └── assets/
├── docker-compose.yml
├── Dockerfile
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. AUTHENTICATION & AUTHORIZATION FLOW

```
┌────────────┐     ┌───────────────┐     ┌──────────────┐
│  Login Page │────▶│  NextAuth.js  │────▶│  Session     │
│             │     │  Providers:   │     │  (JWT in     │
│  - Email/PW │     │  - Credentials│     │   httpOnly   │
│  - SSO/SAML │     │  - LDAP       │     │   cookie)    │
│  - Magic Lnk│     │  - SAML       │     │              │
└────────────┘     └───────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
                                   ┌──────────────────────────┐
                                   │  RBAC Middleware          │
                                   │                          │
                                   │  session.user.roles[]    │
                                   │  ├─ PLATFORM_ADMIN       │
                                   │  ├─ INNOVATION_MANAGER   │
                                   │  ├─ CONTRIBUTOR          │
                                   │  ├─ EVALUATOR            │
                                   │  ├─ MODERATOR            │
                                   │  ├─ EXTERNAL_USER        │
                                   │  └─ GUEST                │
                                   │                          │
                                   │  + context-based perms:  │
                                   │    campaign.manager      │
                                   │    campaign.sponsor      │
                                   │    idea.coach            │
                                   │    project.gatekeeper    │
                                   │    partner.scout         │
                                   └──────────────────────────┘
```

### Permission Resolution

Permissions are checked at 3 levels:

1. **Global Role** — user group membership (Innovation Manager, Admin, etc.)
2. **Resource Role** — per-object assignment (campaign manager of Campaign X)
3. **Scope** — innovation space membership, org unit membership

```typescript
// Permission check pseudocode
function canAccess(user, resource, action) {
  // 1. Global role check
  if (user.roles.includes("PLATFORM_ADMIN")) return true;

  // 2. Resource-specific role check
  const resourceRole = getResourceRole(user, resource);
  if (resourceRole && ROLE_PERMISSIONS[resourceRole].includes(action))
    return true;

  // 3. Scope check (innovation space, audience membership)
  if (resource.audienceType === "ALL_INTERNAL" && user.isInternal) return true;
  if (resource.audience.includes(user.orgUnitId)) return true;

  return false;
}
```

---

## 5. REAL-TIME & NOTIFICATION ARCHITECTURE

```
┌────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Action    │────▶│  Event Emitter   │────▶│  Redis PubSub   │
│  (idea submit,  │     │  (server-side)   │     │                 │
│   comment, etc) │     │                  │     └────────┬────────┘
└────────────────┘     └──────────────────┘              │
                                                          │
                              ┌────────────────────────────┤
                              │                            │
                              ▼                            ▼
                    ┌──────────────────┐      ┌──────────────────────┐
                    │  Socket.io       │      │  BullMQ              │
                    │  (Live UI update │      │  (Async processing)  │
                    │   activity feed, │      │  ┌────────────────┐  │
                    │   notifications) │      │  │ Email Queue    │  │
                    └──────────────────┘      │  │ KPI Queue      │  │
                                              │  │ Teams Queue    │  │
                                              │  │ Push Queue     │  │
                                              │  └────────────────┘  │
                                              └──────────────────────┘
```

---

## 6. MULTI-TENANCY MODEL

Single-tenant deployment with Innovation Spaces providing logical isolation:

```
Platform (single deployment)
├── Innovation Space: "Global Innovation"
│   ├── Campaigns: [...]
│   ├── Channels: [...]
│   ├── SIAs: [...]
│   └── Users: [all internal]
├── Innovation Space: "APAC Division"
│   ├── Campaigns: [...]
│   ├── Channels: [...]
│   ├── SIAs: [...]
│   └── Users: [APAC org units]
└── Innovation Space: "R&D Lab"
    ├── Campaigns: [...]
    └── Users: [R&D team]
```

---

## 7. FILE STORAGE STRATEGY

```
S3 Bucket: innoflow-files/
├── campaigns/{campaignId}/
│   ├── banner.{ext}
│   └── attachments/{fileId}.{ext}
├── ideas/{ideaId}/
│   ├── logo.{ext}
│   └── attachments/{fileId}.{ext}
├── organizations/{orgId}/
│   ├── logo.{ext}
│   └── attachments/{fileId}.{ext}
├── projects/{projectId}/
│   └── attachments/{fileId}.{ext}
├── users/{userId}/
│   └── avatar.{ext}
└── exports/
    └── {reportId}.xlsx
```

All uploads use pre-signed URLs. Max file size: 50MB. Allowed types: images (JPG, PNG, GIF), documents (PDF, DOCX, PPTX, XLSX).
