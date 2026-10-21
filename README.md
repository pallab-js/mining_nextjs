# COMC — Critical Minerals Operations Center

[![CI](https://github.com/pallab-js/mining_nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/pallab-js/mining_nextjs/actions/workflows/ci.yml)

A local, single-user **operations dashboard for critical-minerals mining**. One dark
control-room screen shows whether the portfolio is on plan, whether the fleet is healthy,
whether the site is safe and compliant — and lets you write that data back in by form or
by bulk CSV.

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind v4 · SQLite
(`better-sqlite3`) · Zod 4 · Recharts · vitest.

---

## Quick start

```bash
git clone https://github.com/pallab-js/mining_nextjs.git
cd mining_nextjs
nvm use                 # Node 22.x (see .nvmrc)
npm install
npm run db:seed         # deterministic 12-month demo dataset
npm run dev             # http://localhost:3000
```

No login, no external services, no network calls — the whole app runs against
`data/mining.db` on your machine.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | vitest unit suite (metrics, alerts, CSV pipeline) |
| `npm run typecheck` | `next typegen && tsc --noEmit` (generates route types first, so it works on a fresh clone) |
| `npm run lint` | eslint |
| `npm run db:seed` | rebuild the deterministic demo dataset (wipes existing rows) |
| `npm run db:reset` | empty every table, schema intact |
| `npm run e2e:actions` | drive all 18 server actions over HTTP against `next start` and assert the resulting rows (27 assertions) |

`DATABASE_PATH=/tmp/other.db npm run dev` points the app at a different SQLite file.

The e2e harness can target another server or database without editing the script:

```bash
E2E_BASE=http://localhost:3459 E2E_DB=data/other.db npm run e2e:actions
```

## Feature tour

| Route | What you get |
|---|---|
| `/` | portfolio KPIs with deltas vs the previous period, production/availability trends, site × day availability heatmap, live alert feed |
| `/sites` | portfolio table (mineral, region, status, capacity, live ore/day, fleet, open incidents) + create-site dialog |
| `/sites/[id]` | per-site detail: KPIs, 12-month trend, fleet board, environment snapshot, site alerts, edit dialog |
| `/production` | day/week/month granularity, ore vs waste, production vs capacity, grade & recovery dual axis, strip ratio, mineral mix, monthly table, record dialog |
| `/equipment` | status board, availability trend, downtime Pareto, unit × day utilisation heatmap, roster, live status control, add-unit and log-event dialogs |
| `/safety` | incident KPIs (incl. days since last lost-time incident), severity/type mix, monthly trend, open-incident list with inline Close, log-incident dialog |
| `/environment` | water draw vs recycle, CO₂e trend and intensity, tailings gauge vs the 80 % limit, readings table, add-reading dialog |
| `/inventory` | stockpiles by site/product, shipment status donut, in-transit tonnes, realised value, stockpile and shipment dialogs |
| `/import` | three-step CSV wizard (entity → file/paste → validation report → commit) with template downloads and batch history |
| `/settings` | alert-rule CRUD, data management (reseed / reset with typed confirmation), JSON export, diagnostics |
| `/api/export` | full JSON dump of every table as a download |

Every page honours the global **site** and **range** filters in the top bar, which live in the
URL (`?site=12&range=90d`) — so any view is shareable and bookmarkable.

## Data model

```
sites ─┬─< equipment ──< equipment_events      (running/downtime hours, fuel)
       ├─< production_daily                    (ore, waste, concentrate, grade, recovery)
       ├─< safety_incidents                    (type, severity, lost-time days, status)
       ├─< env_readings                        (water, energy, CO₂e, tailings level)
       ├─< stockpiles                          (unique per site + product)
       ├─< shipments                           (status, ETA, price)
       └─< alert_rules                         (global or site-scoped thresholds)
import_batches                                  (CSV audit trail)
```

The hand-written, idempotent DDL in `src/lib/db/migrations.ts` is the schema authority;
`src/lib/db/schema.ts` mirrors it for Drizzle-typed access. Both are applied automatically
when the connection opens.

## How it is built

- **Cache Components + PPR.** Every page awaits `connection()` before computing its date
  filter, so "now" is never captured at prerender time; the static shell streams instantly
  and all data arrives as dynamic holes.
- **No functions cross the RSC boundary** except server actions. Forms are described as plain
  `FieldSpec[]`, tables and charts as serialisable specs, so the client layer stays dumb.
- **One validation pipeline.** Zod schemas in `src/lib/validation.ts` serve the manual forms
  *and* the CSV importer, so the two can never disagree about what "valid" means.
- **Actions never throw.** Every action returns `ActionResult` (`{ok}` / `{ok:false, message,
  fieldErrors}`), which keeps the UI's error handling uniform.
- **Natural-key upserts.** Re-entering the same production day, equipment event or env reading
  updates the existing record instead of duplicating it — by hand or by CSV.

## Tests & verification

```bash
npm test                    # 42 unit tests: metric formulas, alert evaluation, CSV pipeline
npm run typecheck && npm run lint
npm run build               # prerender validation of every route
npm start -- -p 3457 &
npm run e2e:actions         # 27 end-to-end assertions over all 18 actions
```

The e2e harness resolves action ids from the build's server-reference manifest, posts the
multipart encoding React expects, and asserts the rows that land in SQLite — covering writes,
upserts, Zod rejections, unknown references, duplicate keys, CSV validate/commit, batch
history and the destructive-action guards. It checks its own prerequisites (server reachable,
database seeded, build present) and exits `2` with a clear message if one is missing.

### Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs that whole chain on every push to
`main` and every pull request: **typecheck → lint → unit tests → build → route smoke check →
e2e action checks**. The app is local-only, so no services or secrets are needed — it runs on
a stock `ubuntu-latest` runner with Node from `.nvmrc` and npm caching. In-flight runs for a
branch are cancelled when a newer commit arrives.

To reproduce it locally:

```bash
npm ci && npm run typecheck && npm run lint && npm test && npm run build && npm run db:seed
npx next start -p 3457 &
npm run e2e:actions
```


## Docs

| Document | Contents |
|---|---|
| [`docs/01-sda.md`](docs/01-sda.md) | solution design & architecture |
| [`docs/02-prd.md`](docs/02-prd.md) | product requirements, every feature as `F-<module>-<n>` with acceptance criteria, KPI formulas |
| [`docs/03-trd.md`](docs/03-trd.md) | technical design: schema, data access, actions, CSV format, metrics, testing, risks |
| [`docs/04-ui-ux.md`](docs/04-ui-ux.md) | design language, tokens, component inventory, page layouts |
| [`docs/05-implementation-plan.md`](docs/05-implementation-plan.md) | M0–M9 milestone plan and delivery log |

## Milestones

| | Scope |
|---|---|
| M0–M1 | toolchain, and the five planning documents |
| M2 | SQLite schema, migrations, deterministic seed |
| M3 | domain logic: filters, metrics, alerts, validation, CSV pipeline (+42 tests) |
| M4 | read models for every module |
| M5 | design tokens, UI primitives, app shell |
| M6 | the nine module pages |
| M7 | server actions and the record forms |
| M8 | CSV import wizard, data management, JSON export |
| M9 | verification pass, PRD walkthrough, this README |
