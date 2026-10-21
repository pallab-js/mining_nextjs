/** CSV import — wizard lands in M8; shell page for now. */
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata = { title: 'Import — COMC' }

export default function ImportPage() {
  return (
    <>
      <PageHeader title="CSV Import" subtitle="bulk-load production, equipment events, incidents, readings, stockpiles, shipments" />
      <div className="rounded-lg border border-line bg-panel">
        <EmptyState
          icon={<Upload className="size-6" />}
          title="Import wizard coming in M8"
          description="Template downloads, drag-and-drop validation, error report, and upsert-on-natural-key commits."
        />
      </div>
    </>
  )
}
