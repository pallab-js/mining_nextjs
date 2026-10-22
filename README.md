# COMC — Critical Minerals Operations Center

[![CI](https://github.com/pallab-js/mining_nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/pallab-js/mining_nextjs/actions/workflows/ci.yml)

A local, single-user operations dashboard for critical-minerals mining. One dark control-room screen shows whether the portfolio is on plan, whether the fleet is healthy, and whether each site is safe — with write-back via forms or bulk CSV.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind v4 · SQLite (`better-sqlite3`) · Zod 4 · Recharts · vitest

---

## Quick Start

```bash
git clone https://github.com/pallab-js/mining_nextjs.git
cd mining_nextjs
nvm use                 # Node 22.x (see .nvmrc)
npm install
npm run db:seed         # deterministic 12-month demo dataset
npm run dev             # http://localhost:3000
```

No login, no external services, no network calls — everything runs against `data/mining.db` on your machine.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests (metrics, alerts, CSV pipeline) |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:seed` | Rebuild demo dataset (wipes existing rows) |
| `npm run db:reset` | Empty all tables, keep schema |
| `npm run e2e:actions` | Drive all 18 server actions over HTTP (27 assertions) |

Override DB: `DATABASE_PATH=/tmp/other.db npm run dev`

---

## Routes

| Route | Description |
|---|---|
| `/` | Portfolio KPIs, trends, site heatmap, live alerts |
| `/sites` | Portfolio table + create dialog |
| `/sites/[id]` | Per-site detail: KPIs, trends, fleet, environment, alerts |
| `/production` | Production analytics (granularity, grade, recovery, strip ratio) |
| `/equipment` | Fleet board, availability, downtime, utilisation, roster |
| `/safety` | Incident KPIs, severity/type mix, monthly trend, open list |
| `/environment` | Water, CO₂e, tailings gauge, readings table |
| `/inventory` | Stockpiles, shipments, in-transit, realised value |
| `/import` | 3-step CSV wizard (entity → file → validate → commit) |
| `/settings` | Alert rules, reseed/reset, JSON export, diagnostics |
| `/api/export` | Full JSON dump of all tables |

All pages respect global **site** and **range** filters in the URL (`?site=12&range=90d`) — shareable and bookmarkable.

---

## Architecture Highlights

- **Cache Components + PPR** — static shell streams instantly; data arrives as dynamic holes
- **Server actions only** — no functions cross the RSC boundary; forms/tables/charts are serialisable specs
- **Single validation pipeline** — Zod schemas serve both manual forms and CSV importer
- **Actions never throw** — return `ActionResult` (`{ok}` / `{ok:false, message, fieldErrors}`)
- **Natural-key upserts** — re-entering same record updates instead of duplicating

---

## Security (Local-First Threat Model)

- **Injection** — parameterised SQL; compile-time constants for identifiers; whitelisted query params
- **XSS** — no `dangerouslySetInnerHTML`/`eval`; React escapes all user data
- **CSRF** — Next.js aborts cross-origin Server Action POSTs on `Origin` check
- **Headers** — `nosniff`, `X-Frame-Options: DENY`, CSP, `Referrer-Policy: no-referrer`
- **Uploads** — 5 MB cap enforced on real byte length
- **Dependencies** — `npm audit --omit=dev` = 0 vulnerabilities

---

## Verification

```bash
npm test                              # 42 unit tests
npm run typecheck && npm run lint
npm run build                         # prerender validation of every route
npm run db:seed
npx next start -p 3457 &
npm run e2e:actions                   # 27 e2e assertions over all 18 actions
```

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/01-sda.md`](docs/01-sda.md) | Solution design & architecture |
| [`docs/02-prd.md`](docs/02-prd.md) | Product requirements (features as `F-<module>-<n>`) |
| [`docs/03-trd.md`](docs/03-trd.md) | Technical design (schema, actions, CSV, metrics, testing, security) |
| [`docs/04-ui-ux.md`](docs/04-ui-ux.md) | Design language, tokens, components, layouts |
| [`docs/05-implementation-plan.md`](docs/05-implementation-plan.md) | M0–M9 milestone plan and delivery log |

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push/PR to `main`:
**typecheck → lint → unit tests → build** (on `ubuntu-24.04`, Node 22, npm cache).