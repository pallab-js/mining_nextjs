/** Production & grades — KPIs, multi-granularity charts, monthly table. */
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { DataTable, type Column } from '@/components/ui/data-table'
import { viewRows } from '@/lib/view-rows'
import { EmptyState } from '@/components/ui/empty-state'
import { GranToggle, type Gran } from '@/components/gran-toggle'
import { Donut, PALETTE, TrendChart } from '@/components/charts'
import {
  filterFromSearchParams,
  granFrom,
  previousPeriod,
  rangeLabel,
} from '@/lib/filter'
import {
  getMineralMix,
  getMonthlyTable,
  getProductionSeries,
  getProductionTotals,
} from '@/lib/queries/production'
import { fmtCompact, fmtNum, fmtPct } from '@/lib/format'
import type { SearchParams } from '@/lib/web'

export const metadata = { title: 'Production — COMC' }

const MINERAL_COLORS = [PALETTE.signal, PALETTE.good, PALETTE.blue, PALETTE.purple, PALETTE.bad, PALETTE.inkDim]

export default function ProductionPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <ProductionContent sp={searchParams} />
  )
}

async function ProductionContent({ sp }: { sp: SearchParams }) {
  const params = await sp
  const f = filterFromSearchParams(params)
  const gran: Gran = granFrom(params) ?? 'day'
  return (
    <>
      <PageHeader
        title="Production & Grades"
        subtitle={`${rangeLabel(f)} · ${f.from} → ${f.to}`}
        actions={<GranToggle current={gran} />}
      />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={6} />}>
          <ProductionKpis sp={sp} />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<ChartSkeleton label="Loading tonnages" />}>
            <TonnesChart sp={sp} gran={gran} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton label="Loading grade & recovery" />}>
            <GradeRecoveryChart sp={sp} gran={gran} />
          </Suspense>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Suspense fallback={<ChartSkeleton label="Loading strip ratio" />}>
            <StripChart sp={sp} gran={gran} />
          </Suspense>
          <div className="xl:col-span-2">
            <Suspense fallback={<ChartSkeleton label="Loading mineral mix" />}>
              <MineralMixPanel sp={sp} />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <MonthlyPanel sp={sp} />
        </Suspense>
      </div>
    </>
  )
}

async function ProductionKpis({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const prev = previousPeriod(f)
  const [cur, before] = await Promise.all([getProductionTotals(f), getProductionTotals(prev)])
  const delta = (a: number | null, b: number | null) => (b && b !== 0 && a !== null ? (a - b) / Math.abs(b) : null)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <KpiTile label="Ore" value={fmtCompact(cur.ore)} unit="t" delta={delta(cur.ore, before.ore)} />
      <KpiTile label="Waste" value={fmtCompact(cur.waste)} unit="t" delta={delta(cur.waste, before.waste)} upIsGood={false} />
      <KpiTile label="Concentrate" value={fmtCompact(cur.concentrate)} unit="t" delta={delta(cur.concentrate, before.concentrate)} />
      <KpiTile label="Throughput" value={fmtCompact(cur.throughput)} unit="t/d" delta={delta(cur.throughput, before.throughput)} />
      <KpiTile label="Head grade" value={fmtNum(cur.grade, 2)} unit="%" delta={delta(cur.grade, before.grade)} />
      <KpiTile label="Recovery" value={fmtPct(cur.recovery)} delta={delta(cur.recovery, before.recovery)} />
    </div>
  )
}

async function TonnesChart({ sp, gran }: { sp: SearchParams; gran: Gran }) {
  const f = filterFromSearchParams(await sp)
  const data = await getProductionSeries(f, gran)
  return (
    <Panel title="Ore, waste & concentrate" hint={`${rangeLabel(f)} · ${gran}ly`}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'ore', name: 'Ore (t)', color: PALETTE.signal, kind: 'area', format: 'compact2' },
          { key: 'waste', name: 'Waste (t)', color: PALETTE.inkDim, format: 'compact2' },
          { key: 'concentrate', name: 'Concentrate (t)', color: PALETTE.good, format: 'compact2' },
        ]}
        yFormat="compact"
      />
    </Panel>
  )
}

async function GradeRecoveryChart({ sp, gran }: { sp: SearchParams; gran: Gran }) {
  const f = filterFromSearchParams(await sp)
  const data = await getProductionSeries(f, gran)
  return (
    <Panel title="Head grade & recovery" hint="ore-weighted">
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'grade', name: 'Head grade %', color: PALETTE.purple, axis: 'right', format: 'pct1' },
          { key: 'recovery', name: 'Recovery %', color: PALETTE.good, axis: 'right', format: 'pct1' },
        ]}
        yFormat="pct0"
      />
    </Panel>
  )
}

async function StripChart({ sp, gran }: { sp: SearchParams; gran: Gran }) {
  const f = filterFromSearchParams(await sp)
  const data = await getProductionSeries(f, gran)
  return (
    <Panel title="Strip ratio" hint="waste ÷ ore">
      <TrendChart
        data={data}
        xKey="bucket"
        series={[{ key: 'strip', name: 'Strip ratio', color: PALETTE.signal, format: 'num2' }]}
        height={200}
        yFormat="num2"
      />
    </Panel>
  )
}

async function MineralMixPanel({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const mix = await getMineralMix(f)
  const total = mix.reduce((s, m) => s + m.concentrate, 0)
  return (
    <Panel title="Concentrate mix by mineral" hint={rangeLabel(f)}>
      {mix.length === 0 ? (
        <EmptyState compact title="No concentrate in range" />
      ) : (
        <Donut
          data={mix.map((m, i) => ({
            name: m.mineral,
            value: m.concentrate,
            color: MINERAL_COLORS[i % MINERAL_COLORS.length],
          }))}
          centerValue={fmtCompact(total)}
          centerLabel="tonnes"
        />
      )}
    </Panel>
  )
}

async function MonthlyPanel({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const rows = await getMonthlyTable(f)
  const columns: Column[] = [
    { key: 'month', header: 'Month', kind: 'mono' },
    { key: 'ore', header: 'Ore (t)', align: 'right', kind: 'num', fmt: 'compact2' },
    { key: 'waste', header: 'Waste (t)', align: 'right', kind: 'num', fmt: 'compact2' },
    { key: 'concentrate', header: 'Conc. (t)', align: 'right', kind: 'num', fmt: 'compact2' },
    { key: 'grade', header: 'Grade %', align: 'right', kind: 'num', fmt: 'num2' },
    { key: 'recovery', header: 'Recovery %', align: 'right', kind: 'num', fmt: 'pct1' },
    { key: 'strip', header: 'Strip', align: 'right', kind: 'num', fmt: 'num2' },
  ]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Monthly rollup</h2>
        <span className="text-[11px] text-ink-dim">click headers to sort</span>
      </div>
      <DataTable
        columns={columns}
        rows={viewRows(rows)}
        pageSize={12}
        dense
        emptyState={<EmptyState compact title="No production in range" />}
      />
    </div>
  )
}
