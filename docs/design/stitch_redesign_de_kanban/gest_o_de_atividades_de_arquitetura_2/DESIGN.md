---
name: Gestão de Atividades de Arquitetura
colors:
  surface: '#0c1322'
  surface-dim: '#0c1322'
  surface-bright: '#323949'
  surface-container-lowest: '#070e1d'
  surface-container-low: '#141b2b'
  surface-container: '#191f2f'
  surface-container-high: '#232a3a'
  surface-container-highest: '#2e3545'
  on-surface: '#dce2f7'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dce2f7'
  inverse-on-surface: '#293040'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0c1322'
  on-background: '#dce2f7'
  surface-variant: '#2e3545'
  canvas-base: '#0b0f19'
  surface-card: '#111827'
  surface-elevated: '#1f2937'
  surface-overlay: '#374151'
  border-subtle: '#1f2937'
  border-prominent: '#374151'
  text-primary: '#f9fafb'
  text-secondary: '#e5e7eb'
  text-muted: '#9ca3af'
  text-dim: '#6b7280'
  accent-electric: '#818cf8'
  status-success: '#10b981'
  status-warning: '#f59e0b'
  status-critical: '#f43f5e'
  tag-technical: '#06b6d4'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0'
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-sm: 1rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an elite, high-density dark workspace tailored for Enterprise Architecture Management (EAM), strategic tech governance, and engineering leadership. Inspired by high-velocity developer platforms and command centers like Linear and Datadog, it replaces cluttered administrative forms with structured surfaces, luminous focal cues, and authoritative contrast.

The aesthetic fuses **Corporate Modern** with **Technical Precision Minimalism**:
- **Deep Immersion:** A true dark canvas (`#0B0F19` to `#111827`) reduces eye strain during multi-hour strategic planning, dependency mapping, and governance reviews.
- **Architectural Clarity:** Subtle translucent borders (`#374151` / `#1F2937`) and tiered dark zinc elevations construct distinct planes without heavy shadows or visual noise.
- **Electric Accents:** Deliberate use of high-energy violet/indigo (`#6366F1`) paired with crisp semantic indicators (emerald, amber, crimson, and cyan) ensures instantaneous recognition of health statuses, priority levels, and architectural domains.

## Colors

The color palette establishes a refined dark environment built on deep slate/zinc baselines, illuminated by focused spectral highlights.

### Palette Roles
- **Primary (`#6366F1` Indigo / `#818CF8` Electric Violet):** Primary actions, focal states, active navigation indicators, key metrics, and selection rings.
- **Secondary (`#06B6D4` Cyan):** Technical taxonomy, architectural layer tags (Data, Cloud, Integration, Security), and telemetry callouts.
- **Tertiary (`#10B981` Emerald):** Completed deliveries, compliant architecture reviews, healthy signals, and positive progress benchmarks.
- **Neutral (`#111827` Zinc/Slate):** The structural core for containers, column layouts, table headers, and backdrop planes.

### Dark Layer Progression
- **Canvas Root (`#0B0F19`):** Foundational backdrop for the entire viewport.
- **Surface Level 1 (`#111827`):** Primary workspaces, kanban column tracks, table containers, and filter toolbars.
- **Surface Level 2 (`#1F2937`):** Interactive cards, popovers, nested group rows, and input surfaces.
- **Surface Level 3 (`#374151`):** Active dropdown items, modal headers, and raised drag proxies.

### Semantic Triage Accents
- **Critical / Bloqueada (`#F43F5E` Crimson):** High severity, blocked milestones, and architecture debt warnings. Surface tint: `rgba(244, 63, 94, 0.12)`.
- **Atenção / Aguardando (`#F59E0B` Amber):** Governance reviews pending, architectural risk points. Surface tint: `rgba(245, 158, 11, 0.12)`.
- **Em Andamento (`#6366F1` Violet / `#818CF8`):** Active execution tracks. Surface tint: `rgba(99, 102, 241, 0.14)`.
- **Concluído (`#10B981` Emerald):** Validated deliverables and ratified architecture proposals. Surface tint: `rgba(16, 185, 129, 0.12)`.

## Typography

The type system blends the contemporary geometric clarity of **Plus Jakarta Sans** with the structural exactitude of **JetBrains Mono**.

### Hierarchical Roles
- **Page Titles & Master Metrics:** Use `headline-xl` (desktop) and `headline-lg-mobile` (mobile) in `#F9FAFB`.
- **Card Titles & Group Headers:** Render in `headline-sm` with tight letter spacing for optimal scanability in dense boards.
- **Narrative & Form Inputs:** Render in `body-md` in `#E5E7EB`.
- **Metadata, Captions & Timestamps:** Use `body-sm` in `#9CA3AF`.
- **System Identifiers:** Use `code-sm` or `code-md` for ticket identifiers (`ARC-402`), architecture decision record numbers (`ADR-019`), and metric indexes (`I-04`) to give an unmistakable technical texture.

## Layout & Spacing

The layout is built around a productivity-driven master-detail shell: a permanent collapsible dark navigation dock (`240px` expanded, `64px` icon-only) on the left, coupled with a fluid command canvas.

### Layout Rhythm
- **Global Structure:** A 12-column responsive fluid grid handles complex dashboard visualizations and tabular views. Columns collapse to 6 columns on tablet and 1 column on mobile.
- **Kanban Geometry:** Horizontal flex viewport with discrete columns sized between `300px` and `340px`. Column bodies scroll vertically while the global board scrolls horizontally.
- **Detail Drawers & Modals:** Slide-over inspection panels anchor to the right at `540px` width, preserving workspace context while inspecting architecture artifact relationships.
- **Form Boundaries:** Centered max-width container (`840px`) prevents horizontal eye fatigue across wide monitors.

## Elevation & Depth

In this dark system, elevation is achieved primarily through **tonal step-ups and crisp micro-borders**, rather than heavy drop shadows which are lost against deep backgrounds.

### Depth Hierarchy
- **Base Canvas (`#0B0F19`):** Completely flat, grounding the application chrome.
- **Sub-surfaces & Columns (`#111827`):** Surrounded by an ultra-subtle border: `1px solid #1F2937`.
- **Interactive Cards (`#1F2937`):** Delineated with `1px solid #374151`. A 1px top highlight (`rgba(255, 255, 255, 0.04)`) imparts tactile depth.
- **Hover & Drag States:** Border brightens to `#4B5563` with an ambient glow: `box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(99, 102, 241, 0.3)`.
- **Overlays & Context Menus (`#1F2937` to `#374151`):** Deep ambient spread: `box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px #4B5563`.

## Shapes

The design system employs a **Soft** shape language (`roundedness: 1`), providing an engineered, disciplined appearance appropriate for architecture governance.

- **Base Radius (0.25rem / 4px):** Checkboxes, code badges, table row highlights, and micro status chips.
- **Component Radius (0.375rem / 6px to 0.5rem / 8px):** Form controls, modal sheets, kanban cards, and action buttons.
- **Pill Radius (Full / 9999px):** Domain tags, user avatars, count indicator badges, and segmented tab switchers.

## Components

### Buttons
- **Primary:** Solid `#6366F1` with `#FFFFFF` text. Hover shifts to `#4F46E5` with a subtle electric glow (`box-shadow: 0 0 12px rgba(99, 102, 241, 0.4)`).
- **Secondary:** Filled with `#1F2937`, border `1px solid #374151`, text `#F9FAFB`. Hover shifts fill to `#374151` and border to `#4B5563`.
- **Ghost:** Transparent fill, `#9CA3AF` text; hover reveals `rgba(255, 255, 255, 0.05)` surface and `#F9FAFB` text.

### Form Inputs & Select Controls
- **Shell:** Background `#111827`, border `1px solid #374151`, text `#F9FAFB`, placeholder `#6B7280`.
- **Focus:** 1px border `#6366F1` plus a 2px outer ring `rgba(99, 102, 241, 0.25)`.
- **Labels:** `label-md` in `#E5E7EB` with required asterisks in Crimson `#F43F5E`.

### Architecture Activity Cards (Kanban)
- **Container:** Background `#1F2937`, border `1px solid #374151`, padding `12px`, radius `8px`.
- **Header:** System key in `code-sm` (`#818CF8`) alongside a Cyan technical tag (`#06B6D4` with 10% alpha fill).
- **Title:** `headline-sm` in `#F9FAFB`, clamped to 2 lines.
- **Footer:** Responsible architect avatar, effort token badge (`P`, `M`, `G`) in `#9CA3AF`, and semantic priority pill.

### Chips & Semantic Badges
- **Technical Domains:** Background `rgba(6, 182, 212, 0.1)`, text `#06B6D4`, border `1px solid rgba(6, 182, 212, 0.2)`.
- **Status Indicators:** Micro pill featuring a solid 6px indicator dot next to `label-sm` uppercase text:
  - *Concluído:* Emerald `#10B981` dot and text, background `rgba(16, 185, 129, 0.1)`.
  - *Atenção:* Amber `#F59E0B` dot and text, background `rgba(245, 158, 11, 0.1)`.
  - *Crítico:* Crimson `#F43F5E` dot and text, background `rgba(244, 63, 94, 0.1)`.

### Lists & Tables
- **Rows:** Alternating transparent and `rgba(255, 255, 255, 0.015)` background strips, bordered with `1px solid #1F2937`.
- **Row Hover:** Subtle highlight `rgba(99, 102, 241, 0.06)` with an active left border accent in `#6366F1`.