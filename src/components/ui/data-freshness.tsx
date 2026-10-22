/** DataFreshness — shows when data was last updated for a page/section. */
import { RefreshCw } from 'lucide-react'

interface FreshData {
  latestProductionDate: string | null
  latestEnvDate: string | null
  latestIncidentDate: string | null
  lastImport: { filename: string; createdAt: string; rowsOk: number; rowsFailed: number } | null
}

interface DataFreshnessProps {
  data: FreshData
  className?: string
}

export function DataFreshness({ data, className = '' }: DataFreshnessProps) {
  if (!data) return null

  return (
    <div className={`flex flex-wrap items-center gap-3 text-[11px] text-ink-dim ${className}`}>
      <div className="flex items-center gap-1.5">
        <RefreshCw className="size-3.5" />
        <span>Data through</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {data.latestProductionDate && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel-2">
            <span className="text-ink-dim/70">Production:</span>
            <span className="font-mono">{data.latestProductionDate}</span>
          </span>
        )}
        {data.latestEnvDate && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel-2">
            <span className="text-ink-dim/70">Environment:</span>
            <span className="font-mono">{data.latestEnvDate}</span>
          </span>
        )}
        {data.latestIncidentDate && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel-2">
            <span className="text-ink-dim/70">Safety:</span>
            <span className="font-mono">{data.latestIncidentDate}</span>
          </span>
        )}
      </div>
      {data.lastImport && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-panel-2 border border-line">
          <span className="text-ink-dim/70">Last import:</span>
          <span className="font-mono text-[10px]">{data.lastImport.filename}</span>
          <span className="text-ink-dim/60">({data.lastImport.rowsOk} ok / {data.lastImport.rowsFailed} failed)</span>
          <span className="text-ink-dim/50">{data.lastImport.createdAt}</span>
        </span>
      )}
    </div>
  )
}