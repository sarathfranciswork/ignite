---
stepsCompleted:
  [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# Ignite - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Ignite across all 4 phases, decomposing the requirements from the PRD, UX Design, Architecture, and HYPE Feature Specification into implementable stories.

**Phase 1 — The Ideation Engine (MVP):** Epics 1-8, 35 stories (FR1-FR75)
**Phase 2 — Strategy & Partners:** Epics 9-11, 18 stories (FR76-FR97)
**Phase 3 — Value Creation:** Epics 12-13, 9 stories (FR98-FR111)
**Phase 4 — Enterprise & Advanced AI:** Epics 14-16, 16 stories (FR112-FR134)
**Total:** 16 epics, 78 stories, 134 functional requirements

## Requirements Inventory

### Functional Requirements

**User Management & Access Control**

- FR1: Users can register with email/password or magic link and create a profile with name, avatar, bio, and skills
- FR2: Platform Admin can create, edit, deactivate, and bulk-manage user accounts
- FR3: Platform Admin can define a hierarchical organizational unit structure and assign users to org units
- FR4: Platform Admin can create user groups with configurable permissions and manage group membership
- FR5: The system enforces contextual role-based access control resolving permissions through Global Role > Resource Role > Scope (org unit/audience)
- FR6: Users can view and update their profile, notification preferences, and language settings
- FR7: Users can view a personalized dashboard showing their tasks, active campaigns, and activity feed

**Campaign Management**

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

**Channel Management**

- FR18: Innovation Manager can create and manage always-open channels with no timeline or deadline
- FR19: Channels support the same idea submission, discussion, voting, evaluation, and idea board features as campaigns

**Idea Submission & Lifecycle**

- FR20: Contributors can submit ideas with rich text description, image upload, file attachments, custom field values, tags, and category selection
- FR21: The AI co-pilot can suggest improvements to idea descriptions, recommend tags, and highlight missing information during submission (opt-in)
- FR22: Contributors can save ideas as drafts and submit them later
- FR23: Contributors can add co-authors to their ideas
- FR24: The system can detect and display semantically similar ideas during submission and on the idea detail page
- FR25: Idea Coach can privately review ideas in qualification phase, provide structured feedback, and publish approved ideas to community discussion
- FR26: The system manages idea lifecycle transitions (Draft > Qualification > Community Discussion > HOT! > Evaluation > Selected/Archived) with appropriate access rules per status
- FR27: Ideas automatically graduate to HOT! status when community engagement metrics meet campaign-defined thresholds (visitors, commenters, voters, voting level, days)
- FR28: Innovation Manager can manually change idea status, archive ideas with reason, and unarchive ideas

**Community Engagement**

- FR29: Users can comment on ideas with threaded replies and @mentions
- FR30: Users can vote on ideas using multi-criteria star ratings (configurable criteria per campaign, default: single overall rating)
- FR31: Users can like ideas
- FR32: Users can follow/subscribe to ideas, campaigns, and channels to receive updates
- FR33: Users can view an activity stream on each idea showing all events chronologically
- FR34: The system can suggest relevant users for an idea based on skills and contribution history
- FR35: Moderators can flag comments as inappropriate

**Idea Board & Management**

- FR36: Innovation Manager can view all ideas in a campaign as a sortable, filterable table/grid with configurable columns
- FR37: Innovation Manager can create, name, and color-code manual buckets and assign ideas to them
- FR38: Innovation Manager can create smart buckets that auto-populate based on saved filter criteria
- FR39: Innovation Manager can split one idea into multiple ideas
- FR40: Innovation Manager can merge multiple ideas into one, preserving all comments, votes, and contributor attribution
- FR41: Innovation Manager can perform bulk actions on selected ideas (assign bucket, archive, export)
- FR42: Innovation Manager can use dual-window mode to compare ideas side by side

**Evaluation Engine**

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

**Notifications & Communication**

- FR55: Users receive in-app notifications for key events (idea submitted, evaluation requested, idea status change, HOT! graduation, campaign phase change, comments on followed items)
- FR56: Users receive email notifications with configurable frequency (immediately, daily digest, weekly digest)
- FR57: Users can view, filter, mark as read, and manage notifications in an in-app notification center
- FR58: The system displays an unread notification count badge in the header

**Search & Discovery**

- FR59: Users can perform global full-text search across ideas, campaigns, channels, and users
- FR60: Users can explore campaigns, channels, and ideas in tile and list view layouts with sorting and multi-criteria filtering
- FR61: Users can save searches as favorites for quick access

**AI & Intelligence**

- FR62: The system generates semantic vector embeddings for ideas and uses them to find genuinely similar ideas (meaning-based, not keyword-based)
- FR63: The AI idea enrichment co-pilot provides real-time suggestions during idea submission to improve description quality, suggest tags, and identify gaps
- FR64: The system generates AI-powered summaries for campaigns (engagement overview + top themes), evaluation sessions (results digest), and notification digests
- FR65: The AI layer operates as an optional enhancement — the platform functions fully without AI, falling back to PostgreSQL full-text search for similarity

**Platform Administration**

- FR66: Platform Admin can manage users, groups, and org unit hierarchy through a dedicated admin interface
- FR67: Platform Admin can edit notification templates (subject, body with variable placeholders)
- FR68: Platform Admin can customize platform terminology and login page appearance
- FR69: Platform Admin can view system health information (storage usage, active user counts)
- FR70: The admin panel separates "System Administration" (SMTP, storage, health) from "Innovation Configuration" (campaigns, templates, notification text)

**Deployment & Operations**

- FR71: Platform Operator can deploy the platform via Docker Compose with a single command
- FR72: Platform Operator can configure all system settings via environment variables
- FR73: The system automatically detects and runs pending database migrations on startup
- FR74: Platform Operator can monitor platform health via a health check endpoint and Prometheus metrics endpoint
- FR75: Platform Operator can back up and restore the platform using documented procedures

**Phase 2 — Strategy & Partners**

_Strategy Module_

- FR76: Innovation Manager can define Strategic Innovation Areas (SIAs) with goals, descriptions, and link campaigns, ideas, trends, and technologies to them
- FR77: Innovation Manager can create and manage Trends with Mega/Macro/Micro hierarchy, descriptions, and business relevance
- FR78: Innovation Manager can create and manage Technologies with descriptions, classifications, and links to ideas and campaigns
- FR79: Users can submit and browse community Insights linked to trends, campaigns, or shared globally, with configurable submission permissions
- FR80: Innovation Manager can create Innovation Portfolios as visual collections linking trends, technologies, ideas, and SIAs with bucket boards
- FR81: Innovation Manager can link campaigns to SIAs and campaigns display a "Be Inspired" tab showing related trends, technologies, and insights
- FR82: Users can capture trends, technologies, and insights from external websites via a Web Clipper browser extension

_Partner Engagement_

- FR83: Partner Scout can manage an Organization database with profiles (logo, description, website, industry, location, funding, NDA status), relationship tracking, and contact management
- FR84: Partner Scout can track Use Cases through a pipeline (Identified > Qualification > Evaluation > Pilot > Partnership) with team assignment, task boards, and internal discussions
- FR85: Partner Scout can create Scouting Boards with custom columns, drag-and-drop organization cards, and share boards with colleagues
- FR86: Innovation Manager can create Partnering Campaigns for collecting external partnership proposals with simplified workflow
- FR87: Partner Scout can search/explore organizations with duplicate detection by website URL and Crunchbase ID
- FR88: Partner Scout can create Scouting Missions as structured requests for finding partners for specific problems

_Platform Extensions_

- FR89: Platform Admin can invite External Users with per-campaign scoped access for guest submissions and proposal tracking
- FR90: Innovation Manager can mark ideas and organizations as Confidential with parallel access control (visible only to management team and contributor)
- FR91: Innovation Manager can publish messages to campaign activity feeds and send segmented emails to audience sub-groups through a Communication Hub
- FR92: Platform Admin can configure outgoing Webhooks for all platform events with configurable endpoints and event filtering
- FR93: The system exposes a documented REST API for data export and custom integrations with API key authentication
- FR94: Platform Operator can deploy the platform via Kubernetes Helm chart for production-grade deployments
- FR95: Innovation Manager can create Ad Hoc Evaluation sessions not tied to any campaign for standalone idea assessment
- FR96: Innovation Manager can create One-Team Evaluation sessions for collaborative in-meeting evaluation
- FR97: Innovation Manager can create Generic Submissions with fully customizable submission definitions (templates) beyond standard idea format

**Phase 3 — Value Creation**

_Phase-Gate Projects_

- FR98: Portfolio Manager can create projects with custom process definitions specifying phases, activities, and tasks
- FR99: Portfolio Manager can manage phase lifecycles with Elaboration > Gate > next phase pattern, with planned start/end dates
- FR100: Gatekeepers can review gate materials and make decisions at phase gates (forward, rework, postpone, terminate)
- FR101: Project team members can manage activities with typed tasks (text, number, keyword, attachment, date, user fields), assignees, and deadlines
- FR102: Portfolio Manager can create Concepts as lightweight 2-phase processes (Elaboration > Evaluation) with business case frameworks
- FR103: The system maintains full traceability from ideas through evaluation to projects with linked entity navigation
- FR104: Portfolio Manager can view project dashboards showing key tasks, phase timeline, team, and gate decisions

_Portfolio & Reporting_

- FR105: Portfolio Manager can analyze the project portfolio with cross-project reporting by process definition
- FR106: Innovation Manager can compare campaigns and channels side-by-side with aligned KPI metrics
- FR107: Innovation Manager can export KPI reports, idea lists, and evaluation results to Excel
- FR108: Innovation Manager can create custom KPI reports filtered by campaign, date range, org unit, and user engagement
- FR109: Partner Scout can view partnering reports showing use case pipeline funnel and organization activity metrics
- FR110: Innovation Manager can view Success Factor Analysis comparing campaign configurations (duration, phases, voting setup) vs. outcomes
- FR111: Innovation Manager can view Organization Analysis showing activity breakdown per org unit

**Phase 4 — Enterprise & Advanced AI**

_Enterprise Multi-Tenancy & Identity_

- FR112: Platform Admin can create Innovation Spaces providing logical multi-tenancy isolation with separate admins, campaigns, SIAs, and user scope per space
- FR113: Platform Admin can configure LDAP/SAML SSO for single sign-on authentication
- FR114: The system supports SCIM 2.0 for automated user provisioning and deprovisioning from identity providers
- FR115: Users can enable Two-Factor Authentication (TOTP) for their accounts
- FR116: The system maintains a comprehensive audit log of all platform actions with actor, action, target, timestamp, and IP
- FR117: Platform Admin can view and terminate active user sessions from a session management UI

_Enterprise Integrations_

- FR118: The system integrates with Crunchbase for organization import, enrichment, and duplicate detection
- FR119: The system integrates with Microsoft Teams (campaign launch notifications, tabs for idea submission, bot for quick actions)
- FR120: The system integrates with Slack (bidirectional: submit ideas via slash commands, receive notifications in channels)
- FR121: The system syncs selected ideas to Jira or Azure DevOps as tickets with bidirectional status updates
- FR122: The system provides BI connectors for Tableau and Power BI with documented data models and refresh endpoints
- FR123: The system integrates with Outlook via add-in for organization matching from email sender domains

_Advanced AI_

- FR124: The AI system provides predictive idea scoring based on historical success patterns and idea characteristics
- FR125: The AI system automatically categorizes and tags ideas based on content analysis
- FR126: The AI system powers scouting recommendations to discover relevant organizations based on SIA alignment and trend matching

_Enterprise Experience_

- FR127: Platform Admin can configure white-labeling including custom domain, branding (colors, logo, favicon), and email template theming
- FR128: The platform supports Progressive Web App (PWA) mode with installability, offline reading, and push notifications
- FR129: Platform Admin can configure data residency controls and region selection for data storage
- FR130: Platform Admin can manage GDPR compliance tools including right to erasure, user data export, and user anonymization
- FR131: Platform Admin can configure IP whitelisting for network-level access control
- FR132: The platform supports multilingual content with manual translation and translation service integration (DeepL/Google Translate)
- FR133: The platform displays user activity rankings per campaign with configurable scoring formula for gamification
- FR134: Innovation Manager can enable Discussion Perspectives for structured multi-viewpoint thinking in idea discussions

### NonFunctional Requirements

**Performance**

- NFR1: API endpoints return responses within 200ms (p95) for common operations (list, get, create) with up to 1,000 ideas in the database
- NFR2: Full-text search queries return results within 300ms across 100K ideas
- NFR3: Campaign cockpit KPI dashboards load within 1 second (using pre-aggregated snapshots, not real-time calculation)
- NFR4: Initial page load completes within 2 seconds; subsequent client-side navigation within 500ms
- NFR5: Real-time notifications (Socket.io) deliver within 100ms of event occurrence
- NFR6: AI similarity detection completes within 3 seconds per idea submission (async, non-blocking)
- NFR7: Evaluation session results calculation (weighted scores, standard deviation, rankings) completes within 5 seconds for sessions with up to 200 ideas x 20 evaluators
- NFR8: The platform supports 500 concurrent users on modest hardware (4 vCPU, 8GB RAM, managed PostgreSQL)

**Security**

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

**Scalability**

- NFR20: Database schema optimized for up to 100K ideas, 500 campaigns, 50K users per single-tenant instance
- NFR21: KPI aggregation uses scheduled snapshots (BullMQ daily job) rather than real-time queries to avoid performance degradation as data grows
- NFR22: Socket.io uses Redis adapter from Day 1, enabling horizontal scaling when needed without architecture change
- NFR23: AI embedding generation runs as async background job (BullMQ) — does not block user operations
- NFR24: Cursor-based pagination on all list endpoints to maintain stable performance regardless of data volume
- NFR25: The system degrades gracefully under load — AI features degrade first (fall back to text search), core CRUD operations are last to be affected

**Accessibility**

- NFR26: All pages achieve WCAG 2.1 Level AA compliance
- NFR27: Lighthouse Accessibility score of 90+ on all key pages (campaign list, idea detail, evaluation form, dashboard)
- NFR28: Full keyboard navigation support — all interactive elements reachable and operable via keyboard
- NFR29: Proper semantic HTML and ARIA labels for screen reader compatibility
- NFR30: Color contrast ratios meet WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- NFR31: All interactive elements have visible focus indicators
- NFR32: No functionality relies solely on color to convey information

**Reliability**

- NFR33: Zero data loss — all user-submitted content (ideas, comments, votes, evaluations) persisted to PostgreSQL before confirming to the user
- NFR34: Graceful error handling — users see clear error messages, never raw stack traces or blank pages
- NFR35: Background job failures (email, AI, KPI) are retried with exponential backoff and logged, never silently dropped
- NFR36: Database migrations are forward-compatible — migrations can be applied without downtime (no destructive changes without migration path)
- NFR37: The platform starts and operates correctly after a clean shutdown and restart (no state lost in memory-only stores)

**Maintainability**

- NFR38: 80%+ test coverage on service layer and tRPC routers (unit + integration tests via Vitest)
- NFR39: E2E test suite (Playwright) covering critical user flows: login > create campaign > submit idea > evaluate > shortlist
- NFR40: All code passes TypeScript strict mode with zero `any` types
- NFR41: CI pipeline runs lint, typecheck, unit tests, and integration tests on every pull request
- NFR42: All environment configuration documented in `.env.example` with descriptions
- NFR43: Architecture decisions documented in ADR (Architecture Decision Record) format
- NFR44: Contributor guide with setup instructions, coding standards, and PR process

**Observability**

- NFR45: Health check endpoint (`/api/health`) returns system status (database, Redis, S3 connectivity)
- NFR46: Prometheus metrics endpoint (`/api/metrics`) exposes request latency, error rates, active connections, queue depths
- NFR47: Structured logging (JSON format) with correlation IDs for request tracing
- NFR48: Error tracking integration point (configurable — Sentry, OpenTelemetry, or stdout for self-hosted)

### Additional Requirements

**From Architecture:**

- Starter template: create-t3-app (T3 Stack v7.40.0) — Next.js + tRPC + Prisma + Auth.js + Tailwind. Project initialization should be Epic 1 Story 1
- RBAC middleware pattern: tRPC middleware wrapper with 3-level resolution (Global Role > Resource Role > Scope) with Redis-cached permission lookups (5-min TTL)
- State machine pattern: Custom transition map with guards and side effects for Campaign (6 states) and Idea (8+ states) lifecycles — not XState
- Event system: Dual-layer — synchronous EventEmitter for activity logging, graduation checks, Socket.io emissions + asynchronous BullMQ for email, AI embeddings, KPI snapshots
- AI provider abstraction: Three implementations (LocalAIProvider via ONNX, OpenAIProvider, NullAIProvider) behind AIProvider interface with feature gating
- Database schema refinements: Add searchVector (tsvector), embedding (vector(384) via pgvector), previousStatus fields; composite indexes for hot query paths
- Redis caching: Permission resolution cache (5-min TTL), session store, Socket.io adapter, BullMQ queues
- Docker Compose services: app (Next.js), worker (BullMQ), redis, postgres (optional external), minio (optional external S3)
- CI/CD: GitHub Actions — lint, typecheck, unit tests, integration tests on PR; Docker image build on merge to main
- Code organization: Feature-based components, thin tRPC routers dispatching to thick service layer, co-located tests
- Naming conventions: PascalCase models, camelCase fields, SCREAMING_SNAKE enums, Tailwind utility classes only (no custom CSS)
- Error handling: TRPCError with specific codes, Zod validation, structured JSON logging with correlation IDs
- Date handling: date-fns (not moment.js), UTC on server, timezone conversion on client
- ID format: CUID via Prisma @default(cuid())

**From UX Design:**

- Design system: shadcn/ui + Tailwind CSS ("Refined Industrial" aesthetic)
- Typography: Satoshi (display/headings), Inter (body/UI), JetBrains Mono (code/data)
- Color system: Indigo primary (#6366F1), Amber accent (#F59E0B), warm gray neutrals, 14-state status color palette
- Dark mode: CSS custom properties with data-theme toggle; sidebar always dark
- Accessibility: WCAG 2.1 AA compliance, minimum 44x44px touch targets, prefers-reduced-motion support, Amber used decoratively only (paired with text labels)
- Navigation: Dark sidebar (260px, collapsible to 64px), breadcrumb header, Cmd+K command palette
- 6 contextual layout directions within unified platform shell (Compact Linear, Card Gallery, Command Center, Activity Stream, Kanban Flow, Evaluation Focus)
- Role-adaptive dashboards: Innovation Manager sees Compact Linear + KPIs; Contributor sees Activity Stream
- Mobile-first contributor flows: Idea submission, voting, commenting, idea detail fully functional at 375px
- Progressive disclosure: Simple Setup covers 80% of campaigns; advanced options available but never mandatory
- Novel UX patterns: HOT! Graduation Meter (multi-threshold progress), AI Co-Pilot inline suggestions during submission, Split-pane evaluation with [Done & Next] flow, Campaign Cockpit auto-generation
- Interaction targets: Idea submission < 3 min on mobile, campaign setup < 15 min (simple), 25 evaluations in 90 min
- Optimistic updates on likes, votes, comments (instant UI feedback before server confirms)
- Auto-save on drafts (every 30 seconds) and evaluation scores (immediate on change)
- Component library: 12 custom domain components (CampaignCard, IdeaCard, StatusBadge, IdeaBoard, EvaluationForm, PairwiseComparison, CampaignCockpit, GraduationMeter, RichTextEditor, CommandPalette, ActivityFeed, KpiCard)

### FR Coverage Map

- FR1: Epic 1 - User registration (email/password, magic link, profile)
- FR2: Epic 1 - Admin user account management
- FR3: Epic 1 - Admin org unit hierarchy management
- FR4: Epic 1 - Admin user group management
- FR5: Epic 1 - Contextual RBAC enforcement (Global > Resource > Scope)
- FR6: Epic 1 - User profile and preferences management
- FR7: Epic 8 - Personalized user dashboard (tasks, campaigns, activity)
- FR8: Epic 2 - Campaign creation wizard (Simple + Advanced)
- FR9: Epic 2 - Campaign configuration (description, banner, timeline, sponsor)
- FR10: Epic 2 - Custom submission form fields per campaign
- FR11: Epic 2 - Idea coach settings configuration
- FR12: Epic 2 - Campaign community definition (audience targeting)
- FR13: Epic 2 - Campaign settings (qualification, voting, graduation thresholds)
- FR14: Epic 2 - Campaign lifecycle state machine transitions
- FR15: Epic 2 - Campaign copy/template
- FR16: Epic 2 - Campaign cockpit with KPIs
- FR17: Epic 2 - Campaign sponsor executive view
- FR18: Epic 6 - Always-open channel creation and management
- FR19: Epic 6 - Channel idea/discussion/voting/evaluation features
- FR20: Epic 3 - Idea submission (rich text, uploads, custom fields, tags)
- FR21: Epic 7 - AI co-pilot suggestions during idea submission
- FR22: Epic 3 - Draft idea save and later submission
- FR23: Epic 3 - Idea co-authorship
- FR24: Epic 7 - Semantic similar idea detection and display
- FR25: Epic 3 - Idea coach qualification review and feedback
- FR26: Epic 3 - Idea lifecycle state machine transitions
- FR27: Epic 3 - Automatic HOT! graduation on community thresholds
- FR28: Epic 3 - Manual idea status change, archive/unarchive
- FR29: Epic 3 - Threaded comments with @mentions
- FR30: Epic 3 - Multi-criteria star voting
- FR31: Epic 3 - Idea likes
- FR32: Epic 3 - Follow/subscribe to ideas, campaigns, channels
- FR33: Epic 3 - Idea activity stream
- FR34: Epic 3 - Suggested relevant users for ideas
- FR35: Epic 3 - Moderator comment flagging
- FR36: Epic 4 - Sortable/filterable idea table/grid
- FR37: Epic 4 - Manual buckets (named, color-coded)
- FR38: Epic 4 - Smart buckets (auto-populate by filter criteria)
- FR39: Epic 4 - Idea split
- FR40: Epic 4 - Idea merge (preserving attribution)
- FR41: Epic 4 - Bulk actions on ideas
- FR42: Epic 4 - Dual-window idea comparison
- FR43: Epic 5 - Scorecard evaluation session creation
- FR44: Epic 5 - Pairwise evaluation session creation
- FR45: Epic 5 - Evaluation team assignment, due dates, reminders
- FR46: Epic 5 - Add ideas to evaluation sessions
- FR47: Epic 5 - Evaluator scoring with save/resume
- FR48: Epic 5 - Pairwise slider-based scoring
- FR49: Epic 5 - Evaluation progress tracking and reminders
- FR50: Epic 5 - Weighted scores, rankings, standard deviation calculation
- FR51: Epic 5 - Results table and bubble chart visualization
- FR52: Epic 5 - Shortlist management and locking
- FR53: Epic 5 - Forward shortlisted ideas to next status
- FR54: Epic 5 - Evaluation session templates
- FR55: Epic 6 - In-app notifications for key events
- FR56: Epic 6 - Email notifications with configurable frequency
- FR57: Epic 6 - In-app notification center (view, filter, manage)
- FR58: Epic 6 - Unread notification count badge
- FR59: Epic 7 - Global full-text search
- FR60: Epic 7 - Explore views (tile/list) with sorting and filtering
- FR61: Epic 7 - Saved search favorites
- FR62: Epic 7 - Semantic vector embeddings for idea similarity
- FR63: Epic 7 - AI idea enrichment co-pilot (real-time suggestions)
- FR64: Epic 7 - AI-powered summaries (campaigns, evaluations, digests)
- FR65: Epic 7 - AI as optional enhancement with text search fallback
- FR66: Epic 8 - Dedicated admin interface for users/groups/org units
- FR67: Epic 8 - Notification template editing
- FR68: Epic 8 - Platform terminology and login customization
- FR69: Epic 8 - System health information display
- FR70: Epic 8 - Admin panel separation (System vs Innovation)
- FR71: Epic 1 - Docker Compose single-command deployment
- FR72: Epic 1 - Environment variable configuration
- FR73: Epic 1 - Automatic database migration on startup
- FR74: Epic 1 - Health check and Prometheus metrics endpoints
- FR75: Epic 1 - Backup and restore procedures
- FR76: Epic 9 - Strategic Innovation Areas (SIAs)
- FR77: Epic 9 - Trends with Mega/Macro/Micro hierarchy
- FR78: Epic 9 - Technologies database
- FR79: Epic 9 - Community Insights
- FR80: Epic 9 - Innovation Portfolios
- FR81: Epic 9 - Campaign-SIA linking and "Be Inspired" tab
- FR82: Epic 9 - Web Clipper browser extension
- FR83: Epic 10 - Organization database with profiles and contacts
- FR84: Epic 10 - Use Case pipeline with task boards
- FR85: Epic 10 - Scouting Boards with drag-and-drop
- FR86: Epic 10 - Partnering Campaigns for external proposals
- FR87: Epic 10 - Organization search/explore with duplicate detection
- FR88: Epic 10 - Scouting Missions
- FR89: Epic 11 - External User access with per-campaign scope
- FR90: Epic 11 - Confidential ideas and organizations
- FR91: Epic 11 - Communication Hub with segmented email
- FR92: Epic 11 - Outgoing Webhooks for platform events
- FR93: Epic 11 - REST API for data export and integrations
- FR94: Epic 11 - Kubernetes Helm chart deployment
- FR95: Epic 11 - Ad Hoc Evaluation sessions
- FR96: Epic 11 - One-Team collaborative evaluation
- FR97: Epic 11 - Generic Submissions with custom definitions
- FR98: Epic 12 - Projects with custom process definitions
- FR99: Epic 12 - Phase lifecycles (Elaboration > Gate > next)
- FR100: Epic 12 - Gatekeeper decisions (forward, rework, postpone, terminate)
- FR101: Epic 12 - Activities and tasks with typed fields
- FR102: Epic 12 - Concepts (lightweight 2-phase process)
- FR103: Epic 12 - Idea-to-project traceability
- FR104: Epic 12 - Project dashboards
- FR105: Epic 13 - Portfolio analysis with cross-project reporting
- FR106: Epic 13 - Campaign/channel side-by-side comparison
- FR107: Epic 13 - KPI reports and data export to Excel
- FR108: Epic 13 - Custom KPI reports with filters
- FR109: Epic 13 - Partnering reports (pipeline and organization activity)
- FR110: Epic 13 - Success Factor Analysis
- FR111: Epic 13 - Organization Analysis by org unit
- FR112: Epic 14 - Innovation Spaces (multi-tenancy)
- FR113: Epic 14 - LDAP/SAML SSO
- FR114: Epic 14 - SCIM 2.0 user provisioning
- FR115: Epic 14 - Two-Factor Authentication (TOTP)
- FR116: Epic 14 - Comprehensive audit log
- FR117: Epic 14 - Session management UI
- FR118: Epic 15 - Crunchbase organization import
- FR119: Epic 15 - Microsoft Teams integration
- FR120: Epic 15 - Slack integration
- FR121: Epic 15 - Jira/Azure DevOps sync
- FR122: Epic 15 - BI connectors (Tableau, Power BI)
- FR123: Epic 15 - Outlook Add-in for organizations
- FR124: Epic 15 - AI predictive idea scoring
- FR125: Epic 15 - AI auto-categorization and tagging
- FR126: Epic 15 - AI-powered scouting recommendations
- FR127: Epic 16 - White-labeling (domain, branding, email)
- FR128: Epic 16 - PWA with push notifications
- FR129: Epic 16 - Data residency controls
- FR130: Epic 16 - GDPR compliance tools
- FR131: Epic 16 - IP whitelisting
- FR132: Epic 16 - Multilingual support and translation
- FR133: Epic 16 - Gamification and user rankings
- FR134: Epic 16 - Discussion Perspectives

## Epic List

### Epic 1: Platform Foundation & User Management

Users can deploy the platform via Docker Compose, register and login, manage their profiles; admins manage users, org units, and groups; RBAC enforced across the system.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR71, FR72, FR73, FR74, FR75

### Epic 2: Campaign Management

Innovation Managers can create, configure, and manage complete campaign lifecycles with cockpit KPIs, audience targeting, and sponsor engagement.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17

### Epic 3: Idea Submission & Community Engagement

Contributors can submit rich ideas with custom fields and attachments; the community engages through threaded comments, multi-criteria voting, and likes; ideas progress through lifecycle stages with community graduation (HOT!).
**FRs covered:** FR20, FR22, FR23, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35

### Epic 4: Idea Board & Management

Innovation Managers can organize and triage ideas using sortable/filterable tables, manual and smart buckets, split/merge operations, and bulk actions.
**FRs covered:** FR36, FR37, FR38, FR39, FR40, FR41, FR42

### Epic 5: Evaluation Engine

Innovation Managers create scorecard and pairwise evaluation sessions; evaluators score ideas with save-and-resume; the system calculates weighted results with standard deviation; shortlists are managed and visualized as bubble charts.
**FRs covered:** FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53, FR54

### Epic 6: Channels & Notifications

Always-open ideation channels available for continuous innovation; users receive in-app and email notifications for all key events with configurable frequency.
**FRs covered:** FR18, FR19, FR55, FR56, FR57, FR58

### Epic 7: Search, Discovery & AI Intelligence

Users can search and explore all content through full-text search and filtered views; AI enhances idea quality with co-pilot suggestions, detects similar ideas semantically, and generates smart summaries.
**FRs covered:** FR21, FR24, FR59, FR60, FR61, FR62, FR63, FR64, FR65

### Epic 8: Administration Dashboard & Polish

Admins manage the platform through a dedicated admin panel with System vs. Innovation separation; all users see a personalized dashboard with tasks, campaigns, and activity.
**FRs covered:** FR7, FR66, FR67, FR68, FR69, FR70

---

### Phase 2: Strategy & Partners (Months 6-8)

### Epic 9: Strategy Module — SIAs, Trends, Technologies & Insights

Innovation Managers can define strategic innovation areas, build a trend/technology knowledge base with community insights, create innovation portfolios, and link strategy to campaigns for inspired ideation.
**FRs covered:** FR76, FR77, FR78, FR79, FR80, FR81, FR82

### Epic 10: Partner Engagement — Organizations, Scouting & Use Cases

Partner Scouts can manage an organization database, track partnership use cases through a pipeline, discover partners via scouting boards, and run partnering campaigns for external proposals.
**FRs covered:** FR83, FR84, FR85, FR86, FR87, FR88

### Epic 11: Platform Extensions — External Access, Communication & APIs

External users can participate in campaigns via invitation; ideas and organizations support confidential mode; Innovation Managers can send targeted communications; the platform exposes webhooks and REST API; additional evaluation modes and deployment options are available.
**FRs covered:** FR89, FR90, FR91, FR92, FR93, FR94, FR95, FR96, FR97

---

### Phase 3: Value Creation (Months 9-11)

### Epic 12: Phase-Gate Projects & Concepts

Portfolio Managers can create projects with custom phase-gate processes, assign gatekeepers for go/no-go decisions, manage activities and tasks within phases, create lightweight concepts, and trace ideas through to project implementation.
**FRs covered:** FR98, FR99, FR100, FR101, FR102, FR103, FR104

### Epic 13: Portfolio & Advanced Reporting

Portfolio Managers can analyze the project portfolio; Innovation Managers can compare campaigns, generate custom KPI reports, export data to Excel, and view success factor and organization analyses; Partner Scouts can view partnering reports.
**FRs covered:** FR105, FR106, FR107, FR108, FR109, FR110, FR111

---

### Phase 4: Enterprise & Advanced AI (Months 12-14)

### Epic 14: Enterprise Multi-Tenancy & Identity

Platform Admins can create Innovation Spaces for logical multi-tenancy, configure LDAP/SAML SSO with SCIM provisioning, enable 2FA, manage user sessions, and maintain comprehensive audit logs.
**FRs covered:** FR112, FR113, FR114, FR115, FR116, FR117

### Epic 15: Enterprise Integrations & Advanced AI

The platform integrates with Crunchbase, Microsoft Teams, Slack, Jira/Azure DevOps, Outlook, and BI tools; AI capabilities expand to predictive scoring, auto-categorization, and scouting recommendations.
**FRs covered:** FR118, FR119, FR120, FR121, FR122, FR123, FR124, FR125, FR126

### Epic 16: Enterprise Experience & Compliance

Platform Admins can configure white-labeling, deploy as PWA with push notifications, manage data residency and GDPR compliance, enable IP whitelisting, add multilingual support, and activate gamification features.
**FRs covered:** FR127, FR128, FR129, FR130, FR131, FR132, FR133, FR134

## Epic 1: Platform Foundation & User Management

Users can deploy the platform via Docker Compose, register and login, manage their profiles; admins manage users, org units, and groups; RBAC enforced across the system.

### Story 1.1: Project Scaffold, Docker Compose & Platform Shell

As a Platform Operator,
I want to initialize the Ignite project and deploy it via Docker Compose with a single command,
So that I can get a running application with the design system, platform shell, and foundational architecture patterns in place.

**Acceptance Criteria:**

**Given** a fresh machine with Docker installed
**When** I run `docker compose up`
**Then** five services start successfully: app (Next.js), postgres (PostgreSQL 15+), redis, minio (S3-compatible), and mailpit (dev email testing)
**And** the app is accessible at `http://localhost:3000` showing the login page

**Given** the project is initialized
**When** I inspect the scaffold
**Then** it was created with `npx create-t3-app@latest` using flags: `--trpc --prisma --nextAuth --tailwind --dbProvider postgresql --appRouter --CI`
**And** shadcn/ui is initialized with base components (Button, Input, Card, Dialog, Toast, Badge, Avatar, Dropdown Menu, Command)

**Given** the app starts
**When** Prisma migrations run automatically on startup
**Then** the database contains at minimum: User, Account, Session (NextAuth), OrgUnit, UserGroup, UserGroupMembership models
**And** no other domain models are created (campaigns, ideas, etc. are deferred to their epics)

**Given** the app is loaded in a browser
**When** I view the platform shell
**Then** I see a dark sidebar (260px, collapsible to 64px icon-only) with navigation items for Dashboard, Campaigns, Explore, Admin (linking to placeholder "coming soon" pages where features don't exist yet)
**And** a header with breadcrumb navigation, a search input placeholder, a notification bell placeholder with badge, and a user avatar dropdown
**And** the layout is responsive (sidebar collapses to icon-only at tablet, hides behind hamburger on mobile)

**Given** the Tailwind configuration
**When** I inspect the design tokens
**Then** CSS variables are configured matching the UX design system: Indigo primary (#6366F1), Amber accent (#F59E0B), warm gray neutrals, Satoshi (display/headings), Inter (body/UI), JetBrains Mono (code), 4px base spacing scale, border radius system (4/6/8/12/9999px), shadow system (xs-xl)
**And** dark mode is supported via `data-theme` attribute with CSS variable overrides

**Given** the server codebase
**When** I inspect the foundational patterns
**Then** an EventBus module exists in `src/server/events/` with a typed EventMap interface and EventEmitter setup (no listeners yet — registered by later epics)
**And** an AIProvider abstraction exists in `src/server/lib/ai/` with a NullAIProvider implementation (returns empty results for all methods) and provider selection based on `AI_ENABLED` env var
**And** a `.env.example` file documents all environment variables with descriptions

**Given** the project repository
**When** I inspect CI configuration
**Then** a GitHub Actions workflow runs lint, typecheck on every PR
**And** TypeScript strict mode is enabled with zero `any` types

### Story 1.2: User Registration, Authentication & Profile Management

As a User,
I want to register with email/password or magic link, login securely, and manage my profile,
So that I have a personal identity on the platform and can complete my profile setup after registration.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I submit a valid email and password (8+ characters, at least one number)
**Then** a new user account is created with my email, password hashed with bcrypt (cost factor 12+), and I am redirected to the platform dashboard
**And** I receive a welcome email via mailpit (dev) or SMTP (production)

**Given** I am on the registration page
**When** I choose "Sign in with Magic Link" and enter my email
**Then** a magic link is sent to my email, and clicking it authenticates me and creates an account if one doesn't exist

**Given** I am a registered user on the login page
**When** I submit valid credentials
**Then** I am authenticated with a JWT stored in an httpOnly, Secure, SameSite=Lax cookie
**And** a server-side session is created in Redis
**And** I am redirected to the platform dashboard

**Given** I submit invalid credentials
**When** I attempt to login
**Then** I see a generic error message ("Invalid email or password" — no indication of which field is wrong)
**And** after 10 failed attempts within 1 minute from the same IP, further attempts are rate-limited with a 429 response

**Given** I am authenticated
**When** I navigate to my profile page
**Then** I can view and edit: display name, avatar (image upload to S3/MinIO), bio (text area), skills (tag input), and notification preferences (email frequency: immediate/daily/weekly)
**And** avatar uploads are validated for type (image/\*), size (max 5MB), and stored via S3 pre-signed URL

**Given** I am authenticated
**When** my session expires or I click logout
**Then** the JWT cookie is cleared, the Redis session is invalidated, and I am redirected to the login page

### Story 1.3: RBAC Middleware & Permission System

As a Platform Admin,
I want the system to enforce contextual role-based access control on every API endpoint,
So that users can only access features and data appropriate to their role, resource membership, and organizational scope.

**Acceptance Criteria:**

**Given** the RBAC middleware is implemented
**When** any tRPC procedure is called
**Then** permissions are resolved through three levels in order: Global Role > Resource Role > Scope (org unit/audience)
**And** permission results are cached in Redis with a 5-minute TTL per user-resource pair

**Given** a user with the Platform Admin global role
**When** they access any endpoint (user management, campaign management, evaluation, admin panel)
**Then** access is granted — Platform Admin bypasses all resource and scope checks

**Given** a user with the Campaign Manager resource role for Campaign A
**When** they access Campaign A management endpoints (edit settings, manage lifecycle, view cockpit)
**Then** access is granted
**And** when they access Campaign B management endpoints (where they have no resource role)
**Then** access is denied with a 403 FORBIDDEN response

**Given** a user assigned to Org Unit "Manufacturing"
**When** they request a list of campaigns
**Then** they only see campaigns targeted at Org Unit "Manufacturing" (or campaigns with no audience restriction)
**And** they do not see campaigns targeted exclusively at Org Unit "Engineering"

**Given** the permission system
**When** I inspect the implementation
**Then** `protectedProcedure` middleware verifies authentication (is user logged in?)
**And** `requirePermission(action)` composable middleware verifies authorization (can user do this?)
**And** permission definitions are centralized in `src/server/lib/permissions.ts` as a const map
**And** list endpoints use WHERE clause filtering (scope-based), not middleware blocking

**Given** the RBAC test suite
**When** tests are executed
**Then** the following edge cases pass:
**And** (1) A user with multiple roles (Contributor globally + Evaluator on Campaign A) can evaluate in Campaign A but not manage it
**And** (2) A user with no campaign membership can view public campaign details but cannot submit ideas or evaluate
**And** (3) A deactivated user is denied access to all endpoints regardless of their roles
**And** (4) A user in two org units sees campaigns targeted at either org unit
**And** (5) A resource role assignment that is removed immediately invalidates the Redis permission cache for that user-resource pair

### Story 1.4: Organizational Unit Management

As a Platform Admin,
I want to define a hierarchical organizational unit structure and assign users to org units,
So that the organization's department/division structure is reflected in the platform for audience targeting and access scoping.

**Acceptance Criteria:**

**Given** I am authenticated as a Platform Admin
**When** I navigate to the Org Unit management section
**Then** I see a tree view of the organizational hierarchy

**Given** I am on the Org Unit management page
**When** I create a new org unit with a name and optional parent org unit
**Then** the org unit is created and appears in the hierarchy under its parent
**And** I can create nested hierarchies (e.g., Company > Division > Department > Team)

**Given** an existing org unit
**When** I edit its name or move it to a different parent
**Then** the changes are saved and the hierarchy tree updates accordingly
**And** all users assigned to the org unit retain their assignment

**Given** an existing org unit with no children and no assigned users
**When** I delete it
**Then** it is removed from the hierarchy
**And** if it has children or assigned users, deletion is blocked with an explanatory message

**Given** a list of users
**When** I assign a user to one or more org units
**Then** the assignment is saved and the user's scope is updated for RBAC resolution
**And** a user can belong to multiple org units simultaneously

### Story 1.5: User & Group Administration

As a Platform Admin,
I want to create, edit, deactivate, and manage user accounts and groups,
So that I can control platform access and organize users into permission groups.

**Acceptance Criteria:**

**Given** I am authenticated as a Platform Admin
**When** I navigate to User Management
**Then** I see a paginated, searchable list of all users with their name, email, status (active/deactivated), global roles, and org unit assignments

**Given** the User Management page
**When** I create a new user with email, name, and global role assignment
**Then** the user account is created and a welcome/setup email is sent to the new user
**And** I can assign one or more global roles (Platform Admin, Innovation Manager, Contributor, Evaluator, Moderator)

**Given** an existing user
**When** I edit their profile, roles, or org unit assignments
**Then** the changes are saved and take effect immediately (Redis permission cache invalidated)

**Given** an existing active user
**When** I deactivate their account
**Then** the user can no longer login, active sessions are invalidated, and the user appears as "Deactivated" in the user list
**And** deactivation is reversible — I can reactivate the account

**Given** multiple users selected in the user list
**When** I perform a bulk action (assign role, assign org unit, deactivate)
**Then** the action is applied to all selected users

**Given** I am on the Group Management page
**When** I create a group with a name and description
**Then** the group is created and I can add/remove users as members
**And** groups can be used for campaign audience targeting and permission assignment in later epics

### Story 1.6: Health Monitoring & Observability

As a Platform Operator,
I want health check and Prometheus metrics endpoints with structured logging,
So that I can monitor platform status, integrate with Grafana/alerting, and troubleshoot issues.

**Acceptance Criteria:**

**Given** the platform is running
**When** I call `GET /api/health`
**Then** I receive a JSON response with connectivity status for: database (PostgreSQL), cache (Redis), and storage (S3/MinIO)
**And** the response returns 200 if all services are healthy, 503 if any service is unreachable

**Given** the platform is running
**When** I call `GET /api/metrics`
**Then** I receive Prometheus-format metrics including: HTTP request latency (histogram by route), error rates (counter by status code), active connections, Redis connection pool stats, and BullMQ queue depths

**Given** any API request is processed
**When** I inspect the server logs
**Then** logs are structured JSON with fields: timestamp, level, message, correlationId, userId (if authenticated), procedure (if tRPC), duration
**And** a unique correlationId is generated per request and propagated through all log entries for that request

**Given** the platform documentation
**When** I look for operational procedures
**Then** backup and restore procedures are documented covering: PostgreSQL database dump/restore, S3/MinIO file backup, Redis data (ephemeral — documented as non-critical), and a recommended backup schedule

## Epic 2: Campaign Management

Innovation Managers can create, configure, and manage complete campaign lifecycles with cockpit KPIs, audience targeting, and sponsor engagement.

### Story 2.1: Campaign Data Model, Simple Setup & Campaign Pages

As an Innovation Manager,
I want to create a campaign using Simple Setup with smart defaults and see it on the campaign list and detail pages,
So that I can launch a campaign in under 15 minutes with minimal configuration.

**Acceptance Criteria:**

**Given** I am authenticated as an Innovation Manager
**When** I navigate to Campaigns
**Then** I see a campaign list page with card layout showing each campaign's banner, title, status badge, sponsor avatar, timeline, and participation stats
**And** the list supports cursor-based pagination and can toggle between grid and list views

**Given** I am on the campaign list page
**When** I click "New Campaign" and select "Simple Setup"
**Then** I see a single-page form with: title (required), description (rich text, required), banner image upload (optional, with gradient fallback), timeline start/end dates (required), sponsor selector (optional), and target audience (default: all internal users)
**And** smart defaults are pre-filled: voting enabled with single "Overall Rating" criterion, community graduation thresholds set to sensible defaults (5 visitors, 3 commenters, 2 voters), qualification phase disabled, notifications enabled

**Given** I complete the Simple Setup form and click "Create Campaign"
**When** the campaign is saved
**Then** the campaign is created in DRAFT status with all configured settings
**And** I am redirected to the campaign detail page
**And** the Campaign model and related tables are created via Prisma migration: Campaign, CampaignPhaseSchedule, CampaignAudience, CampaignTeamMember, CustomField, VotingCriterion, GraduationThreshold

**Given** a campaign exists
**When** I navigate to its detail page (campaigns/[id])
**Then** I see the campaign landing page with: banner image (or gradient fallback), title, status badge, sponsor name and avatar, timeline with phase indicator, description (rendered rich text), call-to-action section, support/resources section, and tabbed content area (Ideas, Activity, About)
**And** the "Submit Your Idea" CTA button is visible when the campaign is in SUBMISSION or DISCUSSION_VOTING phase
**And** the page shows social proof: "X ideas submitted" count, participation bar

**Given** I am viewing a campaign detail page
**When** the campaign is in DRAFT status
**Then** a banner shows "This campaign is in draft — only managers can see it"
**And** the "Submit Your Idea" button is hidden

### Story 2.2a: Advanced Campaign Wizard — Content & Submission Form (Steps 1-2)

As an Innovation Manager,
I want to configure rich campaign content and custom submission form fields through an advanced wizard,
So that I can tailor the campaign experience and collect structured data from contributors.

**Acceptance Criteria:**

**Given** I click "New Campaign" and select "Advanced Setup"
**When** the wizard loads
**Then** I see a 5-step wizard with a progress sidebar showing all steps, with Steps 1-2 active and Steps 3-5 visible but navigable only after completing prior steps
**And** each step is independently saveable — I can save progress and return later

**Given** I am on Step 1 (Description)
**When** I configure the campaign content
**Then** I can set: title (required), banner image upload with crop/preview, timeline with start and end date pickers per phase, sponsor selector (search users by name), teaser text (short summary for cards), rich text description (TipTap editor with formatting, images, links), video URL (YouTube/Vimeo embed preview), file attachments (multiple, drag-and-drop), tags (free-form with autocomplete from existing tags), and call-to-action text (customizable button label and support section content)
**And** all fields validate inline with clear error messages
**And** the banner upload is stored via S3 pre-signed URL with type/size validation

**Given** I am on Step 2 (Submission Form)
**When** I configure custom fields
**Then** I see a form builder where I can add, remove, and reorder (drag-and-drop) custom fields
**And** each field supports types: text (single/multi-line), keyword (tag-style input), selection (dropdown with custom options), and checkbox
**And** each field has: label, help text, mandatory flag (required/optional), and display order
**And** I can set visibility conditions on fields (e.g., "Show field B only if field A has value X")
**And** a live preview shows how the submission form will appear to contributors

### Story 2.2b: Advanced Campaign Wizard — Process & Community (Steps 3-5)

As an Innovation Manager,
I want to configure idea coaching, community roles, and campaign settings through the advanced wizard,
So that I can set up the evaluation process, team, and engagement rules before launching.

**Acceptance Criteria:**

**Given** I am on Step 3 (Idea Coach)
**When** I configure idea coaching
**Then** I can toggle idea coach on/off for this campaign
**And** when enabled, I can select assignment mode: global (one coach for all ideas) or per-category (different coach per idea category)
**And** I can define idea categories with a category builder (add/remove/rename categories)
**And** I can assign coach users to global or per-category roles via user search

**Given** I am on Step 4 (Community)
**When** I configure the campaign team and audience
**Then** I can assign: moderators (user picker with search), evaluation team members (user picker), and seeding team members (user picker)
**And** I can set target audience: "All internal users" (default) or "Selected" with multi-select for org units, user groups, and individual users
**And** when audience is selected, an invitee count calculation shows the total unique users who will have access
**And** team members are stored with their campaign-specific resource roles

**Given** I am on Step 5 (Settings)
**When** I configure campaign settings
**Then** I can toggle qualification phase (ideas go through coach review before public visibility)
**And** I can configure voting: enable/disable, voting criteria (add/remove criteria with labels and weight), vote scale (1-5 stars default)
**And** I can set community graduation thresholds: minimum visitors, commenters, voters, average voting level, and minimum days — all individually adjustable
**And** I can configure notification preferences for this campaign (who gets notified on what events)
**And** I can toggle confidentiality mode (ideas visible only to managers and evaluators, not to other contributors)
**And** I can set start page visibility (whether the campaign appears on the platform explore page or is invite-only)

**Given** I complete all 5 wizard steps
**When** I click "Create Campaign"
**Then** the campaign is created in DRAFT status with all configured settings persisted
**And** I am redirected to the campaign detail page

### Story 2.3: Campaign Lifecycle State Machine

As an Innovation Manager,
I want to manage campaign phase transitions with automated scheduling and safeguards,
So that campaigns progress through their lifecycle reliably with proper validation at each gate.

**Acceptance Criteria:**

**Given** a campaign in DRAFT status
**When** I click "Launch Campaign"
**Then** the system validates all required fields are present (title, description, timeline, at least one audience target)
**And** if validation passes, the campaign transitions to SEEDING status
**And** if validation fails, the transition is blocked with a clear message listing missing requirements

**Given** the state machine implementation
**When** I inspect the transition map
**Then** all 6 forward transitions are defined: DRAFT > SEEDING > SUBMISSION > DISCUSSION_VOTING > EVALUATION > CLOSED
**And** each transition specifies: target state, guard function (async precondition check), and effect events (fired on the EventBus after successful transition)

**Given** a campaign with scheduled phase dates
**When** a phase end date is reached (e.g., submission close date)
**Then** a BullMQ scheduled job automatically triggers the transition to the next phase (SUBMISSION > DISCUSSION_VOTING)
**And** if the auto-transition guard fails, the Innovation Manager is notified and the campaign remains in the current phase

**Given** a campaign in SUBMISSION phase
**When** the Innovation Manager selects "Fast-Track to Evaluation"
**Then** the campaign transitions directly from SUBMISSION to EVALUATION, skipping DISCUSSION_VOTING
**And** a previousStatus field is stored to enable revert capability

**Given** a campaign in EVALUATION phase
**When** the Innovation Manager selects "Revert to Submission"
**Then** the campaign transitions back to SUBMISSION phase using the previousStatus field
**And** similarly, CLOSED can revert to EVALUATION

**Given** a campaign in any phase
**When** an invalid transition is attempted (e.g., DRAFT > EVALUATION, SEEDING > CLOSED)
**Then** the transition is rejected with a BAD_REQUEST error explaining the allowed transitions from the current state

**Given** a campaign transitioning to CLOSED
**When** the guard checks preconditions
**Then** the transition is blocked if there are shortlisted ideas that haven't been forwarded to a terminal status (Implementation, Concept, or Archive)
**And** the guard message specifies which ideas need resolution

**Given** any successful campaign transition
**When** the state changes
**Then** the following side effects fire via the EventBus:
**And** DRAFT > SEEDING: `campaign.launched` event (future: notify seeding team)
**And** SEEDING > SUBMISSION: `campaign.submissionOpened` event (future: notify target audience)
**And** SUBMISSION > DISCUSSION_VOTING: `campaign.submissionClosed` event, idea submission is disabled for this campaign
**And** DISCUSSION_VOTING > EVALUATION: `campaign.evaluationStarted` event
**And** EVALUATION > CLOSED: `campaign.closed` event
**And** all transitions: `campaign.phaseChanged` event with previousPhase and newPhase payload, activity log entry created

**Given** the state machine implementation
**When** I inspect the code
**Then** transition maps are defined as `Record<CampaignStatus, TransitionDef[]>` in `src/server/lib/state-machines/campaign.ts`
**And** `transitionCampaign()` is the ONLY function that can change campaign status — never direct `prisma.update({ status })`
**And** comprehensive unit tests cover every valid transition, every invalid transition, every guard condition, and every side effect

### Story 2.4: Campaign Cockpit & KPIs

As an Innovation Manager,
I want a campaign cockpit dashboard with auto-generated KPIs and trend visualization,
So that I can monitor campaign health and present results to leadership without building charts manually.

**Acceptance Criteria:**

**Given** I navigate to a campaign's cockpit view
**When** the dashboard loads
**Then** I see the 4-tier KPI framework with Tier 1 and Tier 2 metrics for the MVP:

**And** Tier 1 — Engagement:

- Awareness rate (% of target audience who viewed the campaign) with trend indicator
- Participation rate (% of audience who submitted at least one idea) with trend indicator
- Contribution depth (average comments per idea)
- Return participation (% of contributors who participated in 2+ campaigns — platform-wide)

**And** Tier 2 — Quality:

- Idea funnel visualization (submitted > under review > published > HOT! > evaluated > selected) as a horizontal funnel chart
- Evaluation completion rate (% of assigned evaluators who completed all evaluations)
- Community graduation rate (% of ideas that achieved HOT! status)

**Given** KPI data
**When** I view the cockpit charts
**Then** KPIs are displayed as KpiCard components: metric value, trend arrow (up/down/flat vs. previous snapshot), icon, and label
**And** the idea funnel is rendered as a Recharts visualization with counts and conversion percentages at each stage
**And** dashboards load within 1 second (NFR3)

**Given** the BullMQ infrastructure from Story 1.1
**When** the daily KPI snapshot job runs
**Then** pre-aggregated metrics are calculated and stored in a KpiSnapshot table (campaignId, date, metrics JSON)
**And** the cockpit reads from snapshots for historical trends and uses real-time counters (simple COUNT queries) for current totals
**And** the job is resilient to failure (retry with exponential backoff, logged if it fails)

**Given** the cockpit is loaded
**When** I want to share results with leadership
**Then** the cockpit URL is shareable (accessible to anyone with campaign view permission)
**And** the layout is print-friendly / presentation-ready

### Story 2.5: Campaign Copy & Sponsor View

As an Innovation Manager,
I want to copy an existing campaign as a template and provide sponsors with a streamlined executive view,
So that I can quickly set up recurring campaigns and keep leadership engaged without overwhelming them.

**Acceptance Criteria:**

**Given** I am viewing an existing campaign
**When** I click "Copy Campaign"
**Then** a new campaign is created in DRAFT status with all settings copied: description, custom fields, idea coach config, community roles, voting criteria, graduation thresholds, and settings
**And** the copied campaign has a new title (original title + " (Copy)"), cleared timeline dates, and cleared sponsor assignment
**And** no ideas, comments, votes, or evaluation data are copied — only configuration

**Given** I am a Campaign Sponsor assigned to a campaign
**When** I access the campaign
**Then** I see a streamlined sponsor view — not the full management interface
**And** the sponsor view shows: campaign description, status, key KPIs (participation rate, idea count, top trending ideas), and a curated list of ideas with AI-generated summaries (placeholder until Epic 7)
**And** I can comment on individual ideas (my comments are visually distinguished as sponsor comments)
**And** I can approve or request changes to evaluation shortlists when presented

**Given** I am a Campaign Sponsor
**When** I receive a weekly campaign digest
**Then** the digest shows: new ideas this week, trending ideas, participation stats, and any items requiring my attention (shortlist approvals)
**And** (email delivery implemented in Epic 6 — for now the digest data is available via API)

## Epic 3: Idea Submission & Community Engagement

Contributors can submit rich ideas with custom fields and attachments; the community engages through threaded comments, multi-criteria voting, and likes; ideas progress through lifecycle stages with community graduation (HOT!).

### Story 3.1: Idea Data Model, Submission Form, Detail Page & Campaign Idea List

As a Contributor,
I want to submit an idea to a campaign, view its detail page, and browse all ideas in a campaign,
So that I can share my ideas and discover what others have submitted.

**Acceptance Criteria:**

**Given** I am authenticated and viewing a campaign in SUBMISSION or DISCUSSION_VOTING phase
**When** I click "Submit Your Idea"
**Then** I see a submission form with: title (required, auto-focused), description (TipTap rich text editor with slash commands, image drag-and-drop/paste), file attachments (multiple, drag-and-drop, validated for type and 50MB max size), category selector (from campaign-configured categories), tags (free-form with autocomplete), and any custom fields configured for this campaign (rendered by type: text, keyword, selection, checkbox)
**And** custom fields marked as required show validation errors if left empty
**And** optional custom fields are progressively disclosed (collapsed section, expandable)
**And** the Idea model and related tables are created via Prisma migration: Idea, IdeaAttachment, IdeaCustomFieldValue, IdeaTag, IdeaCoAuthor

**Given** I am filling out the submission form
**When** I click "Save Draft" or the form auto-saves (every 30 seconds)
**Then** the idea is saved in DRAFT status, visible only to me in my "My Drafts" list
**And** I can return later to complete and submit the idea (FR22)

**Given** I complete the submission form and click "Submit"
**When** the idea is saved
**Then** the idea is created in QUALIFICATION status (if coach is enabled) or COMMUNITY_DISCUSSION status (if coach is disabled)
**And** a success toast appears with the idea title and a "View your idea" link
**And** the submission takes under 3 minutes on mobile (design target)

**Given** an idea exists
**When** I navigate to its detail page (ideas/[id])
**Then** I see: title, author name and avatar, submission date, status badge, description (rendered rich text), attached files (downloadable), custom field values, tags, category, and a tabbed content area for Comments, Activity, and Similar Ideas (placeholder until Epic 7)
**And** the right sidebar shows: voting section (placeholder until Story 3.4), graduation meter (placeholder until Story 3.5), and idea metadata

**Given** I am viewing a campaign detail page
**When** I click the "Ideas" tab
**Then** I see a list of ideas within this campaign, toggleable between tile view (cards with title, author, status badge, vote count, comment count) and compact list view (table rows with same data)
**And** I can filter by: status (all active statuses), category (from campaign categories), and tags
**And** I can sort by: newest, most voted, most commented
**And** the list uses cursor-based pagination (infinite scroll)
**And** only ideas visible to my role are shown (DRAFT ideas visible only to their author, QUALIFICATION ideas visible to author + coach + manager, COMMUNITY_DISCUSSION and above visible to campaign audience)

### Story 3.2: Idea Lifecycle State Machine & Coach Qualification

As an Innovation Manager,
I want ideas to progress through defined lifecycle states with coach qualification as a quality gate,
So that only reviewed ideas reach the community and every idea has a clear status at all times.

**Acceptance Criteria:**

**Given** the idea state machine
**When** I inspect the transition map
**Then** the following 8 states are defined: DRAFT, QUALIFICATION, COMMUNITY_DISCUSSION, HOT, EVALUATION, SELECTED_CONCEPT, SELECTED_IMPLEMENTATION, ARCHIVED

**And** the happy path transitions are: DRAFT > QUALIFICATION > COMMUNITY_DISCUSSION > HOT > EVALUATION > SELECTED_IMPLEMENTATION
**And** skip-qualification path: DRAFT > COMMUNITY_DISCUSSION (when campaign has idea coach disabled)
**And** manual graduation: COMMUNITY_DISCUSSION > HOT (Innovation Manager can manually promote an idea)
**And** archive: any active state (QUALIFICATION, COMMUNITY_DISCUSSION, HOT, EVALUATION) > ARCHIVED with a required reason text
**And** unarchive: ARCHIVED > previous state (stored in previousStatus field on the Idea model)
**And** forward from evaluation: EVALUATION > SELECTED_CONCEPT or EVALUATION > SELECTED_IMPLEMENTATION (manager chooses destination)

**Given** the state machine implementation
**When** I inspect the code
**Then** transition maps are defined as `Record<IdeaStatus, TransitionDef[]>` in `src/server/lib/state-machines/idea.ts`
**And** `transitionIdea()` is the ONLY function that can change idea status — never direct `prisma.update({ status })`
**And** idea transitions are coupled to campaign state: ideas cannot advance past their campaign's current phase (e.g., ideas can't enter EVALUATION if the campaign is still in DISCUSSION_VOTING)
**And** each transition fires typed events on the EventBus: `idea.statusChanged` with previousStatus, newStatus, and ideaId payload

**Given** a campaign with idea coach enabled
**When** a contributor submits an idea
**Then** the idea enters QUALIFICATION status
**And** the idea is visible only to: the contributor (author), assigned idea coach(es), and Innovation Managers
**And** the idea is NOT visible to the general campaign audience
**And** the campaign idea list correctly filters out QUALIFICATION ideas for non-authorized users

**Given** an idea in QUALIFICATION status
**When** the assigned Idea Coach clicks "Publish to Community"
**Then** the idea transitions to COMMUNITY_DISCUSSION status and becomes visible to the campaign audience
**And** an `idea.published` event fires on the EventBus
**And** (note: the full coach review experience with private comments requires Story 3.3 — this story implements the state transitions and visibility rules)

**Given** an Innovation Manager viewing an idea
**When** they click "Archive" and provide a reason
**Then** the idea transitions to ARCHIVED status with the reason stored
**And** the idea's previousStatus is saved for potential unarchive
**And** when they click "Unarchive" on an archived idea, it returns to the previousStatus

**Given** an invalid idea transition is attempted
**When** the guard rejects it (e.g., DRAFT > EVALUATION, or advancing past campaign phase)
**Then** a BAD_REQUEST error is returned with an explanation of why the transition is not allowed

**Given** the idea state machine test suite
**When** tests are executed
**Then** every valid transition, every invalid transition, every guard condition, campaign-phase coupling, and every event emission is tested

### Story 3.3: Comments, @Mentions, Private Comments & Moderation

As a User,
I want to discuss ideas through threaded comments with @mentions and have private coach discussions,
So that ideas are refined through community dialogue and coaches can provide confidential feedback.

**Acceptance Criteria:**

**Given** I am viewing an idea in COMMUNITY_DISCUSSION or higher status
**When** I write a comment
**Then** I can enter rich text (TipTap with basic formatting: bold, italic, links, lists) and submit it
**And** the comment appears immediately via optimistic update
**And** the comment is persisted to the database (Comment model created via Prisma migration: Comment with parentId for threading, ideaId, authorId, content, isPrivate flag, createdAt)
**And** a `comment.created` event fires on the EventBus with ideaId, commentId, authorId, and isPrivate flag

**Given** an idea with comments
**When** I view the Comments tab
**Then** I see comments in chronological order with author avatar, name, timestamp, and content
**And** replies are indented under their parent comment (threaded, max 2 levels deep — deeper replies flatten to level 2 with "@parent-author" prefix)

**Given** I am writing a comment
**When** I type "@" followed by characters
**Then** I see an autocomplete dropdown of users matching the input (name search)
**And** selecting a user inserts an @mention link in the comment
**And** the mentioned user receives an `user.mentioned` event on the EventBus (notification delivered in Epic 6)

**Given** an idea in QUALIFICATION status
**When** the contributor, coach, or manager writes a comment
**Then** the comment is automatically marked as private (isPrivate: true)
**And** private comments are visible only to: the contributor, assigned coach(es), and Innovation Managers
**And** private comments are visually distinguished with a "Private" badge and a subtle background tint
**And** when the idea transitions to COMMUNITY_DISCUSSION, private comments remain private (they don't become public)

**Given** I am on an idea that has both public and private comments
**When** a regular contributor views the idea (not coach, not manager)
**Then** they only see public comments — private comments are completely hidden (not just collapsed)

**Given** I am a Moderator for this campaign
**When** I flag a comment as inappropriate
**Then** the comment is visually marked as flagged (with a flag icon) and hidden from non-moderator/non-manager view
**And** a `comment.flagged` event fires on the EventBus
**And** the Innovation Manager can review flagged comments and either restore or delete them

### Story 3.4: Voting, Likes & Real-Time Community Engagement

As a Contributor,
I want to vote on and like ideas with instant feedback and see real-time updates from other users,
So that community engagement is visible and responsive, driving participation momentum.

**Acceptance Criteria:**

**Given** I am viewing an idea in COMMUNITY_DISCUSSION or HOT status
**When** I click the star rating for a voting criterion
**Then** my vote is recorded optimistically — the UI updates instantly (star fills, average recalculates) before the server confirms
**And** the vote is persisted to the database (Vote model created via Prisma migration: Vote with ideaId, userId, criterionId, score)
**And** a `vote.submitted` event fires on the EventBus with ideaId, userId, criterionId, score
**And** if the server request fails, the optimistic update is rolled back and an error toast appears

**Given** a campaign with multiple voting criteria (e.g., "Feasibility" weight 40%, "Impact" weight 60%)
**When** I vote on an idea
**Then** I see separate star ratings for each criterion with their labels
**And** I can update my vote at any time (previous vote is overwritten, not duplicated)
**And** the weighted average is displayed on the idea card and detail page

**Given** I am viewing an idea
**When** I click the like button (heart icon)
**Then** the like is recorded optimistically — the heart fills and the count increments instantly
**And** the like is persisted (Like model: ideaId, userId, unique constraint)
**And** a `like.added` event fires on the EventBus
**And** clicking again unlikes (toggle behavior) with a `like.removed` event

**Given** another user likes or votes on an idea I am currently viewing
**When** the server processes their action
**Then** the like count / vote average on my screen updates within 100ms via Socket.io broadcast
**And** the Socket.io event is scoped to the idea's room (only users viewing that idea receive the update)

**Given** I am viewing the campaign idea list
**When** another user submits a vote or like
**Then** the affected idea card's vote count / like count updates in real-time via Socket.io

**Given** I want to stay informed about an idea
**When** I click "Follow" on an idea, campaign, or channel
**Then** I am subscribed to updates (Follow model: userId, entityType, entityId)
**And** a `follow.added` event fires on the EventBus (notification delivery in Epic 6)
**And** I can unfollow at any time
**And** contributors automatically follow ideas they submit

### Story 3.5: Community Graduation (HOT!), Activity Stream & Social Features

As a Contributor,
I want to see my idea's progress toward HOT! graduation and see a live activity stream,
So that I feel my idea is alive, moving through the system, and valued by the community.

**Acceptance Criteria:**

**Given** an idea in COMMUNITY_DISCUSSION status
**When** the idea detail page loads
**Then** I see the Graduation Meter in the right sidebar showing progress toward each campaign-configured threshold:

- Visitors: X / Y (progress bar)
- Commenters: X / Y (progress bar)
- Voters: X / Y (progress bar)
- Average voting level: X.X / Y (progress bar)
- Days active: X / Y (progress bar)
  **And** each threshold shows a green checkmark when met and a gray indicator when not yet met
  **And** the meter uses campaign-specific thresholds configured in Story 2.2b

**Given** a comment is created, a vote is submitted, a like is added, or a page view is recorded on an idea in COMMUNITY_DISCUSSION status
**When** the event fires on the EventBus
**Then** the graduation threshold checker runs synchronously (in-process EventEmitter listener — not a scheduled job)
**And** the checker compares current metrics against the campaign's configured thresholds
**And** if ALL thresholds are met, the idea automatically transitions to HOT status via `transitionIdea()`

**Given** graduation only applies to ideas in COMMUNITY_DISCUSSION status
**When** a vote or comment is added to an idea in any other status (DRAFT, QUALIFICATION, HOT, EVALUATION, etc.)
**Then** the graduation checker does NOT run and no transition is attempted

**Given** an idea meets all graduation thresholds and transitions to HOT
**When** the transition succeeds
**Then** the idea's status badge changes to the gradient HOT! pill (amber-to-red gradient with subtle pulse animation)
**And** a celebration toast appears for the contributor: "Your idea earned HOT! status!"
**And** the contributor receives an `idea.graduated` event on the EventBus (notification in Epic 6)
**And** the idea card in the campaign list gains the flame badge and a brief highlight animation
**And** the Graduation Meter shows all thresholds as complete

**Given** an Innovation Manager viewing an idea in COMMUNITY_DISCUSSION
**When** they click "Promote to HOT!"
**Then** the idea transitions to HOT status regardless of threshold progress (manual graduation override)
**And** the same celebration and event behavior fires as automatic graduation

**Given** an idea exists
**When** I view its Activity tab
**Then** I see a chronological timeline of all events: submitted, status changes, comments added, votes received, likes received, coach feedback, HOT! graduation, evaluation started, selected/archived
**And** each event shows: actor avatar, action description, and timestamp
**And** events update in real-time via Socket.io

**Given** I am the author of an idea
**When** I want to add a co-author
**Then** I can search for users and add them as co-authors (IdeaCoAuthor model)
**And** co-authors are displayed on the idea detail page alongside the primary author
**And** co-authors have the same visibility permissions as the original author (FR23)

**Given** I am viewing an idea
**When** the system detects relevant users based on skills and contribution history
**Then** a "Suggested Experts" section appears (small, non-intrusive) listing 3-5 users whose skills match the idea's tags/category (FR34)
**And** this feature uses simple tag/skill matching (AI-enhanced matching deferred to Epic 7)

**Given** all events in Stories 3.3, 3.4, and 3.5
**When** they fire on the EventBus
**Then** each event is typed in the EventMap interface: `comment.created`, `comment.flagged`, `vote.submitted`, `like.added`, `like.removed`, `follow.added`, `idea.graduated`, `idea.statusChanged`
**And** two listeners are active: the graduation threshold checker (3.5) and the activity logger (writes to ActivityLog table for the activity stream)
**And** notification listeners will be registered in Epic 6

## Epic 4: Idea Board & Management

Innovation Managers can organize and triage ideas using sortable/filterable tables, manual and smart buckets, split/merge operations, and bulk actions.

### Story 4.1: Idea Board Table View & Filtering

As an Innovation Manager,
I want to view all ideas in a campaign as a sortable, filterable table with configurable columns,
So that I can scan, sort, and filter the full idea pool to make triage decisions efficiently.

**Acceptance Criteria:**

**Given** I am an Innovation Manager viewing a campaign
**When** I navigate to the Idea Board tab
**Then** I see a full-width data table showing all ideas in the campaign with columns: checkbox (selection), title (linked to idea detail), author, status badge, category, vote average, like count, comment count, HOT! badge, bucket assignment, and submission date
**And** the board page uses the Kanban Flow layout direction from the UX spec (3-panel: buckets sidebar left, data table center, detail preview right)

**Given** the idea board table
**When** I click a column header
**Then** the table sorts by that column (ascending/descending toggle)
**And** I can sort by: title (alpha), vote average (numeric), like count, comment count, submission date, status, category

**Given** the idea board table
**When** I open the filter panel
**Then** I can filter by: status (multi-select checkboxes), category (multi-select), bucket (multi-select including "Unassigned"), tags (multi-select), author (search), date range (submitted between), vote average (min/max), and HOT! status (yes/no)
**And** active filters are shown as removable pills above the table
**And** filters apply immediately (no "Apply" button needed)

**Given** the idea board table
**When** I click the column configuration button
**Then** I can show/hide columns and reorder them via drag-and-drop
**And** my column configuration is persisted per user per campaign (stored in localStorage or user preferences)

**Given** I click on an idea row in the table
**When** the detail preview panel opens
**Then** the right panel (320px) shows a compact idea preview: title, author, status, description excerpt, vote summary, comment count, and quick-action buttons (change status, assign bucket, archive)
**And** I can close the preview panel to return to full-width table view

**Given** the idea board
**When** I use keyboard navigation
**Then** arrow keys move between rows, Enter opens the detail preview, Escape closes the preview, and Tab moves between interactive elements within a row

### Story 4.2: Manual Buckets & Smart Buckets

As an Innovation Manager,
I want to organize ideas into manual and smart buckets for categorization and workflow management,
So that I can group ideas by theme, quality, or any criteria that helps me manage the triage process.

**Acceptance Criteria:**

**Given** I am on the idea board
**When** I view the buckets sidebar (left panel, 240px)
**Then** I see a list of buckets with: "All Ideas" (default, shows everything), "Unassigned" (ideas not in any bucket), and any user-created manual or smart buckets
**And** each bucket shows its name, color dot, and idea count
**And** clicking a bucket filters the table to show only ideas in that bucket

**Given** the buckets sidebar
**When** I click "New Bucket" and select "Manual Bucket"
**Then** I can enter a bucket name, select a color (from a preset palette of 12 colors), and save
**And** the bucket appears in the sidebar (Bucket model created via Prisma migration: Bucket with campaignId, name, color, type enum MANUAL/SMART, filterCriteria JSON nullable)

**Given** a manual bucket exists
**When** I drag an idea row from the table onto the bucket in the sidebar (dnd-kit)
**Then** the idea is assigned to that bucket, the bucket count updates, and the idea's bucket column in the table updates
**And** I can also assign a bucket via the idea's context menu or detail preview quick-action
**And** an idea can belong to only one manual bucket at a time (reassignment removes from previous bucket)

**Given** the buckets sidebar
**When** I click "New Bucket" and select "Smart Bucket"
**Then** I can define filter criteria using the same filter options as the table (status, category, tags, vote range, HOT! status, date range)
**And** the smart bucket auto-populates with all ideas matching the criteria
**And** smart bucket membership updates automatically as idea data changes (recalculated on query, not cached)

**Given** an existing bucket
**When** I right-click or click the bucket's menu icon
**Then** I can rename it, change its color, edit filter criteria (smart buckets), or delete it
**And** deleting a manual bucket unassigns all ideas (they become "Unassigned") — ideas are not deleted
**And** deleting a smart bucket simply removes the saved filter — no ideas are affected

### Story 4.3: Idea Split, Merge & Bulk Actions

As an Innovation Manager,
I want to split, merge, and perform bulk actions on ideas,
So that I can restructure the idea pool — separating compound ideas, combining duplicates, and efficiently managing groups of ideas.

**Acceptance Criteria:**

**Given** I am viewing an idea on the idea board
**When** I select "Split Idea" from the context menu
**Then** a dialog opens showing the original idea's title and description
**And** I can create 2+ new ideas from the original: each with an editable title, description (pre-populated from a split of the original text), and the same category/tags as the original
**And** when I confirm the split, the original idea is archived with reason "Split into ideas [new idea titles]"
**And** the new ideas are created in the same status as the original, with a reference back to the original (splitFromId field)
**And** the original idea's comments, votes, and likes are NOT copied to the new ideas (they remain on the archived original)

**Given** I have selected 2 or more ideas via checkboxes on the idea board
**When** I click "Merge Ideas"
**Then** a dialog opens showing all selected ideas with their titles and descriptions
**And** I can select which idea becomes the "primary" (its title and description are used as the base)
**And** I can edit the merged title and description before confirming
**And** when I confirm the merge, one merged idea is created (or the primary is updated) and all other selected ideas are archived with reason "Merged into [merged idea title]"
**And** all comments from merged ideas are preserved and moved to the merged idea (re-linked via ideaId)
**And** all votes and likes are aggregated to the merged idea (duplicates from same user resolved by keeping the highest vote)
**And** all original contributors are listed as co-authors on the merged idea (preserving attribution)

**Given** I have selected 1 or more ideas via checkboxes
**When** I click the "Bulk Actions" dropdown
**Then** I can perform: "Assign to Bucket" (select from existing manual buckets), "Change Status" (select from valid transitions), "Archive" (with bulk reason), and "Export" (download selected ideas as CSV with all fields)
**And** the action is applied to all selected ideas with a progress indicator for large batches
**And** a success toast shows "X ideas updated"

**Given** I perform a bulk archive
**When** the action completes
**Then** all selected ideas transition to ARCHIVED via `transitionIdea()` (not direct status update)
**And** each idea's archive reason is set to the provided bulk reason
**And** `idea.statusChanged` events fire for each idea

### Story 4.4: Dual-Window Comparison Mode

As an Innovation Manager,
I want to compare two ideas side by side in a dual-window view,
So that I can make informed triage decisions when ideas are similar or competing.

**Acceptance Criteria:**

**Given** I am on the idea board with at least 2 ideas
**When** I select exactly 2 ideas via checkboxes and click "Compare"
**Then** the view switches to a dual-window layout: left panel shows Idea A's full detail (title, description, custom fields, vote summary, comment count, status, category, tags) and right panel shows Idea B's full detail
**And** shared fields are aligned horizontally for easy visual comparison

**Given** I am in dual-window comparison mode
**When** I view the comparison
**Then** differences are subtly highlighted: vote averages show which is higher (green highlight on the higher value), comment counts are compared, and status badges are both visible
**And** I can take quick actions on either idea: change status, assign bucket, archive, or merge the two ideas directly from the comparison view

**Given** I am in dual-window comparison mode
**When** I want to swap or change ideas
**Then** I can click "Change" on either panel to select a different idea from the campaign's idea list (dropdown/search)
**And** I can click "Exit Comparison" to return to the normal table view

**Given** the dual-window view on tablet or smaller screens
**When** the viewport is below 1024px
**Then** the comparison stacks vertically (Idea A on top, Idea B below) with a sticky header showing both idea titles for context

## Epic 5: Evaluation Engine

Innovation Managers create scorecard and pairwise evaluation sessions; evaluators score ideas with save-and-resume; the system calculates weighted results with standard deviation; shortlists are managed and visualized as bubble charts.

### Story 5.1: Evaluation Session Creation & Configuration

As an Innovation Manager,
I want to create and configure scorecard and pairwise evaluation sessions with assigned teams,
So that I can set up structured evaluations with clear criteria, deadlines, and evaluators.

**Acceptance Criteria:**

**Given** I am an Innovation Manager on a campaign in EVALUATION phase
**When** I click "New Evaluation Session"
**Then** I can choose between: Scorecard Session or Pairwise Session
**And** the EvaluationSession model and related tables are created via Prisma migration: EvaluationSession (campaignId, type enum SCORECARD/PAIRWISE, status, dueDate), EvaluationCriterion (sessionId, label, description, weight, fieldType enum SCALE/TEXT/CHECKBOX, guidanceText, displayOrder, conditionalVisibility), EvaluationAssignment (sessionId, evaluatorId, status), EvaluationSessionIdea (sessionId, ideaId)

**Given** I select "Scorecard Session"
**When** I configure the session
**Then** I can set: session name, due date, and add custom evaluation criteria
**And** each criterion has: label (required), description, field type (selection scale 1-5, text comment, checkbox), weight (percentage, all weights must sum to 100%), evaluator guidance text (explaining what each score level means), display order, and optional conditional visibility (show criterion B only if criterion A score > 3)

**Given** I select "Pairwise Session"
**When** I configure the session
**Then** I can set: session name, due date, and comparison criteria
**And** each criterion has: label, description, and weight
**And** the system will present ideas in pairs for side-by-side comparison

**Given** a configured evaluation session
**When** I assign the evaluation team
**Then** I can add evaluators from: the campaign's pre-configured evaluation team (from Story 2.2b), or search and add individual users
**And** each evaluator receives an `evaluation.requested` event on the EventBus
**And** I can set a due date and the system schedules a BullMQ reminder job for 1 day before the deadline

**Given** a configured evaluation session
**When** I add ideas to the session
**Then** I can add ideas from: a specific bucket (all ideas in that bucket), the full campaign idea list (multi-select), or filtered results
**And** only ideas in COMMUNITY_DISCUSSION, HOT, or EVALUATION status can be added
**And** adding ideas transitions them to EVALUATION status (if not already) via `transitionIdea()`

### Story 5.2: Scorecard Evaluation Flow

As an Evaluator,
I want to score ideas against criteria with a focused split-pane interface that saves my progress,
So that I can complete evaluations efficiently between meetings and resume where I left off.

**Acceptance Criteria:**

**Given** I am an Evaluator assigned to a scorecard session
**When** I open the evaluation from my dashboard or notification link
**Then** I see the Evaluation Focus layout (split-pane): left panel (60%) shows the full idea (title, description, custom fields, attachments, community stats — comments, votes, similar ideas), right panel (40%) shows the scoring form with all criteria
**And** a progress bar at the top shows "X of Y completed"

**Given** the scoring form
**When** I score a criterion
**Then** my score is auto-saved immediately (no explicit save button needed) to an EvaluationResponse model (sessionId, evaluatorId, ideaId, criterionId, score, comment)
**And** for scale criteria (1-5): I click stars or type a number, with guidance text visible as a tooltip
**And** for text criteria: I type qualitative feedback
**And** for checkbox criteria: I check/uncheck
**And** I can add an optional comment per criterion for qualitative notes

**Given** I have scored all criteria for the current idea
**When** I click [Done & Next]
**Then** a green checkmark animation confirms completion, and the view auto-advances to the next unscored idea
**And** the progress bar updates ("X+1 of Y completed")
**And** keyboard shortcut: Enter triggers [Done & Next]

**Given** I have partially completed an evaluation session
**When** I close the browser and return later
**Then** I resume exactly where I left off — previously scored ideas show as complete, and the next unscored idea is loaded
**And** I can navigate back to previously scored ideas to revise my scores at any time before the session closes

**Given** I am an Innovation Manager viewing an evaluation session
**When** I check evaluator progress
**Then** I see a progress dashboard showing: each evaluator's name, % complete (X of Y ideas scored), and last activity timestamp
**And** I can send a reminder to evaluators who haven't started or are behind (fires `evaluation.reminder` event on EventBus, email delivery in Epic 6)

### Story 5.3: Pairwise Evaluation Flow

As an Evaluator,
I want to compare ideas side by side and score them on a slider per criterion,
So that I can express relative preferences between ideas without assigning absolute scores.

**Acceptance Criteria:**

**Given** I am an Evaluator assigned to a pairwise session
**When** I open the evaluation
**Then** I see two ideas displayed side by side: Idea A on the left, Idea B on the right, each showing full detail (title, description, custom fields, key stats)
**And** below the ideas, I see a slider for each comparison criterion

**Given** the pairwise comparison form
**When** I adjust a slider for a criterion
**Then** the slider ranges from "Strongly prefer A" (left) through "Equal" (center) to "Strongly prefer B" (right) with 7 discrete positions
**And** my preference is auto-saved immediately (PairwiseResponse model: sessionId, evaluatorId, ideaAId, ideaBId, criterionId, preference score)

**Given** I complete a pairwise comparison
**When** I click [Done & Next]
**Then** the view advances to the next pair of ideas
**And** the system generates pairs algorithmically: every idea is compared with every other idea at least once, with the order randomized to prevent position bias
**And** the progress bar shows "X of Y comparisons completed"

**Given** a large number of ideas (e.g., 20 ideas = 190 possible pairs)
**When** the session is configured
**Then** the Innovation Manager can set the comparison depth: "Full" (all pairs) or "Balanced Incomplete" (each idea appears in N comparisons, reducing evaluator burden while maintaining statistical validity)

**Given** the pairwise session is complete
**When** the system calculates results
**Then** the Bradley-Terry model is applied to convert pairwise preferences into a global ranking score per idea
**And** the ranking is weighted by criterion weights

### Story 5.4: Results Engine, Bubble Chart & Shortlist Management

As an Innovation Manager,
I want to view evaluation results as ranked tables and bubble charts, manage the shortlist, and forward selected ideas,
So that I can make data-driven selection decisions and move winning ideas toward implementation.

**Acceptance Criteria:**

**Given** an evaluation session with completed evaluations
**When** I open the Results view
**Then** I see a sortable results table with columns: idea title, weighted overall score, individual criterion scores, standard deviation (indicating evaluator agreement/disagreement), evaluator count, and rank
**And** rows with high standard deviation (> 1.0 on a 5-point scale) are highlighted with a warning indicator ("High disagreement")
**And** I can click on any idea to see the score breakdown by evaluator (anonymized or named, configurable per session)

**Given** the results view
**When** I switch to Bubble Chart visualization
**Then** I see a Recharts scatter plot where: X-axis = one selected criterion, Y-axis = another selected criterion, bubble size = overall weighted score (or a third criterion)
**And** I can change which criteria map to which axis via dropdowns
**And** hovering over a bubble shows the idea title and scores
**And** clicking a bubble opens the idea detail

**Given** the results view
**When** I click "Add to Shortlist" on an idea (or drag it to the shortlist panel)
**Then** the idea is added to the session's shortlist
**And** I can remove ideas from the shortlist before locking
**And** the shortlist panel shows all shortlisted ideas with their scores

**Given** a finalized shortlist
**When** I click "Lock Shortlist"
**Then** the shortlist is locked — no further additions or removals
**And** the locked shortlist is visible to the Campaign Sponsor for approval (Story 2.5)
**And** an `evaluation.shortlistLocked` event fires on the EventBus

**Given** a locked shortlist
**When** I click "Forward" on a shortlisted idea
**Then** I can choose the destination status: SELECTED_IMPLEMENTATION, SELECTED_CONCEPT, or ARCHIVED (with reason)
**And** the idea transitions via `transitionIdea()` to the chosen status
**And** non-shortlisted ideas in the session can be bulk-archived with reason "Not shortlisted in [session name]"

**Given** I want to reuse this evaluation configuration
**When** I click "Save as Template"
**Then** the session's criteria configuration (labels, weights, field types, guidance text) is saved as a reusable template (EvaluationTemplate model: name, criteria JSON, createdBy)
**And** when creating a new session, I can select "From Template" to pre-populate criteria

## Epic 6: Channels & Notifications

Always-open ideation channels available for continuous innovation; users receive in-app and email notifications for all key events with configurable frequency.

### Story 6.1: Channel Creation & Management

As an Innovation Manager,
I want to create always-open channels for continuous ideation without timeline constraints,
So that ideas can be submitted anytime, not just during time-bound campaigns.

**Acceptance Criteria:**

**Given** I am an Innovation Manager
**When** I click "New Channel"
**Then** I see a creation form with: title (required), description (rich text), banner image (optional), category, and target audience
**And** the Channel model is created via Prisma migration: Channel (sharing relevant fields with Campaign but with hasTimeline=false, no phase schedule)
**And** channels do NOT have timeline dates, phase schedules, or lifecycle state machines — they are always in an "Open" state

**Given** a channel exists
**When** I view the channel detail page
**Then** it looks similar to a campaign detail page (banner, description, Ideas tab, Activity tab) but without timeline indicators or phase badges
**And** the "Submit Your Idea" button is always visible (channels are permanently open for submission)

**Given** a channel with ideas
**When** contributors submit ideas, comment, vote, and like
**Then** all idea submission, discussion, voting, and community engagement features work identically to campaigns (reusing the same components and services from Epic 3)
**And** ideas in channels follow the same lifecycle state machine except there are no campaign-phase coupling constraints

**Given** a channel exists
**When** I want to manage its ideas
**Then** the idea board (Epic 4) works identically within a channel context — table view, buckets, split/merge, bulk actions
**And** evaluation sessions (Epic 5) can be created for channel ideas

**Given** the explore page and navigation
**When** I browse the platform
**Then** channels appear alongside campaigns in the sidebar navigation and explore views, visually distinguished with a "Channel" badge (vs. campaign's phase badge)

### Story 6.2: In-App Notification Center

As a User,
I want to receive in-app notifications for key events and manage them in a notification center,
So that I stay informed about activity relevant to me without leaving the platform.

**Acceptance Criteria:**

**Given** I am authenticated
**When** a relevant event fires on the EventBus
**Then** an in-app notification is created and stored in the database (Notification model via Prisma migration: Notification with userId, type, title, body, entityType, entityId, isRead, createdAt)
**And** the notification appears in real-time via Socket.io (no page refresh needed)

**Given** the following events from previous epics
**When** they fire on the EventBus
**Then** notifications are generated for the appropriate users:
**And** `idea.statusChanged` — notify idea author and followers
**And** `idea.published` — notify idea author ("Your idea is now visible to the community")
**And** `idea.graduated` — notify idea author ("Your idea earned HOT! status!")
**And** `comment.created` — notify idea author and followers (unless commenter is the author)
**And** `user.mentioned` — notify the mentioned user
**And** `vote.submitted` — notify idea author (batched: "Your idea received 3 new votes" not one per vote)
**And** `evaluation.requested` — notify assigned evaluators
**And** `evaluation.reminder` — notify evaluators who haven't completed
**And** `campaign.phaseChanged` — notify campaign followers and team members
**And** `evaluation.shortlistLocked` — notify campaign sponsor
**And** `follow.added` — notify the entity author ("X started following your idea")

**Given** I click the notification bell in the header
**When** the notification center opens
**Then** I see a dropdown/sheet panel listing notifications in reverse chronological order
**And** each notification shows: icon (by type), title, body preview, timestamp (relative: "2 hours ago"), and read/unread indicator
**And** I can click a notification to navigate to the relevant entity (idea, campaign, evaluation)
**And** clicking marks it as read

**Given** the notification bell icon
**When** I have unread notifications
**Then** a badge shows the unread count (number for 1-99, "99+" for more)
**And** the count updates in real-time via Socket.io

**Given** the notification center
**When** I manage my notifications
**Then** I can: mark all as read, mark individual as read/unread, filter by type (ideas, campaigns, evaluations, mentions), and delete old notifications

### Story 6.3: Email Notifications & Digest System

As a User,
I want to receive email notifications with configurable frequency,
So that I stay informed about platform activity even when I'm not logged in.

**Acceptance Criteria:**

**Given** I have configured my notification preferences (Story 1.2) to "Immediate"
**When** a notification-worthy event occurs
**Then** an email is sent immediately via a BullMQ email job (rendered from a template, delivered via SMTP)
**And** the email includes: event description, direct link to the relevant entity, and an unsubscribe/preferences link in the footer
**And** emails are sent through the configured SMTP provider (mailpit in dev, production SMTP in prod)

**Given** I have configured my notification preferences to "Daily Digest"
**When** the daily digest BullMQ job runs (configurable time, default 8:00 AM)
**Then** I receive a single email summarizing all notifications from the past 24 hours
**And** the digest groups notifications by type: "Campaign Updates", "Your Ideas", "Evaluation Tasks", "Mentions"
**And** each group shows the count and top items with links
**And** if I have no notifications, no digest email is sent

**Given** I have configured my notification preferences to "Weekly Digest"
**When** the weekly digest BullMQ job runs (configurable day/time, default Monday 8:00 AM)
**Then** I receive a single email summarizing the past week's activity
**And** the digest includes: campaigns I'm involved in (with participation stats), my ideas (status changes, new votes/comments), pending tasks (evaluations due), and trending ideas in my campaigns

**Given** email delivery
**When** an email fails to send
**Then** the BullMQ job retries with exponential backoff (3 attempts: 1 min, 5 min, 30 min)
**And** failures are logged with the notification ID and error details
**And** the in-app notification is still delivered regardless of email failure

**Given** I want to control my email preferences
**When** I visit my profile notification settings (from Story 1.2)
**Then** I can set frequency per notification type: Ideas (immediate/daily/weekly/off), Campaigns (immediate/daily/weekly/off), Evaluations (immediate/daily/weekly/off), Mentions (immediate/off — mentions are always immediate or off, no digest)

## Epic 7: Search, Discovery & AI Intelligence

Users can search and explore all content through full-text search and filtered views; AI enhances idea quality with co-pilot suggestions, detects similar ideas semantically, and generates smart summaries.

### Story 7.1: Full-Text Search & Explore Views

As a User,
I want to search across all platform content and explore campaigns, channels, and ideas through filtered views,
So that I can quickly find relevant content regardless of which campaign it belongs to.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I type in the global search bar (header) or open Cmd+K command palette
**Then** I see real-time search results grouped by type: Campaigns, Channels, Ideas, Users
**And** search uses PostgreSQL tsvector full-text search with GIN indexes on: Idea (title, description), Campaign (title, description), Channel (title, description), User (name, bio, skills)
**And** results are ranked by relevance (ts_rank) with the search term highlighted in result snippets
**And** search responds within 300ms (NFR2)

**Given** the Cmd+K command palette
**When** I open it
**Then** I see: recent searches, suggested actions ("New Idea", "New Campaign"), and a search input
**And** I can type to search or navigate: "campaign:" prefix searches only campaigns, "idea:" only ideas, "user:" only users
**And** arrow keys navigate results, Enter selects, Escape closes

**Given** I navigate to the Explore page
**When** the page loads
**Then** I see a unified view of campaigns, channels, and ideas across the platform (respecting RBAC — only content I have permission to see)
**And** I can toggle between: tile view (Card Gallery layout with campaign/idea cards), list view (compact rows), and table view (sortable columns)
**And** I can filter by: type (campaigns/channels/ideas), status, category, tags, date range
**And** I can sort by: newest, most active, most ideas, trending

**Given** I have configured useful search filters
**When** I click "Save Search"
**Then** the current search query and filters are saved as a favorite (SavedSearch model: userId, name, query, filters JSON)
**And** saved searches appear in the Cmd+K palette and in a "Saved Searches" section on the Explore page
**And** I can rename or delete saved searches

### Story 7.2: AI Embedding Pipeline & Similarity Detection

As a Contributor,
I want to see semantically similar ideas when submitting or viewing an idea,
So that I can avoid duplicates and build on existing ideas rather than starting from scratch.

**Acceptance Criteria:**

**Given** the AI provider configuration
**When** `AI_ENABLED=true` (default) and no `OPENAI_API_KEY` is set
**Then** the LocalAIProvider is active, using the all-MiniLM-L6-v2 model via ONNX Runtime to generate 384-dimensional vector embeddings
**And** when `OPENAI_API_KEY` is set, the OpenAIProvider is used (embeddings dimensionally reduced to 384 to match local model)
**And** when `AI_ENABLED=false`, the NullAIProvider returns empty results and all AI features are hidden in the UI

**Given** a new idea is submitted or updated
**When** the `idea.submitted` or `idea.updated` event fires
**Then** a BullMQ job generates the embedding vector from the idea's title + description
**And** the embedding is stored in the Idea table's `embedding vector(384)` column (pgvector)
**And** embedding generation completes within 3 seconds (NFR6) and does not block the submission response (async)

**Given** an idea with an embedding exists
**When** I view the idea detail page "Similar Ideas" tab
**Then** the system queries pgvector using cosine distance (`<=>` operator) to find the 5 most similar ideas
**And** results are displayed with: idea title, similarity percentage, author, status badge, and a link to the idea
**And** only ideas the current user has permission to see are included in results

**Given** I am submitting a new idea
**When** I finish typing the title (debounced 500ms after last keystroke)
**Then** a "Similar Ideas" section appears below the title field showing up to 3 potentially similar ideas (real-time similarity check against existing embeddings)
**And** this is non-blocking — the contributor can dismiss it and continue submitting
**And** if AI is disabled, this section shows results from PostgreSQL full-text search instead (keyword-based fallback, FR65)

**Given** the AI system
**When** the ONNX model fails to load or embedding generation throws an error
**Then** the system falls back gracefully to PostgreSQL tsvector full-text search for similarity
**And** the error is logged but no user-facing error is shown — AI degradation is invisible to users

### Story 7.3: AI Idea Enrichment Co-Pilot

As a Contributor,
I want AI-powered suggestions to improve my idea during submission,
So that my idea is clearer, better tagged, and more likely to get community engagement.

**Acceptance Criteria:**

**Given** I am on the idea submission form with AI enabled
**When** I type a title
**Then** the AI co-pilot suggests an improved title as ghost text (grayed out, Tab to accept, keep typing to ignore)
**And** suggestions appear after a 1-second debounce to avoid distracting rapid-fire suggestions
**And** a subtle "Powered by AI" label appears next to suggestions to build trust

**Given** I have entered a title and description
**When** the AI analyzes my content
**Then** it suggests: relevant tags (displayed as clickable chips below the tag input — click to accept), a category recommendation (if campaign has categories), and structural improvements ("Try adding: Problem, Solution, Expected Impact" as a collapsible suggestion banner)
**And** all suggestions are opt-in — the contributor can dismiss any suggestion with a single click or Escape key

**Given** the AI co-pilot
**When** it detects missing information in the description
**Then** it highlights gaps with subtle inline hints: "Consider adding estimated impact" or "What problem does this solve?" displayed as non-intrusive helper text below the description editor
**And** hints disappear once the contributor addresses them or dismisses them

**Given** the co-pilot uses AI
**When** the AI provider is NullAIProvider (AI disabled)
**Then** the co-pilot section is completely hidden — no suggestion UI appears
**And** the submission form works identically without AI, just without the enrichment features

**Given** the AI co-pilot interaction
**When** the user interacts with suggestions
**Then** a `copilot.suggestionAccepted` or `copilot.suggestionDismissed` event fires (for analytics — no listener in MVP beyond activity logging)

### Story 7.4: AI Smart Summarization

As an Innovation Manager,
I want AI-generated summaries for campaigns, evaluation sessions, and notification digests,
So that I can quickly understand the state of my campaigns without reading every idea and comment.

**Acceptance Criteria:**

**Given** I am viewing a campaign cockpit (Story 2.4)
**When** AI is enabled
**Then** an "AI Summary" section appears showing: a narrative summary of the campaign (e.g., "47 ideas submitted across 3 main themes: sustainability, cost reduction, and process automation. The top-performing ideas focus on packaging materials, with 3 ideas reaching HOT! status.")
**And** the summary highlights: top themes/clusters identified from idea embeddings, engagement trends, and notable ideas

**Given** an evaluation session with completed results
**When** I view the results page
**Then** an "AI Results Digest" section appears summarizing: the overall evaluation outcome, areas of evaluator agreement/disagreement, standout ideas, and recommendations
**And** the digest is generated on-demand (not pre-computed) via the AI provider

**Given** the daily/weekly notification digest (Story 6.3)
**When** AI is enabled
**Then** the email digest includes a brief AI-generated narrative summary of the period's activity in addition to the structured notification list
**And** the summary is generated by the BullMQ digest job before email rendering

**Given** AI summaries
**When** the AI provider is NullAIProvider
**Then** all summary sections are hidden — no placeholder or "AI disabled" message shown
**And** the campaign cockpit, results page, and email digests function normally without summaries

**Given** AI summary generation
**When** the summarization call fails or times out (5-second timeout)
**Then** the summary section shows "Summary unavailable" with no error details
**And** the failure is logged and the rest of the page/email renders normally

## Epic 8: Administration Dashboard & Polish

Admins manage the platform through a dedicated admin panel with System vs. Innovation separation; all users see a personalized dashboard with tasks, campaigns, and activity.

### Story 8.1: Dedicated Admin Panel

As a Platform Admin,
I want a dedicated admin interface with clear separation between system and innovation configuration,
So that I can manage platform infrastructure without being overwhelmed by innovation-specific settings, and Innovation Managers can configure campaigns without touching system settings.

**Acceptance Criteria:**

**Given** I am authenticated as a Platform Admin
**When** I navigate to the Admin section
**Then** I see a clearly separated two-section admin panel:

**And** Section 1 — System Administration (Platform Admin only):

- SMTP configuration (host, port, credentials, test send button)
- Storage configuration (S3/MinIO endpoint, bucket, credentials, storage usage display)
- Redis connection status and configuration
- System health dashboard: database size, active user count, storage usage, queue depths, uptime
- Environment variable reference (read-only display of configured values, secrets masked)

**And** Section 2 — Innovation Configuration (Platform Admin + Innovation Manager):

- User management link (to existing Story 1.5 user admin)
- Group management link (to existing Story 1.5 group admin)
- Org unit management link (to existing Story 1.4 org unit admin)
- Notification template management (Story 8.2)
- Platform customization (Story 8.2)
- Campaign template management

**Given** I am an Innovation Manager (not Platform Admin)
**When** I access the Admin section
**Then** I see only Section 2 (Innovation Configuration) — Section 1 (System Administration) is completely hidden
**And** RBAC middleware enforces this separation on all admin API endpoints

**Given** the system health dashboard
**When** I view it
**Then** I see: database connection status and size, Redis connection status, S3/MinIO connectivity and storage used, BullMQ queue depths (pending/active/failed per queue), active user count (logged in within last 24 hours), and platform uptime
**And** each health indicator shows green/yellow/red status with values

### Story 8.2: Notification Templates & Platform Customization

As a Platform Admin,
I want to edit notification email templates and customize platform appearance,
So that communications match our organization's tone and the platform reflects our brand.

**Acceptance Criteria:**

**Given** I am in the Innovation Configuration section
**When** I navigate to Notification Templates
**Then** I see a list of all notification email templates organized by event type: Welcome, Idea Submitted, Evaluation Requested, Campaign Phase Changed, HOT! Graduation, Digest Summary, etc.
**And** each template shows: template name, subject line preview, and last modified date

**Given** I select a notification template to edit
**When** the template editor opens
**Then** I can edit: subject line (with variable placeholders like {{userName}}, {{ideaTitle}}, {{campaignName}}) and body content (rich text with the same variable placeholders)
**And** a live preview shows how the email will render with sample data
**And** I can reset any template to its default content

**Given** I navigate to Platform Customization
**When** the customization page loads
**Then** I can configure:
**And** Platform name (displayed in header, emails, and browser tab title)
**And** Platform logo (uploaded image, displayed in sidebar and login page)
**And** Login page appearance: custom welcome message, background image or color, and terms of service link
**And** Terminology overrides: customize labels for "Campaign" (e.g., "Challenge"), "Idea" (e.g., "Submission"), "Channel" (e.g., "Forum") — stored as a JSON map, applied via a translation layer in the UI

**Given** terminology overrides are configured
**When** users navigate the platform
**Then** all UI labels reflect the custom terminology (sidebar, breadcrumbs, buttons, page titles)
**And** the translation layer falls back to default terms for any unconfigured label

### Story 8.3: Personalized User Dashboard

As a User,
I want a personalized dashboard showing my tasks, active campaigns, and recent activity,
So that I immediately see what needs my attention when I log in.

**Acceptance Criteria:**

**Given** I am an Innovation Manager
**When** I land on my Dashboard (default home page)
**Then** I see the Compact Linear layout (from UX spec Direction 1) with:
**And** "My Tasks" section: pending evaluations (with count and deadline), campaigns needing attention (approaching deadlines, stalled phases), ideas awaiting coach review
**And** "My Campaigns" section: cards for campaigns I manage, showing status, participation rate, and idea count
**And** "Platform Activity" section: recent platform-wide events (new campaigns launched, trending ideas) as a compact activity feed
**And** KPI summary cards: total active campaigns, total ideas this month, total users

**Given** I am a Contributor
**When** I land on my Dashboard
**Then** I see the Activity Stream layout (from UX spec Direction 4) with:
**And** "My Ideas" section: cards for my submitted ideas with current status, vote count, comment count, and HOT! badge if applicable
**And** "Active Campaigns" section: campaigns I can contribute to, with submission deadlines and idea counts
**And** "Activity Feed" section: real-time feed of events relevant to me — comments on my ideas, votes received, status changes, @mentions, campaigns I follow
**And** the feed updates in real-time via Socket.io

**Given** I am an Evaluator with pending evaluations
**When** I land on my Dashboard
**Then** I see a prominent "Pending Evaluations" card at the top with: session name, campaign name, ideas remaining, and deadline
**And** clicking the card takes me directly into the evaluation flow (Story 5.2)

**Given** the dashboard
**When** data is loading
**Then** skeleton loading states are shown for each section (not blank space or spinners)
**And** the dashboard loads within 2 seconds (NFR4)
**And** sections that depend on pre-aggregated data (KPI cards) read from KpiSnapshot table (not real-time queries)

---

# Phase 2: Strategy & Partners (Months 6-8)

## Epic 9: Strategy Module — SIAs, Trends, Technologies & Insights

Innovation Managers can define strategic innovation areas, build a trend/technology knowledge base with community insights, create innovation portfolios, and link strategy to campaigns for inspired ideation.

### Story 9.1: Strategic Innovation Areas (SIAs)

As an Innovation Manager,
I want to define Strategic Innovation Areas with goals and link them to campaigns, ideas, trends, and technologies,
So that all innovation activity is aligned to our organization's strategic focus areas.

**Acceptance Criteria:**

**Given** I am authenticated as an Innovation Manager
**When** I navigate to Strategy > Innovation Areas
**Then** I see a list of SIAs as cards showing: title, description excerpt, linked campaign count, linked idea count, and status (Active/Archived)
**And** the SIA model is created via Prisma migration: StrategicInnovationArea (title, description, goals, status, createdBy, bannerImage, color)

**Given** I click "New Innovation Area"
**When** I fill out the creation form
**Then** I can set: title (required), rich text description, goals (bulleted list), banner image, accent color, and status (Active by default)
**And** the SIA is saved and appears in the list

**Given** an existing SIA
**When** I view its detail page
**Then** I see: description, goals, and tabbed content for Campaigns (linked), Ideas (linked), Trends (linked), Technologies (linked), and KPIs (idea count, campaign count, participation aggregate)
**And** each tab shows the linked entities with add/remove capabilities
**And** linking is many-to-many: a campaign can be linked to multiple SIAs, and vice versa (via SiaCampaign, SiaIdea, SiaTrend, SiaTechnology join tables)

**Given** I want to link entities to an SIA
**When** I click "Link Campaign" (or Idea, Trend, Technology)
**Then** I see a searchable list of available entities and can select one or more to link
**And** linked entities display an SIA badge on their detail pages and cards

### Story 9.2: Trends Database with Mega/Macro/Micro Hierarchy

As an Innovation Manager,
I want to create and manage trends with a hierarchical structure and link them to campaigns and ideas,
So that our innovation activities are informed by market and technology trends at multiple levels.

**Acceptance Criteria:**

**Given** I navigate to Strategy > Trends
**When** the page loads
**Then** I see a hierarchical trend explorer: Mega Trends at the top level, Macro Trends nested under them, Micro Trends nested under Macro
**And** the Trend model is created via Prisma migration: Trend (title, description, businessRelevance, type enum MEGA/MACRO/MICRO, parentId self-reference, confidential boolean, createdBy, bannerImage)
**And** the hierarchy is configurable — Platform Admin can disable any level (e.g., skip Mega if not needed)

**Given** I click "New Trend"
**When** I fill out the creation form
**Then** I can set: title, type (Mega/Macro/Micro), parent trend (optional, enforced: Macro must be under Mega, Micro under Macro), rich text description, business relevance assessment, banner image, tags, and confidential flag
**And** the trend is saved and appears in the hierarchy

**Given** a trend exists
**When** I view its detail page
**Then** I see: description, business relevance, child trends (if Mega or Macro), linked campaigns, linked ideas, linked SIAs, and community insights related to this trend
**And** I can link the trend to campaigns, ideas, SIAs, and technologies via the same many-to-many linking pattern as SIAs

**Given** the community submission toggle is enabled (Platform Admin setting)
**When** a Contributor navigates to Trends
**Then** they can submit new Micro Trends for review by Innovation Managers
**And** submitted trends enter a "Pending Review" status before becoming visible to all users

**Given** a trend is marked as confidential
**When** a regular Contributor views the Trends page
**Then** confidential trends are hidden — only Innovation Managers and Platform Admins can see them

### Story 9.3: Technologies Database

As an Innovation Manager,
I want to maintain a technology database with classifications and link technologies to ideas, trends, and SIAs,
So that we track relevant technologies and can discover connections between tech capabilities and innovation opportunities.

**Acceptance Criteria:**

**Given** I navigate to Strategy > Technologies
**When** the page loads
**Then** I see a searchable list/grid of technologies with: name, classification tags, linked trend count, linked idea count, and description excerpt
**And** the Technology model is created via Prisma migration: Technology (name, description, classification, tags, createdBy, bannerImage)

**Given** I click "New Technology"
**When** I fill out the creation form
**Then** I can set: name, rich text description, classification tags (e.g., "AI/ML", "IoT", "Blockchain"), and banner image
**And** technologies can be linked to trends, ideas, SIAs, and campaigns via many-to-many join tables

**Given** a technology exists
**When** I view its detail page
**Then** I see: description, classification, linked trends, linked ideas, linked SIAs, and related technologies (based on shared tags)

### Story 9.4: Community Insights

As a User,
I want to submit and browse community insights linked to trends, campaigns, or shared globally,
So that signals and observations from across the organization feed into the innovation strategy.

**Acceptance Criteria:**

**Given** I am an authenticated user
**When** I navigate to Strategy > Insights
**Then** I see a feed of community insights sorted by newest first, with: title, type badge, author, date, linked trend/campaign (if any), and excerpt
**And** the Insight model is created via Prisma migration: Insight (title, content, type enum SIGNAL/OBSERVATION/OPPORTUNITY/RISK, scope enum GLOBAL/CAMPAIGN/TREND, scopeEntityId, createdBy, visibility)

**Given** I click "Share Insight"
**When** I fill out the form
**Then** I can set: title, rich text content, insight type (Signal, Observation, Opportunity, Risk), scope (Global, linked to a specific Campaign, linked to a specific Trend), and file attachments
**And** the insight is published based on the visibility rules configured by Platform Admin

**Given** an insight is linked to a trend
**When** I view that trend's detail page
**Then** the insight appears in the trend's "Insights" tab, creating a feedback loop from community observations to strategic trends

**Given** the Platform Admin has configured insight submission permissions
**When** a user's role matches the allowed submitters
**Then** they can submit insights
**And** insights can optionally require Innovation Manager approval before becoming visible (configurable toggle)

### Story 9.5: Innovation Portfolios

As an Innovation Manager,
I want to create visual portfolio collections that group trends, technologies, ideas, and SIAs,
So that I can analyze innovation themes visually and present strategic views to leadership.

**Acceptance Criteria:**

**Given** I navigate to Strategy > Portfolios
**When** the page loads
**Then** I see a list of portfolios as cards with: title, description excerpt, entity count, and last updated date
**And** the InnovationPortfolio model is created via Prisma migration: InnovationPortfolio (title, description, createdBy)
**And** PortfolioItem join table links portfolio to any entity type (Trend, Technology, Idea, SIA) with position for ordering

**Given** I create a new portfolio
**When** I view its detail page
**Then** I see a visual board (similar to Idea Board) with bucket columns for grouping
**And** I can add items from trends, technologies, ideas, and SIAs via search
**And** items are displayed as cards with drag-and-drop between buckets
**And** each card shows: entity type badge, title, key metrics (e.g., linked campaign count for SIA, vote average for idea)

**Given** a portfolio with items
**When** I view the portfolio analysis
**Then** I see aggregate metrics: item counts by type, coverage across SIAs, and a visual matrix view (X-axis and Y-axis selectable from: Impact, Feasibility, Strategic Fit, Timeline)

### Story 9.6: Campaign-SIA Linking & "Be Inspired" Tab

As an Innovation Manager,
I want to link campaigns to SIAs and provide a "Be Inspired" tab on campaigns showing related strategic context,
So that contributors see the strategic relevance of a campaign and get inspired by related trends and technologies.

**Acceptance Criteria:**

**Given** I am creating or editing a campaign (Advanced Wizard Step 1)
**When** I configure the campaign
**Then** I see a new "Strategic Alignment" field where I can link the campaign to one or more SIAs
**And** linked SIAs are displayed on the campaign detail page as badges with links

**Given** a campaign is linked to at least one SIA
**When** a contributor views the campaign detail page
**Then** a "Be Inspired" tab appears alongside Ideas, Activity, and About
**And** the tab shows: linked SIA descriptions, related trends (pulled from SIA-linked trends), related technologies, and community insights linked to those trends
**And** each item is presented as a concise card with title, excerpt, and link to full detail

**Given** a campaign is NOT linked to any SIA
**When** a contributor views the campaign detail page
**Then** the "Be Inspired" tab is hidden — no empty tab shown

**Given** the "Be Inspired" content
**When** a contributor submits an idea to this campaign
**Then** the submission form optionally shows a "Related Trends" sidebar suggesting trends linked to the campaign's SIAs
**And** the contributor can link their idea to a trend with one click (creating an IdeaTrend link)

### Story 9.7: Web Clipper Browser Extension

As a User,
I want to capture trends, technologies, and insights from external websites via a browser extension,
So that I can quickly save relevant information I find while browsing the web.

**Acceptance Criteria:**

**Given** I have installed the Ignite Web Clipper browser extension (Chrome/Firefox)
**When** I am on any external webpage
**Then** I can click the Ignite extension icon to open a capture form
**And** the form pre-fills: page title, URL, selected text (if any), and a screenshot of the selection

**Given** the capture form is open
**When** I fill out the details
**Then** I can choose to save as: Trend (Micro), Technology, or Insight
**And** I can add: title (pre-filled from page title), description (pre-filled from selected text), tags, and linked SIA/Campaign
**And** clicking "Save" sends the data to the Ignite API via a REST endpoint (from Story 11.4)

**Given** a captured item is saved
**When** I view the item in Ignite
**Then** it appears with a "Web Clip" source badge showing the original URL
**And** items captured as Trends enter "Pending Review" status if the community submission review toggle is enabled

**Given** the extension needs authentication
**When** I first use the extension
**Then** I am prompted to enter my Ignite instance URL and authenticate via API key (generated from Profile > API Keys)

## Epic 10: Partner Engagement — Organizations, Scouting & Use Cases

Partner Scouts can manage an organization database, track partnership use cases through a pipeline, discover partners via scouting boards, and run partnering campaigns for external proposals.

### Story 10.1: Organization Database & Contact Management

As a Partner Scout,
I want to manage an organization database with profiles, relationship tracking, and contacts,
So that I can maintain a comprehensive directory of potential and active innovation partners.

**Acceptance Criteria:**

**Given** I am authenticated as a Partner Scout or Innovation Manager
**When** I navigate to Partners > Organizations
**Then** I see a searchable list/grid of organizations with: logo, name, industry, location, relationship status, and manager
**And** the Organization model is created via Prisma migration: Organization (name, logo, description, website, industry, location, fundingStage, managementTeam, ndaStatus enum NONE/PENDING/SIGNED, relationshipStatus enum IDENTIFIED/CONTACTED/EVALUATING/PARTNERED/ARCHIVED, confidential boolean, createdBy)
**And** OrganizationContact model: (organizationId, name, email, role, phone, invitationStatus enum PENDING/ACCEPTED/DECLINED, isPrimary)
**And** OrganizationCustomField for platform-admin-defined classification fields

**Given** I click "Add Organization"
**When** I fill out the creation form
**Then** I can set: name, logo upload, website URL, industry, location, description (rich text), funding stage, NDA status, relationship status, confidential flag, and assign an internal manager (user)
**And** I can add contacts with: name, email, role, phone, and "primary contact" flag

**Given** an organization exists
**When** I view its detail page
**Then** I see: profile overview, contacts list, interactions log (meetings, calls, emails, notes — each with date, type, summary, and private/internal/public visibility), linked use cases, linked scouting boards, and activity timeline
**And** I can add interactions with type, date, summary, attachments, and visibility level

**Given** the organization detail page
**When** I manage contacts
**Then** I can invite a contact as an External User (sends invitation email, creates External User account linked to this organization)
**And** invitation status is tracked (Pending/Accepted/Declined)

### Story 10.2: Use Case Pipeline & Task Board

As a Partner Scout,
I want to track partnership use cases through a pipeline with team assignment and task management,
So that I can manage the partnership journey from initial identification to active partnership.

**Acceptance Criteria:**

**Given** I navigate to Partners > Use Cases
**When** the page loads
**Then** I see a pipeline visualization (Kanban columns): Identified > Qualification > Evaluation > Pilot > Partnership
**And** the UseCase model is created via Prisma migration: UseCase (title, problemDescription, suggestedSolution, benefit, status enum IDENTIFIED/QUALIFICATION/EVALUATION/PILOT/PARTNERSHIP/ARCHIVED, ownerId, createdBy)
**And** UseCaseTeamMember: (useCaseId, userId, role)
**And** UseCaseOrganization: many-to-many link between use cases and organizations

**Given** I click "New Use Case"
**When** I fill out the creation form
**Then** I can set: title, problem description, suggested solution, expected benefit, linked organizations (one or more), owner, and team members

**Given** a use case card on the pipeline board
**When** I drag it to the next stage column
**Then** the use case status transitions and a `useCase.statusChanged` event fires on the EventBus

**Given** a use case detail page
**When** I view the Tasks tab
**Then** I see a Kanban task board with columns: Open > In Progress > Completed
**And** the UseCaseTask model is created: (useCaseId, title, description, status, assigneeId, dueDate, attachments)
**And** I can create, assign, and move tasks between columns via drag-and-drop

**Given** a use case detail page
**When** I view the Discussion tab
**Then** I see internal comments (same Comment component from Epic 3) scoped to the use case
**And** discussion visibility respects the use case team membership

**Given** the pipeline view
**When** I want to see the pipeline as a funnel
**Then** I can switch to "Funnel View" showing conversion rates between stages (e.g., "60% of Identified reach Qualification")

### Story 10.3: Scouting Boards

As a Partner Scout,
I want to create scouting boards for discovering and evaluating potential partners with customizable workflows,
So that I can systematically long-list and short-list organizations for specific innovation needs.

**Acceptance Criteria:**

**Given** I navigate to Partners > Scouting Boards
**When** the page loads
**Then** I see a list of boards with: title, organization count, last updated, and shared-with users
**And** the ScoutingBoard model is created via Prisma migration: ScoutingBoard (title, description, createdBy)
**And** ScoutingBoardColumn: (boardId, name, position, color)
**And** ScoutingBoardCard: (boardId, columnId, organizationId, position, notes)
**And** ScoutingBoardShare: (boardId, userId)

**Given** I create a new scouting board
**When** I configure it
**Then** I can set: title, description, and initial columns (default: "Long List", "Evaluating", "Short List", "Archived")
**And** I can customize columns: add, remove, rename, reorder, and color-code

**Given** a scouting board exists
**When** I add organizations
**Then** I can search the internal organization database and add organizations as cards to any column
**And** I can add organizations by URL (creates a new organization entry if not found)
**And** each card shows: organization logo, name, industry, location, and optional notes

**Given** cards on a scouting board
**When** I drag a card between columns
**Then** the card moves with smooth animation (dnd-kit) and the position is saved
**And** I can reorder cards within a column via drag-and-drop

**Given** a scouting board
**When** I click "Share"
**Then** I can share the board with specific users who gain read-only or edit access
**And** shared users see the board in their "Shared with me" section

### Story 10.4: Scouting Missions & Partnering Campaigns

As a Partner Scout,
I want to create structured scouting missions and run partnering campaigns for collecting external proposals,
So that I can systematically search for partners and receive partnership proposals from external organizations.

**Acceptance Criteria:**

**Given** I navigate to Partners > Scouting Missions
**When** I click "New Mission"
**Then** I can create a scouting mission with: title, problem statement, requirements (structured criteria), target industries, target regions, deadline, and assigned scouts
**And** the ScoutingMission model is created via Prisma migration: ScoutingMission (title, problemStatement, requirements, targetIndustries, targetRegions, deadline, status enum OPEN/IN_PROGRESS/COMPLETED, createdBy)

**Given** a scouting mission exists
**When** scouts work on it
**Then** they can add organizations to the mission's linked scouting board
**And** each organization added shows how it matches the mission requirements
**And** the mission dashboard shows: organizations found, scouting progress, and deadline status

**Given** I want to collect external partnership proposals
**When** I create a new Partnering Campaign
**Then** the campaign wizard offers a "Partnership Proposals" type with simplified workflow (no Discussion & Voting phase)
**And** the submission form is tailored for proposals: organization name, contact info, proposal description, relevant experience, and attachments
**And** External Users invited to the campaign can submit proposals through a streamlined guest experience

**Given** a partnering campaign has proposals
**When** I manage them
**Then** proposals appear in the idea board with organization linking
**And** evaluation sessions can be run on proposals using the standard evaluation engine (Epic 5)

### Story 10.5: Organization Search, Explore & Duplicate Detection

As a Partner Scout,
I want to search and explore organizations with duplicate detection,
So that I can find existing organizations quickly and avoid creating duplicates.

**Acceptance Criteria:**

**Given** I navigate to Partners > Organizations
**When** I use the search bar
**Then** I can search by: name, website URL, industry, location, and relationship status
**And** results appear in tile view (organization cards) or list view (compact rows)
**And** organization search is added to the global Cmd+K command palette with "org:" prefix

**Given** I am creating a new organization
**When** I enter the website URL
**Then** the system checks for existing organizations with the same domain (normalized: strip www, trailing slashes)
**And** if a potential duplicate is found, a warning shows: "An organization with this website already exists: [name]. View existing?" with a link
**And** duplicate detection also checks by Crunchbase ID if available (for Phase 4 Crunchbase integration)

**Given** the organization explore page
**When** I apply filters
**Then** I can filter by: industry (multi-select), location, relationship status, NDA status, confidential (yes/no), and tags
**And** I can sort by: name, relationship status, last interaction date, and creation date

## Epic 11: Platform Extensions — External Access, Communication & APIs

External users can participate in campaigns via invitation; ideas and organizations support confidential mode; Innovation Managers can send targeted communications; the platform exposes webhooks and REST API; additional evaluation modes and deployment options are available.

### Story 11.1: External User Access & Guest Submissions

As a Platform Admin,
I want to invite external users with per-campaign scoped access,
So that outside partners and stakeholders can participate in specific campaigns without gaining platform-wide access.

**Acceptance Criteria:**

**Given** I am a Platform Admin or Innovation Manager
**When** I invite an External User
**Then** I can set: email, name, organization link (optional), and campaign access (one or more specific campaigns)
**And** the invitation sends an email with a unique registration link
**And** the External User role is created with per-campaign scope — they can ONLY access campaigns they're explicitly invited to

**Given** an External User registers via invitation link
**When** they log in
**Then** they see a simplified platform view showing only their accessible campaigns
**And** they can: view campaign details, submit ideas/proposals, track their submission status, and respond to questions/comments on their submissions
**And** they cannot: browse other campaigns, view the explore page, access strategy modules, or see any content outside their scoped campaigns

**Given** an External User's campaign access
**When** their access is revoked or the campaign closes
**Then** they can no longer access that campaign's content
**And** their submissions remain in the system (attributed to them) but they lose interactive access

**Given** the RBAC middleware (Story 1.3)
**When** an External User attempts to access any endpoint outside their campaign scope
**Then** the request is denied with 403 FORBIDDEN

### Story 11.2: Confidential Ideas & Organizations

As an Innovation Manager,
I want to mark ideas and organizations as confidential with restricted access,
So that sensitive innovation activities and partner relationships are protected from general visibility.

**Acceptance Criteria:**

**Given** I am creating or editing an idea in a campaign with confidentiality mode enabled (Story 2.2b)
**When** I toggle "Confidential" on the idea
**Then** the idea is visible only to: the idea author, Innovation Managers, Campaign Managers, and assigned evaluators
**And** confidential ideas are completely hidden from the campaign idea list for non-authorized users (not just blurred or locked — invisible)
**And** confidential ideas do NOT appear in search results, explore views, or similarity detection for non-authorized users

**Given** a campaign itself is set to confidential mode (Story 2.2b)
**When** contributors submit ideas to this campaign
**Then** ALL ideas in the campaign are automatically confidential
**And** contributors can see their own ideas but not other contributors' ideas (isolation within the campaign)

**Given** an organization is marked as confidential (Story 10.1)
**When** a user without Partner Scout or Innovation Manager role browses organizations
**Then** confidential organizations are hidden entirely
**And** use cases and scouting boards linked to confidential organizations are also hidden from non-authorized users

### Story 11.3: Communication Hub & Segmented Email

As an Innovation Manager,
I want to publish messages to campaign feeds and send targeted emails to specific audience segments,
So that I can keep contributors engaged with timely, relevant communications throughout the campaign lifecycle.

**Acceptance Criteria:**

**Given** I am an Innovation Manager viewing a campaign
**When** I navigate to the Communication Hub (new tab on campaign management)
**Then** I see: a message composer, a communication log (history of all sent messages), and audience segment builder

**Given** I compose a new message
**When** I fill out the form
**Then** I can set: subject, rich text body, delivery method (Activity Feed post, Email, or Both), and target audience segment

**Given** the audience segment builder
**When** I define a segment
**Then** I can target based on: all invitees, invitees who viewed but didn't contribute, contributors, contributors of selected/shortlisted ideas, contributors of non-selected ideas, evaluators, evaluation team who completed, evaluation team who haven't completed, and custom filters (by org unit, group)
**And** a preview shows the recipient count before sending

**Given** I send an email to a segment
**When** the email is delivered
**Then** it is sent via BullMQ email jobs (same infrastructure as Story 6.3)
**And** the communication log records: timestamp, subject, segment description, recipient count, delivery status
**And** a "Direct Mail Export" option lets me download the segment's email addresses as CSV for use in external tools

### Story 11.4: Webhook System & REST API

As a Platform Admin,
I want to configure webhooks for platform events and expose a REST API for integrations,
So that external systems can react to Ignite events and programmatically access Ignite data.

**Acceptance Criteria:**

**Given** I am a Platform Admin
**When** I navigate to Admin > Webhooks
**Then** I see a list of configured webhooks with: endpoint URL, subscribed events, status (Active/Paused), and last delivery status
**And** the Webhook model is created via Prisma migration: Webhook (url, secret, events JSON array, status, createdBy)
**And** WebhookDelivery: (webhookId, event, payload, responseStatus, responseBody, deliveredAt)

**Given** I create a new webhook
**When** I configure it
**Then** I can set: endpoint URL, shared secret (for HMAC signature verification), and subscribe to specific events (idea.submitted, idea.statusChanged, campaign.phaseChanged, evaluation.completed, etc.)
**And** the webhook receives a test ping on creation to verify connectivity

**Given** a subscribed event occurs
**When** the EventBus fires the event
**Then** a BullMQ job delivers the webhook payload as an HTTP POST with: event type, timestamp, entity data (serialized), and an HMAC-SHA256 signature header using the shared secret
**And** failed deliveries retry with exponential backoff (3 attempts)
**And** delivery history is logged in WebhookDelivery table

**Given** the REST API
**When** developers access `/api/v1/*` endpoints
**Then** the API exposes read endpoints for: campaigns, ideas, users, organizations, evaluations, trends, and SIAs
**And** write endpoints for: idea submission, comment creation, and Web Clipper data ingestion
**And** authentication is via API key (generated from user profile) passed in `Authorization: Bearer <key>` header
**And** all endpoints respect RBAC — API key inherits the user's permissions
**And** API documentation is auto-generated via OpenAPI/Swagger specification

### Story 11.5: Ad Hoc Evaluation, One-Team Evaluation & Generic Submissions

As an Innovation Manager,
I want additional evaluation modes and flexible submission types,
So that I can evaluate ideas outside campaigns, collaborate on evaluations in meetings, and collect structured data beyond standard ideas.

**Acceptance Criteria:**

**Given** I navigate to Evaluations
**When** I click "New Ad Hoc Session"
**Then** I can create an evaluation session NOT tied to any campaign
**And** I can manually add ideas from any campaign/channel or create standalone items for evaluation
**And** the session uses the same scorecard/pairwise engine from Epic 5 but without campaign-phase coupling

**Given** I create a "One-Team" evaluation session
**When** I configure it
**Then** the session is designed for collaborative in-meeting use: all evaluators see a shared screen view showing the current idea being discussed
**And** each evaluator scores on their own device simultaneously
**And** a facilitator controls the flow: advance to next idea, show live score aggregation, trigger discussion on high-disagreement items
**And** results are visible in real-time as each evaluator submits scores

**Given** I want to collect data beyond standard ideas
**When** I create a "Generic Submission" campaign type
**Then** I can define a fully customizable submission template with arbitrary fields (text, number, keyword, attachment, date, user reference, formula)
**And** submissions follow a simplified lifecycle (Submitted > Reviewed > Accepted/Archived)
**And** submissions appear in a Submission Board (similar to Idea Board but without split/merge — only sort, filter, bucket, bulk actions)

### Story 11.6: Kubernetes Helm Chart Deployment

As a Platform Operator,
I want to deploy Ignite via a Kubernetes Helm chart,
So that I can run production-grade deployments with horizontal scaling, automated rollouts, and infrastructure-as-code.

**Acceptance Criteria:**

**Given** I have a Kubernetes cluster
**When** I install the Ignite Helm chart
**Then** the chart deploys: app deployment (Next.js), worker deployment (BullMQ), PostgreSQL StatefulSet (or external DB config), Redis StatefulSet (or external Redis config), and optional MinIO StatefulSet
**And** all services are configured via `values.yaml` with sensible defaults

**Given** the Helm chart values
**When** I customize the deployment
**Then** I can configure: replica counts for app and worker, resource limits and requests, ingress configuration (host, TLS, cert-manager annotations), external database connection string, external Redis URL, external S3 endpoint, and all application environment variables
**And** horizontal pod autoscaling (HPA) is configurable based on CPU/memory thresholds

**Given** a running Helm deployment
**When** I upgrade to a new version
**Then** `helm upgrade` performs a rolling deployment with zero downtime
**And** database migrations run automatically via an init container before the app starts
**And** the deployment includes liveness and readiness probes pointing to `/api/health`

**Given** the Helm chart
**When** I inspect its structure
**Then** it includes: deployment manifests, service manifests, ingress template, configmap for non-secret config, secret template for credentials, HPA template, PDB (PodDisruptionBudget), and optional PVC for MinIO

---

# Phase 3: Value Creation (Months 9-11)

## Epic 12: Phase-Gate Projects & Concepts

Portfolio Managers can create projects with custom phase-gate processes, assign gatekeepers for go/no-go decisions, manage activities and tasks within phases, create lightweight concepts, and trace ideas through to project implementation.

### Story 12.1: Project Data Model & Custom Process Designer

As a Portfolio Manager,
I want to create projects with custom phase-gate process definitions,
So that I can define the stages, activities, and governance structure for turning selected ideas into implemented projects.

**Acceptance Criteria:**

**Given** I am authenticated as a Portfolio Manager
**When** I navigate to Projects > Process Templates
**Then** I see a list of reusable process definitions (templates) with: name, phase count, and usage count
**And** the ProcessDefinition model is created via Prisma migration: ProcessDefinition (name, description, createdBy)
**And** ProcessPhase: (processDefinitionId, name, position, description, plannedDuration)
**And** ProcessPhaseActivity: (phaseId, name, description, mandatory boolean, position)
**And** ProcessPhaseActivityTask: (activityId, name, fieldType enum TEXT/NUMBER/KEYWORD/ATTACHMENT/DATE/USER, mandatory boolean, position)

**Given** I click "New Process Template"
**When** I configure the process
**Then** I see a visual process designer showing phases as connected stages (left to right)
**And** I can add phases with: name, description, and planned duration
**And** within each phase, I can define activities containing tasks with typed fields
**And** each phase has a gate checkpoint between it and the next phase
**And** I can mark tasks as mandatory (must be completed before gate review)
**And** I can reorder phases, activities, and tasks via drag-and-drop

**Given** a process template exists
**When** I create a new project
**Then** I can select from available process templates or create from scratch
**And** the Project model is created via Prisma migration: Project (title, description, processDefinitionId, status enum ACTIVE/ON_HOLD/COMPLETED/TERMINATED, currentPhaseId, confidential boolean, createdBy, sourceIdeaId nullable)
**And** ProjectTeamMember: (projectId, userId, role enum LEADER/MEMBER/GATEKEEPER)

**Given** I create a new project
**When** I fill out the creation form
**Then** I can set: title, description, process template, project leader, team members, and optionally link to a source idea (for traceability)

### Story 12.2: Phase Lifecycle & Gatekeeper Decisions

As a Gatekeeper,
I want to review phase deliverables and make go/no-go decisions at phase gates,
So that projects progress through structured governance with clear checkpoints.

**Acceptance Criteria:**

**Given** a project is in an active phase
**When** I view the project dashboard
**Then** I see: current phase name, phase progress (mandatory tasks completed / total), timeline (planned vs. actual dates), team members, and a visual process timeline showing all phases with the current one highlighted

**Given** all mandatory tasks in the current phase are completed
**When** the project leader clicks "Request Gate Review"
**Then** the project phase moves to "Gate Review" status
**And** assigned gatekeepers receive a `project.gateReviewRequested` event notification
**And** the gate review page shows: phase summary, completed activities/tasks, outstanding items, and gate evaluation criteria (defined in the process template)

**Given** I am a Gatekeeper reviewing a gate
**When** I make my decision
**Then** I can choose from: Forward (proceed to next phase), Rework (send back to current phase with feedback), Postpone (hold with a review date), or Terminate (end the project with reason)
**And** the GateDecision model records: (projectId, phaseId, gatekeeperId, decision, feedback, timestamp)
**And** each decision triggers a `project.gateDecision` event on the EventBus

**Given** a "Forward" decision
**When** the gate is passed
**Then** the project advances to the next phase, with new activities and tasks activated
**And** the previous phase is marked as complete with a timestamp
**And** if this was the last phase, the project status changes to COMPLETED

**Given** a "Rework" decision
**When** the rework feedback is provided
**Then** the project remains in the current phase with the gatekeeper's feedback visible to the team
**And** specific tasks can be flagged for rework
**And** a new gate review can be requested after rework is complete

**Given** a "Terminate" decision
**When** the project is terminated
**Then** the project status changes to TERMINATED with the reason recorded
**And** all team members are notified
**And** the project remains visible in the portfolio for historical reference

### Story 12.3: Activity & Task Management

As a Project Team Member,
I want to manage activities and tasks with assignees, deadlines, and typed fields,
So that I can track and complete the work required at each project phase.

**Acceptance Criteria:**

**Given** a project in an active phase
**When** I view the phase's activities
**Then** I see a list of activities (from the process template) each containing their tasks
**And** each activity shows: name, description, mandatory badge, and progress (tasks completed / total)

**Given** a task within an activity
**When** I view or edit it
**Then** the task displays its typed field(s): text input, number input, keyword tags, file attachment upload, date picker, or user selector — depending on the task's field type configured in the process template
**And** I can assign the task to a team member and set a due date
**And** the ProjectTaskAssignment model records: (taskId, projectId, phaseId, assigneeId, dueDate, status enum TODO/IN_PROGRESS/COMPLETED, fieldValue)

**Given** I am assigned to a task
**When** I complete it
**Then** I fill in the required field value and mark it as complete
**And** mandatory tasks show a lock icon on the gate review button until completed
**And** a `project.taskCompleted` event fires on the EventBus

**Given** a project with tasks across phases
**When** I view the "Shared Tasks" section
**Then** I see tasks that span multiple phases or processes (e.g., "Budget Tracking" that appears in every phase)
**And** shared tasks maintain their state across phases

**Given** the project dashboard
**When** I view task management
**Then** I see a Kanban board (Todo > In Progress > Completed) for the current phase's tasks
**And** I can filter by: activity, assignee, mandatory status, and due date
**And** overdue tasks are highlighted in red

### Story 12.4: Concepts — Lightweight Phase-Gate

As a Portfolio Manager,
I want to create concepts as lightweight 2-phase processes for early-stage idea development,
So that promising ideas can go through a quick business case development before committing to a full project.

**Acceptance Criteria:**

**Given** I am a Portfolio Manager or Innovation Manager
**When** I navigate to Projects > Concepts
**Then** I see a list of concepts with: title, linked idea, current phase (Elaboration/Evaluation), owner, and status

**Given** I create a new concept
**When** I fill out the form
**Then** I can set: title, description, linked source idea (optional but encouraged), owner, and team members
**And** the Concept model is created via Prisma migration: Concept (title, description, sourceIdeaId nullable, status enum ELABORATION/EVALUATION/APPROVED/REJECTED, ownerId)
**And** concepts automatically use a fixed 2-phase process: Elaboration > Evaluation (no custom process designer needed)

**Given** a concept in Elaboration phase
**When** the team works on it
**Then** the concept detail page provides business case framework sections: Problem Statement, Proposed Solution, Value Proposition, SWOT Analysis (Strengths/Weaknesses/Opportunities/Threats), Target Market, Resource Requirements, Expected ROI, and Risk Assessment
**And** each section is a rich text field that the team fills in collaboratively
**And** the linked source idea's content is pre-populated into relevant sections

**Given** a concept with a completed business case
**When** it moves to Evaluation phase
**Then** gatekeepers can review the business case and decide: Approve (convert to full project), Reject (archive with reason), or Revise (send back to Elaboration)
**And** an approved concept can be converted to a full Project with one click (creates a project linked to the same source idea and pre-fills description)

### Story 12.5: Idea-to-Project Traceability & Project Dashboard

As an Innovation Manager,
I want full traceability from ideas through evaluation to projects,
So that I can demonstrate the innovation pipeline's impact and track which ideas became real projects.

**Acceptance Criteria:**

**Given** an idea that was selected for implementation (SELECTED_IMPLEMENTATION status from Epic 5)
**When** I view its detail page
**Then** I see a "Lineage" section showing: Campaign origin > Evaluation session > Selection decision > Concept (if applicable) > Project (if created)
**And** each lineage node is a link to the entity's detail page

**Given** a project linked to a source idea
**When** I view the project detail page
**Then** I see a "Source" section showing the original idea with: title, author, campaign, evaluation score, and selection date
**And** clicking the idea link navigates to the idea detail page

**Given** I navigate to Projects > Dashboard (global project view)
**When** the dashboard loads
**Then** I see: total active projects, projects by status (pie chart), projects by process definition, phase completion rates, and a timeline Gantt-style view showing all projects with their phases
**And** I can filter by: process definition, status, team member, and date range

**Given** the traceability data
**When** I want to see the full innovation pipeline
**Then** a "Pipeline View" shows the flow: Ideas Submitted > Evaluated > Selected > Concepts > Projects > Completed
**And** each stage shows counts and conversion rates
**And** this provides the "idea-to-project traceability" that validates the platform's end-to-end value

## Epic 13: Portfolio & Advanced Reporting

Portfolio Managers can analyze the project portfolio; Innovation Managers can compare campaigns, generate custom KPI reports, export data to Excel, and view success factor and organization analyses; Partner Scouts can view partnering reports.

### Story 13.1: Portfolio Analyzer

As a Portfolio Manager,
I want to analyze the project portfolio with cross-project reporting,
So that I can understand portfolio health, resource allocation, and strategic alignment.

**Acceptance Criteria:**

**Given** I navigate to Projects > Portfolio Analyzer
**When** the analyzer loads
**Then** I see a portfolio dashboard with: project count by status, project count by process definition, average time-per-phase, gate pass rates, and resource allocation overview

**Given** the portfolio dashboard
**When** I view the visual analysis
**Then** I see a matrix chart (configurable X/Y axes from: Strategic Fit, Expected ROI, Risk Level, Resource Requirements, Timeline) with projects as bubbles
**And** I can filter projects by: process definition, status, team member, SIA alignment, and date range
**And** clicking a bubble navigates to the project detail

**Given** the portfolio data
**When** I select "Process Analysis"
**Then** I see per-process-definition metrics: average duration per phase, gate pass rate, rework rate, termination rate, and completion rate
**And** bottleneck phases are highlighted (phases with longest average duration or highest rework rate)

**Given** portfolio analysis results
**When** I want to export
**Then** I can export the portfolio view as a PDF report or the underlying data as Excel

### Story 13.2: Campaign Comparison & Success Factor Analysis

As an Innovation Manager,
I want to compare campaigns side-by-side and analyze what factors drive campaign success,
So that I can optimize future campaigns based on data-driven insights.

**Acceptance Criteria:**

**Given** I navigate to Reporting > Campaign Comparison
**When** I select 2-4 campaigns to compare
**Then** I see aligned columns showing each campaign's KPIs side by side: participation rate, idea count, average votes, HOT! graduation rate, evaluation completion rate, and shortlist count
**And** metrics that significantly differ between campaigns are highlighted
**And** a radar chart overlays all selected campaigns on key metrics for visual comparison

**Given** I navigate to Reporting > Success Factor Analysis
**When** the analysis loads
**Then** I see correlations between campaign configuration and outcomes:
**And** Duration vs. participation rate (scatter plot)
**And** Voting criteria count vs. evaluation quality
**And** Audience size vs. participation rate
**And** Graduation thresholds vs. HOT! rate
**And** Coach enabled vs. idea quality scores
**And** each factor shows a correlation strength indicator and recommended range based on historical data

**Given** success factor results
**When** I view recommendations
**Then** the system shows actionable insights: "Campaigns with 2-3 week submission windows had 40% higher participation than 4+ week campaigns" or "Campaigns with idea coaching enabled had 25% higher average evaluation scores"

### Story 13.3: Excel Export & Custom Reports

As an Innovation Manager,
I want to export KPI reports and data to Excel and create custom reports,
So that I can integrate innovation data into leadership presentations and external reporting tools.

**Acceptance Criteria:**

**Given** any data view in the platform (campaign cockpit, idea board, evaluation results, portfolio analyzer, organization list)
**When** I click "Export to Excel"
**Then** an Excel file is generated and downloaded containing: all visible columns/data, applied filters noted in a header row, and formatted cells (numbers, dates, percentages)
**And** Excel generation uses a server-side library (e.g., exceljs) via a tRPC endpoint that streams the file

**Given** I navigate to Reporting > Custom Reports
**When** I create a new report
**Then** I can configure: report type (Campaign KPI, Idea Pipeline, Evaluation Results, User Engagement, Organization Activity), date range, filters (campaign, channel, org unit, user group), and metrics to include
**And** the report generates a paginated view with charts and tables
**And** I can save the report configuration for recurring use
**And** saved reports can be scheduled for automatic Excel delivery via email (BullMQ scheduled job)

**Given** the reporting data model
**When** reports are generated
**Then** they read from pre-aggregated KpiSnapshot data where available (same infrastructure from Story 2.4)
**And** fresh aggregations are computed on-demand for non-snapshotted metrics with appropriate caching (1-hour TTL)

### Story 13.4: Partnering & Organization Reports

As a Partner Scout,
I want to view partnering reports showing use case pipeline and organization activity,
So that I can track partner engagement progress and report on scouting outcomes.

**Acceptance Criteria:**

**Given** I navigate to Reporting > Partnering
**When** the report loads
**Then** I see: use case pipeline funnel (Identified > Qualification > Evaluation > Pilot > Partnership with counts and conversion rates), active use cases by stage, average time-per-stage, and stalled use cases (no activity in 30+ days)

**Given** the partnering report
**When** I view Organization Activity
**Then** I see: total organizations by relationship status, new organizations added (trend over time), interactions logged (meetings, calls, emails by month), and top organizations by interaction count
**And** I can filter by: industry, location, relationship status, and date range

**Given** I navigate to Reporting > Organization Analysis
**When** I select an org unit filter
**Then** I see activity breakdown per org unit: campaigns participated in, ideas submitted, evaluation participation, and patent/project conversion rate
**And** this helps identify which departments are most active in innovation

**Given** partnering report results
**When** I want to share
**Then** I can export to Excel or generate a PDF summary report

---

# Phase 4: Enterprise & Advanced AI (Months 12-14)

## Epic 14: Enterprise Multi-Tenancy & Identity

Platform Admins can create Innovation Spaces for logical multi-tenancy, configure LDAP/SAML SSO with SCIM provisioning, enable 2FA, manage user sessions, and maintain comprehensive audit logs.

### Story 14.1: Innovation Spaces (Multi-Tenancy)

As a Platform Admin,
I want to create Innovation Spaces that provide logical multi-tenancy isolation,
So that a single Ignite instance can serve multiple independent divisions, business units, or consulting firm clients.

**Acceptance Criteria:**

**Given** I am a Platform Admin
**When** I navigate to Admin > Innovation Spaces
**Then** I see a list of spaces with: name, admin count, user count, campaign count, and status (Active/Archived)
**And** the InnovationSpace model is created via Prisma migration: InnovationSpace (name, description, logo, slug, status, settings JSON)
**And** InnovationSpaceMembership: (spaceId, userId, role enum SPACE_ADMIN/SPACE_MANAGER/SPACE_MEMBER)

**Given** I create a new Innovation Space
**When** I configure it
**Then** I can set: name, description, logo, URL slug (e.g., `/spaces/division-a`), and assign Space Admins
**And** each Space has its own: campaigns, channels, SIAs, trends, ideas (logically isolated), and user scope

**Given** an Innovation Space exists
**When** users are assigned to it
**Then** they can only see and interact with content within their space(s)
**And** a user can belong to multiple spaces (e.g., consulting firm employees managing multiple client spaces)
**And** Platform Admin always has access to all spaces

**Given** the data isolation model
**When** queries execute
**Then** all list endpoints automatically filter by the user's active space context via middleware
**And** the active space is selected from a space switcher in the sidebar header
**And** cross-space data leakage is prevented at the database query level (not just UI)
**And** shared user directory means users authenticate once and switch between spaces without re-login

**Given** the enterprise feature flag architecture
**When** the `FEATURE_INNOVATION_SPACES` environment variable is `false` (Community Edition default)
**Then** the Innovation Spaces UI is completely hidden and the space middleware is bypassed
**And** when `true` (Enterprise Edition), the full multi-tenancy feature is enabled

### Story 14.2: LDAP/SAML SSO

As a Platform Admin,
I want to configure LDAP or SAML SSO for single sign-on authentication,
So that users can authenticate with their corporate identity provider without separate Ignite credentials.

**Acceptance Criteria:**

**Given** I navigate to Admin > Authentication > SSO
**When** I configure LDAP
**Then** I can set: LDAP server URL, bind DN, bind password, base DN, user search filter, and attribute mapping (username, email, name, org unit, groups)
**And** a "Test Connection" button verifies connectivity and retrieves a sample user
**And** LDAP authentication is attempted first; if it fails, the system falls back to local auth (for Platform Admin accounts)

**Given** I configure SAML SSO
**When** I fill out the settings
**Then** I can set: IdP metadata URL (or upload XML), entity ID, assertion consumer service URL (auto-generated), and attribute mapping
**And** supported IdPs include: Azure AD, Okta, OneLogin, and any SAML 2.0 compliant provider
**And** the Auth.js configuration is extended to support SAML as an additional provider

**Given** SSO is configured
**When** a user visits the login page
**Then** they see a "Sign in with SSO" button alongside the standard email/password form
**And** clicking SSO redirects to the IdP, completes authentication, and returns to Ignite with a valid session
**And** first-time SSO users are auto-provisioned with default role (Contributor) and org unit mapping based on LDAP/SAML attributes

**Given** SSO authentication
**When** the IdP provides group memberships
**Then** the system can map IdP groups to Ignite roles and user groups (configurable mapping table)
**And** group membership is synced on each login (or via SCIM for real-time sync)

**Given** the enterprise feature flag
**When** `FEATURE_SSO` is `false`
**Then** SSO configuration options are hidden and only local auth is available

### Story 14.3: SCIM 2.0 User Provisioning

As a Platform Admin,
I want automated user provisioning and deprovisioning via SCIM,
So that user lifecycle management is synchronized with our identity provider automatically.

**Acceptance Criteria:**

**Given** SCIM is enabled in Admin > Authentication
**When** I configure the SCIM endpoint
**Then** the system exposes a SCIM 2.0 API at `/api/scim/v2/` supporting: Users (create, read, update, delete, list with filtering) and Groups (create, read, update, delete, list)
**And** authentication is via Bearer token (SCIM API token generated in admin settings)

**Given** the IdP pushes a new user via SCIM
**When** the SCIM Users endpoint receives a POST
**Then** a new Ignite user account is created with: email, name, and mapped attributes
**And** the user is assigned the default role (Contributor) and mapped to org units based on SCIM group memberships
**And** no welcome email is sent (user will authenticate via SSO)

**Given** a user is deactivated in the IdP
**When** the IdP sends a SCIM PATCH to set `active: false`
**Then** the Ignite user account is deactivated (same behavior as manual deactivation in Story 1.5)
**And** active sessions are invalidated immediately

**Given** SCIM group updates
**When** a user is added to or removed from an IdP group
**Then** the corresponding Ignite user group membership is updated
**And** role mappings (if configured) are applied automatically

### Story 14.4: Two-Factor Authentication & Session Management

As a User,
I want to enable 2FA for my account and manage my active sessions,
So that my account is protected against unauthorized access even if my password is compromised.

**Acceptance Criteria:**

**Given** I navigate to Profile > Security
**When** I click "Enable 2FA"
**Then** I see a QR code for scanning with an authenticator app (Google Authenticator, Authy, 1Password)
**And** I must enter a valid TOTP code to confirm setup
**And** I am shown backup recovery codes (one-time use) that I must save
**And** the TwoFactorAuth model stores: userId, secret (encrypted), enabled boolean, backupCodes (hashed)

**Given** 2FA is enabled on my account
**When** I log in with email/password
**Then** after successful password verification, I am prompted for a TOTP code
**And** I can enter a 6-digit code from my authenticator app or a backup recovery code
**And** the session is not created until 2FA verification succeeds

**Given** a Platform Admin wants to enforce 2FA
**When** they enable "Require 2FA for all users" in Admin settings
**Then** users without 2FA configured are prompted to set it up on their next login
**And** they cannot access the platform until 2FA is configured

**Given** I navigate to Profile > Security > Active Sessions
**When** the page loads
**Then** I see all my active sessions with: device/browser, IP address, location (GeoIP), last activity timestamp, and "Current session" indicator
**And** I can terminate any session other than my current one
**And** Platform Admin can view and terminate any user's sessions from the user management panel

### Story 14.5: Comprehensive Audit Log

As a Platform Admin,
I want a comprehensive audit log of all platform actions,
So that I can track who did what, when, and where for security, compliance, and accountability.

**Acceptance Criteria:**

**Given** any state-changing action occurs on the platform
**When** the action completes
**Then** an audit log entry is created with: actor (userId), action (create/update/delete/transition/login/logout), target entity (type and id), changes (before/after diff for updates), timestamp, IP address, and user agent
**And** the AuditLog model is created via Prisma migration: AuditLog (actorId, action, entityType, entityId, changes JSON, ipAddress, userAgent, timestamp)
**And** audit logging is implemented as EventBus middleware — every event that changes state is automatically logged

**Given** I navigate to Admin > Audit Log
**When** the log page loads
**Then** I see a searchable, filterable, paginated table of audit entries
**And** I can filter by: actor (user search), action type, entity type, date range, and IP address
**And** I can search audit entries by keyword

**Given** the audit log
**When** I click on an entry
**Then** I see the full detail: before/after state for updates, complete context of the action, and links to the actor's profile and the target entity

**Given** audit log data retention
**When** the Platform Admin configures retention policy
**Then** they can set: retain all (default), or archive entries older than X months to cold storage
**And** audit logs are immutable — they cannot be edited or deleted through the application (only archived)

**Given** compliance requirements
**When** an auditor needs the log
**Then** the audit log can be exported as CSV or JSON with date range filtering
**And** the export includes all fields needed for SOC 2 evidence collection

## Epic 15: Enterprise Integrations & Advanced AI

The platform integrates with Crunchbase, Microsoft Teams, Slack, Jira/Azure DevOps, Outlook, and BI tools; AI capabilities expand to predictive scoring, auto-categorization, and scouting recommendations.

### Story 15.1: Crunchbase Organization Import

As a Partner Scout,
I want to import and enrich organizations from Crunchbase,
So that I can quickly populate the organization database with verified company data.

**Acceptance Criteria:**

**Given** the Platform Admin has configured a Crunchbase API key in Admin > Integrations
**When** I am on the Organization creation or edit page
**Then** I see a "Search Crunchbase" button
**And** I can search Crunchbase by company name or domain
**And** search results show: company name, logo, short description, industry, location, funding total, and employee count

**Given** I select a Crunchbase result
**When** I click "Import"
**Then** the organization fields are pre-filled from Crunchbase data: name, logo URL, description, website, industry, location, funding stage, and employee count
**And** the Crunchbase permalink ID is stored for future enrichment updates
**And** duplicate detection (Story 10.5) uses Crunchbase ID as the primary deduplication key

**Given** an organization linked to Crunchbase
**When** the weekly enrichment job runs (BullMQ scheduled)
**Then** the organization's Crunchbase data is refreshed (funding updates, employee count changes, new news)
**And** changes are logged in the organization's activity timeline

### Story 15.2: Microsoft Teams Integration

As an Innovation Manager,
I want to integrate Ignite with Microsoft Teams,
So that campaign announcements, idea notifications, and quick actions are available where my team already works.

**Acceptance Criteria:**

**Given** the Platform Admin has configured MS Teams integration (Azure AD app registration, Bot Framework)
**When** integration is active
**Then** the following features are available:

**And** Campaign Tab: A Teams tab app that embeds a campaign view within a Teams channel — team members can browse ideas and submit directly from Teams
**And** Notification Bot: Campaign phase changes, HOT! graduations, and evaluation requests are posted to configured Teams channels via the bot
**And** Adaptive Card Actions: Notification cards include action buttons (e.g., "View Idea", "Start Evaluation") that deep-link to Ignite
**And** Message Extension: Users can search Ignite ideas from the Teams compose box and share idea cards in conversations

**Given** Teams notification configuration
**When** an Innovation Manager configures a campaign
**Then** they can select a Teams channel for campaign notifications (selected via Teams channel picker)
**And** notification types are configurable per campaign (campaign launched, new ideas, HOT! ideas, evaluation results)

### Story 15.3: Slack Integration

As a Contributor,
I want to interact with Ignite through Slack,
So that I can submit ideas, receive notifications, and stay engaged without switching applications.

**Acceptance Criteria:**

**Given** the Platform Admin has configured Slack integration (OAuth app with appropriate scopes)
**When** integration is active
**Then** the following features are available:

**And** Slash Commands: `/ignite submit` opens a modal for quick idea submission (title, description, campaign selector); `/ignite search [query]` returns matching ideas; `/ignite status` shows my pending tasks
**And** Notification Channel: Campaign events are posted to configured Slack channels with rich message blocks
**And** Interactive Messages: Notification messages include buttons (e.g., "View", "Vote", "Comment") that deep-link to Ignite
**And** Unfurl: Ignite URLs pasted in Slack automatically expand with a rich preview card showing idea/campaign details

**Given** Slack notification configuration
**When** an Innovation Manager configures a campaign
**Then** they can select a Slack channel for campaign notifications
**And** the Slack integration posts: new campaign launch, idea milestones (10th idea, 50th idea), HOT! graduations, and evaluation results

### Story 15.4: Jira / Azure DevOps Sync

As an Innovation Manager,
I want to sync selected ideas to Jira or Azure DevOps as tickets,
So that ideas selected for implementation seamlessly transition into our existing project management workflow.

**Acceptance Criteria:**

**Given** the Platform Admin has configured a Jira or Azure DevOps integration (OAuth/API token, project mapping)
**When** I view a selected/shortlisted idea
**Then** I see a "Create Ticket" button that syncs the idea to the configured project management tool

**Given** I click "Create Ticket"
**When** the sync executes
**Then** a new ticket/work item is created in the configured Jira project (or Azure DevOps board) with: title from idea title, description from idea description (converted to Jira/ADO markdown), labels from idea tags, link back to the Ignite idea, and custom field mapping (configurable)
**And** the Jira/ADO ticket URL is stored on the Ignite idea and displayed on the detail page
**And** the ExternalSync model records: (ideaId, provider, externalId, externalUrl, syncStatus, lastSyncAt)

**Given** a synced idea
**When** the ticket status changes in Jira/ADO
**Then** a webhook from Jira/ADO updates the Ignite idea's external sync status
**And** optionally, the Ignite idea status can auto-transition based on the ticket status mapping (e.g., Jira "Done" > Ignite "Implemented")

**Given** bulk sync
**When** I select multiple ideas from the idea board and click "Sync to Jira"
**Then** tickets are created for all selected ideas in batch

### Story 15.5: BI Connectors (Tableau & Power BI)

As a Platform Admin,
I want to provide data connectors for Tableau and Power BI,
So that organizations can build custom analytics dashboards using their existing BI tools.

**Acceptance Criteria:**

**Given** the BI connector feature is enabled
**When** a BI tool connects to Ignite
**Then** the system exposes data via a documented OData or REST endpoint optimized for BI consumption
**And** available data models include: Campaigns (with KPIs), Ideas (with votes, comments, status history), Evaluations (with scores), Organizations (with relationship status), Projects (with phase progress), and Users (anonymizable, with activity metrics)

**Given** a Tableau user configuring a connection
**When** they use the Web Data Connector (WDC) or OData endpoint
**Then** they can authenticate with API key and select which data models to import
**And** data refreshes can be scheduled in Tableau Server/Online using the same endpoints
**And** a sample Tableau workbook template is provided with pre-built innovation KPI dashboards

**Given** a Power BI user configuring a connection
**When** they use the custom Power BI connector or OData feed
**Then** they can import Ignite data into Power BI datasets with automatic schema detection
**And** a sample Power BI template (.pbit) is provided with pre-built visualizations

**Given** data export for BI
**When** the connector serves data
**Then** it reads from pre-aggregated snapshot tables where possible (same KpiSnapshot infrastructure)
**And** rate limiting is applied to prevent BI refresh jobs from impacting platform performance
**And** data respects the API key owner's RBAC permissions

### Story 15.6: Advanced AI — Predictive Scoring, Auto-Categorization & AI Scouting

As an Innovation Manager,
I want AI-powered predictive scoring, automatic categorization, and scouting recommendations,
So that the platform proactively surfaces the most promising ideas and relevant partners.

**Acceptance Criteria:**

**Given** the AI predictive scoring feature is enabled
**When** a new idea is submitted
**Then** the AI generates a "Predicted Success Score" (0-100) based on: historical patterns from past campaigns (which idea characteristics correlated with selection), content quality signals (description completeness, specificity), and early engagement signals (first-hour votes, comments)
**And** the score is displayed as a subtle indicator on the idea card and detail page (not prominently — to avoid biasing human evaluation)
**And** the model is trained on the organization's own data (requires at least 2 completed campaigns with selected ideas to activate)
**And** the PredictiveScore model stores: (ideaId, score, confidence, factors JSON, modelVersion, generatedAt)

**Given** the auto-categorization feature
**When** a new idea is submitted
**Then** the AI suggests categories and tags based on content analysis using the campaign's existing category taxonomy and platform-wide tag corpus
**And** suggestions are displayed during submission (enhancing Story 7.3 co-pilot) and also applied retroactively to uncategorized ideas
**And** auto-categorization uses the existing embedding pipeline (Story 7.2) plus a classification layer

**Given** the AI scouting feature
**When** an Innovation Manager views an SIA or trend
**Then** the system recommends organizations from the database (and optionally from Crunchbase) that align with the SIA's goals or the trend's theme
**And** recommendations are based on: organization description similarity to SIA/trend (embedding distance), industry alignment, technology match, and historical partnership success
**And** recommendations are displayed as "AI Suggested Partners" with match percentage and reasoning

**Given** any advanced AI feature
**When** the AI provider is NullAIProvider (AI disabled)
**Then** all advanced AI features are hidden — no scores, no auto-categorization, no scouting recommendations
**And** the platform functions normally with manual categorization and human-driven scouting

## Epic 16: Enterprise Experience & Compliance

Platform Admins can configure white-labeling, deploy as PWA with push notifications, manage data residency and GDPR compliance, enable IP whitelisting, add multilingual support, and activate gamification features.

### Story 16.1: White-Labeling

As a Platform Admin,
I want to configure white-labeling for custom branding,
So that the platform looks and feels like our organization's own product.

**Acceptance Criteria:**

**Given** I navigate to Admin > Branding (Enterprise feature)
**When** I configure white-labeling
**Then** I can set: custom domain (CNAME mapping documentation provided), primary brand color (replaces Indigo), secondary/accent color (replaces Amber), logo (header and login page), favicon, and organization name
**And** all color changes cascade through the CSS custom property system (design tokens from Story 1.1)
**And** email templates use the branded colors, logo, and domain

**Given** white-labeling is configured
**When** users access the platform
**Then** no "Ignite" branding is visible — the platform displays the configured organization name and logo throughout
**And** the login page shows: organization logo, custom welcome message, branded background, and SSO button (if configured)
**And** email notifications use the custom domain as sender and branded header/footer

**Given** the white-labeling settings
**When** they are saved
**Then** CSS custom properties are regenerated on the server and served to all clients
**And** a cache bust ensures all users see the updated branding within 5 minutes

### Story 16.2: PWA & Push Notifications

As a Contributor,
I want to install Ignite as a Progressive Web App with push notifications,
So that I can access the platform like a native app on my phone and get timely alerts.

**Acceptance Criteria:**

**Given** I access Ignite on a mobile browser
**When** the browser detects the PWA manifest
**Then** I see an "Add to Home Screen" prompt (or browser install button)
**And** the Web App Manifest includes: name, short_name, icons (multiple sizes), theme_color (from branding config), background_color, display: "standalone", start_url, and scope

**Given** I install the PWA
**When** I launch from home screen
**Then** the app opens in standalone mode (no browser chrome) with a splash screen showing the organization logo
**And** previously cached pages load instantly for offline reading (service worker caches static assets and recent page shells)

**Given** I am a registered user with push notifications enabled
**When** a notification-worthy event occurs (same events as Story 6.2)
**Then** a web push notification is delivered to all my registered devices via the Push API
**And** notifications show: title, body, icon (event type), and a click action that opens the relevant page in the PWA
**And** push subscription is stored server-side (PushSubscription model: userId, endpoint, keys, device)

**Given** I want to manage push notifications
**When** I visit Profile > Notification Preferences
**Then** I see a toggle for "Push Notifications" alongside the existing email frequency setting
**And** I can enable/disable push per notification category (same categories as email preferences in Story 6.3)

### Story 16.3: Data Residency, GDPR Compliance & IP Whitelisting

As a Platform Admin,
I want to configure data residency controls, GDPR compliance tools, and IP whitelisting,
So that our deployment meets regulatory requirements for data sovereignty and privacy.

**Acceptance Criteria:**

**Given** I navigate to Admin > Compliance > Data Residency
**When** I configure data residency
**Then** I can select the deployment region (EU, US, APAC) which determines: where PostgreSQL stores data, where S3 buckets are located, and where BullMQ jobs process data
**And** the configuration is informational for self-hosted (operators choose their own infrastructure region) but enforced for managed cloud hosting
**And** a compliance dashboard shows: current data storage locations, encryption status, and backup locations

**Given** I navigate to Admin > Compliance > GDPR
**When** I need to handle a data subject request
**Then** I can: export a user's complete data as a downloadable JSON/ZIP package (all ideas, comments, votes, evaluations, profile data), anonymize a user account (replace personal data with "[Anonymized User #X]" while preserving contribution structure), and fully delete a user account (cascade delete all associated data with confirmation)
**And** data export includes all entities attributable to the user across all campaigns and spaces
**And** anonymization preserves data integrity for aggregate reporting while removing all PII

**Given** I navigate to Admin > Security > IP Whitelisting
**When** I configure IP restrictions
**Then** I can add allowed IP ranges (CIDR notation) and toggle enforcement
**And** when enabled, requests from IPs outside the whitelist receive a 403 response (except for the health check endpoint)
**And** Platform Admin IPs are always allowed (emergency access fallback)

### Story 16.4: Multilingual Support & Content Translation

As a Platform Admin,
I want to support multilingual content with translation services,
So that global organizations can run innovation programs across language barriers.

**Acceptance Criteria:**

**Given** I navigate to Admin > Localization
**When** I configure languages
**Then** I can enable multiple content languages (e.g., English, German, French, Spanish, Japanese)
**And** each user can set their preferred language in Profile settings
**And** the UI language (labels, buttons, navigation) is handled via i18n framework (next-intl or similar) with translated message catalogs

**Given** content translation is enabled
**When** an Innovation Manager creates a campaign
**Then** translatable fields (title, description, call-to-action, custom field labels) show a language switcher
**And** the manager can provide translations manually for each enabled language
**And** a "Translate" button triggers automatic translation via configured service (DeepL or Google Translate API)
**And** the Translation model stores: (entityType, entityId, field, language, content, source enum MANUAL/AUTO, translatedAt)

**Given** a user with a preferred language
**When** they view a campaign or idea
**Then** content is displayed in their preferred language if a translation exists
**And** if no translation exists, the original language is shown with a "Translate" button for on-demand auto-translation
**And** the language fallback chain is: user preferred > organization default > English

**Given** translatable content
**When** translations are managed
**Then** Innovation Managers can review and edit auto-translated content
**And** translated content is stored alongside the original (not replacing it)

### Story 16.5: Gamification, User Rankings & Discussion Perspectives

As an Innovation Manager,
I want gamification features and structured discussion perspectives,
So that engagement is incentivized and idea discussions benefit from diverse viewpoints.

**Acceptance Criteria:**

**Given** gamification is enabled for a campaign
**When** contributors participate
**Then** each contributor earns activity points based on a configurable scoring formula: ideas submitted (default 5 pts), comments posted (default 3 pts), likes given (default 1 pt), votes cast (default 2 pts)
**And** the UserCampaignScore model stores: (userId, campaignId, points, ideaCount, commentCount, likeCount, voteCount)

**Given** a campaign with gamification enabled
**When** I view the campaign's Community tab
**Then** I see a leaderboard showing the top contributors ranked by activity points
**And** I can sort by: total points, ideas, comments, likes, or votes
**And** the leaderboard updates in real-time as activity occurs

**Given** the Platform Admin
**When** they configure gamification in Admin > Innovation Configuration
**Then** they can customize the scoring formula (points per activity type)
**And** they can enable/disable the leaderboard per campaign
**And** they can toggle whether the leaderboard is visible to all users or only to managers

**Given** Discussion Perspectives are enabled for a campaign
**When** a contributor adds a comment to an idea
**Then** they can optionally tag their comment with a perspective: Advocate (arguing for the idea), Critic (constructive challenges), Pragmatist (implementation concerns), Visionary (big-picture potential), or Custom perspectives defined by the Innovation Manager
**And** perspective tags are displayed as colored badges on comments
**And** the idea detail page shows a "Perspective Balance" indicator showing how many comments exist per perspective (helping managers see if all viewpoints are represented)

**Given** the perspective feature
**When** an Innovation Manager views the idea board
**Then** they can filter ideas by "perspective coverage" (e.g., show ideas with no Critic comments — indicating potential blind spots)
