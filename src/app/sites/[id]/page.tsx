/** Site detail — trends, fleet snapshot, env snapshot, incidents. */
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { Badge, StatusDot } from '@/components/ui/status-dot'
import { ActionForm } from '@/components/forms/action-form'
import { FormDialog } from '@/components/forms/form-dialog'
import { updateSite } from '@/lib/actions/sites'
import { siteFields } from '@/lib/field-specs'
import { AlertFeed } from '@/components/alert-feed'
import { Gauge, PALETTE, TrendChart } from '@/components/charts'
import { filterFromSearchParams, previousPeriod, rangeLabel } from '@/lib/filter'
import { getSite } from '@/lib/queries/sites'
import { getProductionSeries, getProductionTotals } from '@/lib/queries/production'
import { getAvailabilitySeries, getFleetStatusCounts } from '@/lib/queries/equipment'
import { getEnvKpis, getTailingsLatest } from '@/lib/queries/environment'
import { getSafetyTotals } from '@/lib/queries/safety'
import { getActiveAlerts } from '@/lib/queries/alerts'
import { fmtCompact, fmtNum, fmtPct, fmtDay } from '@/lib/format'
import { humanize, toneFor } from '@/lib/tones'
import type { SearchParams, SiteParams } from '@/lib/web'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default function SiteDetailPage({
  params,
  searchParams,
}: {
  params: SiteParams
  searchParams: SearchParams
}) {
  return (
    <SiteDetail sp={searchParams} idPromise={params} />
  )
}

async function SiteDetail({ sp, idPromise }: { sp: SearchParams; idPromise: SiteParams }) {
  const { id } = await idPromise
  const siteId = Number(id)
  if (!Number.isInteger(siteId)) notFound()
  const site = await getSite(siteId)
  if (!site) notFound()

  return (
    <>
      <Breadcrumbs crumbs={[
        { label: 'Sites', href: '/sites' },
        { label: `${site.code} — ${site.name}` },
      ]} />
      <PageHeader
        title={`${site.code} — ${site.name}`}
        subtitle={
          <>
            {humanize(site.mineral)} · {site.region} · {humanize(site.mineType)} ·{' '}
            <Badge tone={toneFor('site', site.status)}>{humanize(site.status)}</Badge>{' '}
            <span className="num">
              {fmtDay(site.openedDate)} · thru {fmtDay(site.latestDate)}
            </span>
          </>
        }
        actions={
          <FormDialog
            label="Edit site"
            title={`Edit ${site.code}`}
            description="Changes apply across every module for this site."
          >
            <ActionForm
              action={updateSite}
              fields={[
                { name: 'id', type: 'hidden', defaultValue: String(site.id) },
                ...siteFields({
                  code: site.code,
                  name: site.name,
                  mineral: site.mineral,
                  region: site.region,
                  mine_type: site.mineType,
                  status: site.status,
                  capacity_tpd: String(site.capacityTpd),
                  lat: site.lat === null ? undefined : String(site.lat),
                  lon: site.lon === null ? undefined : String(site.lon),
                  opened_date: site.openedDate ?? undefined,
                  description: site.description ?? undefined,
                }),
              ]}
              submitLabel="Save changes"
            />
          </FormDialog>
        }
      />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={4} />}>
          <SiteKpis siteId={siteId} sp={sp} />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<ChartSkeleton label="Loading production trend" />}>
            <SiteProductionChart siteId={siteId} sp={sp} />
          </Suspense>
          <Suspense fallback={<ChartSnapshotFallback />}>
            <SiteFleetPanel siteId={siteId} sp={sp} />
          </Suspense>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<ChartSnapshotFallback />}>
            <SiteEnvPanel siteId={siteId} />
          </Suspense>
          <Suspense fallback={<TableSkeleton rows={4} />}>
            <SiteAlertsPanel siteId={siteId} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function ChartSnapshotFallback() {
  return <ChartSkeleton label="Loading" height={200} />
}

async function SiteKpis({ siteId, sp }: { siteId: number; sp: SearchParams }) {
  const f = { ...filterFromSearchParams(await sp), siteId }
  const prev = previousPeriod(f)
  const [prod, prodPrev, fleet, safety] = await Promise.all([
    getProductionTotals(f),
    getProductionTotals(prev),
    getFleetStatusCounts(f),
    getSafetyTotals(f),
  ])
  const delta = (a: number, b: number | null) => (b && b !== 0 ? (a - b) / Math.abs(b) : null)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Ore moved" value={fmtCompact(prod.ore)} unit="t" delta={delta(prod.ore, prodPrev.ore)} />
      <KpiTile label="Recovery" value={fmtPct(prod.recovery)} delta={delta(prod.recovery ?? 0, prodPrev.recovery ?? 0)} />
      <KpiTile
        label="Fleet down"
        value={`${fleet.down}/${fleet.total}`}
        tone={fleet.down > 0 ? 'warn' : 'good'}
        hint={`${fleet.operational} operational`}
      />
      <KpiTile
        label="Open incidents"
        value={fmtNum(safety.open, 0)}
        tone={safety.open > 0 ? 'bad' : 'good'}
        hint={safety.daysSinceLti !== null ? `${safety.daysSinceLti} days since LTI` : 'no LTI on record'}
      />
    </div>
  )
}

async function SiteProductionChart({ siteId, sp }: { siteId: number; sp: SearchParams }) {
  const f = { ...filterFromSearchParams(await sp), siteId }
  const data = await getProductionSeries(f)
  return (
    <Panel title="Production trend" hint={rangeLabel(f)}>
      <TrendChart
        data={data}
        xKey="bucket"
        series={[
          { key: 'ore', name: 'Ore (t)', color: PALETTE.signal, kind: 'area', format: 'compact2' },
          { key: 'recovery', name: 'Recovery %', color: PALETTE.good, axis: 'right', format: 'pct1' },
        ]}
      />
    </Panel>
  )
}

async function SiteFleetPanel({ siteId, sp }: { siteId: number; sp: SearchParams }) {
  const f = { ...filterFromSearchParams(await sp), siteId }
  const [series, counts] = await Promise.all([getAvailabilitySeries(f), getFleetStatusCounts(f)])
  const chips = [
    { label: 'Operational', count: counts.operational, tone: 'good' as const },
    { label: 'Standby', count: counts.standby, tone: 'idle' as const },
    { label: 'Maintenance', count: counts.maintenance, tone: 'warn' as const },
    { label: 'Down', count: counts.down, tone: 'bad' as const },
  ]
  return (
    <Panel title="Fleet" hint={rangeLabel(f)}>
      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className="flex items-center gap-1.5 rounded border border-line bg-panel-2 px-2 py-1 text-[11px]"
          >
            <StatusDot tone={c.tone} />
            <span className="text-ink-dim">{c.label}</span>
            <span className="num font-medium">{c.count}</span>
          </span>
        ))}
      </div>
      <TrendChart
        data={series}
        xKey="bucket"
        series={[{ key: 'availability', name: 'Availability %', color: PALETTE.blue, format: 'pct1' }]}
        height={180}
        yFormat="pct0"
        reference={{ y: 90, label: 'target 90%' }}
      />
    </Panel>
  )
}

async function SiteEnvPanel({ siteId }: { siteId: number }) {
  const f = { ...filterFromSearchParams(undefined), siteId }
  const [env, tailings] = await Promise.all([getEnvKpis(f), getTailingsLatest(f)])
  const dam = tailings.find((t) => t.siteId === siteId) ?? tailings[0]
  return (
    <Panel title="Environment snapshot" hint="current window · tailings latest reading">
      <KpiTile label="CO₂e intensity" value={env.co2eIntensity === null ? '—' : fmtNum(env.co2eIntensity, 2)} unit="kg/t" />
      <div className="mt-3">
        <Gauge
          value={dam?.level ?? null}
          limit={80}
          label={`Tailings dam level${dam ? ` · ${dam.site}` : ''}`}
          caption={dam ? `latest reading ${fmtDay(dam.date)} · threshold 80%` : 'no readings'}
        />
      </div>
    </Panel>
  )
}

async function SiteAlertsPanel({ siteId }: { siteId: number }) {
  const alerts = (await getActiveAlerts()).filter((a) => a.siteId === siteId)
  return (
    <Panel title="Site alerts" hint="rules scoped to this site">
      <div className="-m-4">
        <AlertFeed
          alerts={alerts}
          emptyTitle="No site-scoped breaches"
          emptyDescription="No alert rules scoped to this site are currently breaching."
        />
      </div>
    </Panel>
  )
}
