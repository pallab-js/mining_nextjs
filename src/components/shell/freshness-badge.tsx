/** FreshnessBadge — newest data date + last import, from meta queries. */
import { Database, Upload } from 'lucide-react'
import { getFreshness } from '@/lib/queries/meta'
import { fmtDay, fmtTimestamp } from '@/lib/format'

export async function FreshnessBadge() {
  const fresh = await getFreshness()
  const latest = [fresh.latestProductionDate, fresh.latestEnvDate, fresh.latestIncidentDate]
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)
  return (
    <div className="hidden items-center gap-3 text-[11px] text-ink-dim md:flex">
      <span className="flex items-center gap-1.5" title="Newest record across all modules">
        <Database className="size-3.5" />
        {latest ? (
          <>
            data thru <span className="num text-ink">{fmtDay(latest)}</span>
          </>
        ) : (
          'no data — see Settings'
        )}
      </span>
      {fresh.lastImport && (
        <span
          className="flex items-center gap-1.5"
          title={`${fresh.lastImport.rowsOk} ok / ${fresh.lastImport.rowsFailed} failed — ${fmtTimestamp(fresh.lastImport.createdAt)}`}
        >
          <Upload className="size-3.5" />
          <span className="num max-w-32 truncate">{fresh.lastImport.filename}</span>
        </span>
      )}
    </div>
  )
}
