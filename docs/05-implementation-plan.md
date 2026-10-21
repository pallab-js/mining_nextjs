# Implementation Plan
**Critical Minerals Operations Center** · living document (checkboxes updated as milestones land)
Methodology: spec-kit style (*specify → plan → tasks → implement*); artifacts = `docs/01…05`.

## Milestones

### M0 — Environment & scaffold ✅
- [x] Install nvm → Node 22 LTS; apt: git 2.53, sqlite3 3.46
- [x] `create-next-app` (TS, Tailwind, App Router, ESLint, src/, alias `@/*`) → Next 16.4.2
- [x] Read bundled Next 16 docs (mutating/fetching/caching) before coding — Cache Components rules
- [x] Deps: better-sqlite3, drizzle-orm, papaparse, recharts 3, lucide-react, zod 4, date-fns
      (dev: @types/*, vitest 5, tsx) — resolved `@types/node` 20→22 peer conflict
- [x] `git init`, `.gitignore` + `data/`, initial commit

### M1 — Documentation ✅
- [x] `docs/01-sda.md` — architecture, layers, cache strategy, alert & CSV pipelines
- [x] `docs/02-prd.md` — goals, Core-6 FRs with acceptance criteria, KPI catalogue
- [x] `docs/03-trd.md` — stack, schema DDL, action contract, CSV formats, budgets, risks
- [x] `docs/04-ui-ux.md` — tokens, shell, component inventory, per-page wireframes
- [x] `docs/05-implementation-plan.md` — this file

### M2 — Data layer
- [x] `src/lib/db/`: connection singleton (WAL, FK pragma), `schema.ts` (Drizzle), `migrations.ts` (idempotent DDL)
- [x] `scripts/seed.ts` — deterministic PRNG, 5 sites, 50 units, 12 months, 13,180 rows
- [x] `scripts/reset.ts` — empty-database mode
- [x] npm scripts: `db:seed`, `db:reset`, `typecheck`, `test`
- [x] Smoke: seed a fresh DB, verify counts via `sqlite3` CLI

### M3 — Domain logic (pure, test-backed)
- [x] `lib/filter.ts` — range presets → from/to, site param parsing
- [x] `lib/metrics.ts` — KPI formulas (weighted avg, availability, deltas, intensity)
- [x] `lib/alerts.ts` — rule evaluation (comparators, scope, null-safety)
- [x] `lib/validation.ts` — shared Zod schemas for all entities + CSV rows
- [x] `lib/csv.ts` — header mapping, row validation, site/equipment resolution
- [x] Vitest suites for metrics/alerts/csv — **green** (42/42)

### M4 — Query layer
- [x] `lib/queries/`: sites, production, equipment, safety, environment, inventory, metrics, alerts, meta
- [x] Every fn: `await connection()`, filter-aware, returns plain serialisable objects
- [x] Aggregate SQL: series (day/week/month buckets), Pareto, heatmap matrices, KPI rollups

### M5 — Shell & design system
- [x] `globals.css` tokens (canvas/panel/line/ink/signals), Geist fonts, base utilities
- [x] Layout: rail nav (active states, icon-collapse), top bar (site/range selects, freshness, bell)
- [x] Primitives: Panel, KpiTile, ChartCard, Skeletons, EmptyState, Badge/StatusDot, DataTable
- [x] `error.tsx` + root `loading.tsx` (per-page `loading.tsx` added alongside M6 pages)

### M6 — Dashboard & module pages
- [x] `/` overview: KPI row + 4 chart panels + alert feed
- [x] `/sites` list · `/sites/[id]` detail (trend, fleet board, env snapshot, alerts)
- [x] `/production` (granularity toggle, 4 charts, monthly table)
- [x] `/equipment` (status board, trends, Pareto, heatmap, roster; status control in M7)
- [x] `/safety` (KPIs, severity/type charts, incident register; close action in M7)
- [x] `/environment` (KPIs, water/CO₂e charts, tailings gauge vs limit)
- [x] `/inventory` (stockpiles, shipments, value KPIs)
- [x] Filters (`site`, `range`) wired via URL → every page honours them

### M7 — Mutations (control layer)
- [x] Server Actions per module with Zod + `refresh()` + `ActionResult` contract
- [x] Record forms (create site/production/event/incident/reading/stockpile/shipment)
- [x] Fleet status control, incident close
- [x] Alert-rule CRUD (settings)

Details: 14 actions in `src/lib/actions/*.ts` (`createSite`, `updateSite`,
`createProduction`, `createEquipment`, `createEquipmentEvent`, `setEquipmentStatus`,
`createIncident`, `closeIncident`, `createEnvReading`, `createStockpile`,
`createShipment`, `createRule`, `toggleRule`, `deleteRule`); every action wraps
its body in `attempt()` so it returns `ActionResult` instead of throwing.
One serialisable form spec (`src/lib/field-specs.ts` → `FieldSpec[]`) drives a
single client `ActionForm` + `FormDialog`; no functions cross the RSC boundary
except the server actions themselves. Manual records upsert on their natural key
and report "updated" vs "added". Verified end-to-end over HTTP by
`scripts/e2e-actions.sh` (writes, validation rejections, unknown references,
duplicate-code rejection).

### M8 — CSV import & settings
- [x] `/import` wizard: entity → file → validation report → commit + batch history
- [x] Template download (generated client-side from `src/lib/import-templates.ts`)
- [x] Settings: reseed (typed confirm), reset, JSON export route, import history
- [x] Import upserts on the natural key (site+date, unit+date, site+date) and
      appends for incidents/shipments; every commit records an `import_batches` row

Details: `validateImport` is a dry run (parses, fuzzy-maps headers, resolves site
and equipment references, validates each row with zod) and returns a per-row
report (line, column, message) that the wizard renders as a table; `commitImport`
re-runs the same pipeline and writes the valid rows in one better-sqlite3
transaction, then logs the batch so `/import` and `/settings › Diagnostics` show
the audit trail. `reseedDatabase` / `resetDatabase` demand the typed words
`RESEED` / `RESET` (re-checked server-side). `/api/export` streams every table as
a JSON attachment and is marked dynamic with `connection()`.
Verified by `scripts/e2e-actions.sh` — 27/27 checks.

### M9 — Quality & release
- [x] `npm run lint` clean · `npm run typecheck` clean · `npm test` green · `npm run build` passes
- [x] Manual walkthrough of all 9 routes against PRD F-* list (populated + empty states)
- [x] README: setup, scripts, feature tour, screenshots, ER diagram, docs index
- [x] Commits per milestone; repo ready for remote (`git remote add` when URL provided)

Details — verification pass:

* **Static checks.** `tsc --noEmit`, `eslint` and `vitest run` are all clean
  (42/42 tests in `src/lib/__tests__`); `next build` prerenders 14 routes with
  `/api/export` correctly marked dynamic (`ƒ`).
* **Live walkthrough (populated).** All nine routes plus `/sites/[id]` and
  `/api/export` return **200** with zero server errors in the log. Each page was
  fetched and grepped against the PRD's `F-*` acceptance list:
  F-SITES (portfolio table with capacity `t/d`, create/edit dialogs, per-site
  detail with trend + fleet + environment + alerts), F-PROD (granularity switch,
  ore vs waste, production vs capacity, grade/recovery dual axis, strip ratio,
  mineral mix, monthly table, record dialog), F-EQ (status board, availability
  trend, downtime Pareto, unit × day heatmap, roster, live status control,
  add-unit/log-event dialogs), F-SAFE (lost-time KPIs, days-since, severity/type
  mix, monthly trend, open-incident list with inline Close, log-incident dialog),
  F-ENV (water draw vs recycle, CO₂e trend + intensity, tailings gauge vs the
  80 % limit, energy trend, add-reading dialog), F-INV (stockpile table, shipment
  status breakdown, in-transit tonnes, realised value, both dialogs), F-ALERT
  (rule CRUD on `/settings`, live alert feed and bell counter on `/`), F-DSH
  (KPI cards with deltas, trends, heatmap, alert feed), F-SET-1..4 (typed-confirm
  reseed/reset, JSON export, import history + diagnostics, CSV wizard).
* **Filters.** The global site + range controls render on all eight filterable
  pages, and a filtered request (`?site=<SAL>&range=7d`) is honoured — the page
  reports the 7-day window and the selected site code.
* **Empty states.** A second instance pointed at an empty database
  (`DATABASE_PATH=/tmp/opencode/empty.db npx next start -p 3458`) serves all nine
  routes with **200** and zero server errors, rendering "No sites yet",
  "No alert rules yet…", "No imports yet" and "No tailings readings" with `—`
  placeholders instead of broken charts or `NaN`.
* **Gaps found:** none — every `F-*` requirement in `docs/02-prd.md` maps to
  visible, working UI.

Post-release follow-up — fresh-clone audit. Cloning the pushed repository into
an empty directory (`git clone … && npm ci && npm run db:seed`) surfaced one
real defect that the working tree had masked: `npm run typecheck` failed with
`Cannot find name 'LayoutProps'`, because `LayoutProps`/`PageProps` are globals
generated into `.next/types` and neither that directory nor `next-env.d.ts` is
committed. `typecheck` now runs `next typegen` first (`next typegen && tsc
--noEmit`), which is the documented remedy, and the audit was re-run from a
clean clone: seed ✓, typecheck ✓, lint ✓, 42/42 unit tests ✓, build ✓ (14
routes), all nine routes 200 with zero server errors, and **27/27** e2e checks
against the cloned app on a different port. The e2e harness also gained
`E2E_BASE` / `E2E_DB` / `E2E_TMP` overrides so it can target any instance, plus
pre-flight checks that exit `2` with a clear message when the server, database
or build is missing.

Post-release follow-up — continuous integration. `.github/workflows/ci.yml`
runs the entire verification chain on every push to `main` and every pull
request: typecheck → lint → unit tests → build → route smoke check (every page
plus `/api/export` must return 200) → e2e action checks, with npm caching, the
Node version read from `.nvmrc`, and superseded runs cancelled per branch. No
services or secrets are required because the app is local-only. The workflow was
rehearsed end to end against a clean clone before being committed, and validated
with `actionlint` (clean) and `shellcheck` (all run blocks clean).
