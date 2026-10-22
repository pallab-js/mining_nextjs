# Graph Report - mining_nextjs  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 692 nodes · 2311 edges · 19 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2df6e165`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [id]/page.tsx
- all
- csv.ts
- enums.ts
- settings/page.tsx
- next
- data-table.tsx
- queries/alerts.ts
- db/seed.ts
- schema.ts
- skeletons.tsx
- charts.tsx
- compilerOptions
- package.json
- devDependencies
- dependencies
- scripts
- e2e-actions.sh
- eslint.config.mjs

## God Nodes (most connected - your core abstractions)
1. `filterFromSearchParams()` - 49 edges
2. `Panel()` - 42 edges
3. `all()` - 37 edges
4. `react` - 33 edges
5. `next` - 30 edges
6. `one()` - 29 edges
7. `EmptyState()` - 27 edges
8. `where()` - 25 edges
9. `attempt()` - 25 edges
10. `fail()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `RuleList()` --indirect_call--> `deleteRule()`  [INFERRED]
  src/components/forms/rule-list.tsx → src/lib/actions/alerts.ts
- `RuleList()` --indirect_call--> `toggleRule()`  [INFERRED]
  src/components/forms/rule-list.tsx → src/lib/actions/alerts.ts
- `Column` --references--> `FMT`  [EXTRACTED]
  src/components/ui/data-table.tsx → src/lib/fmt-kinds.ts
- `SeriesDef` --references--> `FMT`  [EXTRACTED]
  src/components/charts.tsx → src/lib/fmt-kinds.ts
- `ActionForm()` --calls--> `Toast`  [EXTRACTED]
  src/components/forms/action-form.tsx → src/components/toast-host.tsx

## Import Cycles
- None detected.

## Communities (19 total, 0 thin omitted)

### Community 0 - "[id]/page.tsx"
Cohesion: 0.06
Nodes (121): react, Co2eChart(), EnvironmentContent(), EnvironmentPage(), EnvKpis(), metadata, ReadingsPanel(), TailingsPanel() (+113 more)

### Community 1 - "all"
Cohesion: 0.07
Nodes (73): date-fns, server-only, DEFAULT_RANGE, Filter, isoDay(), isRangeKey(), parseFilter(), RANGE_PRESETS (+65 more)

### Community 2 - "csv.ts"
Cohesion: 0.06
Nodes (54): better-sqlite3, drizzle-orm, GET(), TABLES, ENTITY_HINTS, ImportWizard(), commitImport(), CONFLICT (+46 more)

### Community 3 - "enums.ts"
Cohesion: 0.06
Nodes (55): StatusControl(), StatusUnit, COMPARATORS, EQUIPMENT_STATUS_TONE, EQUIPMENT_STATUSES, EQUIPMENT_TYPES, EquipmentStatus, IMPORT_ENTITIES (+47 more)

### Community 4 - "settings/page.tsx"
Cohesion: 0.08
Nodes (37): lucide-react, geistMono, geistSans, metadata, RootLayout(), DataSection(), DiagnosticsSection(), ExportPanel() (+29 more)

### Community 5 - "next"
Cohesion: 0.25
Nodes (31): csp, nextConfig, next, createRule(), deleteRule(), toggleRule(), createEnvReading(), createEquipment() (+23 more)

### Community 6 - "data-table.tsx"
Cohesion: 0.10
Nodes (32): metadata, SitesPage(), Stat(), SEV_ICON, SEV_ORDER, SEV_TONE, OpenIncident, OpenIncidentList() (+24 more)

### Community 7 - "queries/alerts.ts"
Cohesion: 0.14
Nodes (24): vitest, ActiveAlert, compare(), evaluateAlerts(), RuleInput, SEVERITY_RANK, sortAlerts(), Comparator (+16 more)

### Community 8 - "db/seed.ts"
Cohesion: 0.11
Nodes (25): stats, clearAllData(), CUSTOMERS, DESTINATIONS, DOWNTIME_REASONS, FLEET, FleetUnit, INCIDENT_TEMPLATES (+17 more)

### Community 9 - "schema.ts"
Cohesion: 0.07
Nodes (28): AlertRule, alertRules, EnvReading, envReadings, Equipment, EquipmentEvent, equipmentEvents, ImportBatch (+20 more)

### Community 10 - "skeletons.tsx"
Cohesion: 0.20
Nodes (10): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Loading() (+2 more)

### Community 11 - "charts.tsx"
Cohesion: 0.18
Nodes (13): AXIS, BarTrend(), DarkTooltip(), Donut(), SeriesDef, TipEntry, FMT, fmtWith() (+5 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (16): name, private, version, papaparse, react-dom, recharts, tailwindcss, @tailwindcss/turbopack (+8 more)

### Community 14 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, tsx, @types/better-sqlite3, @types/node (+5 more)

### Community 15 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, better-sqlite3, date-fns, drizzle-orm, lucide-react, next, papaparse, react (+4 more)

### Community 16 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, db:reset, db:seed, dev, e2e:actions, lint, start (+2 more)

### Community 17 - "e2e-actions.sh"
Cohesion: 0.57
Nodes (6): action_id(), check(), post(), q(), e2e-actions.sh script, upload()

### Community 18 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **10 isolated node(s):** `react-dom`, `tailwindcss`, `@tailwindcss/turbopack`, `tsx`, `@types/better-sqlite3` (+5 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 242 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `[id]/page.tsx`, `all`, `csv.ts`, `settings/page.tsx`, `data-table.tsx`, `package.json`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `react-dom`, `tailwindcss`, `@tailwindcss/turbopack` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `[id]/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0645129518368955 - nodes in this community are weakly interconnected._
- **Why does `react` connect `[id]/page.tsx` to `csv.ts`, `enums.ts`, `settings/page.tsx`, `data-table.tsx`, `charts.tsx`, `package.json`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `all` be split into smaller, more focused modules?**
  _Cohesion score 0.06540447504302926 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `settings/page.tsx` to `[id]/page.tsx`, `csv.ts`, `package.json`, `data-table.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `csv.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06001984126984127 - nodes in this community are weakly interconnected._