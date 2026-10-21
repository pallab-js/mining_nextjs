/** AlertFeed — active threshold breaches, critical first. Server component. */
import { ShieldAlert } from 'lucide-react'
import type { ActiveAlert } from '@/lib/alerts'
import { Badge, StatusDot, type DotTone } from '@/components/ui/status-dot'
import { EmptyState } from '@/components/ui/empty-state'
import { fmtNum } from '@/lib/format'

const SEV_TONE: Record<string, DotTone> = {
  critical: 'bad',
  high: 'bad',
  medium: 'warn',
  low: 'idle',
}

const SEV_ORDER = ['critical', 'high', 'medium', 'low']

export function AlertFeed({
  alerts,
  siteCodes = {},
  emptyTitle = 'All metrics within limits',
  emptyDescription = 'No active alert rules are breaching in the fixed 30-day evaluation window.',
}: {
  alerts: ActiveAlert[]
  siteCodes?: Record<number, string>
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        compact
        icon={<ShieldAlert className="size-6" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }
  const sorted = [...alerts].sort(
    (a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity),
  )
  return (
    <ul className="divide-y divide-line/60">
      {sorted.map((a) => (
        <li key={`${a.ruleId}-${a.siteId ?? 'global'}`} className="flex items-center gap-3 px-4 py-2.5">
          <StatusDot tone={SEV_TONE[a.severity] ?? 'idle'} pulse={a.severity === 'critical'} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[12.5px] text-ink">{a.name}</span>
              <Badge tone={SEV_TONE[a.severity] ?? 'idle'}>{a.severity}</Badge>
            </div>
            <div className="num mt-0.5 text-[11px] text-ink-dim">
              {a.metricLabel} {a.comparator} {fmtNum(a.threshold, 1)}
              {a.unit} · now{' '}
              <span className="text-bad">
                {a.currentValue === null ? '—' : `${fmtNum(a.currentValue, 1)}${a.unit}`}
              </span>
              {a.siteId !== null && siteCodes[a.siteId] && (
                <> · {siteCodes[a.siteId]}</>
              )}
              {a.siteId === null && <> · portfolio</>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
