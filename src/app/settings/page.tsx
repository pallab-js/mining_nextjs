/** Settings — alert rules CRUD, reseed/reset, diagnostics land in M8. */
import { Suspense } from 'react'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { FreshnessBadge } from '@/components/shell/freshness-badge'

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
      <div className="rounded-lg border border-line bg-panel">
        <EmptyState
          icon={<Settings className="size-6" />}
          title="Administration coming in M8"
          description="Alert-rule CRUD, seed/reset controls, DB diagnostics, and export."
        />
      </div>
    </>
  )
}
