---
stepsCompleted:
  [
    step-01-init,
    step-02-discovery,
    step-02b-vision,
    step-02c-executive-summary,
    step-03-success,
    step-04-journeys,
    step-05-domain,
    step-06-innovation,
    step-07-project-type,
    step-08-scoping,
    step-09-functional,
    step-10-nonfunctional,
    step-11-polish,
    step-12-complete,
  ]
inputDocuments:
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
  - docs/HYPE_Feature_List_for_Claude_Code.md
  - docs/README.md
workflowType: "prd"
classification:
  projectType: saas_b2b
  domain: innovation_management
  complexity: medium-high
  projectContext: greenfield
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 1
  projectDocs: 10
  projectContext: 0
---

# Product Requirements Document - Ignite

**Author:** Cvsilab
**Date:** 2026-03-09

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Classification](#project-classification)
3. [Success Criteria](#success-criteria)
4. [Product Scope](#product-scope)
5. [User Journeys](#user-journeys)
6. [Innovation & Novel Patterns](#innovation--novel-patterns)
7. [SaaS B2B Platform Requirements](#saas-b2b-platform-requirements)
8. [Project Scoping & Phased Development](#project-scoping--phased-development)
9. [Functional Requirements](#functional-requirements)
10. [Non-Functional Requirements](#non-functional-requirements)

## Executive Summary

Ignite is the first comprehensive open-source innovation management platform — a full-lifecycle, self-hosted alternative to HYPE Enterprise. It covers HYPE's four interconnected pillars (Idea Generation, Partner Engagement, Strategy Building, Value Creation) on a modern Next.js/tRPC/Prisma stack, with AI embedded from Day 1.

**The problem:** End-to-end innovation lifecycle management is locked behind proprietary platforms costing $50K-$100K+/year. No open-source alternative exists beyond basic ideation tools. Innovation managers at mid-to-large enterprises (500-50,000 employees) are forced to either pay enterprise licensing costs, cobble together disconnected tools (spreadsheets + Jira + email), or forgo structured innovation entirely.

**The solution:** Ignite replicates and reimagines HYPE Enterprise's complete feature set as an open-core platform. The Community Edition (AGPLv3) includes the full ideation engine, evaluation, partner management, strategy module, phase-gate projects, and reporting — genuinely useful, not a crippled teaser. The Enterprise Edition adds multi-tenancy, SSO, white-labeling, BI connectors, and priority support.

**Target users:** Innovation Program Managers (both dedicated roles and "hat-wearers" running innovation part-time), Contributors/Innovators submitting ideas, Evaluators scoring ideas in formal sessions, and Platform Operators deploying/maintaining self-hosted instances. Optimized for the hat-wearer: if it works for someone running innovation part-time, it works for everyone.

**MVP (Phase 1):** The Ideation Engine — campaigns, channels, ideas with custom fields, community features (voting, comments, HOT! graduation), scorecard and pairwise evaluation, idea boards with buckets, campaign KPI dashboards, and Day 1 AI (semantic similarity, idea enrichment co-pilot, smart summarization). This covers 80% of what 80% of HYPE customers use daily.

**Business model:** Open-core following the GitLab/Supabase/Cal.com playbook. 12-month targets: 50+ production deployments, 3,000+ GitHub stars, 3-5 paying enterprise customers, $150K-$300K ARR.

### What Makes This Special

1. **Category creator** — "The WordPress of innovation management." No OSS project covers the full lifecycle from ideation through partner scouting to phase-gate project execution. Ignite creates a new category.

2. **Full-lifecycle integration as moat** — The interconnected data flow (trend informs campaign, idea gets evaluated and becomes a project involving a scouted partner) is what makes innovation programs work. No OSS project has attempted this.

3. **Modern stack advantage** — HYPE was built on enterprise Java over many years. Ignite is built on Next.js/tRPC/Prisma — faster to develop, easier to extend, more attractive to contributors, and capable of delivering a Linear/Notion-quality interface.

4. **AI-native from Day 1** — Semantic similarity detection (embeddings, not keyword matching), AI idea enrichment co-pilot, and smart summarization are core capabilities, not premium add-ons. Phase 2 AI adds predictive scoring, auto-categorization, and AI-powered scouting.

5. **Open-core economics** — Community-driven development velocity that no proprietary vendor can match, with a clear revenue path through enterprise features that only matter at scale or in regulated environments.

6. **Hat-wearer optimization** — Designed for Innovation Managers who do this part-time. Campaign setup in 15-20 minutes (vs. 45-60 in HYPE), idea submission in under 3 minutes, evaluations in 60-90 minutes instead of 2-3 hours, instant KPI dashboards instead of manual PowerPoint.

## Project Classification

- **Project Type:** SaaS B2B Platform (self-hosted + managed cloud option)
- **Domain:** Innovation Management / Enterprise Collaboration
- **Complexity:** Medium-High — Complex interconnected workflows (campaigns, evaluations, partner pipelines, phase-gate projects), 12+ RBAC roles with context-based permissions, real-time features. No regulatory compliance burden.
- **Project Context:** Greenfield codebase with comprehensive domain knowledge (HYPE Enterprise reference implementation, 14-module feature specification, complete database schema, API design, and UI specifications already documented)
- **Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, tRPC, Prisma, PostgreSQL, Redis, BullMQ, Socket.io, S3/MinIO
- **License:** AGPLv3 (Community Edition) + BSL (Enterprise Edition)

## Success Criteria

### User Success

**Innovation Manager (Sarah):**

- Creates a campaign in under 20 minutes (first time, no training required)
- Runs evaluation sessions that complete in under 1 week (vs. 2-3 weeks with HYPE)
- Generates leadership-ready KPI dashboards instantly without touching a spreadsheet or PowerPoint
- Achieves 30-50%+ participation rates across campaigns
- NPS 50+ (vs. estimated HYPE NPS of 30-40)

**Contributor (Marco):**

- Submits an idea in under 3 minutes from mobile
- Sees idea status at every lifecycle stage (no "black hole" experience)
- Receives notification when idea is evaluated, selected, or implemented
- Returns for 2+ campaigns (40%+ return participation rate)

**Evaluator (Priya):**

- Completes 25 evaluations in 60-90 minutes (vs. 2-3 hours with HYPE)
- Has full idea context (description, attachments, comments, similar ideas) in one view
- Receives clear criteria guidance text per evaluation field

**Platform Operator (Ravi):**

- Deploys production instance via Docker Compose in under 15 minutes
- Upgrades between versions with a single command and zero downtime
- Configures SMTP, SSO, and storage via environment variables (IaC-friendly)

### Business Success

| Metric                                | 3-Month Target | 12-Month Target |
| ------------------------------------- | -------------- | --------------- |
| GitHub stars                          | 500+           | 3,000+          |
| Monthly Docker pulls                  | 100+           | 500+            |
| Production deployments                | 5+             | 50+             |
| Organizations running 3+ campaigns    | -              | 5+              |
| External contributors with merged PRs | 3+             | 15+             |
| Enterprise Edition customers          | -              | 3-5             |
| Enterprise ARR                        | -              | $150K-$300K     |
| Enterprise pipeline leads             | -              | 10+             |
| Published case studies                | -              | 1+              |

**Single-sentence 12-month test:** "50 organizations are running real innovation programs on Ignite, 5 of them are paying for Enterprise, and the community is contributing code — not just filing issues."

### Technical Success

| Metric                                 | Target                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| API response time (p95)                | < 200ms for common operations at 1,000 ideas                                              |
| Campaign lifecycle E2E                 | Create > submit > evaluate > shortlist works without errors                               |
| Evaluation engine accuracy             | Scorecard + pairwise both produce correctly weighted, ranked shortlists                   |
| AI similarity quality                  | Finds semantically similar ideas (not just keyword matches) validated against test corpus |
| Deployment time                        | Docker Compose up in < 15 minutes on fresh machine                                        |
| Test coverage                          | 80%+ unit/integration coverage on services and tRPC routers                               |
| Lighthouse score                       | 90+ Performance, 90+ Accessibility on key pages                                           |
| Zero critical security vulnerabilities | Validated by automated SAST + dependency scanning                                         |

### Measurable Outcomes

**Built-in Innovation KPI Framework (auto-calculated from platform data):**

| Tier       | KPI                                            | Benchmark                   |
| ---------- | ---------------------------------------------- | --------------------------- |
| Engagement | Awareness rate (% invited who viewed)          | 60-80%                      |
| Engagement | Participation rate (% who contributed)         | 30-50%                      |
| Engagement | Contribution depth (comments per idea)         | 3-5                         |
| Engagement | Return participation (% in 2+ campaigns)       | 40%+                        |
| Quality    | Idea funnel conversion (submitted to selected) | 5-15%                       |
| Quality    | Evaluation completion rate                     | 80%+                        |
| Quality    | Community graduation rate (HOT!)               | 10-20%                      |
| Pipeline   | Selection-to-implementation rate               | 60%+                        |
| Impact     | Innovation ROI (value vs. program cost)        | User-input, auto-aggregated |
| Impact     | Program health score (composite 0-100)         | Auto-calculated with trend  |

## Product Scope

### MVP — Minimum Viable Product (Phase 1: "The Ideation Engine")

**User Management:** Registration (email/password + magic link), profiles, RBAC (Admin, Innovation Manager, Contributor, Evaluator, Moderator), hierarchical org units, user groups.

**Campaigns:** Simple + Advanced setup wizard, full lifecycle (Draft > Seeding > Submission > Discussion & Voting > Evaluation > Closed), campaign cockpit with KPIs, audience targeting, campaign copying.

**Channels:** Always-open ideation (derived from campaign code, hasTimeline=false), simplified lifecycle.

**Ideas:** Rich text (TipTap), image/file upload, custom fields per campaign (text, keyword, selection, checkbox), tags, categories, co-authorship, threaded comments with @mentions, multi-criteria star voting, likes, community graduation (HOT!), idea connections, follow/subscribe, activity stream, suggested users.

**Idea Coach:** Toggle-based qualification phase with private review workflow and structured feedback.

**Idea Board:** Table/grid view, manual + smart buckets, split/merge ideas, column selection, filtering, bulk actions, dual-window mode.

**Evaluation:** Scorecard sessions (custom criteria, weighted results, standard deviation), pairwise sessions (side-by-side comparison with sliders), evaluator progress tracking, shortlist management, bubble chart visualization.

**Notifications:** In-app notification center + email notifications, configurable frequency (immediate/daily/weekly), follow/subscribe.

**Search:** PostgreSQL full-text search (tsvector), explore views (tile/list), sort, filter, saved searches.

**Day 1 AI:** Semantic similarity (embeddings), idea enrichment co-pilot, smart summarization.

**Admin:** User/group/org unit management, notification templates, platform customization, system health.

**Technical:** Next.js 14+, tRPC, Prisma, PostgreSQL, Redis, BullMQ, Socket.io, S3/MinIO, Docker Compose deployment, responsive web (375px+).

### Growth Features (Post-MVP)

**Phase 2 — Strategy & Partners (Months 6-8):** Trends (Mega/Macro/Micro hierarchy), technologies, insights, innovation portfolios, strategic innovation areas, organization database, use case pipeline, scouting boards, contact management, external user access, confidential ideas.

**Phase 3 — Value Creation (Months 9-11):** Phase-gate projects with custom process definitions, gatekeeper decisions, activity/task management, concepts, portfolio analysis, Excel export.

### Vision (Future)

**Phase 4 — Enterprise & Advanced AI (Months 12-14):** Innovation Spaces (multi-tenancy), LDAP/SAML SSO + SCIM, white-labeling, BI connectors, external integrations (Crunchbase, MS Teams, Outlook), advanced AI (predictive scoring, auto-categorization, AI scouting), PWA.

**Year 2+:** External solver networks, prediction markets, Innovation Graph (ML-powered network visualization), autonomous idea creation from external data, hackathon management, federated innovation networks, plugin marketplace, managed cloud hosting.

## User Journeys

### Journey 1: Sarah's First Campaign (Innovation Manager — Success Path)

**Opening Scene:** Sarah is the new Head of Innovation at a mid-size manufacturing company. She's been given a mandate to "make innovation happen" but no budget for HYPE or Brightidea. Her predecessor left behind nothing but a shared drive folder of dead PowerPoints. She discovers Ignite on GitHub at 9 PM while researching "open source innovation management."

**Rising Action:** She asks Ravi (DevOps) to spin up a Docker instance — it's running in 15 minutes. She opens the platform, creates her first user accounts, and clicks "+ New Campaign." She chooses "Simple Setup" — title: "How Can We Reduce Production Waste by 30%?", sets a banner, picks her VP of Operations as sponsor, writes two paragraphs of context, sets a 3-week submission window, and targets the Manufacturing org unit. The AI suggests adding voting criteria ("Feasibility" and "Impact") and she accepts. Total setup: 18 minutes, no training needed.

She sends the campaign link to 200 employees via email. Within 3 days, 12 ideas are submitted. The AI co-pilot helped two first-time contributors strengthen their ideas before submission. By week 2, the community graduation engine has flagged 3 ideas as HOT! based on visitor count and comment depth. She checks the campaign cockpit — 62% awareness rate, 28% participation rate, 3.4 comments per idea. She's never had data this clean before.

**Climax:** She creates a scorecard evaluation session, assigns 4 subject matter experts, and within 5 days all evaluations are complete (the system sent one reminder on day 3). She opens the results view — weighted scores, standard deviation indicators, a bubble chart showing Impact vs. Feasibility. She shortlists the top 5 ideas with one click each. The entire evaluation that used to take 3 weeks at her old company took 5 days.

**Resolution:** Sarah walks into the quarterly leadership meeting with an auto-generated dashboard showing: 28% participation (up from 0%), 47 ideas submitted, 5 selected for implementation, estimated value of $340K across the shortlisted ideas. The CFO asks "can we run one of these for supply chain too?" Sarah smiles — she can set up the next campaign during lunch.

**Capabilities revealed:** Campaign wizard (simple + advanced), audience targeting, campaign cockpit KPIs, community graduation, evaluation sessions, weighted scoring, bubble chart, shortlisting, idea enrichment co-pilot, smart reminders, auto-generated dashboards.

---

### Journey 2: Marco's Idea Gets Lost (Contributor — Edge Case / Recovery)

**Opening Scene:** Marco, a logistics team lead, receives an email about a new campaign: "Ideas to Cut Last-Mile Delivery Costs." He's been complaining about this for months. He opens the link on his phone during his commute.

**Rising Action:** He taps "Submit Idea," types a title: "Consolidate Weekend Deliveries into Hub Drops." The AI co-pilot suggests he add more detail about estimated savings and suggests the tag "logistics." He adds two paragraphs and uploads a photo of the whiteboard sketch from his team meeting. Total time: 2 minutes 40 seconds. He gets an in-app notification: "Your idea has been submitted to Discussion."

Two weeks pass. Marco's idea gets 4 comments and 3 votes but doesn't reach HOT! status. The campaign closes and moves to evaluation. Marco gets a notification: "Your idea is being evaluated." A week later: "Evaluation complete — your idea was not shortlisted."

**Climax:** Here's where many platforms fail — the "black hole" moment. But Ignite sends Marco a notification with the evaluation summary: "Your idea scored 3.2/5 on Feasibility (evaluators noted concerns about cold chain logistics for consolidated drops) and 4.1/5 on Impact. It ranked #8 of 34 ideas. The top 5 were selected. Thank you for contributing — your idea has been archived with these scores for future reference."

**Resolution:** Marco is disappointed but not disengaged. He saw exactly where his idea fell, understood why, and knows his contribution was valued. When the next campaign launches ("Improve Warehouse Safety"), he submits another idea. His return participation makes him part of the 40%+ who come back.

**Capabilities revealed:** Mobile-responsive idea submission, AI co-pilot suggestions, file upload from phone, idea status tracking with notifications at every stage, evaluation feedback to non-selected contributors, archive with scores, re-engagement through transparency.

---

### Journey 3: Priya's Evaluation Sprint (Evaluator — Time-Constrained)

**Opening Scene:** Dr. Priya Sharma, R&D Director, receives an email: "You've been invited to evaluate 25 ideas in the Q4 Sustainability Challenge. Due date: Friday." It's Tuesday. She has 3 board meetings this week.

**Rising Action:** She opens Ignite on her iPad between meetings. The evaluation dashboard shows "0 of 25 completed." She taps the first idea — the left panel shows the full idea (title, description, custom fields, attachments, 8 comments, 2 similar ideas detected). The right panel shows the scorecard: three criteria (Impact, Feasibility, Strategic Fit) each with a 1-5 scale and guidance text explaining what each score level means. She reads, scores, taps "Done & Next." 3 minutes per idea.

She completes 8 evaluations before her 2 PM meeting. That evening, she does 10 more from home. On Thursday morning, she finishes the remaining 7. Total: 25 evaluations in approximately 75 minutes of focused time, spread across 3 sessions.

**Climax:** On Friday, Priya opens the results view. She can see her scores alongside the panel average, with standard deviation indicators highlighting where she disagreed with other evaluators. Idea #7 ("Biodegradable Packaging Film") shows high disagreement — she scored it 5/5 on Impact but others scored 2/5. She leaves a comment explaining her reasoning. The Innovation Manager sees this and adds it to the shortlist discussion.

**Resolution:** Priya gets a thank-you notification with a summary: "You completed all 25 evaluations. Your most aligned idea with the panel: #12. Your most contrarian view: #7 (added to shortlist discussion based on your input)." She feels her expertise was genuinely valued, not just box-ticking.

**Capabilities revealed:** Evaluation invitation workflow, evaluator dashboard with progress tracking, split-panel evaluation UX (idea context + scorecard side-by-side), guidance text per criterion, save-and-continue across sessions, tablet-optimized layout, results comparison with panel, standard deviation indicators, smart reminders, evaluator acknowledgment.

---

### Journey 4: James Sets Up the Platform (Platform Admin — Configuration)

**Opening Scene:** James, IT Applications Manager, gets a Slack message from the VP of Strategy: "Can you set up this Ignite thing? I found it on GitHub and want to pilot it for our innovation program." James has never heard of innovation management software.

**Rising Action:** James pulls up the GitHub README. It says: "Docker Compose: `docker compose up -d`." He clones the repo, copies `.env.example` to `.env`, fills in his PostgreSQL connection string (they already have a managed Postgres instance), SMTP credentials, and S3 bucket details. He runs `docker compose up -d`. Three containers start: app, redis, worker. He opens `http://localhost:3000` — the setup wizard appears.

The setup wizard walks him through: (1) Create admin account, (2) Set organization name and logo, (3) Configure org unit hierarchy (he imports from their LDAP structure), (4) Create initial user groups (Admin, Innovation Manager, Contributor, Evaluator), (5) Test email delivery. He clicks "Complete Setup."

**Climax:** James opens the admin panel. It's clearly separated into two sections: "System Administration" (SMTP, storage, SSO, health monitoring — his domain) and "Innovation Configuration" (campaigns, templates, notification text — not his domain). He configures SMTP, verifies the health endpoint returns 200, sets up a daily backup cron job using the documented backup script, and adds the Prometheus metrics endpoint to their Grafana instance.

**Resolution:** James sends the VP of Strategy a message: "Ignite is live at ignite.company.com. I've set you up as Innovation Manager. The admin panel for campaign stuff is under Settings > Innovation Configuration. I'll handle the server side — you handle the innovation side." He never needs to understand what a "campaign" or "idea coach" is. His Grafana dashboard shows the instance is healthy. He adds Ignite to his weekly maintenance checklist alongside their other self-hosted tools.

**Capabilities revealed:** Docker Compose deployment, .env configuration, setup wizard, LDAP/directory import for org units, admin panel with clear System vs. Innovation separation, health endpoint, Prometheus metrics, backup/restore documentation, zero domain knowledge required for operations.

---

### Journey 5: Victoria Sponsors a Campaign (Executive Sponsor — Lightweight Engagement)

**Opening Scene:** Victoria, Chief Strategy Officer, is asked by Sarah to sponsor the Q1 "Future of Customer Experience" campaign. Victoria cares deeply about the topic but has zero time for platform administration.

**Rising Action:** Sarah sets up the campaign and adds Victoria as sponsor. Victoria receives an email: "You've been added as Campaign Sponsor for 'Future of Customer Experience.'" She clicks through to a streamlined sponsor view — not the full management interface. She sees the campaign description Sarah drafted, approves it, and records a 60-second video introduction using her phone, which she uploads directly.

During the campaign's submission phase, Victoria receives a weekly digest email: "This week: 14 new ideas, 3 trending. Top idea: 'AI-Powered Customer Sentiment Dashboard' by Omar Hassan (4.6 avg rating, 23 comments)." She clicks through, reads Omar's idea, and leaves a comment: "This aligns perfectly with our CX strategy. Let's explore this further." Her comment triggers a notification to Omar and a visible boost in the idea's activity — other employees see the CSO is engaged.

**Climax:** After evaluation, Sarah presents the shortlist. Victoria reviews the 5 shortlisted ideas in a clean executive summary view — each idea with a one-paragraph AI-generated summary, evaluation scores, and estimated business impact. She approves the shortlist and writes a personalized thank-you note to each shortlisted contributor through the platform.

**Resolution:** At the quarterly town hall, Victoria presents the campaign results using the auto-generated dashboard — participation rates, idea funnel, and the 5 selected ideas. She credits the contributors by name. The organization sees that leadership takes innovation seriously, setting the stage for even higher participation in Q2.

**Capabilities revealed:** Sponsor role with streamlined view, video upload for campaign introduction, weekly digest emails with trending ideas, executive comment visibility, AI-generated idea summaries for executive review, shortlist approval workflow, personalized contributor recognition, auto-generated presentation-ready dashboards.

---

### Journey 6: Ravi Handles an Upgrade and Incident (Platform Operator — Operations)

**Opening Scene:** Ravi, DevOps Engineer, receives an automated notification from his monitoring system: Ignite v1.2.0 is available (he subscribed to GitHub releases). The changelog mentions performance improvements and a new pairwise evaluation mode.

**Rising Action:** Ravi checks the migration guide in the release notes. It lists one database migration (adding a column to the EvaluationSession table) and no breaking API changes. He schedules a maintenance window for Saturday 2 AM. He pulls the new image (`docker pull ignite:1.2.0`), runs `docker compose down && docker compose up -d` — the startup script automatically detects and runs pending migrations. Health check passes. Total downtime: 47 seconds.

Monday morning, Sarah reports that the campaign cockpit is loading slowly — 8 seconds instead of the usual instant load. Ravi checks the Prometheus metrics dashboard: PostgreSQL query time for the KPI aggregation query spiked. He identifies that a campaign with 2,000 ideas is hitting a missing index. He checks the Ignite troubleshooting docs, finds the recommended index, applies it, and response time drops to 180ms.

**Climax:** Three months later, the organization wants to run Ignite for a second business unit. Ravi evaluates options: same instance with org units (works for Community Edition) or separate instances. He chooses same instance, creates a new org unit hierarchy, and configures audience targeting so each business unit only sees their own campaigns. No additional infrastructure needed.

**Resolution:** Ravi has maintained Ignite for 6 months with zero unplanned downtime. His total time investment: 30 minutes per month for updates and monitoring. He recommends Ignite to his DevOps community as "one of the easiest self-hosted tools we run — up there with Plausible and Gitea."

**Capabilities revealed:** Docker-based upgrade with automatic migrations, zero/minimal downtime upgrades, Prometheus metrics for monitoring, health check endpoints, troubleshooting documentation, performance tuning guidance, multi-org-unit deployment within single instance, low operational overhead.

### Journey Requirements Summary

| Journey                         | Key Capabilities Revealed                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Sarah (Innovation Manager)      | Campaign wizard, cockpit KPIs, evaluation engine, shortlisting, AI co-pilot, auto-generated dashboards                                 |
| Marco (Contributor - Edge Case) | Mobile submission, AI enrichment, idea status tracking, evaluation feedback for non-selected ideas, re-engagement through transparency |
| Priya (Evaluator)               | Split-panel evaluation UX, save-and-continue, tablet optimization, results comparison, smart reminders                                 |
| James (Platform Admin)          | Docker deployment, setup wizard, admin panel separation (System vs. Innovation), health endpoints, backup/restore                      |
| Victoria (Executive Sponsor)    | Streamlined sponsor view, weekly digests, executive summary with AI summaries, recognition tools                                       |
| Ravi (Platform Operator)        | Docker upgrades with auto-migration, Prometheus metrics, troubleshooting docs, multi-org scaling, low maintenance overhead             |

**Coverage validation:**

- Primary user success path (Sarah) — covered
- Primary user edge case / failure recovery (Marco) — covered
- Time-constrained secondary user (Priya) — covered
- Admin/configuration (James) — covered
- Executive/lightweight engagement (Victoria) — covered
- Operations/troubleshooting (Ravi) — covered
- External user (Alex) — deferred to Phase 2 (external access not in MVP)
- API/integration consumer — deferred (no public API integrations in MVP)

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Category Creation: First Comprehensive OSS Innovation Management Platform**
No open-source project covers the full innovation lifecycle. OpenideaL handles basic ideation. Ignite covers ideation + evaluation + partner management + strategy + phase-gate projects in one connected platform. This is analogous to what GitLab did for DevOps (unified platform vs. point tools) — but in a market with zero OSS presence.

**2. AI-Native Innovation Management**
Every competitor (HYPE, IdeaScale, Brightidea, Qmarkets) is bolting AI features onto platforms built 5-15 years ago. Ignite builds with AI in the foundation:

- Semantic similarity detection using embeddings (vs. HYPE's Lucene/TF-IDF keyword matching)
- AI idea enrichment co-pilot during submission (no competitor has real-time AI coaching during idea creation)
- Smart summarization generating narrative insights from platform data (vs. manual PowerPoint creation)

This isn't AI for AI's sake — each capability directly addresses a validated user pain point (duplicate ideas, low-quality submissions, time-consuming reporting).

**3. Full-Lifecycle Data Integration**
The novel pattern is not any single module — it's the interconnected data flow: a trend informs a campaign challenge, an idea from that campaign gets evaluated and shortlisted, the winning idea becomes a project, which involves a partner discovered through scouting. This creates a "knowledge graph" of innovation activity that no point-tool combination can replicate. The data model is designed from Day 1 to support cross-entity relationships (idea-to-trend, idea-to-organization, campaign-to-SIA).

**4. Open-Core Model in an Enterprise-Only Market**
Innovation management is exclusively a paid enterprise market ($50K-$100K+/year per platform). No one has attempted the open-core disruption pattern here. The community edition is genuinely useful (not a teaser), creating a bottom-up adoption flywheel that proprietary vendors cannot replicate.

### Market Context & Competitive Landscape

| Innovation Aspect            | Closest Competitor               | Ignite's Advantage                                      |
| ---------------------------- | -------------------------------- | ------------------------------------------------------- |
| OSS full-lifecycle platform  | None (category creation)         | First mover, community development velocity             |
| AI-native architecture       | HYPE (AI Coach, 2024)            | Built-in from Day 1 vs. bolted-on; model-agnostic       |
| Modern tech stack            | All competitors on older stacks  | Developer attraction, contribution velocity, UX quality |
| Open-core pricing disruption | None in this market              | 60-80% cost reduction vs. incumbents                    |
| Hat-wearer optimization      | All designed for full-time teams | Broader TAM, faster time-to-value                       |

Market validation: $3.17B market (2026) growing at 14.55% CAGR to $10.77B (2035). 79% of boards now require quarterly innovation KPI reviews. The demand exists — the accessibility doesn't.

### Validation Approach

| Innovation                 | Validation Method                           | Success Signal                                                         |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Category creation (OSS)    | GitHub traction + production deployments    | 3,000 stars, 50 deployments in 12 months                               |
| AI-native features         | A/B comparison vs. keyword-based similarity | Semantic similarity finds 2x more true duplicates than TF-IDF          |
| Full-lifecycle integration | User retention across modules               | Organizations using 2+ modules retain at 80%+                          |
| Open-core disruption       | Community-to-enterprise conversion          | 5-10% of production deployments convert to paid                        |
| Hat-wearer optimization    | Time-to-first-campaign                      | Hat-wearers complete first campaign setup in < 20 min without training |

### Risk Mitigation

| Risk                              | Likelihood | Impact | Mitigation                                                                                                                            |
| --------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| HYPE releases OSS version         | Low        | High   | Move fast, build community moat. HYPE's Java architecture makes OSS transition unlikely.                                              |
| AI features don't deliver quality | Medium     | Medium | Fallback to non-AI alternatives (keyword search works, manual summarization works). AI is enhancement, not dependency.                |
| Open-core model undermonetizes    | Medium     | Medium | Enterprise features target genuine scale needs (multi-tenancy, SSO, compliance). Follow GitLab's proven enterprise feature selection. |
| Community doesn't materialize     | Medium     | High   | Seed with compelling demo content, excellent docs, contributor guides. First 10 contributors are founder-recruited, not organic.      |
| Scope creep beyond MVP            | High       | High   | Phase gates with explicit success criteria. No Phase 2 until MVP metrics are met. Product brief and PRD enforce boundaries.           |

## SaaS B2B Platform Requirements

### Project-Type Overview

Ignite is a self-hosted-first B2B SaaS platform with an optional managed cloud offering. Unlike typical cloud-only B2B SaaS, the primary deployment model is customer-managed infrastructure (Docker Compose / Kubernetes), with a commercial managed hosting option for organizations that prefer not to self-host. This inverts the typical SaaS architecture: the platform must work excellently as a single-tenant self-hosted application first, with multi-tenancy layered on top in Phase 4.

### Technical Architecture Considerations

#### Tenant Model

**MVP (Phase 1-3): Single-tenant, self-hosted**

- Each organization runs its own Ignite instance on their infrastructure
- Data isolation is physical (separate database per instance)
- Org units provide logical separation within an instance (departments, business units)
- Audience targeting on campaigns controls visibility between org units
- No shared infrastructure between organizations

**Phase 4: Multi-tenant via Innovation Spaces**

- Innovation Spaces provide logical isolation within a single instance
- Each Space has its own admins, campaigns, SIAs, and user scope
- Shared user directory with space-level access control
- Data is logically isolated (row-level security or schema-per-space)
- Required for Enterprise Edition: consulting firms managing multiple clients, large enterprises with independent divisions

**Managed Cloud (Future):**

- Database-per-tenant isolation (not row-level — enterprise customers require hard isolation)
- Tenant provisioning via admin API
- Per-tenant resource limits and usage metering
- Tenant-specific custom domains and branding

#### RBAC Matrix

| Role               | Scope                  | Key Permissions                                                                                             |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Platform Admin     | Global                 | Full system configuration, user management, all features                                                    |
| Innovation Manager | Global or Space        | Create/manage campaigns, channels, evaluation sessions, view all ideas, manage buckets, view KPI dashboards |
| Campaign Manager   | Per-campaign           | Manage specific campaign: settings, lifecycle, communication, idea board                                    |
| Campaign Sponsor   | Per-campaign           | View campaign, comment on ideas, approve shortlists, access executive summary                               |
| Moderator          | Per-campaign           | Moderate comments, flag content, keep discussions alive                                                     |
| Evaluator          | Per-session            | Evaluate assigned ideas, view own scores, view panel results (if permitted)                                 |
| Idea Coach         | Per-campaign/category  | Review ideas in qualification, provide private feedback, publish to community                               |
| Contributor        | Global                 | Submit ideas, comment, vote, like, follow, view own submissions                                             |
| External User      | Per-campaign (Phase 2) | Submit proposals via invitation, track status, respond to questions                                         |
| Partner Scout      | Global (Phase 2)       | Manage organizations, scouting boards, use case pipeline                                                    |
| Portfolio Manager  | Global (Phase 3)       | Create/manage projects, define processes, view portfolio analysis                                           |
| Gatekeeper         | Per-project (Phase 3)  | Review gate materials, make go/no-go decisions                                                              |

**Permission resolution order:** Global Role > Resource Role > Scope (Innovation Space / Org Unit membership). Platform Admin bypasses all checks.

#### Subscription Tiers (Open-Core Split)

| Capability                                            | Community (AGPLv3) | Enterprise (BSL) |
| ----------------------------------------------------- | ------------------ | ---------------- |
| Campaigns, channels, ideas                            | Full               | Full             |
| Evaluation engine (scorecard + pairwise)              | Full               | Full             |
| Idea boards with buckets                              | Full               | Full             |
| Campaign cockpit KPIs                                 | Full               | Full             |
| Day 1 AI (similarity, co-pilot, summarization)        | Full               | Full             |
| Partner management (Phase 2)                          | Full               | Full             |
| Strategy module (Phase 2)                             | Full               | Full             |
| Phase-gate projects (Phase 3)                         | Full               | Full             |
| Core reporting                                        | Full               | Full             |
| Notifications (in-app + email)                        | Full               | Full             |
| Single-tenant deployment                              | Full               | Full             |
| Innovation Spaces (multi-tenancy)                     | -                  | Phase 4          |
| LDAP/SAML SSO + SCIM provisioning                     | -                  | Phase 4          |
| White-labeling (custom domain, branding, email)       | -                  | Phase 4          |
| BI connectors (Tableau, Power BI)                     | -                  | Phase 4          |
| External integrations (Crunchbase, MS Teams, Outlook) | -                  | Phase 4          |
| Priority support + SLA                                | -                  | All phases       |
| Managed cloud hosting                                 | -                  | Future           |

#### Integration Architecture (Phased)

**MVP — Built-in:**

- Email (SMTP) for notifications
- S3-compatible storage (MinIO / AWS S3) for file uploads
- Redis for caching, sessions, and job queues
- PostgreSQL full-text search (tsvector)

**Phase 2-3 — Platform integrations:**

- Webhook system (configurable outgoing webhooks for all events)
- REST API for data export and custom integrations

**Phase 4 — Enterprise integrations:**

- Microsoft Teams (deep integration: tabs, bot, message extensions)
- Slack (bidirectional: submit ideas, receive notifications)
- Jira / Azure DevOps (sync selected ideas as tickets)
- Crunchbase (organization import and enrichment)
- LDAP/SAML for SSO
- SCIM for automated user provisioning
- Power BI / Tableau connectors for BI integration
- Zapier/Make/n8n compatibility via webhook + REST API

#### Compliance & Security

**MVP:**

- Authentication: email/password with bcrypt hashing + magic link
- Session management: JWT in httpOnly cookies with Redis-backed sessions
- CSRF protection on all state-changing endpoints
- Rate limiting on authentication and API endpoints (Redis-backed)
- Input sanitization and parameterized queries (Prisma prevents SQL injection)
- File upload validation (type, size, content scanning)
- HTTPS enforcement in production
- CORS configuration
- Content Security Policy headers

**Phase 4 — Enterprise:**

- LDAP/SAML SSO with SCIM provisioning
- Audit log (comprehensive trail of all platform actions)
- Data residency controls (EU, US, APAC hosting options)
- GDPR compliance tools (right to erasure, data export, user anonymization)
- SOC 2 readiness (audit logs, access controls, encryption at rest)
- 2FA support (TOTP)
- IP whitelisting
- Session management UI (view and terminate active sessions)

### Implementation Considerations

**Deployment strategy:**

- Docker Compose as primary deployment method (single command, works everywhere)
- Kubernetes Helm chart for production-grade deployments (Phase 2)
- All configuration via environment variables (12-factor app, IaC-friendly)
- Automatic database migrations on startup
- Health check endpoint (/api/health) for load balancer and monitoring
- Prometheus metrics endpoint (/api/metrics) for observability
- Graceful shutdown handling

**Performance targets:**

- API response time: < 200ms p95 for common operations
- Page load: < 2s initial, < 500ms subsequent (client-side navigation)
- Search: < 300ms for full-text queries across 100K ideas
- Real-time: < 100ms Socket.io event delivery
- Concurrent users: Support 500 concurrent users per instance on modest hardware (4 vCPU, 8GB RAM)
- Database: Optimized for up to 100K ideas, 500 campaigns, 50K users per instance

**Data model considerations:**

- Soft deletes on all user-facing entities (preserve data integrity, support undo)
- Cursor-based pagination for all list endpoints (stable pagination under concurrent writes)
- Optimistic concurrency control for collaborative editing scenarios
- Event sourcing for activity feeds and audit trail (ActivityLog table)
- Materialized views or scheduled aggregation for KPI dashboards (avoid expensive real-time aggregation)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP — deliver the complete ideation-to-evaluation loop that covers 80% of what 80% of HYPE customers use daily. Not a feature demo, but a genuinely usable product that an Innovation Manager can deploy and run real campaigns with.

**Resource Reality:**

- **Team:** Solo developer (Sarath) with Claude Code as AI-assisted development partner
- **Effective hours:** 15-20 hours/week (evenings and weekends alongside full-time role)
- **AI multiplier:** Claude Code handles scaffolding, CRUD routes, UI components, Prisma migrations, and test suites. Human focuses on architecture, integration, review, debugging, and deployment.
- **Bottleneck:** Architecture and integration decisions, not coding velocity
- **Origin story model:** Cal.com / Plausible pattern — solo founder ships solid V1, community builds on it

### MVP Feature Set (Phase 1: "The Ideation Engine")

**Timeline: 20 weeks (5 months) at 15-20 hrs/week**
Compressible to 12 weeks with a second full-time developer.

| Weeks | Focus                    | Deliverable                                                                                                           |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1-3   | Foundation               | Next.js project, Prisma schema, auth (NextAuth), RBAC middleware, basic layout shell, Docker Compose                  |
| 4-7   | Campaigns                | Campaign CRUD, wizard (simple + advanced), lifecycle state machine, cockpit KPIs                                      |
| 8-11  | Ideas                    | Idea submission, custom fields, discussion, voting, likes, community graduation, idea board with buckets, merge/split |
| 12-15 | Evaluation               | Scorecard sessions, pairwise sessions, results engine with weighted scoring, shortlist management                     |
| 16-17 | Channels + Notifications | Channel variant (derived from campaigns), notification system (in-app + email), follow/subscribe                      |
| 18-19 | AI + Search              | Semantic similarity (embeddings), idea co-pilot, smart summarization, full-text search                                |
| 20    | Polish + Ship            | Dashboard, responsive fixes, Docker packaging, README, seed data, first public release                                |

**Core User Journeys Supported by MVP:**

- Sarah creates and manages a campaign end-to-end (Journey 1)
- Marco submits an idea and receives feedback at every stage (Journey 2)
- Priya completes evaluations efficiently on tablet (Journey 3)
- James deploys and configures the platform (Journey 4)
- Victoria sponsors a campaign with lightweight engagement (Journey 5)
- Ravi operates and upgrades the platform (Journey 6)

**Must-Have Capabilities:**

- User management with contextual RBAC (roles + campaign membership + org unit scope)
- Campaign lifecycle state machine (Draft > Seeding > Submission > Discussion & Voting > Evaluation > Closed)
- Campaign wizard (simple setup with smart defaults + advanced 5-step wizard)
- Idea submission with custom fields, rich text, file attachments
- Community features: threaded comments, multi-criteria star voting, likes, community graduation (HOT!)
- Idea board with manual and smart buckets, split, merge, bulk actions
- Idea coach / qualification phase (toggle-based private review workflow)
- Scorecard evaluation sessions with weighted results and standard deviation
- Pairwise evaluation sessions with slider scoring
- Shortlist management with bubble chart visualization
- Campaign cockpit with 4-tier KPI framework
- Channels (always-open ideation derived from campaign code)
- In-app notification center + email notifications with configurable frequency
- Global full-text search (PostgreSQL tsvector)
- Day 1 AI: semantic similarity (pgvector + local embeddings), idea enrichment co-pilot, smart summarization
- User dashboard with tasks, activity feed, active campaigns
- Docker Compose single-command deployment
- Responsive web (mobile-friendly for submission, evaluation, and idea detail)

### Post-MVP Features

**Phase 2 — Strategy & Partners (Months 6-8):**

- Trends with Mega/Macro/Micro hierarchy, technologies, community insights
- Innovation portfolios and strategic innovation area alignment
- Campaign-to-SIA linking and "Be Inspired" tab
- Organization database, contacts, use case pipeline (Identified > Partnership)
- Scouting boards with custom columns and drag-and-drop
- External user access and guest submissions
- Confidential ideas with parallel access control
- Communication hub with segmented email
- Ad hoc evaluation sessions
- Webhook system and REST API for integrations
- Kubernetes Helm chart

**Phase 3 — Value Creation (Months 9-11):**

- Phase-gate projects with custom process definitions
- Gatekeeper decision workflows (forward, rework, postpone, terminate)
- Activity/task management with assignees and deadlines
- Concepts with business case frameworks
- Portfolio analyzer with portfolio-level reporting
- KPI report export to Excel
- Idea-to-project traceability

**Phase 4 — Enterprise & Advanced AI (Months 12-14):**

- Innovation Spaces (multi-tenancy with logical isolation)
- LDAP/SAML SSO with SCIM provisioning
- White-labeling (custom domain, branding, email templates)
- BI connectors (Tableau, Power BI)
- External integrations (Crunchbase, MS Teams, Slack, Jira, Outlook)
- Advanced AI: predictive idea scoring, auto-categorization, AI-powered scouting
- PWA with push notifications
- 2FA, audit log, data residency controls
- Managed cloud hosting offering

### Risk Mitigation Strategy

**Risk #1: RBAC + Context-Based Permissions (HIGH)**

- Impact: Touches every endpoint and every UI component. Contextual permissions (Evaluator in Campaign A, Contributor in Campaign B) create complex permission resolution.
- Mitigation: Build `checkAccess(user, resource, action)` middleware as the very first thing after auth (Week 1-2). Extensive permission edge case tests before building any features. Permission resolution: Global Role > Resource Role > Scope.

**Risk #2: Campaign Lifecycle State Machine (MEDIUM-HIGH)**

- Impact: 6 campaign states with conditional transitions, auto-transitions on date, manual fast-track. Ideas have 10+ statuses with own transition rules. Wrong state machine = cascading bugs.
- Mitigation: Implement as explicit state machine pattern. Define all valid transitions and guards upfront. Write state transition tests for every path including reversals (Evaluation back to Submission).

**Risk #3: Evaluation Engine Scoring Math (MEDIUM)**

- Impact: Weighted scoring, normalized ratings, standard deviation, and pairwise ranking (Bradley-Terry model) must be mathematically correct. Wrong math = zero evaluation credibility.
- Mitigation: Implement as pure functions with comprehensive unit tests against known inputs/outputs. Use established Bradley-Terry algorithm for pairwise, not custom invention.

**Risk #4: AI Embedding Pipeline (MEDIUM)**

- Impact: Operational complexity of generating, storing, and updating vector embeddings. Fallback behavior when AI is unavailable.
- Mitigation: Use pgvector (embeddings alongside data, no separate vector DB). Default to local model (sentence-transformers via ONNX in Node.js) — works without external API keys. **Entire AI layer is optional** — platform functions fully without it, falling back to PostgreSQL full-text search.

**Risk #5: Solo Developer Bus Factor (MEDIUM)**

- Impact: Single point of failure for all decisions and code.
- Mitigation: Comprehensive documentation from Day 1 (CLAUDE.md, architecture decisions, API docs). Clean code that a contributor can understand without context. CI/CD from Week 1. Public development — all decisions documented in GitHub issues/discussions. Early community building to attract first contributors post-V1.

**Non-risk: Performance at MVP scale.** At 1,000 ideas and 50 concurrent users, PostgreSQL with proper indexes handles everything. Don't over-engineer for scale you don't have yet. Performance optimization is a Phase 4 concern.

## Functional Requirements

### User Management & Access Control

- FR1: Users can register with email/password or magic link and create a profile with name, avatar, bio, and skills
- FR2: Platform Admin can create, edit, deactivate, and bulk-manage user accounts
- FR3: Platform Admin can define a hierarchical organizational unit structure and assign users to org units
- FR4: Platform Admin can create user groups with configurable permissions and manage group membership
- FR5: The system enforces contextual role-based access control resolving permissions through Global Role > Resource Role > Scope (org unit/audience)
- FR6: Users can view and update their profile, notification preferences, and language settings
- FR7: Users can view a personalized dashboard showing their tasks, active campaigns, and activity feed

### Campaign Management

- FR8: Innovation Manager can create a campaign using either Simple Setup (smart defaults, minimal fields) or Advanced Setup (5-step wizard with full configuration)
- FR9: Innovation Manager can configure campaign description, banner image, timeline, sponsor, tags, attachments, call-to-action, and support section
- FR10: Innovation Manager can define custom submission form fields per campaign (text, keyword, selection, checkbox) with ordering, mandatory flags, and visibility conditions
- FR11: Innovation Manager can configure idea coach settings (enable/disable, assignment mode: global or per-category, category definitions)
- FR12: Innovation Manager can define the campaign community (moderators, evaluation team, seeding team, target audience by org unit/group/individual)
- FR13: Innovation Manager can configure campaign settings (qualification phase, voting criteria, community graduation thresholds, notification preferences, confidentiality mode)
- FR14: Innovation Manager can manage campaign lifecycle transitions (Draft > Seeding > Submission > Discussion & Voting > Evaluation > Closed) both manually and via scheduled auto-transition
- FR15: Innovation Manager can copy an existing campaign as a template for a new campaign
- FR16: Innovation Manager can view a campaign cockpit with KPIs (awareness rate, participation rate, activity metrics, idea funnel visualization)
- FR17: Campaign Sponsor can view campaign details, comment on ideas, and approve evaluation shortlists through a streamlined executive view

### Channel Management

- FR18: Innovation Manager can create and manage always-open channels with no timeline or deadline
- FR19: Channels support the same idea submission, discussion, voting, evaluation, and idea board features as campaigns

### Idea Submission & Lifecycle

- FR20: Contributors can submit ideas with rich text description, image upload, file attachments, custom field values, tags, and category selection
- FR21: The AI co-pilot can suggest improvements to idea descriptions, recommend tags, and highlight missing information during submission (opt-in)
- FR22: Contributors can save ideas as drafts and submit them later
- FR23: Contributors can add co-authors to their ideas
- FR24: The system can detect and display semantically similar ideas during submission and on the idea detail page
- FR25: Idea Coach can privately review ideas in qualification phase, provide structured feedback, and publish approved ideas to community discussion
- FR26: The system manages idea lifecycle transitions (Draft > Qualification > Community Discussion > HOT! > Evaluation > Selected/Archived) with appropriate access rules per status
- FR27: Ideas automatically graduate to HOT! status when community engagement metrics meet campaign-defined thresholds (visitors, commenters, voters, voting level, days)
- FR28: Innovation Manager can manually change idea status, archive ideas with reason, and unarchive ideas

### Community Engagement

- FR29: Users can comment on ideas with threaded replies and @mentions
- FR30: Users can vote on ideas using multi-criteria star ratings (configurable criteria per campaign, default: single overall rating)
- FR31: Users can like ideas
- FR32: Users can follow/subscribe to ideas, campaigns, and channels to receive updates
- FR33: Users can view an activity stream on each idea showing all events chronologically
- FR34: The system can suggest relevant users for an idea based on skills and contribution history
- FR35: Moderators can flag comments as inappropriate

### Idea Board & Management

- FR36: Innovation Manager can view all ideas in a campaign as a sortable, filterable table/grid with configurable columns
- FR37: Innovation Manager can create, name, and color-code manual buckets and assign ideas to them
- FR38: Innovation Manager can create smart buckets that auto-populate based on saved filter criteria
- FR39: Innovation Manager can split one idea into multiple ideas
- FR40: Innovation Manager can merge multiple ideas into one, preserving all comments, votes, and contributor attribution
- FR41: Innovation Manager can perform bulk actions on selected ideas (assign bucket, archive, export)
- FR42: Innovation Manager can use dual-window mode to compare ideas side by side

### Evaluation Engine

- FR43: Innovation Manager can create scorecard evaluation sessions with custom criteria, field types (selection scale, text, checkbox), conditional visibility, and evaluator guidance text
- FR44: Innovation Manager can create pairwise evaluation sessions where evaluators compare ideas side by side on configurable criteria
- FR45: Innovation Manager can assign evaluation teams (per session), set due dates, and send reminder notifications
- FR46: Innovation Manager can add ideas to evaluation sessions from buckets or directly
- FR47: Evaluators can view pending evaluations, score ideas against criteria, save progress, and resume across sessions
- FR48: Evaluators can complete pairwise comparisons using slider-based scoring per criterion
- FR49: Innovation Manager can track evaluation progress (% complete per evaluator) and send reminders to incomplete evaluators
- FR50: The system calculates weighted scores, normalized rankings, and standard deviation per criterion across all evaluator responses
- FR51: Innovation Manager can view evaluation results as a sortable table and as a bubble chart (two criteria as axes, score as bubble size)
- FR52: Innovation Manager can add/remove ideas from the shortlist and lock the shortlist after final session
- FR53: Innovation Manager can forward shortlisted ideas to Implementation, Concept, or Archive status
- FR54: Session templates can be saved and reused across campaigns

### Notifications & Communication

- FR55: Users receive in-app notifications for key events (idea submitted, evaluation requested, idea status change, HOT! graduation, campaign phase change, comments on followed items)
- FR56: Users receive email notifications with configurable frequency (immediately, daily digest, weekly digest)
- FR57: Users can view, filter, mark as read, and manage notifications in an in-app notification center
- FR58: The system displays an unread notification count badge in the header

### Search & Discovery

- FR59: Users can perform global full-text search across ideas, campaigns, channels, and users
- FR60: Users can explore campaigns, channels, and ideas in tile and list view layouts with sorting and multi-criteria filtering
- FR61: Users can save searches as favorites for quick access

### AI & Intelligence

- FR62: The system generates semantic vector embeddings for ideas and uses them to find genuinely similar ideas (meaning-based, not keyword-based)
- FR63: The AI idea enrichment co-pilot provides real-time suggestions during idea submission to improve description quality, suggest tags, and identify gaps
- FR64: The system generates AI-powered summaries for campaigns (engagement overview + top themes), evaluation sessions (results digest), and notification digests
- FR65: The AI layer operates as an optional enhancement — the platform functions fully without AI, falling back to PostgreSQL full-text search for similarity

### Platform Administration

- FR66: Platform Admin can manage users, groups, and org unit hierarchy through a dedicated admin interface
- FR67: Platform Admin can edit notification templates (subject, body with variable placeholders)
- FR68: Platform Admin can customize platform terminology and login page appearance
- FR69: Platform Admin can view system health information (storage usage, active user counts)
- FR70: The admin panel separates "System Administration" (SMTP, storage, health) from "Innovation Configuration" (campaigns, templates, notification text)

### Deployment & Operations

- FR71: Platform Operator can deploy the platform via Docker Compose with a single command
- FR72: Platform Operator can configure all system settings via environment variables
- FR73: The system automatically detects and runs pending database migrations on startup
- FR74: Platform Operator can monitor platform health via a health check endpoint and Prometheus metrics endpoint
- FR75: Platform Operator can back up and restore the platform using documented procedures

## Non-Functional Requirements

### Performance

- NFR1: API endpoints return responses within 200ms (p95) for common operations (list, get, create) with up to 1,000 ideas in the database
- NFR2: Full-text search queries return results within 300ms across 100K ideas
- NFR3: Campaign cockpit KPI dashboards load within 1 second (using pre-aggregated snapshots, not real-time calculation)
- NFR4: Initial page load completes within 2 seconds; subsequent client-side navigation within 500ms
- NFR5: Real-time notifications (Socket.io) deliver within 100ms of event occurrence
- NFR6: AI similarity detection completes within 3 seconds per idea submission (async, non-blocking)
- NFR7: Evaluation session results calculation (weighted scores, standard deviation, rankings) completes within 5 seconds for sessions with up to 200 ideas x 20 evaluators
- NFR8: The platform supports 500 concurrent users on modest hardware (4 vCPU, 8GB RAM, managed PostgreSQL)

### Security

- NFR9: All passwords stored using bcrypt with cost factor 12+
- NFR10: Authentication sessions use JWT in httpOnly, Secure, SameSite cookies with Redis-backed session store
- NFR11: All state-changing API endpoints protected against CSRF
- NFR12: Rate limiting enforced on authentication endpoints (max 10 attempts per minute per IP) and API endpoints (configurable per-route limits)
- NFR13: All user input sanitized; all database queries parameterized (Prisma ORM guarantees)
- NFR14: File uploads validated for type, size (max 50MB), and content; stored in S3-compatible storage with pre-signed URLs (no direct public access)
- NFR15: HTTPS enforced in production; HTTP Strict Transport Security (HSTS) headers set
- NFR16: Content Security Policy (CSP) headers configured to prevent XSS
- NFR17: CORS restricted to configured allowed origins
- NFR18: No secrets, API keys, or credentials stored in source code or client-side bundles
- NFR19: Contextual RBAC enforced on every API endpoint — no endpoint accessible without permission check

### Scalability

- NFR20: Database schema optimized for up to 100K ideas, 500 campaigns, 50K users per single-tenant instance
- NFR21: KPI aggregation uses scheduled snapshots (BullMQ daily job) rather than real-time queries to avoid performance degradation as data grows
- NFR22: Socket.io uses Redis adapter from Day 1, enabling horizontal scaling when needed without architecture change
- NFR23: AI embedding generation runs as async background job (BullMQ) — does not block user operations
- NFR24: Cursor-based pagination on all list endpoints to maintain stable performance regardless of data volume
- NFR25: The system degrades gracefully under load — AI features degrade first (fall back to text search), core CRUD operations are last to be affected

### Accessibility

- NFR26: All pages achieve WCAG 2.1 Level AA compliance
- NFR27: Lighthouse Accessibility score of 90+ on all key pages (campaign list, idea detail, evaluation form, dashboard)
- NFR28: Full keyboard navigation support — all interactive elements reachable and operable via keyboard
- NFR29: Proper semantic HTML and ARIA labels for screen reader compatibility
- NFR30: Color contrast ratios meet WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- NFR31: All interactive elements have visible focus indicators
- NFR32: No functionality relies solely on color to convey information

### Reliability

- NFR33: Zero data loss — all user-submitted content (ideas, comments, votes, evaluations) persisted to PostgreSQL before confirming to the user
- NFR34: Graceful error handling — users see clear error messages, never raw stack traces or blank pages
- NFR35: Background job failures (email, AI, KPI) are retried with exponential backoff and logged, never silently dropped
- NFR36: Database migrations are forward-compatible — migrations can be applied without downtime (no destructive changes without migration path)
- NFR37: The platform starts and operates correctly after a clean shutdown and restart (no state lost in memory-only stores)

### Maintainability

- NFR38: 80%+ test coverage on service layer and tRPC routers (unit + integration tests via Vitest)
- NFR39: E2E test suite (Playwright) covering critical user flows: login > create campaign > submit idea > evaluate > shortlist
- NFR40: All code passes TypeScript strict mode with zero `any` types
- NFR41: CI pipeline runs lint, typecheck, unit tests, and integration tests on every pull request
- NFR42: All environment configuration documented in `.env.example` with descriptions
- NFR43: Architecture decisions documented in ADR (Architecture Decision Record) format
- NFR44: Contributor guide with setup instructions, coding standards, and PR process

### Observability

- NFR45: Health check endpoint (`/api/health`) returns system status (database, Redis, S3 connectivity)
- NFR46: Prometheus metrics endpoint (`/api/metrics`) exposes request latency, error rates, active connections, queue depths
- NFR47: Structured logging (JSON format) with correlation IDs for request tracing
- NFR48: Error tracking integration point (configurable — Sentry, OpenTelemetry, or stdout for self-hosted)
