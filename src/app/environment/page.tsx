/** Environment & tailings — water, energy, CO₂e, dam gauges, readings table. */
import { Suspense } from 'react'
import { connection } from 'next/server'
import { Leaf } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { DataTable, type Column } from '@/components/ui/data-table'
import { viewRows } from '@/lib/view-rows'
import { EmptyState } from '@/components/ui/empty-state'
import { Gauge, PALETTE, TrendChart } from '@/components/charts'
import { ActionForm } from '@/components/forms/action-form'
import { FormDialog } from '@/components/forms/form-dialog'
import { createEnvReading } from '@/lib/actions/environment'
import { envReadingFields } from '@/lib/field-specs'
import { filterFromSearchParams, parseFilter, previousPeriod, rangeLabel } from '@/lib/filter'
import {
  getCo2eSeries,
  getEnvKpis,
  getTailingsLatest,
  getWaterSeries,
  listEnvReadings,
} from '@/lib/queries/environment'
import { getSiteOptions } from '@/lib/queries/sites'
import { fmtCompact, fmtDay, fmtNum, fmtPct } from '@/lib/format'
import type { SearchParams } from '@/lib/web'

export const metadata = { title: 'Environment — COMC' }

export default function EnvironmentPage({ searchParams }: { searchParams: SearchParams }) {
  return <EnvironmentContent sp={searchParams} />
}

async function EnvironmentContent({ sp }: { sp: SearchParams }) {
  await connection()
  const f = filterFromSearchParams(await sp)
  const sites = await getSiteOptions()
  const scopedSite = sites.find((s) => s.id === f.siteId)?.code
  return (
    <>
      <PageHeader
        title="Environment & Tailings"
        subtitle={`${rangeLabel(f)} · ${f.from} → ${f.to}`}
        actions={
          <FormDialog
            label="＋ Add reading"
            title="Add environmental reading"
            description="Water, energy, CO₂e and tailings level for one site on one day."
          >
            <ActionForm
              action={createEnvReading}
              fields={envReadingFields(sites, scopedSite)}
              submitLabel="Save reading"
            />
          </FormDialog>
        }
      />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={6} />}>
          <EnvKpis sp={sp} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton label="Loading tailings gauges" height={120} />}>
          <TailingsPanel />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<ChartSkeleton label="Loading water series" />}>
            <WaterChart sp={sp} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton label="Loading CO₂e series" />}>
            <Co2eChart sp={sp} />
          </Suspense>
        </div>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <ReadingsPanel sp={sp} />
        </Suspense>
      </div>
    </>
  )
}

async function EnvKpis({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const prev = previousPeriod(f)
  const [cur, before] = await Promise.all([getEnvKpis(f), getEnvKpis(prev)])
  const delta = (a: number, b: number) => (b !== 0 ? (a - b) / Math.abs(b) : null)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <KpiTile label="Water withdrawal" value={fmtCompact(cur.waterWithdrawal)} unit="m³" delta={delta(cur.waterWithdrawal, before.waterWithdrawal)} upIsGood={false} />
      <KpiTile label="Water recycled" value={fmtPct(cur.waterRecycled)} delta={cur.waterRecycled !== null && before.waterRecycled !== null ? delta(cur.waterRecycled, before.waterRecycled) : null} />
      <KpiTile label="Energy" value={fmtCompact(cur.energy)} unit="MWh" delta={delta(cur.energy, before.energy)} upIsGood={false} />
      <KpiTile label="CO₂e" value={fmtCompact(cur.co2e)} unit="t" delta={delta(cur.co2e, before.co2e)} upIsGood={false} />
      <KpiTile
        label="CO₂e intensity"
        value={cur.co2eIntensity === null ? '—' : fmtNum(cur.co2eIntensity, 2)}
        unit="kg/t"
        delta={cur.co2eIntensity !== null && before.co2eIntensity !== null ? delta(cur.co2eIntensity, before.co2eIntensity) : null}
        upIsGood={false}
        hint="per tonne of ore"
      />
      <KpiTile
        label="Tailings (worst)"
        value={cur.tailingsLevel === null ? '—' : fmtNum(cur.tailingsLevel, 1)}
        unit="%"
        tone={cur.tailingsLevel !== null && cur.tailingsLevel >= 80 ? 'bad' : cur.tailingsLevel !== null && cur.tailingsLevel >= 72 ? 'warn' : 'good'}
        hint={cur.tailingsDate ? `latest ${fmtDay(cur.tailingsDate)}` : 'no readings'}
      />
    </div>
  )
}

async function TailingsPanel() {
  // dam level is a state metric: latest reading per site regardless of range
  const tailings = await getTailingsLatest(parseFilter(undefined))
  return (
    <Panel title="Tailings dam levels" hint="latest reading per site · threshold 80%">
      {tailings.length === 0 ? (
        <EmptyState compact icon={<Leaf className="size-6" />} title="No tailings readings" description="Seed or import environment readings to monitor dam levels." />
      ) : (
        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          {tailings.map((t) => (
            <Gauge
              key={t.siteId}
              value={t.level}
              limit={80}
              label={t.site}
              caption={`as of ${fmtDay(t.date)}`}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

async function WaterChart({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const data = await getWaterSeries(f)
  return (
    <Panel title="Water" hint={`${rangeLabel(f)} · withdrawal & recycle rate`}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'water', name: 'Withdrawal (m³)', color: PALETTE.blue, kind: 'area', format: 'compact2' },
          { key: 'recycled', name: 'Recycled %', color: PALETTE.good, axis: 'right', format: 'pct1' },
        ]}
        yFormat="compact"
      />
    </Panel>
  )
}

async function Co2eChart({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const data = await getCo2eSeries(f)
  return (
    <Panel title="Energy & emissions" hint={`${rangeLabel(f)} · MWh & t CO₂e`}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'co2e', name: 'CO₂e (t)', color: PALETTE.bad, kind: 'area', format: 'compact2' },
          { key: 'energy', name: 'Energy (MWh)', color: PALETTE.signal, format: 'compact2' },
        ]}
        yFormat="compact"
      />
    </Panel>
  )
}

async function ReadingsPanel({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const rows = (await listEnvReadings(f, 100)) ?? []
  const view = rows.map((r) => ({
    ...r,
    tailTone: r.tailingsLevel >= 80 ? ('bad' as const) : r.tailingsLevel >= 72 ? ('warn' as const) : ('good' as const),
  }))
  const columns: Column[] = [
    { key: 'date', header: 'Date', kind: 'mono' },
    { key: 'site', header: 'Site', kind: 'mono' },
    { key: 'waterWithdrawal', header: 'Water (m³)', align: 'right', kind: 'num', fmt: 'compact2' },
    { key: 'waterRecycled', header: 'Recycled %', align: 'right', kind: 'num', fmt: 'pct1' },
    { key: 'energy', header: 'Energy (MWh)', align: 'right', kind: 'num', fmt: 'compact2' },
    { key: 'co2e', header: 'CO₂e (t)', align: 'right', kind: 'num', fmt: 'compact2' },
    { key: 'tailingsLevel', header: 'Tailings %', align: 'right', kind: 'num', fmt: 'num1', toneField: 'tailTone' },
  ]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Daily readings</h2>
        <span className="text-[11px] text-ink-dim">{rows.length} readings</span>
      </div>
      <DataTable
        columns={columns}
        rows={viewRows(view)}
        pageSize={20}
        dense
        emptyState={<EmptyState compact title="No readings in range" />}
      />
    </div>
  )
}
