/** CSV import — entity picker, template download, validation report, batch history. */
import { Suspense } from 'react'
import { History, Upload } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/ui/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeletons'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/status-dot'
import { ImportWizard } from '@/components/import/import-wizard'
import { viewRows } from '@/lib/view-rows'
import { listImportBatches } from '@/lib/queries/meta'
import { fmtInt } from '@/lib/format'

export const metadata = { title: 'Import — COMC' }

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="CSV Import"
        subtitle="bulk-load production, equipment events, incidents, readings and shipments"
      />
      <div className="space-y-4">
        <Panel title="Import wizard" hint="validate first, then commit">
          <div className="p-4">
            <ImportWizard />
          </div>
        </Panel>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <BatchHistory />
        </Suspense>
      </div>
    </>
  )
}

interface BatchRow extends Record<string, unknown> {
  id: number
  entity: string
  filename: string
  rowsOk: number
  rowsFailed: number
  createdAt: string
}

const COLUMNS: Column[] = [
  { key: 'id', header: '#', kind: 'mono', align: 'right', width: '56px' },
  { key: 'entity', header: 'Entity', kind: 'text' },
  { key: 'filename', header: 'File', kind: 'dim' },
  { key: 'rowsOk', header: 'Imported', kind: 'num', fmt: 'int', align: 'right' },
  { key: 'rowsFailed', header: 'Rejected', kind: 'num', fmt: 'int', align: 'right' },
  { key: 'createdAt', header: 'When', kind: 'date' },
]

async function BatchHistory() {
  const batches = await listImportBatches(15)
  const rows: BatchRow[] = batches.map((b) => ({
    id: b.id,
    entity: b.entity.replace('_', ' '),
    filename: b.filename,
    rowsOk: b.rowsOk,
    rowsFailed: b.rowsFailed,
    createdAt: b.createdAt,
  }))
  const failed = rows.reduce((sum, r) => sum + r.rowsFailed, 0)

  return (
    <Panel
      title="Import history"
      hint={
        rows.length === 0
          ? 'no imports yet'
          : `${rows.length} batch${rows.length === 1 ? '' : 'es'} · ${fmtInt(failed)} rejected rows`
      }
      actions={
        rows.length > 0 ? (
          <Badge tone={failed > 0 ? 'warn' : 'good'}>
            <History className="size-3" />
            {rows.length} recorded
          </Badge>
        ) : null
      }
      flush
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<Upload className="size-6" />}
          title="No imports yet"
          description="Every committed batch is recorded here with its row counts and validation errors."
        />
      ) : (
        <DataTable columns={COLUMNS} rows={viewRows(rows)} />
      )}
    </Panel>
  )
}
