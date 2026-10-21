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

Details: 13 actions in `src/lib/actions/*.ts` (`createSite`, `updateSite`,
`createProduction`, `createEquipment`, `createEquipmentEvent`, `setEquipmentStatus`,
`createIncident`, `closeIncident`, `createEnvReading`, `createStockpile`,
`createShipment`, `createRule`, `toggleRule`, `deleteRule`); every action wraps
its body in `attempt()` so it returns `ActionResult` instead of throwing.
One serialisable form spec (`src/lib/field-specs.ts` → `FieldSpec[]`) drives a
single client `ActionForm` + `FormDialog`; no functions cross the RSC boundary
except the server actions themselves. Manual records upsert on their natural key
and report "updated" vs "added". Verified end-to-end over HTTP by
`scripts/e2e-actions.sh` (18/18 checks: writes, validation rejections, unknown
references, duplicate-code rejection).

### M8 — CSV import & settings
- [ ] `/import` wizard: entity → file → validation report → commit + batch history
- [ ] Template download (generated client-side)
- [ ] Settings: reseed (typed confirm), reset, JSON export route, import history

### M9 — Quality & release
- [ ] `npm run lint` clean · `npm run typecheck` clean · `npm test` green · `npm run build` passes
- [ ] Manual walkthrough of all 9 routes against PRD F-* list (populated + empty states)
- [ ] README: setup, scripts, feature tour, screenshots, ER diagram, docs index
- [ ] Commits per milestone; repo ready for remote (`git remote add` when URL provided)
