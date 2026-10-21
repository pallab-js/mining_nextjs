# COMC — Critical Minerals Operations Center

[![CI](https://github.com/pallab-js/mining_nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/pallab-js/mining_nextjs/actions/workflows/ci.yml)

A local, single-user operations dashboard for critical-minerals mining. One dark
control-room screen shows whether the portfolio is on plan, whether the fleet is
healthy and whether each site is safe — and lets you write that data back in by
form or by bulk CSV.

**Next.js 16** (App Router, Cache Components) · React 19 · TypeScript · Tailwind v4 ·
SQLite (`better-sqlite3`) · Zod 4 · Recharts · vitest

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

No login, no external services, no network calls — everything runs against
`data/mining.db` on your machine.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | vitest unit suite (metrics, alerts, CSV pipeline) |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run lint` | eslint |
| `npm run db:seed` | rebuild the deterministic demo dataset (wipes existing rows) |
| `npm run db:reset` | empty every table, schema intact |
| `npm run e2e:actions` | drive all 18 server actions over HTTP and assert the resulting rows (27 checks) |

`DATABASE_PATH=/tmp/other.db npm run dev` points the app at a different SQLite file.

## Routes

| Route | What you get |
|---|---|
| `/` | portfolio KPIs with period deltas, production/availability trends, site × day heatmap, live alerts |
| `/sites` | portfolio table (mineral, region, status, capacity, live ore/day, fleet, open incidents) + create dialog |
| `/sites/[id]` | per-site detail: KPIs, 12-month trend, fleet board, environment snapshot, site alerts, edit dialog |
| `/production` | day/week/month granularity, ore vs waste, production vs capacity, grade & recovery, strip ratio, mineral mix |
| `/equipment` | status board, availability trend, downtime Pareto, utilisation heatmap, roster, status control, event log |
| `/safety` | incident KPIs (incl. days since last lost-time), severity/type mix, monthly trend, open list with inline Close |
| `/environment` | water draw vs recycle, CO₂e trend and intensity, tailings gauge vs the 80 % limit, readings table |
| `/inventory` | stockpiles by site/product, shipment status donut, in-transit tonnes, realised value |
| `/import` | three-step CSV wizard (entity → file/paste → validation report → commit) with templates and batch history |
| `/settings` | alert-rule CRUD, data management (reseed / reset with typed confirmation), JSON export, diagnostics |
| `/api/export` | full JSON dump of every table as a download |

Every page honours the global **site** and **range** filters in the top bar, which live
in the URL (`?site=12&range=90d`) — so any view is shareable and bookmarkable.

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
`src/lib/db/schema.ts` mirrors it for Drizzle-typed access. Both apply automatically when
the connection opens.

## How it is built

- **Cache Components + PPR.** Every page awaits `connection()` before computing its date
  filter, so "now" is never captured at prerender time — the static shell streams instantly
  and all data arrives as dynamic holes.
- **No functions cross the RSC boundary** except server actions. Forms are described as plain
  `FieldSpec[]`, tables and charts as serialisable specs, so the client layer stays dumb.
- **One validation pipeline.** Zod schemas in `src/lib/validation.ts` serve the manual forms
  *and* the CSV importer, so the two can never disagree about what "valid" means.
- **Actions never throw.** Every action returns `ActionResult` (`{ok}` / `{ok:false, message,
  fieldErrors}`), keeping UI error handling uniform.
- **Natural-key upserts.** Re-entering the same production day, equipment event or env reading
  updates the existing record instead of duplicating it — by hand or by CSV.

## Security

Threat model: single-user and local-only — no auth by design, and `DATABASE_PATH` is an
operator env var, never request-derived. The hardening targets what applies, plus safe
behaviour if this is ever hosted behind a proxy.

- **Injection** — all SQL is parameterised; table/column names come from compile-time
  constants. `?site=` is digit-gated and `?range=` whitelisted against presets.
- **XSS** — no `dangerouslySetInnerHTML`/`eval`; React escapes user data on every render path
  (forms *and* CSV import, list *and* detail), verified with stored payloads.
- **CSRF** — Next aborts cross-origin Server Action POSTs on the `Origin` check before any write.
- **Headers** — `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a CSP
  (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), and `poweredByHeader: false`.
- **Uploads** — the importer's 5 MB cap is enforced against real byte length, not the
  client-reported `file.size`.
- **Dependencies** — `npm audit --omit=dev` reports 0 vulnerabilities. The remaining dev-only
  advisories have no upstream fix and do not reach the bundle; see [TRD §10a](docs/03-trd.md).

## Tests & verification

```bash
npm test                              # 42 unit tests
npm run typecheck && npm run lint
npm run build                         # prerender validation of every route
npm run db:seed
npx next start -p 3457 &
npm run e2e:actions                   # 27 end-to-end assertions over all 18 actions
```

The e2e harness resolves action ids from the build's server-reference manifest, posts the
multipart encoding React expects, and asserts the rows that land in SQLite — covering writes,
upserts, Zod rejections, unknown references, duplicate keys, CSV validate/commit, batch
history and the destructive-action guards. It retargets with `E2E_BASE` / `E2E_DB` /
`E2E_TMP`, checks its own prerequisites (server reachable, database seeded, build present),
and exits `2` with a clear message when one is missing.

### Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs the whole chain on every push to
`main` and every pull request: **typecheck → lint → unit tests → build → route smoke check →
e2e action checks**. The app is local-only, so no services or secrets are needed — it runs on
a pinned `ubuntu-24.04` runner with Node from `.nvmrc` and npm caching. Superseded runs for a
branch are cancelled.

## Docs

| Document | Contents |
|---|---|
| [`docs/01-sda.md`](docs/01-sda.md) | solution design & architecture |
| [`docs/02-prd.md`](docs/02-prd.md) | product requirements, every feature as `F-<module>-<n>` with acceptance criteria and KPI formulas |
| [`docs/03-trd.md`](docs/03-trd.md) | technical design: schema, data access, actions, CSV format, metrics, testing, security, risks |
| [`docs/04-ui-ux.md`](docs/04-ui-ux.md) | design language, tokens, component inventory, page layouts |
| [`docs/05-implementation-plan.md`](docs/05-implementation-plan.md) | M0–M9 milestone plan and delivery log |

## Milestones

| | Scope |
|---|---|
| M0–M1 | toolchain and the five planning documents |
| M2 | SQLite schema, migrations, deterministic seed |
| M3 | domain logic: filters, metrics, alerts, validation, CSV pipeline (+42 tests) |
| M4 | read models for every module |
| M5 | design tokens, UI primitives, app shell |
| M6 | the nine module pages |
| M7 | server actions and the record forms |
| M8 | CSV import wizard, data management, JSON export |
| M9 | verification pass, PRD walkthrough, this README |
