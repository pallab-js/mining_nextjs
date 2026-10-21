# TRD — Technical Requirements Document
**Critical Minerals Operations Center** · v1.0 · supersedes nothing, pairs with [01-sda](./01-sda.md)

## 1. Stack (pinned by lockfile)

| Concern | Choice |
|---|---|
| Runtime | Node ≥ 22 (nvm), npm 10 |
| Framework | Next.js **16.4.2** App Router, `cacheComponents: true`, `partialPrefetching: true` |
| Language | TypeScript 5 strict |
| Styling | Tailwind CSS **v4** (`@theme` tokens in `globals.css`) |
| DB | SQLite via **better-sqlite3 13** (file `data/mining.db`, WAL) |
| Query layer | **drizzle-orm 0.45** for typed CRUD + raw `sql` for analytics |
| Schema | Hand-written idempotent DDL — `src/lib/db/migrations.ts` (**single source of truth**, runs on connection) |
| Validation | **zod 4** (shared manual-entry + CSV schemas) |
| Charts | **recharts 3** (client components, JSON props from RSC) |
| CSV | **papaparse 5** |
| Icons | lucide-react |
| Dates | date-fns 4 |
| Tests | vitest 5 (domain logic) |

Scripts: `dev` · `build` · `start` · `lint` · `typecheck` (`tsc --noEmit`) · `test` · `db:seed` (`tsx scripts/seed.ts`) · `db:reset` (`tsx scripts/reset.ts`)

## 2. Database schema (DDL authority: `src/lib/db/migrations.ts`)

```sql
sites(id PK, code UNIQUE, name, mineral, region, mine_type, status,
      capacity_tpd REAL, lat REAL, lon REAL, opened_date, description)
equipment(id PK, site_id→sites, code UNIQUE, name, type, status,
          manufacturer, model, capacity REAL, installed_date)
production_daily(id PK, site_id→sites, date, ore_tonnes, waste_tonnes,
                 concentrate_tonnes, head_grade_pct, recovery_pct, throughput_tpd,
                 UNIQUE(site_id,date))
equipment_events(id PK, equipment_id→equipment, date, running_hours, downtime_hours,
                 downtime_reason, fuel_litres, UNIQUE(equipment_id,date))
safety_incidents(id PK, site_id→sites, date, type, severity, description,
                 lost_time_days, reported_by, status, created_at)
env_readings(id PK, site_id→sites, date, water_withdrawal_m3, water_recycled_pct,
             energy_mwh, co2e_tonnes, tailings_level_pct, UNIQUE(site_id,date))
stockpiles(id PK, site_id→sites, product, grade_pct, tonnes, updated_at,
           UNIQUE(site_id,product))
shipments(id PK, site_id→sites, product, tonnes, destination, customer,
          status, eta, shipped_date, price_usd_per_t)
alert_rules(id PK, name, metric, comparator, threshold REAL, severity,
            site_id NULL→sites, active INT, created_at)
import_batches(id PK, entity, filename, rows_ok, rows_failed, errors_json, created_at)
```

**Enums (TEXT + CHECK-free, enforced by Zod):**
`mineral ∈ {lithium, cobalt, nickel, graphite, rare-earth, copper, manganese, chromite}`
`mine_type ∈ {open-pit, underground, brine, placer}` · `site status ∈ {active, maintenance, care-maintenance, exploration}`
`equipment type ∈ {drill, excavator, haul-truck, loader, crusher, concentrator, dozer, grader}`
`equipment status ∈ {operational, maintenance, standby, down}` · `incident type ∈ {injury, near-miss, spill, environmental, vehicle}`
`severity ∈ {low, medium, high, critical}` · `shipment status ∈ {planned, in-transit, delivered, delayed}`
`comparator ∈ {>, >=, <, <=}` · stockpile/shipment `product` = mineral enum.

**Indexes:** `production_daily(site_id,date)`, `equipment_events(equipment_id,date)`, `env_readings(site_id,date)`, `safety_incidents(site_id,date)`, `shipments(site_id,status)`.

**Natural keys** (upsert targets for CSV): production/equipment_events/env_readings as shown; stockpiles by `(site_id,product)`; safety & shipments append-only (no natural key → duplicates possible; surfaced in batch report).

## 3. Data-access contract

```ts
// every read fn:
export async function getProductionSeries(f: Filter): Promise<ProductionPoint[]> {
  await connection()                     // ← per-request, defeats build-time snapshot
  return db.select({...}).from(...)      // Drizzle, or sql`...` for GROUP BY analytics
}
type Filter = { siteId?: number; from: string; to: string }  // ISO dates
```
- All query modules are server-only (`import 'server-only'` guard).
- Results are mapped to **plain serialisable objects** before leaving the query layer.
- Date ranges come from `parseFilter(searchParams)` in `src/lib/filter.ts` (presets 7d/30d/90d/180d/365d, default 30d; `site=all` default).

## 4. Server Actions (`src/lib/actions/*.ts`)

Signature convention: `(formData: FormData) => Promise<ActionResult>` where
`ActionResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string,string[]> }`.

| Action file | Actions |
|---|---|
| `sites.ts` | `createSite`, `updateSite` |
| `production.ts` | `createProduction` |
| `equipment.ts` | `createEquipmentEvent`, `setEquipmentStatus`, `createEquipment` |
| `safety.ts` | `createIncident`, `closeIncident` |
| `environment.ts` | `createEnvReading` |
| `inventory.ts` | `createStockpile`, `createShipment` |
| `alerts.ts` | `createRule`, `toggleRule`, `deleteRule` |
| `import.ts` | `importCsv(entity, file)` (5 MB cap, transaction, batch record) |
| `settings.ts` | `reseedDatabase`, `resetDatabase` |

All end with `refresh()` (`next/cache`). Validation via zod `.safeParse` on `FormData` → object.

## 5. CSV import format (header row required; matching case/space-insensitive)

| entity | required columns |
|---|---|
| `production` | site(code\|name), date, ore_tonnes, waste_tonnes, concentrate_tonnes, head_grade_pct, recovery_pct, throughput_tpd |
| `equipment_events` | equipment(code), date, running_hours, downtime_hours, downtime_reason, fuel_litres |
| `safety` | site, date, type, severity, description, lost_time_days, reported_by |
| `environment` | site, date, water_withdrawal_m3, water_recycled_pct, energy_mwh, co2e_tonnes, tailings_level_pct |
| `shipments` | site, product, tonnes, destination, customer, status, eta, shipped_date, price_usd_per_t |

Rows validated with the same Zod schemas as the forms; failures are collected (max 25 returned)
with `{row, column, message}`; valid rows insert inside one transaction (all-or-nothing batch).

## 6. Metric registry & alerts (`src/lib/metrics.ts`, `src/lib/alerts.ts`)

```ts
type MetricKey = 'recovery_pct' | 'availability_pct' | 'tailings_level_pct'
               | 'water_recycled_pct' | 'head_grade_pct' | 'co2e_intensity'
type MetricDef = { key, label, unit, decimals, latest: (f: Filter) => Promise<number|null> }
evaluate(metrics: Record<MetricKey, number|null>, rules: Rule[]): ActiveAlert[]
```
Default seeded rules: recovery < 72 % · availability < 85 % · tailings ≥ 80 % ·
water recycled < 75 % · CO₂e intensity > 12 kg/t (each with severity).

## 7. Performance budgets

| Metric | Budget | Notes |
|---|---|---|
| Widget query | < 100 ms | indexed range scans over ~17 k rows |
| Route TTFB (local) | < 500 ms | PPR shell streams instantly |
| Bundle (First Load JS) | < 250 kB | recharts is the main weight; loaded only in chart pages |
| Seed duration | < 5 s | pure-JS PRNG, batched inserts in one transaction |

## 8. Testing strategy

- **Unit (vitest)**: `metrics.test.ts` (weighted averages, deltas, guarded division),
  `alerts.test.ts` (comparators, scope, inactive rules, null metrics), `csv.test.ts`
  (header mapping, per-row errors, numeric coercion, site resolution).
- **Static**: `eslint` (next/core-web-vitals + ts) and `tsc --noEmit` in CI-equivalent script.
- **Build**: `next build` must pass (prerender validation of Cache Components is itself a test).

## 9. Error handling contract

- Actions: never throw — always `ActionResult`.
- Pages: `error.tsx` per segment; `notFound()` for unknown site ids.
- Queries tolerate empty tables (`SUM` → 0 via `COALESCE`, `AVG` → null → UI "—").
- DB open failure: throw with actionable message (`npm run db:seed`).

## 10. Repository & environment

- Commits: conventional (`feat(dashboard): …`, `chore(db): …`), one per milestone/feature slice.
- `data/` ignored; docs committed; remote added when supplied by user.
- `.env` not required; port 3000 default.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Next 16 Cache Components build-time snapshot of sync SQLite | `connection()` in every query + `loading.tsx`/`Suspense` everywhere (validated at build) |
| `useSearchParams` prerender error in filter bar | wrap filter components in `<Suspense>` |
| better-sqlite3 native build | prebuilt binaries for Node 22; verified at install |
| Recharts SSR | client components only; skeletons fill pre-hydration |
| CSV injection of arbitrary SQL | parameterised Drizzle/`sql` bindings only; enums checked by Zod |
| Drizzle schema drift vs hand-written DDL | both live side-by-side in `db/` with a comment pointing at each other; unit smoke test opens a fresh DB |
