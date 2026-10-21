/** Safety (HSE) — KPIs, severity/type charts, incident list. */
import { Suspense } from 'react'
import { connection } from 'next/server'
import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { DataTable, type Column } from '@/components/ui/data-table'
import { viewRows } from '@/lib/view-rows'
import { EmptyState } from '@/components/ui/empty-state'
import { BarTrend, PALETTE } from '@/components/charts'
import { ActionForm } from '@/components/forms/action-form'
import { FormDialog } from '@/components/forms/form-dialog'
import { OpenIncidentList } from '@/components/forms/open-incidents'
import { createIncident } from '@/lib/actions/safety'
import { incidentFields } from '@/lib/field-specs'
import { filterFromSearchParams, rangeLabel } from '@/lib/filter'
import {
  getIncidentsByMonth,
  getIncidentsByType,
  getSafetyTotals,
  listIncidents,
} from '@/lib/queries/safety'
import { getSiteOptions } from '@/lib/queries/sites'
import { fmtDay, fmtInt } from '@/lib/format'
import type { SearchParams } from '@/lib/web'

export const metadata = { title: 'Safety — COMC' }

const SEVERITY_COLORS: Record<string, string> = {
  low: PALETTE.inkDim,
  medium: PALETTE.signal,
  high: '#fb7185',
  critical: PALETTE.bad,
}

export default function SafetyPage({ searchParams }: { searchParams: SearchParams }) {
  return <SafetyContent sp={searchParams} />
}

async function SafetyContent({ sp }: { sp: SearchParams }) {
  await connection()
  const f = filterFromSearchParams(await sp)
  const sites = await getSiteOptions()
  const scopedSite = sites.find((s) => s.id === f.siteId)?.code
  return (
    <>
      <PageHeader
        title="Safety (HSE)"
        subtitle={`${rangeLabel(f)} · ${f.from} → ${f.to}`}
        actions={
          <FormDialog
            label="＋ Log incident"
            title="Log incident"
            description="Record an injury, near miss, spill or event."
          >
            <ActionForm
              action={createIncident}
              fields={incidentFields(sites, scopedSite)}
              submitLabel="Log incident"
            />
          </FormDialog>
        }
      />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={6} />}>
          <SafetyKpis sp={sp} />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Suspense fallback={<ChartSkeleton label="Loading incident trend" />}>
              <IncidentTrend sp={sp} />
            </Suspense>
          </div>
          <Suspense fallback={<ChartSkeleton label="Loading incident types" />}>
            <IncidentTypes sp={sp} />
          </Suspense>
        </div>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <OpenIncidentsPanel sp={sp} />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <IncidentList sp={sp} />
        </Suspense>
      </div>
    </>
  )
}

async function SafetyKpis({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const t = await getSafetyTotals(f)
  const ltiTone = t.daysSinceLti === null ? 'neutral' : t.daysSinceLti >= 90 ? 'good' : t.daysSinceLti >= 30 ? 'warn' : 'bad'
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <KpiTile label="Incidents" value={fmtInt(t.incidents)} />
      <KpiTile
        label="Open"
        value={fmtInt(t.open)}
        tone={t.open > 0 ? 'bad' : 'good'}
      />
      <KpiTile label="High + critical" value={fmtInt(t.highAndCritical)} tone={t.highAndCritical > 0 ? 'warn' : 'neutral'} />
      <KpiTile label="Near misses" value={fmtInt(t.nearMisses)} hint="reported, no injury" />
      <KpiTile label="Lost-time days" value={fmtInt(t.lostTimeDays)} unit="d" upIsGood={false} />
      <KpiTile
        label="Days since LTI"
        value={t.daysSinceLti === null ? '—' : fmtInt(t.daysSinceLti)}
        unit="d"
        tone={ltiTone}
        hint={t.lastLtiDate ? `last: ${fmtDay(t.lastLtiDate)}` : 'no LTI on record'}
      />
    </div>
  )
}

async function IncidentTrend({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const data = await getIncidentsByMonth(f)
  return (
    <Panel title="Incidents by month" hint="stacked by severity">
      {data.length === 0 ? (
        <EmptyState compact icon={<ShieldCheck className="size-6" />} title="No incidents in range" />
      ) : (
        <BarTrend
          data={data}
          xKey="bucket"
          stacked
          bars={['critical', 'high', 'medium', 'low'].map((s) => ({
            key: s,
            name: s.charAt(0).toUpperCase() + s.slice(1),
            color: SEVERITY_COLORS[s],
            format: 'int' as const,
          }))}
          yFormat="int"
        />
      )}
    </Panel>
  )
}

async function IncidentTypes({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const data = await getIncidentsByType(f)
  return (
    <Panel title="By type" hint={rangeLabel(f)}>
      {data.length === 0 ? (
        <EmptyState compact title="No incidents in range" />
      ) : (
        <BarTrend
          data={data}
          xKey="type"
          bars={[{ key: 'count', name: 'Incidents', color: PALETTE.signal, format: 'int' }]}
          horizontal
          height={Math.max(180, data.length * 30)}
        />
      )}
    </Panel>
  )
}

async function OpenIncidentsPanel({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const open = await listIncidents(f, { status: 'open', limit: 25 })
  if (open.length === 0) return null
  return (
    <Panel title="Open incidents" hint={`${open.length} awaiting action`} flush>
      <OpenIncidentList
        incidents={open.map((i) => ({
          id: i.id,
          site: i.site,
          date: i.date,
          type: i.type,
          severity: i.severity,
          description: i.description,
          lostTimeDays: i.lostTimeDays,
        }))}
      />
    </Panel>
  )
}

async function IncidentList({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const rows = await listIncidents(f, { limit: 100 })
  const columns: Column[] = [
    { key: 'date', header: 'Date', kind: 'mono' },
    { key: 'site', header: 'Site', kind: 'mono' },
    { key: 'type', header: 'Type' },
    { key: 'severity', header: 'Severity', kind: 'badge', toneKind: 'severity', sortable: false },
    { key: 'description', header: 'Description', kind: 'dim', sortable: false },
    { key: 'lostTimeDays', header: 'LTI days', align: 'right', kind: 'num', fmt: 'int' },
    { key: 'reportedBy', header: 'Reported by', kind: 'dim' },
    { key: 'status', header: 'Status', kind: 'badge', toneKind: 'incident' },
  ]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Incident register</h2>
        <span className="text-[11px] text-ink-dim">{rows.length} incidents</span>
      </div>
      <DataTable
        columns={columns}
        rows={viewRows(rows)}
        pageSize={20}
        dense
        emptyState={
          <EmptyState
            compact
            icon={<ShieldCheck className="size-6" />}
            title="No incidents in range"
            description="A clean register — widen the range or import historical records."
          />
        }
      />
    </div>
  )
}
