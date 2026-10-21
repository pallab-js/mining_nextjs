# UI/UX Specification
**Critical Minerals Operations Center** · v1.0 · dark control-room theme

## 1. Design principles

1. **Wall-display legible** — dark canvas, high-contrast numbers, glanceable KPI hierarchy.
2. **Signal colours only** — colour always means something (health/critical), never decoration.
3. **Dense but calm** — 12-column grid, 1px borders instead of shadows, generous tabular numerals.
4. **Every async surface has three states**: skeleton → content | empty (with CTA) | error (retry).

## 2. Design tokens (`globals.css` — Tailwind v4 `@theme`)

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#0a0f16` | Page background (near-black blue) |
| `--color-panel` | `#111823` | Cards/panels |
| `--color-panel-2` | `#0d141d` | Nested rows, table stripes |
| `--color-line` | `#1e2a3a` | 1px borders / dividers |
| `--color-ink` | `#e6edf6` | Primary text |
| `--color-ink-dim` | `#8b9bb0` | Labels, axis text |
| `--color-signal` | `#f5a524` | **Amber** — active, selected, primary CTA |
| `--color-good` | `#2dd4bf` | **Teal** — healthy/positive deltas |
| `--color-warn` | `#f5a524` | Amber — degraded |
| `--color-bad` | `#f43f5e` | **Rose** — breach/critical/negative delta |
| `--font-mono` | Geist Mono | All numbers (`tabular-nums`) |

Typography: **Geist Sans** (UI) / **Geist Mono** (metrics) via `next/font`.
Micro-labels: `text-[10px] uppercase tracking-[0.14em] text-ink-dim`.
KPI value: `font-mono text-2xl/8 font-semibold tracking-tight`.

## 3. Shell & navigation

```
┌───────────┬──────────────────────────────────────────────────────────┐
│ LOGO      │  breadcrumb      [Site ▾] [Range ▾]  ⟳ fresh  🔔3  ⚙   │  ← top bar (56px)
│ ───────── │─────────────────────────────────────────────────────────│
│ ▤ Overview│                                          main content  │
│ ⛏ Sites   │   page title + subtitle + primary action                │
│ 📈 Production  ┌ KPI row: 4–8 tiles, each: label / value / Δ ┐      │
│ 🚚 Equipment   │ panels: charts (12-col grid, min-h)          │      │
│ 🛡 Safety      └──────────────────────────────────────────────┘      │
│ 🌿 Environment                                                        │
│ 📦 Inventory                                                          │
│ ⇄ Import                                                             │
│ ⚙ Settings                                                           │
├───────────┴──────────────────────────────────────────────────────────┤
│ rail w-60 (w-16 icon-only < lg) · sticky · active item = amber left bar│
└──────────────────────────────────────────────────────────────────────┘
```

- **Active nav**: amber 2px left border + amber icon + panel background.
- **Site filter** & **range filter**: URL params `?site=&range=` — server-rendered on every page;
  changing them triggers a router refresh (skeletons, not spinners).
- **Freshness badge**: latest production date + last import time (skeleton while loading).
- **Alert bell**: count badge; opens the alerts panel on the overview (anchor link).

## 4. Component inventory

| Component | Kind | Notes |
|---|---|---|
| `Panel` | server | Title + optional right slot + children; `border-line` |
| `KpiTile` | server | label, value (mono), unit, delta (▲/▼ teal/rose), optional spark hint |
| `ChartCard` | server → wraps client chart | Fixed height 260/320 px, skeleton until hydration |
| `Skeleton` / `ChartSkeleton` / `KpiSkeleton` | server | Pulse blocks matching final layout |
| `EmptyState` | server | Icon + message + CTA button/link |
| `ErrorBoundary` (`error.tsx`) | file | Retry button |
| `DataTable<T>` | client | Sort by column, 10/25/50 page size, zebra rows, right-aligned mono numerics |
| `Badge` / `StatusDot` | server | status → colour map (operational=teal, down=rose, standby=amber…) |
| `SiteSelect`, `RangeSelect` | client | URL-driven selects in top bar |
| `AlertBell`, `AlertList` | server | live rule evaluation |
| `RecordForm` variants | client | `useActionState` → pending spinner + field errors + success toast strip |
| `ImportWizard` | client | pick entity → choose file → preview/validate → commit → report |
| `ConfirmButton` | client | destructive actions (reseed) require typed confirm |

## 5. Page wireframes & chart catalogue

### `/` Overview
```
[ Ore t ][ Concentrate t ][ Grade % ][ Recovery % ][ Avail. % ][ Open incidents ][ CO₂e t ][ Alerts ]
┌ Production 30d (stacked area: ore/waste) ─────┐ ┌ Grade & recovery (dual axis lines) ┐
│                                                │ │                                     │
└────────────────────────────────────────────────┘ └─────────────────────────────────────┘
┌ Availability heatmap (site × day) ────────────┐ ┌ Alerts (live breaches, severity) ──┐
└────────────────────────────────────────────────┘ └─────────────────────────────────────┘
```
KPI tiles show Δ vs the **previous period of equal length** (teal ▲ good / rose ▼ bad, inverted
for "bad when up" metrics: incidents, alerts, CO₂e).

### `/sites` — table (code, name, mineral, type, status, capacity, latest ore/d, availability) → `/sites/[id]`
Header with site identity + status; KPI row; 12-month ore & concentrate combo; fleet status board
(cards per unit with status dot); latest env snapshot strip; site-scoped alerts.

### `/production`
Controls: granularity (day/week/month). Charts: ore vs waste stacked bars + capacity line ·
grade & recovery dual axis · strip ratio area · mineral mix donut (portfolio) · monthly table.

### `/equipment`
Fleet status board (counts by status) · availability + utilization trend (lines) ·
downtime Pareto (horizontal bars by reason) · utilisation heatmap (unit × last 14 days) ·
roster table with per-unit status select (control action).

### `/safety`
KPI: incidents, lost-time days, days since last LTI, open · stacked bars by severity/month ·
type donut · open incidents table with ✅ close action.

### `/environment`
KPI: water withdrawn, recycled %, CO₂e, intensity, tailings level · water draw vs recycle
(dual axis) · CO₂e trend · **tailings gauge vs 80 % limit** · daily table.

### `/inventory`
Stockpile by product bars + table · shipment status donut · in-transit & delivered value KPIs ·
shipments table with status badges · add shipment form.

### `/import` — 4-step wizard: entity → file → validation report (row errors) → commit summary.
### `/settings` — alert rule CRUD · data (reseed/reset/export) · import history table.

## 6. Interaction & motion

- Skeletons pulse at 1.5 s; buttons show 14 px spinner while `pending`.
- Success = inline green strip at top of form ("Saved · refreshed"); error = rose strip + field text.
- Chart tooltips: panel background, mono numbers, 1px line border.
- No page-level spinners — PPR shell + skeletons cover all latency.
- Transitions: 120 ms colour/border only; no transforms on data surfaces.

## 7. Responsive

`lg` (≥1024): full rail + 12-col grid (charts span 6/6). `md`: rail icon-only (w-16), charts span 12.
`sm`: KPI tiles 2-up, tables scroll horizontally (`overflow-x-auto`), top bar wraps filters to second row.

## 8. Accessibility

- Contrast ≥ 4.5:1 for text (ink on canvas ≈ 14:1); signals used with text labels, not colour alone.
- Focus ring: `ring-2 ring-signal/60` on all interactive elements; visible nav focus.
- Charts: `<title>`/aria-labels on containers summarising the series; data also exists in tables.
- Forms: `<label>` per field, `aria-invalid` + `aria-describedby` for errors.
