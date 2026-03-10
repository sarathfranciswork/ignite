---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-03-09-2020.md
  - docs/00-FEATURE-LIST.md
  - docs/01-SYSTEM-ARCHITECTURE.md
  - docs/02-DATABASE-SCHEMA.md
  - docs/03-API-DESIGN.md
  - docs/04-UI-DESIGN-SYSTEM.md
  - docs/05-PAGE-SPECIFICATIONS.md
  - docs/06-DATA-FLOWS-AND-IMPLEMENTATION.md
  - docs/06-DATA-FLOWS-AND-IMPLEMENTATION_1.md
  - docs/HYPE_Feature_List_for_Claude_Code.md
  - docs/README.md
date: 2026-03-09
author: Cvsilab
---

# Product Brief: Ignite

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Ignite is the first comprehensive open-source innovation management platform — a full-lifecycle, self-hosted alternative to HYPE Enterprise, the market-leading proprietary platform used by Airbus, Siemens, Nokia, and Saudi Aramco. Built on a modern stack (Next.js, tRPC, Prisma, PostgreSQL), Ignite delivers feature-level parity with HYPE's four core pillars — Idea Generation, Partner Engagement, Strategy Building, and Value Creation — while reimagining the user experience for the modern era and embedding AI intelligence from Day 1.

The innovation management market ($3.17B in 2026, growing to $10.77B by 2035) has zero comprehensive open-source alternatives. Existing OSS tools like OpenideaL cover basic ideation but nothing in the open-source world touches evaluation engines, partner relationship management, trend/technology scouting, or phase-gate project workflows. Ignite fills this gap with an open-core model (AGPLv3 community edition + commercial enterprise edition), following the proven playbook of GitLab, Supabase, and Cal.com — a genuinely useful free tier with enterprise features for organizations operating at scale.

The MVP delivers the core ideation-to-evaluation loop: campaigns, ideas, community engagement, scorecard and pairwise evaluation, idea boards, and campaign KPI dashboards. This covers 80% of what 80% of HYPE customers use daily. Subsequent phases add strategy & partner management, phase-gate projects, and advanced enterprise/AI capabilities — building toward the positioning: "Everything HYPE does, reimagined for the modern era."

---

## Core Vision

### Problem Statement

End-to-end innovation lifecycle management — from strategic foresight to ideation to partner scouting to project execution — is locked behind expensive, closed-source SaaS platforms. HYPE Enterprise starts at $50,000/year. Mid-market platforms range $20,000-$100,000/year. No open-source alternative exists that covers the full innovation lifecycle.

Innovation managers at mid-to-large enterprises (500-50,000 employees) are forced to choose between: (a) paying enterprise licensing costs for platforms like HYPE, ITONICS, or Qmarkets, (b) cobbling together disconnected tools (ideas in spreadsheets, partners in email threads, trends in PowerPoints, projects in Jira), or (c) not running structured innovation programs at all. Each choice results in lost innovation potential, wasted investment, or organizational stagnation.

### Problem Impact

Without a unified innovation platform, organizations experience:

- **Fragmented innovation data** — Ideas, trends, partner relationships, and project outcomes live in disconnected silos, making it impossible to trace the thread from strategic insight to implemented value
- **Low participation rates** — Clunky, expensive tools discourage broad employee engagement; ideas die in "digital suggestion boxes" without feedback or visibility
- **Inability to prove ROI** — Innovation leaders cannot demonstrate program value to executives when data is scattered across 5-10 different tools
- **Vendor lock-in and rigidity** — Proprietary platforms constrain workflow customization, data portability, and integration with existing enterprise systems
- **Exclusion of smaller organizations** — Government agencies, universities, consulting firms, and mid-market companies are priced out of the category entirely

### Why Existing Solutions Fall Short

| Solution                        | Gap                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **HYPE Enterprise**             | $50K+/year, dated Java-based UI, rigid configuration, project module needs overhaul, vendor lock-in |
| **Brightidea**                  | "Pilot cockpit" complexity, limited self-service analytics, admin locked to IT, $20K+/year          |
| **IdeaScale**                   | Limited UI customization, no engineering tool integrations, manual moderation, ideation-only        |
| **Qmarkets**                    | Strong scouting but limited project management, enterprise pricing                                  |
| **Planview Spigit**             | Outdated UX, limited AI, acquired/deprioritized within Planview portfolio                           |
| **OpenideaL (OSS)**             | Basic ideation only — no evaluation engine, no partner management, no strategy module, no projects  |
| **Spreadsheets + Jira + Email** | No integration, no innovation-specific workflows, no KPI tracking, no community engagement          |

No solution combines: full lifecycle coverage + modern UX + AI-native intelligence + open source + self-hosted option + affordable pricing.

### Proposed Solution

Ignite is a full-featured innovation management platform that replicates and reimagines HYPE Enterprise's complete capability set across four interconnected pillars:

1. **Idea Generation** — Campaigns and always-open channels with rich submission forms, community discussion, multi-criteria voting, community graduation ("HOT!" status), idea boards with buckets, and AI-assisted idea enrichment
2. **Partner Engagement** — Organization database, use case pipeline (Identified -> Partnership), scouting boards, contact management, and interaction tracking
3. **Strategy Building** — Trend radar (Mega/Macro/Micro hierarchy), technology database, community insights, innovation portfolios, and strategic innovation area alignment
4. **Value Creation** — Phase-gate projects with custom process definitions, gatekeeper decisions, activity/task management, concepts with business case frameworks, and portfolio analysis

These pillars are deeply interconnected: a trend informs a campaign, an idea from that campaign gets evaluated and shortlisted, the winning idea becomes a concept or project, which may involve a partner discovered through scouting. This connected data flow — not any single feature — is the platform's primary value.

**AI-native from Day 1** with semantic similarity detection (embedding-based, not keyword), AI-assisted idea enrichment (co-pilot for contributors), and smart summarization (campaign digests, evaluation reports, trend briefings). Phase 2 AI adds predictive scoring, auto-categorization, and AI-powered scouting.

**Open-core model:** Community Edition (AGPLv3) includes the full ideation engine, basic partner management, strategy module, phase-gate projects, core reporting, and single-tenant deployment. Enterprise Edition adds multi-tenancy, LDAP/SAML SSO, white-labeling, BI connectors, external integrations, and priority support.

**Modern stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, tRPC, Prisma, PostgreSQL, Redis, BullMQ, Socket.io — delivering a Linear/Notion-quality interface that makes innovation management actually enjoyable.

### Key Differentiators

1. **First comprehensive OSS innovation platform** — "The WordPress of innovation management." No other open-source project covers the full lifecycle from ideation through partner scouting to phase-gate project execution.

2. **Full-lifecycle integration as moat** — Not just ideation OR project management OR partner CRM. The interconnected data flow across all four pillars is what makes innovation programs actually work, and no OSS project has attempted this.

3. **Modern tech stack advantage** — HYPE was built on enterprise Java over many years. Ignite is built on Next.js/tRPC/Prisma — faster to develop, easier to extend, more attractive to contributors, and capable of delivering a dramatically better user experience.

4. **AI-native architecture** — Not bolted-on AI, but intelligence embedded in the foundation from Day 1. Semantic similarity, idea enrichment co-pilot, and smart summarization are core capabilities, not premium add-ons.

5. **Open-core economics** — Community edition is genuinely useful, not a crippled teaser. Enterprise features target scale and compliance needs, following the proven GitLab/Supabase/Cal.com playbook. This enables community-driven development velocity that no proprietary vendor can match.

6. **Reimagined UX** — Every HYPE workflow works conceptually the same, but the interface is built to modern standards. Campaign setup feels like magic, not a government form. Idea boards feel like Linear, not enterprise Java.

---

## Target Users

### Primary Users

#### 1. Innovation Program Manager — "Sarah, Head of Innovation"

**Context:** Sarah leads a 3-person innovation team at a manufacturing company with 8,000 employees. She runs 12 campaigns per year across 4 business units, manages evaluation panels, and reports quarterly to the C-suite on innovation ROI. She's used HYPE at a previous company and knows what good looks like.

**At mid-market companies (500-5,000 employees), this role is a "hat-wearer"** — a VP of Strategy, R&D manager, or CTO office lead running 2-3 campaigns per year alongside their main job. Ignite must be optimized for this persona: if it's easy enough for someone who runs innovation part-time, it's definitely easy enough for the dedicated Innovation Manager.

**Daily Frustrations (priority order):**

1. **Proving ROI to leadership** — "We ran 5 campaigns, got 200 ideas, implemented 8, but I can't tell the CFO what that was worth." Needs dashboards that speak in business outcomes.
2. **Low and declining participation** — Spends more time on internal marketing and reminder emails than on actual innovation management.
3. **The evaluation bottleneck** — 200 ideas, 5 evaluators, 2 weeks — then evaluators go dark. Chasing evaluators and synthesizing scattered feedback is the most time-consuming manual task.
4. **Disconnected tools** — Ideas in the platform, follow-up in Jira, partners in Excel, reporting in PowerPoint. She's the human integration layer, manually stitching data together for every leadership update.

**Success with Ignite:** Stands up a campaign in 30 minutes, gets 70%+ participation, runs evaluation in days not weeks, and walks into the quarterly review with an auto-generated dashboard showing clear ROI — without touching a spreadsheet.

#### 2. Contributor / Innovator — "Marco, Field Operations Manager"

**Context:** Marco manages a logistics team of 40 people. He sees operational inefficiencies daily and has ideas for improvement, but has never been asked for them in a structured way. He'll spend 10 minutes submitting an idea if the topic is relevant and he believes something will happen.

**Motivation Hierarchy:**

1. **Relevance of the question** (strongest) — Participates when the campaign topic directly affects his work
2. **Belief that something will happen** — Needs to see that previous ideas were evaluated, feedback was given, and some got implemented
3. **Sponsor credibility** — Participates more when a respected senior leader is visibly engaged
4. **Recognition over rewards** — Public acknowledgment matters more than gift cards; being named a top contributor or having his idea highlighted in a newsletter
5. **Social proof** — Participates when he sees others already participating; seeding and HOT! status create momentum

**What kills participation:** Management mandates ("submit 2 ideas"), ideas going into a black hole with no feedback, vague campaigns without clear focus.

**Success with Ignite:** Submits an idea in under 3 minutes from his phone, sees its status at every stage, gets notified when it's evaluated, and sees it implemented 4 months later with his name on the results page.

#### 3. Evaluator — "Dr. Priya Sharma, R&D Director"

**Context:** Priya is an expert asked to evaluate 25 ideas in a scorecard session for the Q3 sustainability campaign. She's extremely time-constrained and needs to complete evaluations between meetings, often on her tablet.

**Frustrations:** Evaluation UIs that require too many clicks, unclear criteria, no context on the idea beyond a title, and no way to see how her scores compare to other evaluators.

**Success with Ignite:** Opens her pending evaluations, sees clear criteria with guidance text, reads the idea with all context in one view, scores it, and moves to the next — completing 25 evaluations in 90 minutes. Gets a summary of results showing how her scores compared to the panel.

#### 4. Platform Admin — "James, IT Applications Manager"

**Context:** James manages business applications at a 3,000-person company. He's been asked to set up Ignite after the VP of Strategy found it on GitHub. He needs to configure user groups, set up SSO, define org units, and customize notification templates — then hand it off to the Innovation Manager.

**Needs:** Clear separation between system administration and innovation configuration. Doesn't care about campaigns or ideas — cares about uptime, security, user provisioning, and compliance.

**Success with Ignite:** Deploys via Docker Compose in 15 minutes, configures SMTP and SSO in the admin panel, imports users from LDAP, and hands the "Innovation Configuration" section to the Innovation Manager — never touching it again.

### Secondary Users

#### 5. Campaign Sponsor — "Victoria, Chief Strategy Officer"

**Context:** Victoria sponsors 2-3 major innovation campaigns per year. She defines the challenge, provides strategic context, and is the face of the campaign. She doesn't manage it operationally — Sarah does — but her visible engagement is critical for participation rates.

**Interaction:** Reviews campaign setup, records a video introduction, comments on promising ideas, approves evaluation shortlists, and presents results at town halls. Needs a streamlined executive view, not the full management interface.

#### 6. Idea Coach — "David, Senior Innovation Specialist"

**Context:** Assigned to quality-gate ideas during the qualification phase. Reviews early submissions privately with contributors, helps them strengthen their proposals, and decides when ideas are ready for community discussion.

**Interaction:** Reviews 5-10 ideas per week in qualification, provides structured feedback, and publishes approved ideas to the community. Needs a coach dashboard with a queue of ideas awaiting review.

#### 7. Partner/Scout Manager — "Leila, Open Innovation Lead"

**Context:** Manages relationships with 80+ external organizations (startups, research labs, suppliers). Tracks partnership pipelines from identification through pilot to formal partnership. Uses scouting boards to evaluate new prospects.

**Interaction:** Manages organization profiles, tracks use cases through pipeline stages, records interactions (meetings, calls, emails), and reports on partnership health. Needs CRM-like functionality purpose-built for innovation partnerships.

#### 8. Portfolio/Project Manager — "Tom, Innovation Portfolio Lead"

**Context:** Manages 15 active innovation projects through phase-gate processes. Ensures projects meet gate criteria, assigns tasks to team members, and reports on portfolio health to the innovation steering committee.

**Interaction:** Creates projects from evaluated ideas, defines phase activities and tasks, monitors progress, and coordinates gatekeeper reviews. Needs Kanban and timeline views with clear gate decision workflows.

#### 9. Gatekeeper — "Yuki, VP of Engineering"

**Context:** Makes go/no-go decisions at project phase gates. Reviews completed activities, evaluates against gate criteria, and decides whether to forward, rework, postpone, or terminate a project.

**Interaction:** Receives gate review notifications, reviews project materials (read-only), fills gate task evaluations, and makes a documented decision with rationale. Needs a focused decision interface, not the full project management view.

#### 10. External User — "Alex, Startup CEO"

**Context:** Invited to submit a partnership proposal in response to a partnering campaign. Has limited platform access and no internal context. May also be a customer submitting ideas through a public innovation portal.

**Interaction:** Receives an invitation link, submits a structured proposal, tracks its status, and responds to questions from the evaluation team. Needs an extremely simple, branded, self-explanatory submission experience.

#### 11. Platform Operator — "Ravi, DevOps Engineer"

**Context:** Deploys and maintains the Ignite instance on company infrastructure. Handles Docker/Kubernetes deployment, database backups, upgrades, monitoring, and security hardening. May manage multiple instances for different business units or clients (consulting firm scenario).

**Needs:**

- Dead-simple deployment (Docker Compose in 15 minutes, Helm chart for production Kubernetes)
- Clear upgrade path with migration scripts and zero-downtime deployments
- Monitoring endpoints (Prometheus metrics, health API)
- Backup/restore documentation and automation
- Configuration via environment variables (infrastructure-as-code friendly)
- Security hardening guide (HTTPS, rate limiting, CORS, CSP headers)

**Success with Ignite:** Deploys a production instance in under an hour, sets up automated backups and monitoring, and upgrades between versions with a single command and no downtime. Never needs to understand innovation management concepts.

### User Journey

#### Primary Journey: Bottom-Up Adoption (Community Edition)

1. **Discovery:** Innovation Manager or technical champion finds Ignite on GitHub via search for "open source innovation management" or HackerNews/Reddit discussion
2. **Evaluation:** Spins up a Docker Compose instance in 15 minutes, explores the demo, compares feature list against HYPE/IdeaScale
3. **Pilot:** Runs a single internal campaign with their team (20-50 people), collects ideas, runs a scorecard evaluation
4. **Aha Moment:** Campaign cockpit shows participation rates, idea funnel, and engagement KPIs — "I can actually show this to leadership"
5. **Expansion:** Presents pilot results to VP/CTO, gets approval to roll out org-wide, imports full user directory
6. **Enterprise Upgrade:** Hits multi-tenancy or SSO requirements, evaluates Enterprise Edition, builds cost-savings business case vs. HYPE ($50K+ savings)

#### Primary Journey: Top-Down Adoption (Enterprise Edition)

1. **Discovery:** Head of Innovation evaluates platforms during annual budget planning, finds Ignite through industry comparison or referral
2. **Evaluation:** Requests demo/trial, compares against HYPE/ITONICS/Qmarkets on features, pricing, and data ownership
3. **Business Case:** Builds ROI case — 60-80% cost reduction vs. HYPE, full data ownership, customization freedom, no vendor lock-in
4. **Procurement:** IT/Security reviews self-hosted deployment model, CISO approves, Legal reviews AGPLv3/BSL licensing
5. **Deployment:** Platform Operator deploys production instance, configures SSO/LDAP, imports org structure
6. **Launch:** Innovation Manager configures first campaigns, runs organization-wide launch with executive sponsorship
7. **Aha Moment:** First quarterly review with auto-generated ROI dashboards — "This would have taken me 2 days in PowerPoint"

---

## Success Metrics

### Platform Success — 12-Month Milestones

**Open-source traction (proves the category exists):**

- 3,000+ GitHub stars
- 500+ Docker pulls per month
- 50+ organizations running production instances with active campaigns
- 15+ external contributors with merged PRs

**User success (proves the product works):**

- At least 5 organizations running 3+ campaigns each (repeat usage signal)
- At least 1 published case study showing measurable results (participation rates, ideas implemented, time saved)

**Commercial validation (proves the business model):**

- 3-5 paying Enterprise Edition customers
- Pipeline of 10+ enterprise leads generated through community edition usage

**Single-sentence success test:** "50 organizations are running real innovation programs on Ignite, 5 of them are paying for Enterprise, and the community is contributing code — not just filing issues."

### Business Objectives

#### Open-Core Revenue Model

| Metric                                  | 12-Month Target                                                     |
| --------------------------------------- | ------------------------------------------------------------------- |
| Enterprise Edition ARR                  | $150K-$300K (3-5 customers at $30K-$60K, 60-80% below HYPE pricing) |
| Community to Enterprise conversion rate | 5-10% of production deployments                                     |
| Enterprise pipeline                     | 10+ qualified leads from community usage                            |
| Community Edition deployments           | 50+ production instances                                            |
| GitHub stars                            | 3,000+                                                              |
| Monthly Docker pulls                    | 500+                                                                |

#### Strategic Position

- Establish Ignite as the default open-source answer to "what's the OSS alternative to HYPE?"
- Achieve top-3 ranking for "open source innovation management" in Google search
- Get listed on at least 2 industry comparison sites (G2, Capterra) with 4+ star ratings
- Present at 1-2 innovation management conferences or webinars

### Key Performance Indicators

#### Built-In Innovation KPI Framework (What the Platform Tracks for Users)

**Tier 1 — Engagement Metrics (are people participating?):**

| KPI                  | Description                                                 | Benchmark Target            |
| -------------------- | ----------------------------------------------------------- | --------------------------- |
| Awareness rate       | % of invited users who viewed the campaign                  | 60-80%                      |
| Participation rate   | % of invited users who contributed (idea, comment, or vote) | 30-50% good, 50%+ excellent |
| Contribution depth   | Average comments per idea                                   | 3-5 per idea                |
| Return participation | % of contributors who participate in 2+ campaigns           | 40%+                        |

**Tier 2 — Quality Metrics (are the ideas any good?):**

| KPI                        | Description                                        | Benchmark Target              |
| -------------------------- | -------------------------------------------------- | ----------------------------- |
| Idea funnel conversion     | % of submissions surviving each stage to selection | 5-15% overall                 |
| Evaluation completion rate | % of requested evaluations actually completed      | 80%+ (below 60% = UX problem) |
| Score distribution spread  | Are evaluators differentiating or clustering?      | Healthy standard deviation    |
| Community graduation rate  | % of ideas reaching HOT! status                    | 10-20%                        |

**Tier 3 — Pipeline Metrics (are ideas becoming reality?):**

| KPI                              | Description                                            | Benchmark Target              |
| -------------------------------- | ------------------------------------------------------ | ----------------------------- |
| Selection-to-implementation rate | % of selected ideas that get implemented               | 60%+                          |
| Time-to-implementation           | Average days from selection to implementation complete | Track trend, reduce over time |
| Active pipeline count            | Projects by stage distribution                         | Balanced across stages        |
| Partner pipeline velocity        | Average days per use case stage                        | Track and reduce over time    |

**Tier 4 — Business Impact (the CFO slide):**

| KPI                              | Description                                              | Measurement                                            |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Innovation ROI                   | Value of implemented ideas vs. program cost              | User-input estimated value, auto-aggregated            |
| Ideas implemented                | Count of ideas reaching implementation status            | Automatic from platform data                           |
| Cost savings / revenue generated | Self-reported per implemented idea                       | Single "estimated impact" field, portfolio aggregation |
| Program health score             | Composite 0-100 index of engagement + quality + pipeline | Auto-calculated with trend line                        |

**Design decisions:**

- Tiers 1-3 calculate automatically from platform data with zero manual input
- Tier 4 requires one manual field: "estimated impact" on the implementation tab — platform handles all aggregation and visualization
- Built-in benchmark ranges ship with the platform (e.g., "Your participation rate of 45% is in the top quartile") based on published HYPE case studies and industry research

#### "Better Than HYPE" Comparison Metrics

**Faster:**

| Metric                          | HYPE Baseline                          | Ignite Target                   |
| ------------------------------- | -------------------------------------- | ------------------------------- |
| Time to deploy                  | 2-6 weeks (enterprise onboarding)      | 15 minutes (Docker Compose)     |
| Time to create a campaign       | 45-60 min (complex wizard)             | 15-20 min (smart defaults + AI) |
| Time to complete 25 evaluations | 2-3 hours                              | 60-90 minutes                   |
| Time to generate a KPI report   | 30-60 min (manual export + PowerPoint) | Instant (built-in dashboards)   |
| Evaluation turnaround           | 2-3 weeks typical                      | Under 1 week                    |

**Easier:**

| Metric                        | HYPE Baseline              | Ignite Target                          |
| ----------------------------- | -------------------------- | -------------------------------------- |
| Campaign setup learning curve | 2-3 day training typical   | Self-service, no training needed       |
| Idea submission time          | 5-10 minutes               | Under 3 minutes                        |
| Admin configuration           | Requires HYPE consulting   | Self-service admin panel               |
| Upgrade process               | Vendor-coordinated release | Single command (docker pull + migrate) |

**Smarter (AI-native — not available in HYPE):**

| Capability                 | HYPE                              | Ignite                                          |
| -------------------------- | --------------------------------- | ----------------------------------------------- |
| Similar idea detection     | Lucene keyword / basic TF-IDF     | Semantic embeddings (understands meaning)       |
| Idea submission assistance | None                              | AI co-pilot (improvements, tags, trends)        |
| Report generation          | Manual export + formatting        | AI-generated narrative summaries                |
| Trend discovery            | Manual curation + TrendOne import | AI-enhanced signal detection from platform data |

**Qualitative benchmark:** Run the same scenario on both platforms (create campaign, submit 20 ideas, evaluate, generate report). Ignite should complete the workflow in half the time with zero training.

**NPS target:** 50+ from Innovation Managers (HYPE estimated at 30-40 based on Gartner Peer Insights).

---

## MVP Scope

### Core Features (Phase 1 — "The Ideation Engine")

#### User Management & Access Control

- User registration (email/password + magic link), login, profiles
- Role-based access control: Platform Admin, Innovation Manager, Contributor, Evaluator, Moderator
- Hierarchical org unit structure with user assignment
- User groups with configurable permissions
- User dashboard with task list, activity feed, and active campaigns overview

#### Campaign Management

- **Simple Setup** — Title, banner, timeline, sponsor, description, target audience with smart defaults (under 15 minutes)
- **Advanced Setup** — Full 5-step wizard: Description, Submission Form, Idea Coach, Community, Settings
- **Full Campaign Lifecycle** — Draft > Seeding > Submission > Discussion & Voting > Evaluation > Closed
- Configurable closing dates with auto-transition between phases
- Manual fast-track forward/backward between phases
- Campaign copying as template
- Campaign cockpit with KPIs (awareness, adoption, activity, idea funnel)
- Target audience configuration (all internal, selected org units/groups/individuals)

#### Channels (Always-Open Ideation)

- Derived from campaign codebase with hasTimeline = false, hasSeedingPhase = false
- Simplified lifecycle: Draft > Submission > Closed
- Same idea submission, discussion, evaluation, and idea board features as campaigns
- Optional problem description field

#### Ideas & Submissions

- Rich text descriptions (TipTap editor) with image upload and file attachments
- Custom fields per campaign (text, keyword, selection, checkbox) with field builder
- Tags with auto-suggestion
- Category assignment linked to idea coaches
- Co-authorship (multiple contributors)
- Threaded discussion/comments with @mentions
- Multi-criteria star voting (default: single overall rating; campaign managers add criteria in advanced setup)
- Like button
- Community graduation (HOT! status) with configurable thresholds (visitors, commenters, voters, voting level, days)
- Idea connections / linking related ideas
- Follow/subscribe to ideas
- Activity stream per idea
- Suggested users (based on skills/contributions)

#### Idea Coach / Qualification Phase

- Toggle on campaign setup (enabled/disabled)
- Private review workflow: idea visible only to contributor + coach until approved
- Coach provides structured feedback via private comments
- Coach publishes approved ideas to community discussion
- Coach assignment: global or per-category

#### Idea Board (Manager Tool)

- Table/grid view of all ideas in a campaign
- Manual buckets (named, color-coded, assignable)
- Smart buckets (auto-filter based on saved search criteria)
- Split ideas into multiple
- Merge similar ideas into one
- Column selection, sorting, filtering
- Multi-action toolbar (bulk assign bucket, archive, export)
- Dual-window mode for comparison

#### Evaluation Engine

- **Scorecard Evaluation** — Custom criteria forms, individual evaluator scoring, weighted results, standard deviation indicators
- **Pairwise Evaluation** — Side-by-side idea comparison with slider scoring per criterion
- Configurable evaluation team (per session)
- Due dates with reminder notifications
- Progress tracking (% complete per evaluator)
- Results table with criteria weighting, sorting, and bubble chart visualization
- Shortlist management (add/remove from shortlist, lock after final session)
- Forward shortlisted ideas to: Implementation, Concept, or Archive (status change only — project creation deferred to Phase 3)

#### Notifications

- In-app notification center with unread count, mark as read, filtering
- Email notifications for key events (idea submitted, evaluation requested, evaluation completed, idea status change, HOT! graduation, campaign phase change)
- Configurable notification frequency per user (immediately, daily digest, weekly digest)
- Follow/subscribe to ideas, campaigns, channels

#### Search & Discovery

- Global full-text search across ideas, campaigns, channels, users (PostgreSQL tsvector)
- Explore views with tile and list layouts for campaigns, channels, and ideas
- Sort by date, name, comments, votes, status
- Filter by multiple criteria
- Saved searches with favorites

#### Day 1 AI Features

- **Semantic similarity detection** — Embedding-based similar idea finding (replaces TF-IDF). Triggered on idea submission, shown in idea detail sidebar and during submission.
- **AI idea enrichment co-pilot** — Real-time suggestions during idea submission: improve description clarity, suggest tags, highlight missing information. Opt-in, not mandatory.
- **Smart summarization** — Auto-generated campaign summaries (engagement stats + top themes), evaluation session digests, and trend briefings from platform data. Available in campaign cockpit and notification digests.

#### Platform Administration

- User management (list, create, edit, deactivate, bulk actions)
- Org unit tree management (create, edit, rearrange hierarchy)
- User group management (create, assign permissions, manage members)
- Notification template editor (subject + body with variable placeholders)
- Platform customization (terminology, login page design)
- System health basics (storage usage, active users)

#### Technical Foundation

- Next.js 14+ (App Router) with TypeScript
- tRPC for type-safe API layer
- Prisma ORM with PostgreSQL 15+
- Redis for caching, sessions, and job queues
- BullMQ for async processing (email sending, similarity calculations, KPI snapshots)
- Socket.io for real-time notifications and activity feeds
- S3-compatible file storage (MinIO for self-hosted)
- Docker Compose for single-command deployment
- Responsive web design (mobile-friendly down to 375px for campaign pages, idea submission, idea detail, and evaluation forms)

### Out of Scope for MVP

#### Deferred to Phase 2 — "Strategy & Partners"

- Trends, technologies, insights (entire strategy module)
- Innovation portfolios and strategic innovation areas (SIAs)
- Organizations, contacts, use cases (entire partner module)
- Scouting boards and missions
- Campaign inspirations / "Be Inspired" tab
- Confidential ideas (parallel access control layer)
- External users, guest access, and self-registration
- Communication hub segmented email blaster
- Ad hoc evaluation sessions (cross-campaign evaluation)

#### Deferred to Phase 3 — "Value Creation"

- Projects with phase-gate processes and process designer
- Concepts and business case frameworks
- Portfolio analyzer and portfolio management
- Gate decisions and gatekeeper workflows
- KPI report export to Excel

#### Deferred to Phase 4 — "Enterprise & Advanced AI"

- Innovation Spaces (multi-tenancy / logical isolation)
- LDAP/SAML SSO (MVP uses email/password + magic link)
- White-labeling and custom branding per campaign
- External integrations (Crunchbase, MS Teams deep integration, Outlook Add-in, TrendOne)
- Invention disclosures and patent department workflow
- Generic submissions (flexible form-based submission type)
- BI connectors (Tableau, Power BI)
- Multi-language content support and content translation (DeepL/Google Translate)
- Web Clipper browser extension
- Discussion perspectives (multi-perspective thinking)
- Idea market
- PWA and native mobile app
- Advanced AI: predictive scoring, auto-categorization, AI-powered scouting, AI campaign generation

### MVP Success Criteria

**Go/No-Go gate for proceeding to Phase 2:**

| Signal                                    | Target                                                             | Measurement                            |
| ----------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Deployable                                | Docker Compose up in < 15 minutes                                  | Manual testing                         |
| Campaign lifecycle works end-to-end       | Create campaign > submit ideas > evaluate > shortlist              | E2E test suite                         |
| Evaluation engine produces ranked results | Scorecard + pairwise both produce weighted shortlists              | Integration tests                      |
| AI similarity detection works             | Finds genuinely similar ideas, not just keyword matches            | Quality evaluation against test corpus |
| Performance                               | < 200ms API response for common operations at 1,000 ideas          | Load testing                           |
| First external pilot                      | At least 1 organization outside the core team runs a real campaign | User feedback                          |
| Contributor submission flow               | Complete idea submission in under 3 minutes (mobile)               | Usability testing                      |
| Innovation Manager setup flow             | Create a campaign in under 20 minutes (first time, no training)    | Usability testing                      |

### Future Vision

#### Phase 2 — "Strategy & Partners" (Months 4-6)

Complete the second and third pillars: trend/technology scouting with hierarchy (Mega > Macro > Micro), community insights, innovation portfolios, strategic innovation area alignment, and the full partner engagement module (organization database, use case pipeline, scouting boards, contact management, interaction tracking). Add external user access, confidential ideas, and campaign-to-SIA linking. This phase makes Ignite a genuine HYPE replacement for organizations that use the strategy and partner modules.

#### Phase 3 — "Value Creation" (Months 7-9)

Complete the fourth pillar: phase-gate projects with custom process definitions, gatekeeper decisions, activity/task management, concepts with business case frameworks, and portfolio analysis. Add Excel export for KPI reports. This phase closes the idea-to-implementation loop and delivers the full lifecycle integration that is Ignite's primary differentiator.

#### Phase 4 — "Enterprise & Advanced AI" (Months 10-12)

Add enterprise-grade features: Innovation Spaces (multi-tenancy), LDAP/SAML SSO with SCIM provisioning, white-labeling, BI connectors, and external integrations. Expand AI capabilities with predictive idea success scoring, automated categorization, AI-powered scouting, and AI campaign generation. Add PWA support with push notifications. This phase enables the Enterprise Edition commercial launch.

#### Long-Term Vision (Year 2+)

- External solver networks (crowdsourced innovation challenges)
- Prediction markets for crowd-science idea selection
- Innovation Graph — ML-powered network visualization of ideas, trends, and technologies
- Autonomous idea creation from external data sources (patents, support tickets, social media)
- Hackathon management product
- Federated innovation networks (multi-instance collaboration)
- Marketplace of community-built plugins and integrations
- Managed cloud hosting offering
