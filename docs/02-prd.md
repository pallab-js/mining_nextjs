# PRD — Product Requirements Document
**Critical Minerals Operations Center (COMC)** · v1.0

## 1. Problem statement

Critical-minerals operators (lithium, cobalt, nickel, graphite, rare earths…) juggle spreadsheets,
site logs and siloed tools. There is no single place to answer, at a glance: *are we on plan, is the
fleet healthy, are we safe, are we compliant with environmental limits, what's in the stockpile?*

COMC is a **bird's-eye operational dashboard** running locally: one screen for portfolio-level
analytics, drill-down per site and per domain, manual/CSV data entry, and threshold alerts.

## 2. Goals

- **G1** One dashboard shows the health of all sites within 5 seconds of opening.
- **G2** Every domain (production, fleet, safety, environment, inventory) is queryable with
  trend analytics over 7d/30d/90d/12m ranges.
- **G3** Data can be entered by form **or** bulk CSV with row-level validation feedback.
- **G4** Threshold breaches surface as live alerts, not as something the user must hunt for.
- **G5** Runs entirely locally: `npm run dev` → `localhost:3000`, zero external services.

## 3. Non-goals (v1)

Authentication/multi-user, real-time IoT/telemetry ingestion, cloud deployment, finance & cost
accounting, reserves/resource estimation, workflow approvals, i18n, mobile-native UX.

## 4. Personas (single local user wearing several hats)

| Persona | Top questions |
|---|---|
| **Operations manager** | Output vs plan? Fleet availability? What needs my attention now? |
| **Site engineer** | Grade/recovery trends, downtime causes, throughput |
| **HSE officer** | Incident counts, severity mix, lost-time days, environmental limits |

## 5. Functional requirements — Core 6

> Format: **F-<module>-<n>** · Acceptance criteria in Given/When form.

### FR-Sites
- **F-SITES-1** List all sites with code, mineral, region, type, status, design capacity.
- **F-SITES-2** Site detail: KPI summary, 12-month production trend, fleet status board, latest
  environmental reading, active alerts for that site.
- **F-SITES-3** Create/edit a site (name, code, mineral, region, status, capacity).

### FR-Production
- **F-PROD-1** Daily records per site: ore tonnes, waste tonnes, concentrate tonnes, head grade %,
  recovery %, throughput t/d. Unique per (site, date).
- **F-PROD-2** Range view with: stacked ore/waste bars, production vs capacity line, grade &
  recovery dual-axis, strip-ratio trend, mineral mix donut, monthly summary table.
- **F-PROD-3** Add a daily record via form; validation blocks negatives and recovery/grade > 100 %.
- **F-PROD-4** CSV import (`production` template).

### FR-Equipment
- **F-EQ-1** Fleet roster: code, type, status (operational/maintenance/standby/down), site.
- **F-EQ-2** Daily events: running hours, downtime hours, downtime reason, fuel litres.
  Derived: availability = running / (running + downtime), utilization = running / planned (24 h).
- **F-EQ-3** Analytics: OEE/availability trend, **downtime Pareto by reason**, utilisation
  heatmap (machine × day), fleet status board with counts.
- **F-EQ-4** Update unit status (control action) and log an event; CSV import (`equipment_events`).

### FR-Safety
- **F-SAFE-1** Log incidents: type (injury/near-miss/spill/environmental/vehicle), severity,
  lost-time days, description, status open/closed.
- **F-SAFE-2** Analytics: incidents by type & severity (stacked), monthly trend, open-incident
  list, **days since last lost-time incident**, total lost-time days in range.
- **F-SAFE-3** Close an incident; CSV import (`safety`).

### FR-Environment
- **F-ENV-1** Daily readings: water withdrawal m³, water recycled %, energy MWh, CO₂e t,
  tailings dam level %.
- **F-ENV-2** Analytics: water draw vs recycle (dual axis), CO₂e trend + intensity (kg/t ore),
  tailings level vs 80 % limit (gauge), energy trend.
- **F-ENV-3** Add reading; CSV import (`environment`).

### FR-Inventory
- **F-INV-1** Stockpiles per site/product: tonnes, grade %, updated time.
- **F-INV-2** Shipments: tonnes, product, destination, customer, status
  (planned/in-transit/delivered/delayed), ETA, price USD/t.
- **F-INV-3** Analytics: stockpile by product (bar), shipment status (donut), in-transit tonnes,
  realised value of delivered shipments; CRUD + CSV import (`shipments`).

### FR-Alerts (cross-cutting)
- **F-ALERT-1** Metric registry with latest-value lookups for recovery, availability, tailings
  level, water recycle, head grade, CO₂e intensity.
- **F-ALERT-2** Rules: metric + comparator + threshold + severity + site scope (or global) + active.
- **F-ALERT-3** Top bar bell shows active breach count; panel lists breaches with current value;
  settings page manages rules (create/toggle/delete).

### FR-Settings
- **F-SET-1** Reseed demo database (destructive, confirmed) and reset to empty.
- **F-SET-2** Full JSON export of the database (route handler download).
- **F-SET-3** Import history (batches with counts + row errors).

### FR-Dashboard (overview)
- **F-DSH-1** KPI tiles for the selected range & site filter: ore tonnes, concentrate, avg head
  grade, avg recovery, fleet availability, open safety incidents, CO₂e, active alerts — each with
  delta vs the previous equal-length period.
- **F-DSH-2** Charts: production trend (area), ore vs waste (stacked bars), grade/recovery
  (dual line), fleet availability heatmap (site × day), safety trend, alert feed.
- **F-DSH-3** Global filters: **site** and **date range** in the top bar, persisted in the URL,
  applied to every page.

## 6. KPI definitions (authoritative formulas in `metrics.ts`)

| KPI | Formula |
|---|---|
| Ore tonnes | Σ `ore_tonnes` in range |
| Concentrate | Σ `concentrate_tonnes` in range |
| Head grade (avg) | Σ(grade × ore) / Σ ore (weighted) |
| Recovery (avg) | Σ(recovery × ore) / Σ ore (weighted) |
| Strip ratio | Σ waste / Σ ore |
| Fleet availability | Σ running / Σ (running + downtime) |
| Fleet utilization | Σ running / Σ planned (24 h × units × days) |
| Downtime Pareto | Σ downtime hours grouped by reason, desc |
| CO₂e intensity | Σ CO₂e / Σ ore × 1000 (kg/t) |
| Days since last LTI | today − max(date of incident with lost_time_days > 0) |
| Δ vs previous | (current − previous) / previous, guarded for 0 |

## 7. Data sources

1. **Demo seed** — deterministic (seeded PRNG), 12 months × 4 sites, realistic seasonality,
   weekend dips, occasional downtime spikes and a handful of incidents. Created by `npm run db:seed`.
2. **Forms** — Zod-validated Server Actions.
3. **CSV import** — templates downloadable in-app; row-level error report.

## 8. Quality attributes

| Attribute | Target |
|---|---|
| Performance | First paint < 1.5 s local; widget queries < 100 ms on 12-month dataset |
| Reliability | Every mutation either fully commits or fully rolls back (transaction) |
| Data integrity | Unique natural keys; FKs enforced; no orphan rows |
| Testability | Domain math + CSV + alerts covered by unit tests (`npm test`) |
| Lint/type | `npm run lint` and `npm run typecheck` clean |
| Usability | Every async view has skeleton/empty/error states; dark control-room theme |

## 9. Success criteria

- [ ] Fresh clone → `npm install && npm run db:seed && npm run dev` shows a fully populated dashboard
- [ ] All F-* requirements demonstrable in the UI
- [ ] `lint`, `typecheck`, `test`, `build` all pass
- [ ] Docs (SDA/PRD/TRD/UI-UX/plan) match the shipped behaviour
