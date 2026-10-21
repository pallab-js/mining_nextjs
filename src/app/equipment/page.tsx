/** Equipment & fleet — status board, trends, Pareto, utilization heatmap, roster. */
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { DataTable, type Column } from '@/components/ui/data-table'
import { viewRows } from '@/lib/view-rows'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusDot } from '@/components/ui/status-dot'
import { BarTrend, Heatmap, PALETTE, TrendChart } from '@/components/charts'
import { filterFromSearchParams, previousPeriod, rangeLabel } from '@/lib/filter'
import {
  getAvailabilitySeries,
  getAvailabilityTotals,
  getDowntimePareto,
  getFleetStatusCounts,
  getRoster,
  getUnitUtilizationMatrix,
} from '@/lib/queries/equipment'
import { fmtCompact, fmtPct } from '@/lib/format'
import type { SearchParams } from '@/lib/web'

export const metadata = { title: 'Equipment — COMC' }

export default function EquipmentPage({ searchParams }: { searchParams: SearchParams }) {
  return <EquipmentContent sp={searchParams} />
}

async function EquipmentContent({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  return (
    <>
      <PageHeader
        title="Equipment & Fleet"
        subtitle={`${rangeLabel(f)} · ${f.from} → ${f.to}`}
      />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={4} />}>
          <EquipmentKpis sp={sp} />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <StatusBoard sp={sp} />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<ChartSkeleton label="Loading availability" />}>
            <AvailabilityChart sp={sp} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton label="Loading downtime Pareto" />}>
            <DowntimePareto sp={sp} />
          </Suspense>
        </div>
        <Suspense fallback={<ChartSkeleton label="Loading utilization heatmap" height={200} />}>
          <UtilizationHeatmap sp={sp} />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <RosterPanel sp={sp} />
        </Suspense>
      </div>
    </>
  )
}

async function EquipmentKpis({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const prev = previousPeriod(f)
  const [cur, before] = await Promise.all([getAvailabilityTotals(f), getAvailabilityTotals(prev)])
  const delta = (a: number | null, b: number | null) =>
    a !== null && b !== null && b !== 0 ? (a - b) / Math.abs(b) : null
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        label="Availability"
        value={fmtPct(cur.availability)}
        delta={delta(cur.availability, before.availability)}
        tone={cur.availability !== null && cur.availability < 85 ? 'warn' : 'neutral'}
        hint="running ÷ (running + downtime)"
      />
      <KpiTile
        label="Utilization"
        value={fmtPct(cur.utilization)}
        delta={delta(cur.utilization, before.utilization)}
        hint="running ÷ (unit-days × 24h)"
      />
      <KpiTile label="Downtime" value={fmtCompact(cur.downtime)} unit="h" delta={delta(cur.downtime, before.downtime)} upIsGood={false} />
      <KpiTile label="Fuel" value={fmtCompact(cur.fuel)} unit="L" delta={delta(cur.fuel, before.fuel)} upIsGood={false} />
    </div>
  )
}

async function StatusBoard({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const counts = await getFleetStatusCounts(f)
  const chips = [
    { key: 'operational', label: 'Operational', count: counts.operational, tone: 'good' as const },
    { key: 'standby', label: 'Standby', count: counts.standby, tone: 'idle' as const },
    { key: 'maintenance', label: 'Maintenance', count: counts.maintenance, tone: 'warn' as const },
    { key: 'down', label: 'Down', count: counts.down, tone: 'bad' as const },
  ]
  return (
    <Panel title="Fleet status board" hint={`${counts.total} units`}>
      {counts.total === 0 ? (
        <EmptyState compact title="No equipment" description="Seed or import equipment to see the status board." />
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {chips.map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-md border border-line bg-panel-2 px-3 py-2.5">
              <StatusDot tone={c.tone} pulse={c.key === 'down' && c.count > 0} />
              <div>
                <div className="label-micro">{c.label}</div>
                <div className="num text-[20px] leading-tight font-medium">{c.count}</div>
              </div>
              <div className="num ml-auto text-[11px] text-ink-dim">
                {counts.total > 0 ? `${Math.round((c.count / counts.total) * 100)}%` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

async function AvailabilityChart({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const data = await getAvailabilitySeries(f)
  return (
    <Panel title="Availability & utilization" hint={`${rangeLabel(f)} · target 90%`}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'availability', name: 'Availability %', color: PALETTE.blue, format: 'pct1' },
          { key: 'utilization', name: 'Utilization %', color: PALETTE.purple, format: 'pct1' },
        ]}
        yFormat="pct0"
        reference={{ y: 90, label: 'target 90%' }}
      />
    </Panel>
  )
}

async function DowntimePareto({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const pareto = await getDowntimePareto(f)
  return (
    <Panel title="Downtime Pareto" hint="hours by reason · worst first">
      {pareto.length === 0 ? (
        <EmptyState compact title="No downtime in range" description="All units ran without recorded downtime events." />
      ) : (
        <BarTrend
          data={pareto}
          xKey="reason"
          bars={[{ key: 'hours', name: 'Hours', color: PALETTE.bad, format: 'int' }]}
          horizontal
          height={Math.max(180, pareto.length * 26)}
        />
      )}
    </Panel>
  )
}

async function UtilizationHeatmap({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const matrix = await getUnitUtilizationMatrix(f, 14)
  return (
    <Panel title="Unit utilization heatmap" hint="running hours ÷ 24 per day · last 14 days">
      {matrix.units.length === 0 || matrix.dates.length === 0 ? (
        <EmptyState compact title="No fleet events in range" />
      ) : (
        <Heatmap
          rowLabels={matrix.units.map((u) => u.code)}
          dates={matrix.dates}
          cells={matrix.cells}
          height={22}
        />
      )}
    </Panel>
  )
}

async function RosterPanel({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const roster = await getRoster(f)
  const rows = roster.map((r) => ({
    ...r,
    unit: `${r.code} · ${r.name}`,
    availTone:
      r.availability === null ? 'idle' : r.availability < 85 ? ('warn' as const) : ('good' as const),
  }))
  const columns: Column[] = [
    { key: 'unit', header: 'Unit', kind: 'mono' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status', kind: 'dot', toneKind: 'equipment' },
    { key: 'site', header: 'Site', kind: 'mono' },
    { key: 'running', header: 'Running (h)', align: 'right', kind: 'num', fmt: 'int' },
    { key: 'downtime', header: 'Down (h)', align: 'right', kind: 'num', fmt: 'int' },
    { key: 'availability', header: 'Avail %', align: 'right', kind: 'num', fmt: 'pct1', toneField: 'availTone' },
    { key: 'fuel', header: 'Fuel (L)', align: 'right', kind: 'num', fmt: 'int' },
    { key: 'lastEvent', header: 'Last event', align: 'right', kind: 'date' },
  ]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Fleet roster</h2>
        <span className="text-[11px] text-ink-dim">{roster.length} units · click headers to sort</span>
      </div>
      <DataTable
        columns={columns}
        rows={viewRows(rows)}
        pageSize={25}
        dense
        emptyState={<EmptyState compact title="No equipment" description="Seed or import a fleet to populate the roster." />}
      />
    </div>
  )
}
