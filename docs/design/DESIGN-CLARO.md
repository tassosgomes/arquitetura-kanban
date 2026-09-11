---
name: Gestão de Atividades de Arquitetura
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
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
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-sm: 0.75rem
  gutter-lg: 1.75rem
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

This design system elevates enterprise enterprise architecture governance and activity tracking into a razor-sharp, high-performance SaaS experience reminiscent of Linear, modern Jira, and Asana. It is designed for enterprise architects, technical directors, and project leads who navigate complex decision matrices, multi-domain governance, and cross-functional deliveries.

The aesthetic blends **Corporate Modern** with **Technical Precision Minimalism**:
- **Clarity over Clutter:** Replacing heavy form boxes and raw HTML field rows with structured command surfaces, grouped disclosure filters, and tactile card affordances.
- **Visual Rhythm:** High-density productivity workspaces contrasted with generous breathing room in metrics dashboards and form authoring flows.
- **Architectural Polish:** Deep midnight slate navigation anchor, crisp borders, subtle interactive elevation, and deliberate typographic hierarchy that turns dense architectural taxonomy (domínio, esforço, papel da arquitetura) into easily parseable metadata.

## Colors

The palette establishes an authoritative, high-end technical tone using deep slate for navigation and structure, balanced with pure white and cool light zinc canvas tones. Vibrant semantic accents guide focus and provide immediate status recognition across boards and tables.

### Role Assignments
- **Primary (`#4f46e5` Indigo):** Main interactive affordances, active filter states, primary action buttons (`Nova atividade`, `Salvar`), focus rings, and primary links.
- **Secondary (`#0ea5e9` Sky):** Secondary technical indicators, analytical chart metrics, domain tags, and interactive hover highlights.
- **Tertiary (`#10b981` Emerald):** Completed states, positive health signals, operational success indicators, and resolved activity statuses.
- **Neutral (`#0f172a` Slate):** Used as the root tone for typography, header chrome, and the high-contrast dark sidebar (`#0f172a` body with `#1e293b` borders and `#334155` hover tiers).

### Neutral Scale Breakdown
- **Canvas Base:** `#f8fafc` (Slate 50) for the main application workspace.
- **Surface Elevation:** `#ffffff` (Pure White) for kanban columns, dashboard cards, modal sheets, and filter toolbars.
- **Dividers & Subtle Borders:** `#e2e8f0` (Slate 200) for clean containment without harsh visual noise.
- **Muted Text / Placeholder:** `#64748b` (Slate 500) for auxiliary metadata, labels, and helper descriptions.
- **Primary Body Text:** `#0f172a` (Slate 900) providing crisp contrast against light surfaces.

### Semantic Status Colors
- **Urgent / Bloqueada:** `#ef4444` (Rose 500) background tint `#fef2f2`, border `#fecaca`.
- **Em Andamento:** `#3b82f6` (Blue 500) background tint `#eff6ff`, border `#bfdbfe`.
- **Aguardando Retorno:** `#f59e0b` (Amber 500) background tint `#fffbeb`, border `#fde68a`.
- **A Fazer / Backlog:** `#64748b` (Slate 500) background tint `#f1f5f9`, border `#e2e8f0`.

## Typography

**Plus Jakarta Sans** provides a warm, ultra-precise corporate identity with geometric clarity, ensuring high readability across multi-level form fields, compact kanban columns, and analytics counters.

**JetBrains Mono** is introduced selectively for system-level identifiers, ticket keys (e.g., `ARC-102`), metric IDs (`I-01`, `I-02`), and temporal timestamp badges.

### Typographic Hierarchy Rules
- **View Headers:** `headline-xl` (desktop) and `headline-lg-mobile` (mobile) are used exclusively for primary page routing destinations (Kanban, Dashboard, Novo Projeto).
- **Section Groupings & Metric Values:** `headline-md` paired with `headline-xl` for big numeric KPI callouts.
- **Card Titles:** Strictly `headline-sm` with 600 weight to stand out amid dense tag layouts.
- **Field Labels:** `label-md` with 500 weight in Slate 700 `#334155`. Required asterisks rendered in Red 500 (`#ef4444`).
- **Tagging & Chips:** `label-sm` uppercase tracking `0.02em` for priority markers and architectural roles.

## Layout & Spacing

The layout model adopts an ergonomic enterprise master-detail pattern with a persistent, collapsible **Dark Slate Navigation Sidebar** (width `256px` expanded, `64px` collapsed) anchored to the left, paired with a full-height, flexible canvas.

### Layout Philosophy
- **App Shell:** Fixed lateral navigation with sticky sub-headers for views, filter bars, and contextual actions. Main workspace scrolls independently.
- **Filter Toolbar Layout:** Replaces scattered standalone drop-downs with an integrated, cohesive collapsible filter bar. High-frequency time presets (e.g., *Este mês, Minha semana*) sit horizontally as segmented pills above a compact 4-column responsive matrix of multi-selects.
- **Kanban Board:** Horizontal continuous scroll with fixed column widths (`300px` to `340px`) maintaining vertical scrolling independence per column.
- **Dashboard Grid:** Multi-tier fluid layout using 12 columns:
  - KPI Stat row: 4 columns (`col-span-3` on desktop, `col-span-6` on tablet, `col-span-12` on mobile).
  - Main charts & tables: 8-column primary focus area paired with 4-column audit feed.
- **Form Canvas:** Centered, comfortable reading width (max-width `820px`) preventing input elongation across ultrawide monitors.

## Elevation & Depth

Visual hierarchy uses a refined combination of crisp micro-borders and soft ambient shadows to create distinct planes without visual clutter.

### Depth Layers
- **Level 0 (App Canvas):** `#f8fafc` flat background.
- **Level 1 (Sub-surfaces & Kanban Columns):** `#f1f5f9` with a subtle 1px border (`#e2e8f0`).
- **Level 2 (Interactive Cards & Container Panels):** `#ffffff` elevated with `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)` and border `1px solid #e2e8f0`.
- **Level 3 (Card Hover & Active Drag):** Lifted state with `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` and slight border tinting (`#cbd5e1`).
- **Level 4 (Popovers, Select Menus & Quick Drawers):** `#ffffff` overlay elevation `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`.

### Dark Navigation Depth
The dark sidebar lives on `#0f172a`. Active navigation pills use `#1e293b` with a left accent border (`#4f46e5`, 3px wide). Hover states use subtle opacity shifts (`rgba(255, 255, 255, 0.06)`).

## Shapes

The interface embraces a precise, modern **Soft** geometry (`roundedness: 1`). This provides an agile, professional product feel that balances modern software aesthetics with high information density.

- **Base Radius (0.25rem / 4px):** Form inputs, checkboxes, small status pills, and dropdown menu items.
- **Medium Radius (0.5rem / 8px):** Activity cards, filter panel enclosures, metric summary boxes, and modal dialogues.
- **Pill Radius (Full / 9999px):** Status badges, count pills, avatar clips, and quick-filter toggle segmented tabs.

## Components

### Buttons
- **Primary:** Solid `#4f46e5` with white typography, crisp 8px radius, height `38px`, horizontal padding `16px`. On hover: `#4338ca` with subtle Y-translation (`-1px`).
- **Secondary:** White surface, `#e2e8f0` border, `#0f172a` text. On hover: `#f8fafc` surface and `#cbd5e1` border.
- **Ghost / Tertiary:** No fill, transparent border, `#475569` text. Hover brings `#f1f5f9` fill.
- **Icon Actions:** `32x32px` square with centered icon for quick board view switching, filters toggle, and card context menus.

### Input Fields & Select Controls
- **Structure:** Replace the raw unstyled default selects with custom styled elements: height `38px`, background `#ffffff`, border `1px solid #cbd5e1`, font size `13px`.
- **Focus Ring:** 2px ring `#4f46e5` with 2px offset.
- **Helper & Error:** Helper text uses `body-sm` in `#64748b`; error states apply `#ef4444` border and red tinted badge callouts.

### Kanban Cards
- **Architecture:** Compact card units (`#ffffff`, 8px radius, border `1px solid #e2e8f0`).
- **Content Hierarchy:**
  1. Header: Ticket key (e.g. `ARC-42`) in `code-sm` font, alongside domain pill (e.g., `Segurança`, `Integração`).
  2. Body: Activity title in `headline-sm` with max 2 lines clamp.
  3. Footer: Avatar thumbnail for responsible architect, priority badge, and effort token (`P`, `M`, `G`).

### Filter Chips & Quick Selectors
- **Time Presets Segmented Group:** Horizontal pill bar container (`#f1f5f9`, 6px padding) with tab buttons. Active tab switches to pure white with shadow `0 1px 2px rgba(0,0,0,0.05)` and `#0f172a` text.
- **Status & Priority Badges:** Soft background tint (10% opacity of key color) with high-contrast text and a small 6px solid dot indicator.

### Dashboard Metric Cards
- Container built with `#ffffff`, 8px radius, padding `20px`, and 1px border `#e2e8f0`.
- Top row displays technical metric code (e.g. `I-01`) in `code-sm` Slate 400 next to an icon indicator.
- Metric headline in `body-sm` Slate 600, with numeric tally displayed in `headline-xl` (`#0f172a`).
- Bottom section includes delta comparisons or contextual scope descriptions in muted text.