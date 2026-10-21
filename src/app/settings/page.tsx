/** Settings — alert-rule CRUD (M7); data management, reseed/reset land in M8. */
import { Suspense } from 'react'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { FreshnessBadge } from '@/components/shell/freshness-badge'
import { ActionForm } from '@/components/forms/action-form'
import { FormDialog } from '@/components/forms/form-dialog'
import { RuleList } from '@/components/forms/rule-list'
import { createRule } from '@/lib/actions/alerts'
import { alertRuleFields } from '@/lib/field-specs'
import { getAlertRules } from '@/lib/queries/alerts'
import { getSiteOptions } from '@/lib/queries/sites'

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
        <Suspense fallback={<div className="h-40 rounded-lg border border-line bg-panel" />}>
          <RulesSection />
        </Suspense>
        <div className="rounded-lg border border-line bg-panel">
          <EmptyState
            icon={<Settings className="size-6" />}
            title="Data management coming in M8"
            description="Reseed, reset, JSON export, import history and DB diagnostics."
          />
        </div>
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
          <ActionForm
            action={createRule}
            fields={alertRuleFields(sites)}
            submitLabel="Create rule"
          />
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
