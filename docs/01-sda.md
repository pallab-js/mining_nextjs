# SDA — System Design & Architecture
**Critical Minerals Operations Center** · v1.0 · companion to [02-prd](./02-prd.md), [03-trd](./03-trd.md), [04-ui-ux](./04-ui-ux.md)

---

## 1. Overview

A **local, single-user web application** that centralises monitoring and control of critical-minerals
mining operations behind one dashboard. It runs entirely on the operator's machine: Next.js serves the
UI and API in one process; SQLite stores all data in one file. No cloud services, no auth, no external
dependencies at runtime.

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                                          │
│  Server-rendered pages + hydrated islands (charts, forms, filters) │
└──────────────▲─────────────────────────────────▲───────────────────┘
               │ HTML / RSC payload              │ Server Action POSTs
┌──────────────┴─────────────────────────────────┴───────────────────┐
│  Next.js 16 (App Router, Cache Components) — single Node process   │
│                                                                    │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────────┐  │
│  │ Pages (RSC)  │──▶│ Query layer   │──▶│ Drizzle ORM + raw SQL  │  │
│  │ layouts      │   │ (src/lib/     │   │ (analytics aggregations│  │
│  │ loading.tsx  │   │  queries/*)   │   │  in `sql` templates)   │  │
│  └──────────────┘   └───────────────┘   └───────────▲────────────┘  │
│  ┌──────────────┐   ┌───────────────┐               │               │
│  │ Client isles │   │ Server Actions│──validation───┘               │
│  │ charts/filters│  │ (actions/*)   │  (Zod → DB write → refresh()) │
│  │ forms/tables │   └───────────────┘                               │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                          ┌────────▼─────────┐
                          │  SQLite (better- │
                          │  sqlite3)        │
                          │  data/mining.db  │  ← git-ignored, copy = backup
                          └──────────────────┘
```

## 2. Architecture layers

| Layer | Location | Responsibility |
|---|---|---|
| **Presentation** | `src/app/**/page.tsx`, `src/components/**` | Rendering, layout, skeletons. Server Components by default; `"use client"` only for interactivity (charts, filters, tables, forms). |
| **Application / actions** | `src/lib/actions/**` | Server Actions: parse `FormData`, **Zod-validate**, write to DB, then `refresh()` so the UI re-renders with fresh data. |
| **Query / read model** | `src/lib/queries/**` | All reads. One function per dashboard widget-group. Returns **plain serialisable objects** (no ORM rows) so Server → Client props are trivial. |
| **Domain logic** | `src/lib/metrics.ts`, `alerts.ts`, `csv.ts` | Pure functions: KPI formulas, threshold evaluation, CSV parse/validate/normalise. Unit-tested. |
| **Persistence** | `src/lib/db/**` | Connection singleton, idempotent DDL (`migrations.ts`), Drizzle schema. |

**Rules of the architecture**
1. Client components never talk to the database or to HTTP endpoints for reads — they receive JSON
   props from Server Components. Only mutations go through Server Actions.
2. Every write goes through a Zod schema shared with the read/CSV path (`src/lib/validation.ts`), so
   manual entry and CSV import enforce identical rules.
3. Business math (ratios, OEE, TRIF, aggregation) lives in pure modules, not in components — one
   definition used by dashboard, tables and tests.

## 3. Rendering & caching strategy (Next.js 16 Cache Components)

The scaffold enables `cacheComponents: true` + `partialPrefetching: true`. SQLite reads are
*predictable synchronous I/O*, which Next would snapshot **at build time** — wrong for live ops data.
Therefore:

- Every query function starts with `await connection()` → the read happens **per request**.
- All data-reading components sit under `<Suspense>`; the `loading.tsx` file convention supplies the
  page-level boundary, so navigation shows skeletons instantly (PPR static shell + streaming content).
- Layout-level widgets that need data (freshness badge, alert bell) are individually wrapped in
  `<Suspense>` so the shell/prerender never blocks on the DB.
- **No `use cache` anywhere** — live data is always fresh; after a mutation the action calls
  `refresh()` from `next/cache` to re-render the current route with the new state.

## 4. Module boundaries

Six operational domains, each with a read surface, a write surface and (most) CSV import:

| Module | Read | Write (Server Action) | CSV import |
|---|---|---|---|
| Sites & mines | `queries/sites.ts` | create / update site | — |
| Production & grades | `queries/production.ts` | add daily record | ✅ `production` |
| Equipment / fleet | `queries/equipment.ts` | add event, update unit status | ✅ `equipment_events` |
| Safety (HSE) | `queries/safety.ts` | log incident, close incident | ✅ `safety` |
| Environment & tailings | `queries/environment.ts` | add daily reading | ✅ `environment` |
| Inventory & shipments | `queries/inventory.ts` | add stockpile/shipment | ✅ `shipments` |

Cross-cutting: **alerts** (threshold engine over live metrics) and **settings** (reseed, export,
import history).

## 5. Alert engine (control layer)

`alerts.ts` evaluates configured rules **at read time** against the latest data:

```
alert_rules (stored)  ──▶  evaluate(current metric values, rules)  ──▶  ActiveAlert[]
        ▲                                                      │
        └── managed on /settings (CRUD, enable/disable) ◀──────┘
```

- Metrics are resolved through a single **metric registry** (`metrics.ts`): key → {label, unit,
  latest-value lookup}. The same registry drives KPI tiles, so "what the dashboard shows" and
  "what triggers an alert" can never diverge.
- Evaluation is pure and unit-tested; no background jobs (state is derived, never stored ⇒ no
  stale/false history to reconcile).

## 6. CSV import pipeline

```
File (FormData) ─▶ Papa.parse (header:true, dynamicTyping:false)
              ─▶ header/column mapping (fuzzy: case/space-insensitive)
              ─▶ Zod row-by-row validation (same schemas as forms)
              ─▶ transaction: valid rows inserted, invalid rows collected
              ─▶ import_batches row (filename, entity, counts, first 25 errors)
              ─▶ refresh() ─▶ UI shows batch summary + per-row errors
```

Imports are **append-with-upsert**: rows with a natural key (e.g. `site_id + date`) upsert, so
re-importing a corrected file is safe.

## 7. Error handling & resilience

- **Route-level**: `error.tsx` boundaries per segment with a "retry" affordance.
- **Actions**: never throw to the UI — return `{ ok: false, errors }` discriminated results consumed
  by `useActionState`.
- **Missing DB / empty tables**: schema is created idempotently on first connection; empty tables
  render designed `EmptyState` components with a call-to-action (seed or add record), not crashes.
- **Dev-only friction**: if `data/mining.db` cannot be opened, the error message names the fix
  (`npm run db:seed`).

## 8. Security posture (local single-user)

No auth by design (see PRD out-of-scope). Mitigations that still apply:
- All mutations are POST-only Server Actions with Zod validation (no injection surface: Drizzle +
  parameterised `sql` templates, never string-concatenated SQL).
- Uploaded files are parsed in memory with a 5 MB cap; nothing is written to disk.
- CSV values are parameterised on insert; no shell/exec usage anywhere.

## 9. Repository & environment

- Git repo initialised at project root from day one; remote added when provided. Conventional
  commits per milestone.
- `data/` (SQLite files) git-ignored ⇒ the repo never carries data, and **backup = copy the file**.
- Node ≥ 22 (nvm), SQLite 3.46 (system CLI available for ad-hoc inspection).

## 10. Technology decisions (and why)

| Choice | Alternative | Why this |
|---|---|---|
| Next.js 16 App Router + RSC | Vite SPA | Server-side SQLite access, one process, streaming skeletons |
| better-sqlite3 | node:sqlite / Prisma | Fast, synchronous, zero-config; `node:sqlite` still experimental |
| Drizzle ORM (queries) + hand-written idempotent DDL | Prisma / drizzle-kit push | Typed queries without a codegen/migration tool in the hot path; `CREATE TABLE IF NOT EXISTS` runs on open |
| Recharts 3 | Chart.js / visx | Declarative React, good SSR story, low ceremony |
| Server Actions + Zod | REST controllers | Single validation pipeline, progressive enhancement, no API boilerplate |
| URL `searchParams` for site/date filters | Context/state store | Shareable, bookmarkable, server-rendered — no client cache to invalidate |
