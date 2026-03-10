# Innovation Management Platform — Feature Specification for Claude Code

> Extracted from HYPE Enterprise Platform Owner's Guide v10.15. Use this as a modular feature backlog — build incrementally, module by module.

---

## PLATFORM ARCHITECTURE OVERVIEW

The platform has **4 core pillars**:

1. **Idea Generation** (Campaigns & Channels)
2. **Partner Engagement** (Scouting, Organizations, Use Cases)
3. **Strategy Building** (Trends, Technologies, Insights, Innovation Portfolios)
4. **Value Creation** (Projects with Phase-Gate Processes, Concepts)

---

## MODULE 1: USER MANAGEMENT & AUTHENTICATION

### 1.1 User Accounts

- User registration (self-registration, invitation-based, LDAP/SSO integration)
- User profiles with: name, email, avatar, skills/expertise, org unit, preferred language, notification preferences
- Privacy settings per user
- User groups with role-based access (Admin, Innovation Manager, Contributor, Evaluator, Moderator, Guest, External)

### 1.2 Roles & Permissions

- **Platform Admin** — full system configuration
- **Innovation Manager** — create/manage campaigns, channels, evaluation sessions
- **Campaign Manager** — runs specific campaigns
- **Campaign Sponsor** — figurehead, owns the need/challenge
- **Moderator** — comments, keeps discussions alive
- **Evaluator** — evaluates ideas in formal sessions
- **Idea Coach** — mentors idea submitters, quality gates
- **Contributor/Innovator** — submits ideas, comments, votes
- **External User / Guest** — limited access for outside partners
- **Patent Department** — reviews invention disclosures
- **Portfolio Manager** — creates/manages projects
- **Gatekeeper** — approves/rejects projects at phase gates
- **Scout** — manages scouting boards and partner discovery
- **Help Desk** — elevated read/edit across all objects

### 1.3 Organizational Units

- Hierarchical org unit structure
- Users assigned to one or more org units
- Org-unit-based audience targeting for campaigns
- Innovation Spaces — scoped sub-environments with their own admins, managers, campaigns, and strategic areas

### 1.4 Functional Groups

- Custom groups for cross-cutting permissions
- Group-based campaign targeting

---

## MODULE 2: IDEA GENERATION — CAMPAIGNS

### 2.1 Campaign Types

- **Call for Ideas** — ideation campaigns
- **Call for Partnership Proposals** — partnering campaigns
- **Call for Generic Submissions** — flexible form-based submissions (best practices, risks, use cases, etc.)

### 2.2 Campaign Setup Wizard

- **Simple Setup** — streamlined, fixed defaults, quick launch
- **Advanced Setup** — full configuration with 5 steps:
  1. Description (title, banner image, video, teaser, description, timeline, sponsor, tags, attachments, call-to-action, support section, inspirations/trends/insights)
  2. Submission Form (custom fields: text, keyword, rating, checkbox, formula, selection; visibility conditions between fields; mandatory fields; custom guidance text)
  3. Idea Coach configuration (per-category or global, extended rights toggle)
  4. Community (moderators, evaluation team, seeding team, target audience by org unit/group/individual, internal/external, innovation space restrictions)
  5. Settings (qualification phase toggle, suggested users, like/voting, community graduation thresholds, start page visibility, notification settings, confidentiality, invention disclosures, insights submission, discussion perspectives, mobile toggle)

### 2.3 Campaign Lifecycle / Workflow

- **Draft** → **Seeding** → **Submission** → **Discussion & Voting** → **Evaluation** → **Closed**
- Configurable closing dates for submission and discussion phases
- Auto-transition between phases on date
- Manual fast-track forward/backward between phases
- Campaign copying as template

### 2.4 Seeding Phase

- Pre-populate with seed ideas from a hand-picked seeding team
- Sets quality bar and engagement tone before public launch

### 2.5 Community Graduation ("HOT!" Status)

- Auto-preselection based on configurable thresholds:
  - Number of page visitors
  - Number of discussion participants
  - Number of likes
  - Number of voters
  - Voting level (min average star rating)
  - Days in status
- Ideas meeting thresholds auto-promoted to "HOT!" for evaluation

### 2.6 Communication Hub

- Publish messages to campaign activity feed
- Publish notifications to MS Teams
- Send segmented emails to audience sub-groups (e.g., "invitees who viewed but didn't contribute", "contributors of selected ideas", etc.)
- Communication log / history
- Direct mail export (email addresses to Excel)

### 2.7 Campaign Cockpit / Dashboard

- Overview KPIs: awareness (users who browsed), adoption (participation rate), activity (ideas, comments, votes)
- Activity KPIs over time (charts)
- Process KPIs: ideas per status, idea funnel
- Export to Excel
- Compare campaigns/channels side-by-side

---

## MODULE 3: IDEA GENERATION — CHANNELS

### 3.1 Channels

- Always-open, no deadline (unlike campaigns)
- Same submission types: ideas, partnership proposals, generic submissions
- Same community/evaluation features as campaigns
- Optional problem description field
- Qualification phase support
- No seeding phase

---

## MODULE 4: IDEAS & SUBMISSIONS

### 4.1 Idea Lifecycle

- **Draft** → **Qualification** (optional, private with coach) → **Community Discussion** → **HOT!** → **Evaluation** → **Selected for Implementation / Concept** → **Implemented** / **Archived**

### 4.2 Idea Features

- Rich text description with image upload
- Custom submission form fields per campaign
- Tags (auto-suggested based on content)
- Category assignment (linked to idea coaches)
- Similar idea detection (Lucene-based or TensorFlow vector similarity)
- Idea connections / linking related ideas
- Co-authorship (multiple contributors)
- Confidential ideas (visible only to management team + contributor)
- Invention disclosure flag (triggers patent department workflow with PDF export)
- Implementation details tab with configurable visibility
- Discussion/comments with @mentions
- Like button
- Multi-criteria star voting (e.g., Feasibility, Attractiveness, Impact)
- Activity stream per idea
- Follow/subscribe to ideas
- Suggested users (people who might be interested based on skills/contributions)

### 4.3 Idea Board (Management Tool)

- Table/grid view of all ideas in a campaign
- Buckets — named groupings for organizing ideas (color-coded, assignable)
- Smart Buckets — auto-filter based on saved search criteria
- Split ideas — divide one idea into multiple
- Merge ideas — combine similar ideas into one
- Calculate similar objects
- Column selection, sorting, filtering
- Dual-window mode
- Multi-action toolbar (bulk assign buckets, archive, export)
- Excel export

### 4.4 Generic Submissions

- Fully customizable submission definitions (templates)
- Same lifecycle as ideas but slightly different workflow
- Submission board (similar to idea board, minus split/merge)

---

## MODULE 5: EVALUATION ENGINE

### 5.1 Evaluation Session Types

- **Scorecard Evaluation** — criteria-based scoring with custom forms
- **Pairwise Evaluation** — head-to-head comparison of idea pairs
- **Ad Hoc Evaluation** — standalone sessions not tied to a campaign
- **One Team Evaluation** — collaborative in-meeting evaluation
- **Individual Evaluations** — each evaluator fills their own form

### 5.2 Evaluation Setup

- Custom evaluation forms with field types: selection boxes (5-point scale, yes/no), text fields, checkboxes, keyword fields
- Conditional visibility between evaluation fields
- Evaluator guidance text
- Configurable evaluation team (per session, per bucket, per idea)
- Due dates with reminder notifications
- Session templates (reusable across campaigns)

### 5.3 Evaluation Workflow

- Request evaluations → evaluators complete forms → track progress → examine results → shortlist winners → close session
- Multiple evaluation rounds/sessions per campaign
- Parallel sessions supported
- Progress tracking with reminder sending
- Results table with criteria weighting and sorting
- Standard deviation indicators for controversial ratings
- Bubble chart visualization
- Radar chart by evaluation criteria

### 5.4 Shortlist Processing

- Shortlisted ideas from all sessions aggregated
- Forward ideas to: Implementation, Concept, Project, or Archive
- Archive with reason/details
- Shortlist lock after final session

---

## MODULE 6: PARTNER ENGAGEMENT

### 6.1 Organization Management

- Organization database (internal + imported from Crunchbase, INNOSPOT)
- Organization profiles: logo, description, website, industry, location, funding, management team, NDA status
- Relationship status tracking (pipeline stages)
- Confidential organizations
- Internal managers + external primary contacts
- Contact management (create, invite, track invitation status)
- Organization classification with custom fields
- Duplicate detection by Crunchbase ID and website URL
- Organization search/explore with tile and list views

### 6.2 Use Cases (Partnership Opportunities)

- Track opportunities from Identified → Qualification → Evaluation → Pilot → Partnership
- Use case summary: problem description, suggested solution, benefit
- Use case team (owner + members)
- Task board (Kanban: Open → In Progress → Completed)
- Internal discussion per use case
- Attachments & interactions (meetings, calls, emails, notes — private/internal/public)
- Use case pipeline visualization (funnel view)
- Link use cases to organizations (many-to-many)

### 6.3 Scouting

- **Scouting Boards** — long-list → short-list workflow for finding partners
  - Search internal DB + external sources (Crunchbase, INNOSPOT)
  - Add organizations by URL
  - Custom columns and groups for evaluation
  - Drag-and-drop reordering
  - Share boards with colleagues
  - Archive/reactivate organizations on boards
- **Scouting Missions** — structured scouting requests for specific problems
- **Outlook Add-in** — auto-identify organizations from email sender domains

### 6.4 Partnering Campaigns

- Campaigns specifically for collecting external partnership proposals
- Simplified workflow (no discussion & voting phase)

---

## MODULE 7: STRATEGY BUILDING

### 7.1 Strategic Innovation Areas (SIAs)

- Define long-term innovation themes and goals
- Link campaigns, ideas, trends, technologies to SIAs
- SIA-based filtering and reporting

### 7.2 Trends

- Trend database (manual creation + TrendOne integration + community submission)
- Trend hierarchy: Mega → Macro → Micro (configurable/disableable)
- Trend pages with description, business relevance, related insights
- Confidential trends
- Link trends to campaigns, ideas, innovation portfolios
- Web Clipper browser extension — capture trends from any website
- Community submission toggle

### 7.3 Technologies

- Technology database with descriptions and classifications
- Link to ideas, campaigns, innovation portfolios
- Web Clipper support

### 7.4 Insights

- Community-generated signals and observations
- Share insights globally, within campaigns, or linked to trends
- Multiple insight types
- Web Clipper support
- Insights community with configurable submission/visibility permissions

### 7.5 Innovation Portfolios

- Visual portfolio management (collection of data points)
- Bucket boards for grouping and analyzing
- Link to trends, technologies, ideas, strategic areas

---

## MODULE 8: VALUE CREATION — PROJECTS & CONCEPTS

### 8.1 Projects (Phase-Gate Process)

- Custom process designer — define phases, activities, tasks
- Phase lifecycle: Elaboration → Gate → next phase (repeatable)
- Phase timing with planned start/end dates (auto or manual)
- Project team: leader + members
- Gatekeepers per phase (preselected or assigned)
- Gatekeeper decisions: forward, rework, postpone, terminate
- Activities with tasks (text, number, keyword, attachment, date, user fields)
- Shared tasks across phases/processes
- Mandatory task enforcement
- Project dashboard showing key tasks
- Project confidentiality toggle
- Project history log
- Gate tasks for gatekeeper evaluation criteria
- Multiple process definitions (templates)
- Portfolio analyzer reporting

### 8.2 Concepts

- Lightweight phase-gate process (2 phases: Elaboration → Evaluation)
- Business case development framework (SWOT, Canvas, Design Thinking compatible)
- Link concepts to source ideas

---

## MODULE 9: REPORTING & ANALYTICS

### 9.1 Campaign/Channel KPI Reports

- Awareness metrics (browsed campaign, browsed ideas)
- Adoption metrics (participation rate)
- Activity metrics (ideas, comments, votes, likes over time)
- Process metrics (ideas per status, idea funnel)
- Success Factor Analysis (compare campaign duration, phases, voting setup vs. outcomes)
- Compare campaigns/channels side-by-side
- Organization Analysis (activity per org unit)
- Export all reports to Excel

### 9.2 Custom KPI Reports

- Define and generate custom reports
- Filter by campaign, channel, date range, org unit
- Invention disclosure reports
- User engagement reports

### 9.3 Partnering Reports

- Use case pipeline
- Organization activity reports

### 9.4 Portfolio Analyzer

- Project portfolio analysis by process

### 9.5 BI Integration

- Data export/integration for external BI tools (Tableau, Power BI)

---

## MODULE 10: NOTIFICATIONS & COMMUNICATION

### 10.1 Email Notifications

- Configurable notification templates (subject + body editable by admin)
- Frequency settings: immediately, daily, weekly
- Email merging for batch notifications
- Campaign-specific email footer
- Draft reminders
- Evaluation invitations and reminders
- MS Teams integration (campaign launch notifications)

### 10.2 Subscriptions & Following

- Follow users, ideas, campaigns, channels
- Auto-follow items you comment on
- Subscribe to tags for new campaign alerts
- Saved/favorite searches with new-result notifications

### 10.3 Push Notifications

- Mobile native app push notification support
- Configurable per notification template

---

## MODULE 11: SEARCH & DISCOVERY

### 11.1 Full-Text Search

- Global search across all object types
- Literal search with quotes
- Wildcard search
- OR operator
- Search within specific fields
- Empty value search

### 11.2 Explore Views

- Tile view and list view for campaigns, channels, ideas, organizations, submissions
- Sort by date, name, comments, votes, status
- Filter by multiple criteria
- Saved searches with favorites

### 11.3 Similar Object Detection

- Lucene-based text similarity
- TensorFlow-based semantic vector similarity
- Auto-calculate similar ideas on idea boards

---

## MODULE 12: PLATFORM ADMINISTRATION

### 12.1 Customization

- Custom terminology (rename statuses, labels)
- Custom fields (PA fields) on ideas, organizations, use cases
- Custom notification templates
- Custom submission definitions for generic submissions
- Custom evaluation session templates
- Login page design (background image, onboarding message)
- Image library / gallery (Unsplash integration)

### 12.2 Content Management

- Discussion moderation (flag as inappropriate, threshold-based escalation)
- Bulk user actions
- Admin search across all objects
- Object deletion (with safety controls)
- Data export to Excel

### 12.3 Multilingual Support

- Content translation (manual or via Google Translate / DeepL)
- Multiple content languages per user
- Language fallback chain
- Translatable: campaign descriptions, idea forms, evaluation criteria, notification templates

### 12.4 GDPR / Data Protection

- User data export
- User anonymization
- Privacy settings
- Data retention policies

### 12.5 Integration Points

- LDAP/SSO for authentication
- MS Teams notifications
- Crunchbase integration (organization import)
- INNOSPOT integration (startup discovery)
- TrendOne integration (trend data)
- Outlook Add-in (organization matching from emails)
- Web Clipper browser extension
- REST API / BI data export
- Content translation services (Google Translate, DeepL)
- Mobile native app + mobile web app

---

## MODULE 13: MOBILE EXPERIENCE

- Mobile-optimized web views
- Native mobile app (iOS/Android) with push notifications
- Campaign-level toggle for mobile visibility
- Idea submission from mobile
- Desktop view toggle from mobile
- Insight sharing with photo attachment

---

## MODULE 14: GAMIFICATION & ENGAGEMENT

### 14.1 User Ranking

- Activity-based ranking per campaign (ideas × 5 + comments × 3 + likes × 1)
- Sortable by all activities, comments, ideas, likes
- Visible on campaign community page

### 14.2 Community Features

- Community graduation (HOT! status)
- Multi-perspective thinking (discussion roles/perspectives)
- Idea market (if enabled)

### 14.3 Recognition & Feedback

- Campaign results page with feedback from sponsor
- Selected ideas displayed on results tab
- Communication tools for personalized recognition emails
- Quarterly program briefings recommended

---

## RECOMMENDED BUILD ORDER FOR CLAUDE CODE

### Phase 1: Foundation

1. User management & authentication (Module 1)
2. Database schema & API framework
3. Basic RBAC (roles & permissions)

### Phase 2: Core Ideation

4. Campaigns — setup wizard & lifecycle (Module 2)
5. Ideas — submission, discussion, voting (Module 4)
6. Channels — always-open variant (Module 3)
7. Idea Board with buckets (Module 4.3)

### Phase 3: Evaluation

8. Scorecard evaluation engine (Module 5)
9. Pairwise evaluation (Module 5)
10. Shortlist processing

### Phase 4: Strategy & Insights

11. Strategic Innovation Areas (Module 7.1)
12. Trends & Technologies (Module 7.2, 7.3)
13. Insights (Module 7.4)

### Phase 5: Partner Engagement

14. Organization management (Module 6.1)
15. Use cases & pipeline (Module 6.2)
16. Scouting boards (Module 6.3)

### Phase 6: Value Creation

17. Projects with phase-gate process (Module 8.1)
18. Concepts (Module 8.2)

### Phase 7: Reporting & Polish

19. KPI reports & analytics (Module 9)
20. Notification system (Module 10)
21. Search & discovery (Module 11)
22. Platform administration (Module 12)
23. Mobile experience (Module 13)
24. Gamification (Module 14)

---

_Generated from HYPE Enterprise Platform Owner's Guide v10.15 (July 2023). This is a feature specification for building a similar innovation management platform._
