/** AlertFeed — active threshold breaches, critical first. Server component. */
import { ShieldAlert, AlertTriangle, AlertCircle } from 'lucide-react'
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

const SEV_ICON: Record<string, typeof ShieldAlert> = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: ShieldAlert,
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
    <ul className="divide-y divide-line/60" role="list" aria-live="polite" aria-label="Active alerts">
      {sorted.map((a) => {
        const Icon = SEV_ICON[a.severity] ?? ShieldAlert
        const tone = SEV_TONE[a.severity] ?? 'idle'
        return (
          <li key={`${a.ruleId}-${a.siteId ?? 'global'}`} className="flex items-start gap-3 px-4 py-3 group">
            <StatusDot tone={tone} pulse={a.severity === 'critical'} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Icon className={`size-3.5 shrink-0 ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink-dim'}`} aria-hidden />
                <span className="truncate text-[12.5px] font-medium text-ink">{a.name}</span>
                <Badge tone={tone}>{a.severity}</Badge>
              </div>
              <div className="num mt-1 text-[11px] text-ink-dim flex flex-wrap gap-2 items-center">
                <span className="truncate">
                  {a.metricLabel} {a.comparator} {fmtNum(a.threshold, 1)}{a.unit}
                </span>
                <span className="text-bad font-mono whitespace-nowrap">
                  {a.currentValue === null ? '—' : `${fmtNum(a.currentValue, 1)}${a.unit}`}
                </span>
                {a.siteId !== null && siteCodes[a.siteId] && (
                  <span className="text-ink-dim/70">{siteCodes[a.siteId]}</span>
                )}
                {a.siteId === null && <span className="text-ink-dim/70">portfolio</span>}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
