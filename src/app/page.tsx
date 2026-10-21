/** Overview — portfolio KPIs, trends, availability heatmap, alert feed. */
import { Suspense } from 'react'
import { connection } from 'next/server'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { AlertFeed } from '@/components/alert-feed'
import { Heatmap, PALETTE, TrendChart } from '@/components/charts'
import { filterFromSearchParams, previousPeriod, rangeLabel } from '@/lib/filter'
import { getProductionSeries, getProductionTotals } from '@/lib/queries/production'
import { getAvailabilitySeries, getSiteAvailabilityMatrix } from '@/lib/queries/equipment'
import { getActiveAlerts } from '@/lib/queries/alerts'
import { listSites } from '@/lib/queries/sites'
import { fmtCompact, fmtNum, fmtPct } from '@/lib/format'
import type { SearchParams } from '@/lib/web'

export default function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  return <OverviewContent sp={searchParams} />
}

type SP = SearchParams

/**
 * Page body — `connection()` first so the whole subtree is rendered at
 * request time (the filter's "now" must never be captured at prerender).
 */
async function OverviewContent({ sp }: { sp: SP }) {
  await connection()
  return (
    <>
      <OverviewHeader sp={sp} />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={4} />}>
          <OverviewKpis sp={sp} />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<ChartSkeleton label="Loading production trend" />}>
            <OverviewProductionChart sp={sp} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton label="Loading availability trend" />}>
            <OverviewAvailabilityChart sp={sp} />
          </Suspense>
        </div>
        <Suspense fallback={<ChartSkeleton label="Loading availability heatmap" height={180} />}>
          <OverviewHeatmap sp={sp} />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <OverviewAlerts />
        </Suspense>
      </div>
    </>
  )
}

async function OverviewHeader({ sp }: { sp: SP }) {
  await connection()
  const f = filterFromSearchParams(await sp)
  const site = f.siteId !== null ? (await listSites()).find((s) => s.id === f.siteId) : null
  return (
    <PageHeader
      title={site ? `${site.code} — ${site.name}` : 'Operations Overview'}
      subtitle={`${rangeLabel(f)} · ${f.from} → ${f.to}`}
    />
  )
}

async function OverviewKpis({ sp }: { sp: SP }) {
  const f = filterFromSearchParams(await sp)
  const prev = previousPeriod(f)
  const [cur, before] = await Promise.all([getProductionTotals(f), getProductionTotals(prev)])
  const delta = (a: number, b: number | null) =>
    b && b !== 0 ? (a - b) / Math.abs(b) : null
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        label="Ore moved"
        value={fmtCompact(cur.ore)}
        unit="t"
        delta={delta(cur.ore, before.ore)}
        hint={`${fmtNum(cur.days)} operating days`}
      />
      <KpiTile
        label="Head grade"
        value={fmtNum(cur.grade, 2)}
        unit="%"
        delta={delta(cur.grade ?? 0, before.grade)}
      />
      <KpiTile
        label="Recovery"
        value={fmtPct(cur.recovery)}
        delta={delta(cur.recovery ?? 0, before.recovery)}
      />
      <KpiTile
        label="Concentrate"
        value={fmtCompact(cur.concentrate)}
        unit="t"
        delta={delta(cur.concentrate, before.concentrate)}
      />
    </div>
  )
}

async function OverviewProductionChart({ sp }: { sp: SP }) {
  const f = filterFromSearchParams(await sp)
  const data = await getProductionSeries(f)
  return (
    <Panel title="Ore & concentrate" hint={rangeLabel(f)}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'ore', name: 'Ore (t)', color: PALETTE.signal, kind: 'area', format: 'compact2' },
          { key: 'concentrate', name: 'Concentrate (t)', color: PALETTE.good, format: 'compact2' },
        ]}
        yFormat="compact"
      />
    </Panel>
  )
}

async function OverviewAvailabilityChart({ sp }: { sp: SP }) {
  const f = filterFromSearchParams(await sp)
  const data = await getAvailabilitySeries(f)
  return (
    <Panel title="Fleet availability" hint={`${rangeLabel(f)} · target 90%`}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[{ key: 'availability', name: 'Availability %', color: PALETTE.blue, format: 'pct1' }]}
        yFormat="pct0"
        reference={{ y: 90, label: 'target 90%' }}
      />
    </Panel>
  )
}

async function OverviewHeatmap({ sp }: { sp: SP }) {
  const f = filterFromSearchParams(await sp)
  const [matrix, sites] = await Promise.all([getSiteAvailabilityMatrix(f, 14), listSites()])
  const rowHrefs = Object.fromEntries(
    sites.filter((s) => matrix.sites.includes(s.code)).map((s) => [s.code, `/sites/${s.id}`]),
  )
  return (
    <Panel title="Availability heatmap — site × day" hint="last 14 days, worst → best">
      {matrix.sites.length === 0 || matrix.dates.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-ink-dim">No fleet events in range.</p>
      ) : (
        <Heatmap rowLabels={matrix.sites} dates={matrix.dates} cells={matrix.cells} rowHrefs={rowHrefs} />
      )}
    </Panel>
  )
}

async function OverviewAlerts() {
  const alerts = await getActiveAlerts()
  const sites = await listSites()
  const siteCodes = Object.fromEntries(sites.map((s) => [s.id, s.code]))
  return (
    <Panel
      title="Active alerts"
      hint="fixed 30-day window · all sites · rules engine"
      actions={<a href="/settings" className="label-micro focus-ring rounded hover:text-ink">manage rules →</a>}
    >
      <div className="-m-4">
        <AlertFeed alerts={alerts} siteCodes={siteCodes} />
      </div>
    </Panel>
  )
}
