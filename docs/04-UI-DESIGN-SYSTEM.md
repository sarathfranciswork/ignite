# 04 — UI/UX DESIGN SYSTEM

## Design Philosophy

**Aesthetic Direction: "Refined Industrial"**
Clean, professional, with warm accents. Think Notion meets Linear meets Figma — information-dense but never cluttered. The platform handles complex innovation workflows, so the design must make complexity feel approachable.

---

## 1. DESIGN TOKENS

### Colors

```css
:root {
  /* Primary — Deep Indigo (trust, innovation) */
  --primary-50: #eef2ff;
  --primary-100: #e0e7ff;
  --primary-200: #c7d2fe;
  --primary-300: #a5b4fc;
  --primary-400: #818cf8;
  --primary-500: #6366f1; /* Main brand */
  --primary-600: #4f46e5;
  --primary-700: #4338ca;
  --primary-800: #3730a3;
  --primary-900: #312e81;

  /* Accent — Warm Amber (energy, ideas, innovation spark) */
  --accent-50: #fffbeb;
  --accent-100: #fef3c7;
  --accent-200: #fde68a;
  --accent-300: #fcd34d;
  --accent-400: #fbbf24;
  --accent-500: #f59e0b;
  --accent-600: #d97706;

  /* Success — Emerald */
  --success-50: #ecfdf5;
  --success-500: #10b981;
  --success-700: #047857;

  /* Warning — Orange */
  --warning-50: #fff7ed;
  --warning-500: #f97316;

  /* Danger — Rose */
  --danger-50: #fff1f2;
  --danger-500: #f43f5e;
  --danger-700: #be123c;

  /* HOT! badge — gradient flame */
  --hot-gradient: linear-gradient(135deg, #f97316, #ef4444, #ec4899);

  /* Neutrals — Warm gray (not cold) */
  --gray-25: #fcfcfd;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --gray-950: #030712;

  /* Surfaces */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --bg-sidebar: #111827;
  --bg-hover: #f3f4f6;
  --bg-selected: #eef2ff;

  /* Borders */
  --border-light: #e5e7eb;
  --border-medium: #d1d5db;
  --border-focus: #6366f1;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --bg-sidebar: #020617;
  --border-light: #334155;
  --border-medium: #475569;
  --gray-50: #f8fafc;
  --gray-900: #f1f5f9;
}
```

### Typography

```css
:root {
  /* Font Families */
  --font-display: "Satoshi", "General Sans", system-ui; /* Headings & titles */
  --font-body: "Inter Variable", "Inter", system-ui; /* Body text */
  --font-mono: "JetBrains Mono", "Fira Code", monospace; /* Code, IDs */

  /* Font imports (add to <head>) */
  /* https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap */
  /* https://rsms.me/inter/inter.css */

  /* Scale */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Letter Spacing */
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
}
```

### Spacing

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 0.375rem; /* 6px — buttons, inputs */
  --radius-md: 0.5rem; /* 8px — cards */
  --radius-lg: 0.75rem; /* 12px — modals, panels */
  --radius-xl: 1rem; /* 16px — large cards */
  --radius-full: 9999px; /* pills, avatars */
}
```

---

## 2. CORE COMPONENTS

### Button Variants

```
Primary:     bg-primary-600, text-white, hover:bg-primary-700
Secondary:   bg-white, border, text-gray-700, hover:bg-gray-50
Ghost:       bg-transparent, text-gray-600, hover:bg-gray-100
Danger:      bg-danger-500, text-white, hover:bg-danger-700
Accent:      bg-accent-500, text-white, hover:bg-accent-600
Link:        text-primary-600, underline on hover

Sizes: sm (h-8, text-sm), md (h-10, text-sm), lg (h-12, text-base)
Icon-only: square button with centered icon
```

### Input Fields

```
Default:     border-gray-300, rounded-sm, h-10, focus:ring-2 focus:ring-primary-500
With label:  Label above (text-sm font-medium text-gray-700)
With error:  border-danger-500, error text below in text-danger-500
Textarea:    Same styling, min-h-[100px], resize-y
Select:      Custom dropdown with search for long lists
Multi-select: Tag-style chips with remove button
Date picker: Calendar popover
File upload: Drag & drop zone with progress bar
```

### Card

```
Base:        bg-white, border border-gray-200, rounded-lg, shadow-xs
Hover:       shadow-sm, border-gray-300 transition
Selected:    border-primary-500, bg-primary-50
Campaign:    Full-width banner image on top, content below
Idea:        Compact card with title, contributor avatar, stats row
Organization: Logo + name + industry + status badge
```

### Badge / Status Chip

```
Status badges use pill shape with soft background:
  Draft:        bg-gray-100, text-gray-600
  Seeding:      bg-purple-100, text-purple-700
  Submission:   bg-blue-100, text-blue-700
  Discussion:   bg-cyan-100, text-cyan-700
  Evaluation:   bg-amber-100, text-amber-700
  HOT!:         bg-gradient-to-r from-orange-500 to-rose-500, text-white, animate-pulse subtle
  Selected:     bg-emerald-100, text-emerald-700
  Implemented:  bg-emerald-500, text-white
  Archived:     bg-gray-200, text-gray-500
  Closed:       bg-gray-400, text-white

Relationship status (partnering):
  Identified:   bg-slate-100
  Qualification: bg-blue-100
  Pilot:        bg-amber-100
  Partnership:  bg-emerald-100
```

### Avatar

```
Sizes: xs (24px), sm (32px), md (40px), lg (48px), xl (64px)
Shape: rounded-full
Fallback: Initials on colored background (color derived from name hash)
Group: Overlapping stack with +N indicator
```

### Modal / Dialog

```
Backdrop:    bg-black/50, blur-sm
Container:   bg-white, rounded-xl, shadow-xl, max-w-lg (or full for wizards)
Header:      font-display text-xl, close button top-right
Footer:      border-t, flex justify-end gap-3, action buttons
Sizes:       sm (max-w-md), md (max-w-lg), lg (max-w-2xl), full (max-w-5xl)
```

### Toast / Notification

```
Position:    top-right, stacked
Types:       success (green), error (red), warning (amber), info (blue)
Animation:   slide-in from right, fade out
Auto-dismiss: 5 seconds
```

### Tabs

```
Style:       Bottom border indicator (not background)
Active:      text-primary-600, border-b-2 border-primary-600
Inactive:    text-gray-500, hover:text-gray-700
Pill tabs:   For secondary navigation (bg-gray-100 container, active: bg-white shadow-sm)
```

### Table

```
Header:      bg-gray-50, text-xs uppercase tracking-wide text-gray-500
Rows:        border-b border-gray-100, hover:bg-gray-50
Sortable:    Arrow indicators in header
Selectable:  Checkbox in first column
Actions:     Sticky last column with icon buttons
Pagination:  Bottom bar with page numbers + items per page selector
```

### Empty State

```
Centered:    illustration (optional), heading, description, CTA button
Illustration: Simple line art or icon in primary-200
```

---

## 3. LAYOUT SYSTEM

### Platform Shell

```
┌──────────────────────────────────────────────────────────────────┐
│ [SIDEBAR]  │  [HEADER BAR]                                       │
│            │  ┌──────────────────────────────────────────────┐   │
│  Logo      │  │  Breadcrumb   │  Search  │  Notif │ Avatar  │   │
│            │  └──────────────────────────────────────────────┘   │
│  ───────── │  ┌──────────────────────────────────────────────┐   │
│  Dashboard │  │                                              │   │
│  Explore ▸ │  │                                              │   │
│  Campaigns │  │              MAIN CONTENT AREA               │   │
│  Channels  │  │                                              │   │
│  Ideas     │  │              (scrollable)                    │   │
│  ───────── │  │                                              │   │
│  Partners ▸│  │                                              │   │
│  Strategy ▸│  │                                              │   │
│  Projects  │  │                                              │   │
│  ───────── │  │                                              │   │
│  Reports   │  │                                              │   │
│  Tasks     │  │                                              │   │
│  ───────── │  │                                              │   │
│  Admin ▸   │  │                                              │   │
│            │  └──────────────────────────────────────────────┘   │
│  [Collapse]│                                                     │
└──────────────────────────────────────────────────────────────────┘
```

**Sidebar**:

- Width: 260px expanded, 64px collapsed (icon-only)
- Background: var(--bg-sidebar) (dark gray-900)
- Text: gray-300, hover: white
- Active item: bg-white/10, border-l-2 border-primary-400
- Grouped with subtle section dividers
- Collapsible with animation (stored in localStorage)
- Sub-menus expand inline

**Header**:

- Height: 56px
- Sticky top
- Contains: breadcrumb trail, global search (Cmd+K), notification bell with count badge, user avatar dropdown
- Background: white with bottom border

**Main Content**:

- Max-width: 1280px centered (1440px for data-heavy views like idea boards)
- Padding: 24px horizontal, 24px top
- Scrollable independently of sidebar/header

### Responsive Breakpoints

```
sm:  640px    — Mobile
md:  768px    — Tablet
lg:  1024px   — Desktop (sidebar collapses)
xl:  1280px   — Wide desktop
2xl: 1536px   — Ultra wide
```

On mobile: sidebar becomes a slide-out drawer, header stays fixed.

---

## 4. ICONOGRAPHY

Use **Lucide React** as the primary icon set. Consistent 20px size in UI, 16px for inline. Stroke width 1.5.

Key icons by concept:

```
Campaign:       Megaphone
Channel:        Hash / Radio
Idea:           Lightbulb
Evaluation:     ClipboardCheck
Partner:        Handshake
Organization:   Building2
Trend:          TrendingUp
Technology:     Cpu
Insight:        Eye
Project:        FolderKanban
Report:         BarChart3
Task:           CheckSquare
User:           User
Search:         Search
Notification:   Bell
Settings:       Settings
Add:            Plus
Edit:           Pencil
Delete:         Trash2
Archive:        Archive
HOT:            Flame
Vote:           Star
Like:           ThumbsUp
Comment:        MessageCircle
Attach:         Paperclip
Filter:         SlidersHorizontal
Sort:           ArrowUpDown
Export:          Download
Share:          Share2
```

---

## 5. ANIMATION PATTERNS

```css
/* Page enter */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.page-enter {
  animation: fadeInUp 0.3s ease-out;
}

/* Card hover lift */
.card-hover {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.card-hover:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Sidebar collapse */
.sidebar {
  transition: width 0.2s ease;
}

/* Status badge pulse (for HOT!) */
@keyframes subtlePulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}
.hot-badge {
  animation: subtlePulse 2s ease-in-out infinite;
}

/* Skeleton loading */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 6. DATA VISUALIZATION STYLE

### Chart Palette

```
Primary series:  #6366F1 (indigo)
Secondary:       #F59E0B (amber)
Tertiary:        #10B981 (emerald)
Quaternary:      #F43F5E (rose)
5th:             #8B5CF6 (violet)
6th:             #06B6D4 (cyan)
Grid lines:      #E5E7EB
Axis text:       #6B7280
```

### Chart Types Used

- **Bar Chart**: Campaign comparison, org analysis
- **Line Chart**: Activity KPIs over time
- **Funnel Chart**: Idea funnel (Draft → ... → Implemented)
- **Pie/Donut**: Ideas per status
- **Bubble Chart**: Evaluation results (2 criteria + size = score)
- **Pipeline/Kanban**: Use case pipeline
- **Radar Chart**: Multi-criteria evaluation visualization
- **Stacked Bar**: Participation breakdown

All charts use Recharts with consistent styling, tooltips with shadows, and responsive containers.
