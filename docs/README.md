# InnoFlow — Complete Design Package

## Innovation Management Platform (HYPE Enterprise Clone)

---

## 📁 Document Index

| #   | Document                              | Purpose                                                                                                                                                                      |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00  | `00-FEATURE-LIST.md`                  | Complete feature backlog extracted from HYPE Enterprise Platform Owner's Guide v10.15. The "what" of the platform.                                                           |
| 01  | `01-SYSTEM-ARCHITECTURE.md`           | Tech stack, high-level architecture, directory structure, auth flow, real-time architecture, file storage strategy.                                                          |
| 02  | `02-DATABASE-SCHEMA.md`               | Complete Prisma schema with all models, enums, relations, and indexes. Copy-paste ready.                                                                                     |
| 03  | `03-API-DESIGN.md`                    | All tRPC router definitions with every endpoint, input/output types. The complete API surface.                                                                               |
| 04  | `04-UI-DESIGN-SYSTEM.md`              | Design tokens (colors, typography, spacing), component specs, layout system, iconography, animations, chart styling.                                                         |
| 05  | `05-PAGE-SPECIFICATIONS.md`           | Every screen in the app described in detail — layout, components, interactions, data displayed.                                                                              |
| 06  | `06-DATA-FLOWS-AND-IMPLEMENTATION.md` | Key data flows (idea submission, graduation, evaluation, pipeline, phase-gate), state management, search, similarity, KPI computation, Docker, env vars, testing, seed data. |

---

## 🚀 How to Use with Claude Code

### Approach 1: Phase-by-Phase (Recommended)

Feed documents in order, building incrementally:

```
Phase 1 — Foundation:
  Feed: 01-SYSTEM-ARCHITECTURE.md + 02-DATABASE-SCHEMA.md (Users, OrgUnits, UserGroups only)
  Ask: "Set up the Next.js project with Prisma, auth, and the user management module"

Phase 2 — Campaigns & Ideas:
  Feed: 02-DATABASE-SCHEMA.md (Campaign + Idea models) + 03-API-DESIGN.md (campaign + idea routers)
        + 05-PAGE-SPECIFICATIONS.md (sections 3-6)
  Ask: "Build the campaign CRUD, idea submission, and campaign detail pages"

Phase 3 — Evaluation Engine:
  Feed: 02-DATABASE-SCHEMA.md (Evaluation models) + 03-API-DESIGN.md (evaluation router)
        + 05-PAGE-SPECIFICATIONS.md (sections 7-8)
  Ask: "Build the evaluation session system with scorecard and pairwise modes"

Phase 4 — Partner Engagement:
  Feed: 02-DATABASE-SCHEMA.md (Partner models) + 03-API-DESIGN.md (partner router)
        + 05-PAGE-SPECIFICATIONS.md (section 9)
  Ask: "Build the partner management module with organizations, use cases, and scouting boards"

Phase 5 — Strategy & Projects:
  Feed: 02-DATABASE-SCHEMA.md (Strategy + Project models) + 03-API-DESIGN.md (strategy + project routers)
        + 05-PAGE-SPECIFICATIONS.md (sections 10-11)
  Ask: "Build trends, technologies, insights, and the project phase-gate system"

Phase 6 — Reports, Admin, Polish:
  Feed: 03-API-DESIGN.md (report + admin routers) + 05-PAGE-SPECIFICATIONS.md (sections 12-15)
        + 06-DATA-FLOWS-AND-IMPLEMENTATION.md
  Ask: "Build the reporting dashboards, admin panel, and global search"
```

### Approach 2: Full Context

If using Claude Code with a large context window, feed all 7 documents at once and ask:

```
"Here are the complete design documents for InnoFlow, an innovation management platform.
Start by setting up the project foundation: Next.js 14 with TypeScript, Prisma with PostgreSQL,
tRPC, NextAuth, and the basic layout shell. Then proceed module by module."
```

---

## 🏗 Tech Stack Summary

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Zustand
- **Backend**: tRPC + Prisma + PostgreSQL + Redis + BullMQ
- **Auth**: NextAuth.js v5
- **Storage**: S3/MinIO
- **Real-time**: Socket.io
- **Charts**: Recharts
- **Rich Text**: TipTap
- **Drag & Drop**: dnd-kit

---

## 📊 Scale Estimates

| Entity                  | Expected Volume                  |
| ----------------------- | -------------------------------- |
| Users                   | 100 - 50,000                     |
| Campaigns               | 10 - 500 active                  |
| Ideas per campaign      | 20 - 2,000                       |
| Total ideas             | 1,000 - 100,000                  |
| Organizations           | 100 - 10,000                     |
| Projects                | 10 - 500                         |
| Evaluations per session | up to 5,000 (ideas × evaluators) |

---

_Built for Claude Code. Ship it._ 🚀
