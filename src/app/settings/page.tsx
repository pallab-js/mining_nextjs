/** Settings — alert-rule CRUD, data management, diagnostics. */
import { Suspense } from 'react'
import Link from 'next/link'
import { Database, Download, Share2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/ui/panel'
import { Badge } from '@/components/ui/status-dot'
import { TableSkeleton } from '@/components/ui/skeletons'
import { FreshnessBadge } from '@/components/shell/freshness-badge'
import { ActionForm } from '@/components/forms/action-form'
import { FormDialog } from '@/components/forms/form-dialog'
import { RuleList } from '@/components/forms/rule-list'
import { DataAdmin } from '@/components/forms/data-admin'
import { createRule } from '@/lib/actions/alerts'
import { alertRuleFields } from '@/lib/field-specs'
import { getAlertRules } from '@/lib/queries/alerts'
import { getFreshness } from '@/lib/queries/meta'
import { getSiteOptions } from '@/lib/queries/sites'
import { fmtInt } from '@/lib/format'

export const metadata = { title: 'Settings — COMC' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings & Administration"
        subtitle="alert rules, data management, diagnostics"
        actions={
          <div className="rounded-md border border-line bg-panel px-2 py-1">
            <Suspense fallback={<span className="text-[11px] text-ink-dim">…</span>}>
              <FreshnessBadge />
            </Suspense>
          </div>
        }
      />
      <div className="space-y-4">
        <Suspense fallback={<TableSkeleton rows={4} />}>
          <RulesSection />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <DataSection />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <DiagnosticsSection />
        </Suspense>
      </div>
    </>
  )
}

async function RulesSection() {
  const [rules, sites] = await Promise.all([getAlertRules(), getSiteOptions()])
  return (
    <Panel
      title="Alert rules"
      hint={`${rules.filter((r) => r.active).length} active of ${rules.length}`}
      actions={
        <FormDialog
          label="＋ New rule"
          title="Create alert rule"
          description="Fire when a metric crosses a threshold."
        >
          <ActionForm action={createRule} fields={alertRuleFields(sites)} submitLabel="Create rule" />
        </FormDialog>
      }
      flush
    >
      <RuleList
        rules={rules.map((r) => ({
          id: r.id,
          name: r.name,
          metric: r.metric,
          comparator: r.comparator,
          threshold: r.threshold,
          severity: r.severity,
          siteCode: r.siteCode,
          active: r.active,
        }))}
      />
    </Panel>
  )
}

async function DataSection() {
  return (
    <>
      <Panel title="Data management" hint="reseed · reset · export" flush>
        <DataAdmin />
      </Panel>
      <ExportPanel />
    </>
  )
}

function ExportPanel() {
  return (
    <Panel title="Backup & transfer" hint="one JSON file, every table" flush>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[12.5px]">Export the whole database</p>
          <p className="mt-0.5 text-[11px] text-ink-dim">
            Sites, fleet, production, events, incidents, environment, stockpiles, shipments, rules
            and import history as a single JSON attachment.
          </p>
        </div>
        <a
          href="/api/export"
          className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-[12px] hover:border-ink-dim/50"
        >
          <Download className="size-3.5" />
          Download JSON
        </a>
      </div>
    </Panel>
  )
}

async function DiagnosticsSection() {
  const [fresh, rules] = await Promise.all([getFreshness(), getAlertRules()])
  const last = fresh.lastImport

  return (
    <Panel title="Diagnostics" hint="data freshness & last import">
      <div className="space-y-3">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-panel-2/30 px-3 py-2">
            <dt className="text-[10.5px] tracking-wide text-ink-dim uppercase">Production thru</dt>
            <dd className="num mt-0.5 text-[13px]">{fresh.latestProductionDate ?? '—'}</dd>
          </div>
          <div className="rounded-md border border-line bg-panel-2/30 px-3 py-2">
            <dt className="text-[10.5px] tracking-wide text-ink-dim uppercase">Environment thru</dt>
            <dd className="num mt-0.5 text-[13px]">{fresh.latestEnvDate ?? '—'}</dd>
          </div>
          <div className="rounded-md border border-line bg-panel-2/30 px-3 py-2">
            <dt className="text-[10.5px] tracking-wide text-ink-dim uppercase">Safety thru</dt>
            <dd className="num mt-0.5 text-[13px]">{fresh.latestIncidentDate ?? '—'}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-panel-2/30 px-3 py-2">
          <Database className="size-4 text-ink-dim" />
          {last ? (
            <>
              <span className="text-[12px]">
                Last import: <span className="font-mono text-[11.5px]">{last.filename}</span> (
                {last.entity.replace('_', ' ')})
              </span>
              <Badge tone={last.rowsFailed > 0 ? 'warn' : 'good'}>
                {fmtInt(last.rowsOk)} ok · {fmtInt(last.rowsFailed)} rejected
              </Badge>
              <span className="num text-[11px] text-ink-dim">{last.createdAt}</span>
            </>
          ) : (
            <span className="text-[12px] text-ink-dim">
              No CSV import yet —{' '}
              <Link href="/import" className="underline hover:text-ink">
                run the import wizard
              </Link>
              .
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-panel-2/30 px-3 py-2">
          <Share2 className="size-4 text-ink-dim" />
          <span className="text-[12px]">
            {rules.length} alert rule{rules.length === 1 ? '' : 's'} configured
          </span>
          <Link href="/import" className="text-[11.5px] underline hover:text-ink">
            CSV import & history →
          </Link>
        </div>
      </div>
    </Panel>
  )
}
