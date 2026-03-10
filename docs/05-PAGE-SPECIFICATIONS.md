# 05 — PAGE & SCREEN SPECIFICATIONS

## Every screen in the app, described for implementation.

---

## 1. AUTHENTICATION PAGES

### Login Page (`/login`)

```
Layout: Centered card on gradient background (primary-900 → primary-700)
Left half (desktop): Brand illustration + tagline "Innovation, Together"
Right half: Login form

Form fields:
  - Email input
  - Password input
  - "Remember me" checkbox
  - "Forgot password?" link
  - Primary button: "Sign In"
  - Divider: "or"
  - SSO button: "Sign in with SSO"
  - Footer link: "Don't have an account? Contact your admin"
```

### Register Page (`/register`)

```
Same split layout
Form: firstName, lastName, email, password, confirmPassword
Button: "Create Account"
```

---

## 2. DASHBOARD (`/dashboard`)

```
Layout: 2-column grid (main 2/3, sidebar 1/3)

MAIN COLUMN:
┌─────────────────────────────────────────────┐
│ Welcome back, {firstName}!                   │
│ Your innovation pulse for today              │
├─────────────────────────────────────────────┤
│ MY TASKS (card with tabs)                    │
│ Tabs: All | Ideas | Evaluations | Projects   │
│ Each task: icon + title + source + due date  │
│ "View all tasks →" link                      │
├─────────────────────────────────────────────┤
│ ACTIVE CAMPAIGNS (horizontal scroll cards)   │
│ Each card: banner, title, status badge,      │
│   time remaining, participation bar          │
│ + "Explore all campaigns →"                  │
├─────────────────────────────────────────────┤
│ RECENT ACTIVITY FEED                         │
│ Timeline of events: idea submitted, comment  │
│   added, evaluation completed, etc.          │
│ Each: avatar + action text + timestamp       │
│ Infinite scroll                              │
└─────────────────────────────────────────────┘

SIDEBAR COLUMN:
┌───────────────────────────┐
│ MY STATS                   │
│ Ideas submitted: 12       │
│ Comments: 47              │
│ Evaluations pending: 3    │
│ Active projects: 2        │
├───────────────────────────┤
│ TRENDING IDEAS 🔥          │
│ Top 5 HOT ideas across    │
│ all campaigns (card list)  │
├───────────────────────────┤
│ QUICK ACTIONS              │
│ [+ New Idea]              │
│ [+ New Campaign]          │
│ [Browse Partners]         │
└───────────────────────────┘
```

---

## 3. CAMPAIGN LIST (`/campaigns`)

```
Header: "Campaigns" + [+ New Campaign] button (primary)
Filter bar: Status pills (All | Running | Seeding | Evaluation | Closed) + Type dropdown + Search input
Sort: Newest | Oldest | Most Ideas | Most Active
View toggle: Grid (default) | List

GRID VIEW:
3 columns of campaign cards
Each card:
┌────────────────────────┐
│ [Banner Image]          │
│ {Status badge}          │
├────────────────────────┤
│ {Title}                 │
│ {Teaser - 2 lines}     │
│                         │
│ 👤 {Sponsor name}       │
│ 📅 {Timeline info}      │
│                         │
│ ┌──── Stats row ──────┐│
│ │ 💡23  💬89  👁 412   ││
│ └─────────────────────┘│
│ [Participation bar %]   │
└────────────────────────┘

LIST VIEW:
Table with columns: Title | Status | Type | Sponsor | Ideas | Comments | Participants | Launch Date
Clickable rows → campaign detail
```

---

## 4. CAMPAIGN DETAIL (`/campaigns/[id]`)

```
CAMPAIGN HEADER (full-width banner):
┌─────────────────────────────────────────────────────────────┐
│ [Banner Image - full width, 200px height, darkened overlay] │
│                                                             │
│   {Status Badge}  {SIA Badge}                               │
│   {Campaign Title}                                          │
│   👤 Sponsored by {Sponsor Name + Avatar}                   │
│                                                             │
│   Timeline bar: ■■■■■■■□□□ 67% complete                    │
│   Submission closes in 5 days                               │
│                                                             │
│   [Submit Idea] (primary CTA)  [Follow] (secondary)        │
└─────────────────────────────────────────────────────────────┘

TAB BAR:
[Overview] [Ideas ({count})] [Be Inspired] [Community] [Results]
// Manager-only tabs: [Cockpit] [Idea Board] [Evaluation] [Settings]

OVERVIEW TAB:
  - Campaign description (rich text)
  - Attachments section
  - Support section (contact person)
  - Call to action footer with [Submit Idea] button

IDEAS TAB:
  Sub-tabs: Active Ideas | All Ideas
  Filter: Status | Category | Sort (newest/most voted/most commented)
  View: Cards (default) | Compact list

  Idea Card:
  ┌────────────────────────────────────────┐
  │ [Image] {Title}              🔥 HOT!   │
  │         {2-line excerpt}               │
  │                                        │
  │ 👤 {Author}  📅 {date}                 │
  │ ⭐ 4.2 (12)  💬 7  ❤️ 15               │
  │ [Category badge]                       │
  └────────────────────────────────────────┘

COMMUNITY TAB:
  Campaign team section: Sponsor, Managers, Moderators, Evaluators, Coaches
  User ranking table: # | Avatar+Name | Ideas | Comments | Likes | Total Score
  "Your ranking: #7 of 234 participants"

BE INSPIRED TAB:
  Grid of Trend/Insight/Technology cards linked to this campaign

RESULTS TAB (after evaluation):
  Selected ideas displayed as highlight cards
  Feedback from sponsor
  Concepts/projects created from selected ideas
```

---

## 5. CAMPAIGN WIZARD (`/campaigns/new`)

```
Multi-step wizard with progress sidebar:

LEFT SIDEBAR (narrow, sticky):
  Step indicators with status (completed ✓, current ●, upcoming ○)
  1. Description
  2. Submission Form
  3. Idea Coach
  4. Community
  5. Settings

MAIN AREA:
  Step 1 - Description:
    - SIA dropdown
    - Title input
    - Banner upload (drag & drop zone)
    - Timeline: submission close date picker, voting close date picker
    - Sponsor: user picker (search + select, up to 3)
    - Teaser: textarea (160 char limit with counter)
    - Description: rich text editor (TipTap)
    - Video URL input
    - Attachments: multi-file upload zone
    - Tags: tag input with autocomplete
    - Support section toggle + fields
    - Inspirations: search and add trends/insights/technologies
    - Call to action: text input with default

  Step 2 - Submission Form:
    - Campaign-specific guidance: textarea
    - Custom fields builder:
      - [+ Add Field] button
      - Drag to reorder fields
      - Each field: type selector, name, explanation, mandatory toggle, visibility conditions
      - Field types: Text, Keyword (single/multi), Selection (radio/dropdown), Checkbox, Number
    - Default idea image: upload or use banner

  Step 3 - Idea Coach:
    - Toggle: Enable/disable coach functionality
    - Assignment mode: "Same coaches for all" | "Per category"
    - If per category: category builder (name + coach user picker per category)
    - Extended rights toggle

  Step 4 - Community:
    - Moderators: user multi-picker
    - Evaluation team: user multi-picker
    - Seeding team: user multi-picker
    - Target audience: radio (All Internal | Selected Internal | External | Mixed)
      If selected: org unit tree picker + group picker + individual user picker
    - Innovation space restriction toggle + space picker
    - Invitee count display (calculated + manual override)

  Step 5 - Settings:
    - Idea process: checkbox for qualification phase
    - Suggested users: toggle
    - Like: toggle
    - Voting: toggle + criteria builder (name fields)
    - Community graduation: toggle + threshold inputs (visitors, commenters, voters, voting level, days)
    - Start page: show toggle + featured toggle
    - Notifications: toggle per event type
    - Email footer: textarea
    - Confidentiality: radio (all public / allow confidential / all confidential)
    - Invention disclosure: toggle
    - Insights: toggle + audience selector
    - Discussion perspectives: toggle
    - Mobile: toggle

FOOTER:
  [Back] [Save Draft] [Next] or [Start Seeding Phase] (on last step)
```

---

## 6. IDEA DETAIL (`/ideas/[id]`)

```
┌─────────────────────────────────────────────────────────────────┐
│ IDEA HEADER                                                      │
│ [Image]  {Title}                              {Status Badge}    │
│          Campaign: {link}  Category: {badge}   🔥 HOT!          │
│          By: {Avatar + Name}  {Date}                            │
│                                                                  │
│ Stats: ⭐4.2 (12 votes) | 💬7 comments | ❤️15 likes | 👁 234   │
│                                                                  │
│ [Like ❤️] [Follow 🔔] [Share] // Manager: [Manage ⚙️]          │
├─────────────────────────────────────────────────────────────────┤
│ TABS: [Description] [Discussion] [Evaluation] [Implementation]   │
│       [Connections] [History]                                    │
├─────────────────────────────────────────────────────────────────┤
│ DESCRIPTION TAB                          │ RIGHT SIDEBAR        │
│                                          │                      │
│ {Rich text description}                  │ VOTING               │
│                                          │ Feasibility ⭐⭐⭐⭐☆  │
│ {Custom field values displayed}          │ Impact     ⭐⭐⭐☆☆  │
│                                          │ [Submit Vote]        │
│ Attachments:                             │                      │
│ 📎 file1.pdf  📎 file2.xlsx             │ COMMUNITY GRADUATION │
│                                          │ ████████░░ 80%       │
│                                          │ Visitors: 8/10       │
│                                          │ Comments: 4/5        │
│                                          │                      │
│                                          │ SIMILAR IDEAS        │
│                                          │ - {idea title} (87%) │
│                                          │ - {idea title} (72%) │
│                                          │                      │
│                                          │ SUGGESTED USERS      │
│                                          │ {avatar} {name}      │
│                                          │ {avatar} {name}      │
│                                          │                      │
│                                          │ TAGS                 │
│                                          │ [AI] [Automation]    │
└──────────────────────────────────────────┴──────────────────────┘

DISCUSSION TAB:
  Comment input (rich text, with @mention support)
  Toggle: [All] [Private] (if coach/manager)
  Perspective selector (if multi-perspective enabled)
  Threaded comments list:
    {Avatar} {Name} {Time ago}  {Perspective badge?}
    {Comment content}
    [Reply] [Like] [Flag]
      └─ {Reply avatar} {Reply content}

EVALUATION TAB:
  List of evaluation sessions this idea was part of
  For each: session name, date, average scores per criterion, individual ratings (if visible)

IMPLEMENTATION TAB:
  Implementation details form (responsible, start date, status, notes)
  Visible based on campaign settings

CONNECTIONS TAB:
  Related ideas (linked)
  Source ideas (if merged/split)
  Concepts created from this idea
  Projects linked
```

---

## 7. IDEA BOARD (`/campaigns/[id]/board`)

```
Manager-only view. Full-width layout.

TOOLBAR:
[Search] [More Filters ▾] [Column Selection] [Calculate Similar] [Export ▾]
[+ New Bucket] [+ New Evaluation Session]

THREE-PANEL LAYOUT:
┌──────────┬──────────────────────────────────────┬──────────────┐
│ LEFT     │ CENTER                                │ RIGHT        │
│ PANEL    │                                       │ PANEL        │
│          │                                       │ (detail)     │
│ BUCKETS  │ IDEA TABLE                            │              │
│ ○ All    │ ☐ Title | Author | Status | Votes... │ Selected     │
│ ● Q3     │ ☐ idea1 | john   | HOT!  | 4.2      │ idea detail  │
│ ○ Review │ ☐ idea2 | jane   | Eval  | 3.8      │ preview      │
│ ○ Merge  │ ☐ idea3 | bob    | Disc  | 4.5      │              │
│          │ ☐ idea4 | alice  | Qual  | -        │              │
│ ──────── │                                       │              │
│ EVAL     │ Multi-action bar (when selected):     │              │
│ SESSIONS │ [Assign Bucket] [Start Eval] [Archive]│              │
│ ○ Sess 1 │ [Merge] [Split]                       │              │
│ ○ Sess 2 │                                       │              │
│          │                                       │              │
└──────────┴──────────────────────────────────────┴──────────────┘

Drag ideas from center table into buckets/sessions on left panel.
Dual-window mode: split center into two panes for comparison.
```

---

## 8. EVALUATION SESSION (`/campaigns/[id]/evaluate/[sessionId]`)

### Session Setup View (organizer)

```
Wizard-style form:
  1. Session Definition: name, type (scorecard/pairwise), items selection
  2. Evaluation Form: criteria builder (drag-reorder, field types, conditions)
  3. Team: evaluator selection, type (individual/team/per-bucket/per-object), due date
  4. Access: readability settings, share results scope

Action buttons: [Start Session] [Save as Template]
```

### Evaluator View — Scorecard

```
Header: Session name + progress (3 of 12 completed)
Navigation: [← Previous] Idea 4 of 12 [Next →]

LEFT: Idea content (title, description, comments summary, attachments)
RIGHT: Evaluation form
  - Evaluator guidance text (collapsible)
  - Form fields per criterion:
    - Selection boxes (radio buttons with scale labels)
    - Text fields
    - Conditional fields that appear based on previous answers
  - [Done & Next] [Edit Later & Next]

After all complete: Overview table showing all your ratings, editable inline
[Mark All as Done]
```

### Evaluator View — Pairwise

```
Header: Session name + progress bar + coverage indicator

Side-by-side comparison:
┌────────────────────┐  ┌────────────────────┐
│ IDEA A             │  │ IDEA B             │
│ {title}            │  │ {title}            │
│ {description}      │  │ {description}      │
│ [Show Details ▾]   │  │ [Show Details ▾]   │
└────────────────────┘  └────────────────────┘

For each criterion:
  Slider in center: A ◄━━━━━●━━━━━► B
  Criterion label above slider

[Submit & Next] [Skip Pair]
```

### Results View (organizer)

```
Results table:
  Columns: Idea Title | Criterion 1 | Criterion 2 | ... | Weighted Score | Shortlist
  Weighting row: input fields for each criterion weight
  [Sort] button to apply weighted sort
  Standard deviation indicators (dots showing spread)
  🏆 icon to add/remove from shortlist

Toggle: [Table View] [Bubble Chart]

Bubble Chart:
  X-axis: Criterion 1 score
  Y-axis: Criterion 2 score
  Bubble size: Weighted score
  Gold trophy icon on shortlisted items
  Click-to-select rectangle tool
```

---

## 9. PARTNER PAGES

### Partner Landing (`/partners`)

```
Hero section: "Partner Ecosystem" + quick action buttons
  [Search Partners] [Add Organization] [Start Scouting Mission]

Latest Use Cases: horizontal card scroll
Pipeline: visual funnel (Identified → Qualification → Eval → Pilot → Partnership)
  Click stage to filter
Recently Added Organizations: card grid

Calls for Proposals: linked campaigns/channels
```

### Organization Detail (`/partners/organizations/[id]`)

```
Three-panel layout:

LEFT NAV:
  Organization logo + name
  Relationship status indicator (colored dot)
  NDA status badge
  ───────
  About {org}
  Use Cases (3)
    → UC: Widget Integration
    → UC: Data Partnership
    → UC: Joint Venture
  Contacts (5)
  ───────
  [+ New Use Case]
  [+ New Interaction]

CENTER CONTENT:
  Tab: [Overview] [Info] [Use Cases]

  Overview tab:
    Dashboard: key metrics, latest use cases, latest attachments
    Quick info: Industry, Location, Founded, Employees, Funding

  Info tab:
    Full details, management team (from Crunchbase), website iframe

  Use case detail (when clicked from left nav):
    Summary: problem, solution, benefit
    Task Board (Kanban): Open | In Progress | Completed
    Activities timeline

RIGHT CONTEXT SIDEBAR:
  [Organization Classification] — custom fields, managers, scouting boards
  [Discussion] — internal discussion thread
  [Attachments] — files, notes, interactions timeline
  Each attachment: type icon + title + date + visibility badge
```

### Scouting Board (`/partners/scouting/[boardId]`)

```
Header: Board name + [Share] [Add Organization] [Search External]

Search modal: query input, results from internal DB + Crunchbase + INNOSPOT
  Each result: logo + name + source badge + [Add to Board]

Board table (spreadsheet-like):
  OVERVIEW GROUP columns: Name | Industry | Location | Funding | Website | Status
  CUSTOM GROUP columns: user-defined text/number/select columns

  Row actions: [View Details] [Create Use Case] [Archive from Board]

  Features:
    - Column drag-reorder
    - Column show/hide
    - Custom column add (+ button on header)
    - Row drag-reorder
    - Inline cell editing for custom columns
    - "Show less" toggle for long text

  Tabs: [List] [Archived]
```

---

## 10. STRATEGY PAGES

### Trends (`/strategy/trends`)

```
View modes: Card Grid | Hierarchy Tree | Table

Card Grid: trend cards with image, title, type badge (Mega/Macro/Micro), business relevance score
Hierarchy Tree: expandable tree (Mega → Macro → Micro)
Table: sortable columns, filters by type/SIA/confidentiality

Trend Detail page:
  Banner image + title + type badge
  Description (rich text)
  Business relevance score
  Related: SIAs, insights, campaigns, ideas
  Community insights section (if enabled)
```

### Innovation Portfolio (`/strategy/portfolios/[id]`)

```
Visual canvas with data points (ideas, trends, technologies)
Bucket board for grouping
2x2 matrix view (configurable axes)
Collection management tools
```

---

## 11. PROJECT PAGES

### Project Detail (`/projects/[id]`)

```
HEADER:
  Project name + process name + phase indicator
  Phase timeline visualization:
    ◉ Phase 1 ──── ◉ Phase 2 ──── ○ Phase 3 ──── ○ Phase 4
    (colored by status: green=done, blue=current, gray=future)

  [Forward to Gate] button (for project leader)
  OR [Make Decision] button (for gatekeeper)

CONTENT:
  Project summary + description
  Project team (leader, members)

  ACTIVITIES section:
    Accordion of activities for current phase
    Each activity: name + task count + completion status
    Click to expand: task list with form fields
    Each task: field input (text/number/keyword/file/date/user) + [Mark as Done] checkbox
    Assignee avatar per task

  COMPLETED PHASES section:
    Collapsible history of previous phases
    Gate decisions logged with gatekeeper name + decision + message

GATE VIEW (when in gate status):
  Activities are read-only
  Gate tasks form for gatekeeper
  Decision buttons: [Forward] [Send to Rework] [Postpone] [Terminate]
  Message textarea (required for rework/terminate)
```

---

## 12. REPORTS (`/reports`)

```
Landing page with report categories:
  IDEATION REPORTS
    - Campaign Overview
    - Compare Campaigns
    - Organization Analysis
    - Success Factor Analysis
    - Idea Funnel
    - User Engagement
    - Invention Disclosures

  PARTNERING REPORTS
    - Use Case Pipeline
    - Organization Activity
    - Scouting Overview

  PROJECT REPORTS
    - Portfolio Analyzer

Each report page:
  Filter bar: date range picker, campaign/channel selector, org unit selector
  Chart area: responsive Recharts visualization
  Data table below chart: sortable, filterable, exportable
  [Export to Excel] button
  [Refresh] button
```

---

## 13. ADMIN PAGES (`/admin`)

### User Management (`/admin/users`)

```
Table: Avatar | Name | Email | Org Unit | Groups | Status | Last Login | Actions
Filters: search, group, org unit, status (active/deactivated)
Bulk actions: assign group, deactivate, activate
User detail: edit profile, manage group memberships, view activity log
```

### Org Units (`/admin/org-units`)

```
Tree view (expandable hierarchy)
Each node: name + user count + [Edit] [Add Child] [Delete]
Drag to rearrange hierarchy
```

### Notification Templates (`/admin/notifications`)

```
Table of all templates: Event Type | Subject | Status (active/inactive) | Push Enabled
Click to edit: subject line + rich text body with variable placeholders
Preview: rendered email preview
```

---

## 14. GLOBAL SEARCH (Cmd+K Modal)

```
Modal overlay with search input at top
Auto-complete results grouped by type:
  CAMPAIGNS (2)
    🎯 Q3 Innovation Challenge
    🎯 Sustainability Ideas 2024
  IDEAS (5)
    💡 AI-Powered Customer Support
    💡 Green Packaging Solution
    ...
  ORGANIZATIONS (1)
    🏢 TechStart GmbH
  USERS (3)
    👤 John Smith
    ...

Recent searches at bottom
Keyboard navigation: arrow keys + Enter to select
Filter pills: [All] [Campaigns] [Ideas] [Partners] [Users]
```

---

## 15. TASK CENTER (`/tasks`)

```
Tab layout:
  [My Evaluations] [My Ideas] [Campaign Tasks] [Project Tasks] [All]

Each tab: filterable list of task cards
Task card: icon + title + source (campaign/project name) + due date + status badge
Click → navigates to the relevant page

Grouped by urgency:
  OVERDUE (red section)
  DUE THIS WEEK (amber section)
  UPCOMING (default section)
```
