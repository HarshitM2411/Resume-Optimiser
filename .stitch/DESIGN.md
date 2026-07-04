# Resume Optimiser — Stitch Design System

> Source of truth for Google Stitch screen generation. Reference this file in every Stitch prompt for consistent UI across screens.

---

## Product Context

**Resume Optimiser** is an AI-powered resume customization web app. It is **not** a resume builder — it optimizes an existing resume against a job description and lets users refine sections with natural-language prompts. Output is always a fixed professional LaTeX template rendered as a downloadable PDF.

**MVP constraints:**
- Web only, desktop-first (responsive to tablet)
- No authentication — anonymous single-session workflow
- All state is session-scoped (browser tab)
- No in-browser PDF preview — download only

**Core user journey:**
1. Upload resume (PDF, DOCX, TXT — max 5MB)
2. System parses into structured sections
3. Paste job description or HTTPS URL
4. AI tailors resume → user reviews before/after diff → Accept or Discard
5. User makes targeted edits via section + action dropdowns + instruction text
6. Download PDF anytime
7. Version history tracks every accepted change in session

**Style reference:** Linear, Notion, Vercel dashboard — clean SaaS, trustworthy, productivity-focused.

---

## Design Tokens

### Platform
- **Platform:** Web, Desktop-first (1280px+)
- **Breakpoint (tablet):** 768px — collapse sidebars into drawers/sheets
- **Theme:** Light mode primary

### Colors

| Token | Hex | Usage |
|---|---|---|
| Background | `#FAFAFA` | Page background |
| Surface | `#FFFFFF` | Cards, panels, modals |
| Border | `#E5E7EB` | Card borders, dividers, input borders |
| Primary | `#4F46E5` | Primary CTAs, active states, focus rings |
| Primary Hover | `#4338CA` | Primary button hover |
| Secondary | `#0D9488` | Success states, accepted changes, additions in diff |
| Warning | `#F59E0B` | Pending review states, amber highlights |
| Error | `#EF4444` | Validation errors, removals in diff |
| Error Surface | `#FEF2F2` | Error banner background |
| Success Surface | `#F0FDFA` | Added text highlight in diff |
| Removed Surface | `#FEF2F2` | Removed text highlight in diff |
| Text Primary | `#111827` | Headings, body text |
| Text Secondary | `#6B7280` | Labels, helper text |
| Text Muted | `#9CA3AF` | Timestamps, placeholders |
| Indigo Muted | `#EEF2FF` | Active nav item background, selected chips |

### Typography
- **Font family:** Inter (fallback: system-ui, sans-serif)
- **Page title:** 24px / 600 weight / `#111827`
- **Section header:** 16px / 600 weight / `#111827`
- **Body:** 14px / 400 weight / `#111827`
- **Label:** 13px / 500 weight / `#6B7280`
- **Caption:** 12px / 400 weight / `#9CA3AF`
- **Line height:** 1.5 for body, 1.3 for headings

### Spacing
- **Grid:** 8px base unit
- **Card padding:** 16px (compact) / 24px (default)
- **Section gap:** 16px between cards
- **Panel gap:** 24px between major layout columns
- **Sidebar width:** 240px (version history)
- **Right panel width:** 360px (actions)

### Borders & Radius
- **Card radius:** 12px
- **Button radius:** 8px
- **Input radius:** 8px
- **Chip/badge radius:** 6px (or full pill for tags)
- **Border width:** 1px solid `#E5E7EB`

### Shadows & Elevation
- **Card shadow:** `0 1px 3px rgba(0, 0, 0, 0.08)`
- **Modal shadow:** `0 4px 24px rgba(0, 0, 0, 0.12)`
- **Dropdown shadow:** `0 2px 8px rgba(0, 0, 0, 0.10)`

### Icons
- **Style:** Lucide-style line icons, 20px default, 16px inline
- **Color:** `#6B7280` default, `#4F46E5` active

---

## Components

### Buttons
| Variant | Style |
|---|---|
| Primary | Filled `#4F46E5`, white text, 8px radius, 12px 20px padding |
| Secondary | Outlined `#E5E7EB` border, `#111827` text |
| Ghost | No border, `#6B7280` text, hover `#FAFAFA` background |
| Destructive | Outlined or filled `#EF4444` for Discard actions |

### File Upload Dropzone
- Dashed border `#E5E7EB`, 2px; hover/drag-over: dashed `#4F46E5`
- Centered upload icon + "Drop your resume here or click to browse"
- Format pills: `PDF` · `DOCX` · `TXT`
- Helper: "Max 5MB · Text-based PDFs only"

### Inputs
- 1px border `#E5E7EB`, 8px radius, 12px padding
- Focus: 2px ring `#4F46E5` at 20% opacity
- Textarea: min-height 120px for JD paste, 80px for edit instructions

### Cards
- White surface, 12px radius, 1px border, soft shadow
- Section title row: 16px semibold + optional chevron for collapse
- Resume section cards: Contact, Summary, Work Experience, Education, Skills, Projects, Achievements, Certifications

### Chips / Tags
- **Skill chips:** grouped by category (Languages, Frameworks, Tools, Other)
- **JD must-have:** filled amber/warning tint
- **JD nice-to-have:** gray `#F3F4F6` background
- **JD keywords:** indigo outline `#4F46E5`
- **Seniority/tone badges:** small pill, muted background

### Diff Viewer
- **Layout:** Split-pane (side by side desktop, stacked mobile)
- **Removed text:** `#FEF2F2` background + strikethrough + `#EF4444` text
- **Added text:** `#F0FDFA` background + `#0D9488` text
- **Unchanged:** normal text
- **Section nav:** vertical pills with dot indicators for changed sections
- **Section badge:** change count e.g. "Summary (1 change)"

### Version History Timeline
- Newest on top
- Each entry: label (human-readable), relative timestamp
- Active version: indigo dot + `#EEF2FF` background
- Entries: "Tailored for: …", "Edited: …", "Original parse"

### Loading States
- Centered spinner + status text
- Step progress for tailoring: Analyze JD → Compare experience → Generate version
- Button loading: spinner replaces label ("Compiling PDF…")

### Alerts & Toasts
- **Error banner:** `#FEF2F2` background, `#EF4444` left border, icon + message + optional Retry
- **Session notice:** muted caption at panel bottom
- **Toast:** bottom-right, auto-dismiss, success/error variants

### Tabs
- Underline or pill style for: Paste JD | URL
- Right panel tabs: Tailor for Job | Edit Section

### Dropdowns
- Section selector: Summary, Work Experience, Education, Skills, Projects, Achievements, Certifications
- Action selector: Rewrite section, Add entry, Remove entry, Edit bullet, Update skills
- Context selectors (when Edit bullet): Company → Bullet

---

## Screen Inventory

Generate screens in this order for a cohesive flow:

| # | Screen | Key elements |
|---|---|---|
| 1 | Landing / Upload | Hero, dropzone, 3-step how-it-works, error/loading variants |
| 2 | Editor Workspace | 3-column: version history \| resume preview \| actions panel |
| 3 | Diff Review | Split-pane before/after, JD insight chips, Accept / Discard |
| 4 | Prompt Edit + Mini-diff | Right panel expanded, inline proposed change card |
| 5 | JD Analysis Panel | Role title, skills chips, seniority/tone badges, Tailor CTA |
| 6 | Loading & Error States | Component sheet with all error/loading variants |

---

## Layout — Editor Workspace

```
┌─────────────────────────────────────────────────────────────────┐
│  Top toolbar: Breadcrumb ················· Download PDF · Re-upload │
├──────────┬──────────────────────────────────┬───────────────────┤
│ Version  │  Structured Resume Preview       │  Actions Panel    │
│ History  │  (section cards)                 │  [Tailor | Edit]  │
│ (240px)  │                                  │  (360px)          │
│          │                                  │                   │
└──────────┴──────────────────────────────────┴───────────────────┘
```

---

## Mock Data (use in all screens)

**Candidate:** Jane Doe — Backend Engineer — San Francisco  
**Email:** jane.doe@email.com · **GitHub/LinkedIn:** linked  

**Work Experience:**
1. **Stripe** — Senior Software Engineer — 2021–Present — 4 bullets (payments, microservices, latency)
2. **Acme Corp** — Software Engineer — 2018–2021 — 3 bullets

**Education:** Stanford — BS Computer Science — 2018  

**Skills:** Python, Go, FastAPI, React, PostgreSQL, Docker, Kubernetes  

**Target JD:** Senior Backend Engineer at Stripe — Python, PostgreSQL, Distributed Systems, Kubernetes, gRPC  

**Version labels:**
- "Tailored for: Senior Backend Engineer at Stripe"
- "Edited: Rewrote summary"
- "Original parse"

---

## Stitch Prompt Template

Paste this block at the top of every Stitch screen prompt:

```markdown
**DESIGN SYSTEM (REQUIRED):**
Reference: Resume Optimiser `.stitch/DESIGN.md`
- Platform: Web, Desktop-first (1280px+), responsive to 768px
- Theme: Light, clean SaaS (Linear / Notion aesthetic)
- Background: Off-white (#FAFAFA)
- Surface: White (#FFFFFF) cards with 1px border (#E5E7EB)
- Primary: Deep indigo (#4F46E5) for CTAs and active states
- Success/Diff additions: Teal (#0D9488)
- Error/Diff removals: Red (#EF4444)
- Text: Primary (#111827), Secondary (#6B7280), Muted (#9CA3AF)
- Font: Inter — 14px body, 24px page titles, 16px section headers
- Buttons: 8px radius · Cards: 12px radius · 8px spacing grid
- Icons: Lucide-style line icons

Use realistic mock data from DESIGN.md. No lorem ipsum.
```

---

## Iteration Notes

- Generate **one screen per Stitch prompt** for best results
- When refining: *"Please refrain from altering any other functionalities or design elements."*
- Diff review can be generated as a modal overlay on the editor workspace
- MVP has no auth UI, no PDF preview pane, no restore button in version history (preview only)
