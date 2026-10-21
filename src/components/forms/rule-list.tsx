'use client'
/**
 * RuleList — alert-rule management for /settings (toggle + delete).
 */
import { useState, useTransition } from 'react'
import { deleteRule, toggleRule } from '@/lib/actions/alerts'
import { Badge } from '@/components/ui/status-dot'
import { toneFor } from '@/lib/tones'
import { METRICS } from '@/lib/metrics'

export interface RuleItem {
  id: number
  name: string
  metric: string
  comparator: string
  threshold: number
  severity: string
  siteCode: string | null
  active: boolean
}

function metricLabel(key: string): string {
  const m = METRICS[key as keyof typeof METRICS]
  return m?.label ?? key
}

export function RuleList({ rules }: { rules: RuleItem[] }) {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const run = (id: number, fn: (fd: FormData) => Promise<{ ok: boolean; message: string }>) => {
    const fd = new FormData()
    fd.set('id', String(id))
    setPendingId(id)
    setError(null)
    startTransition(async () => {
      const res = await fn(fd)
      setPendingId(null)
      if (!res.ok) setError(res.message)
    })
  }

  const remove = (id: number, name: string) => {
    if (!window.confirm(`Delete alert rule "${name}"?`)) return
    run(id, deleteRule)
  }

  if (rules.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-ink-dim">
        No alert rules yet — create one to start monitoring thresholds.
      </p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px]">{r.name}</span>
                <Badge tone={toneFor('severity', r.severity)}>{r.severity}</Badge>
                <Badge tone={r.active ? 'good' : 'idle'}>
                  {r.active ? 'active' : 'disabled'}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-dim">
                {metricLabel(r.metric)} {r.comparator} {r.threshold} ·{' '}
                {r.siteCode ? `site ${r.siteCode}` : 'all sites'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => run(r.id, toggleRule)}
                disabled={pendingId === r.id}
                className="focus-ring rounded-md border border-line bg-panel px-3 py-1.5 text-[11px] hover:border-ink-dim/50 disabled:opacity-50 min-h-[44px]"
              >
                {r.active ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                onClick={() => remove(r.id, r.name)}
                disabled={pendingId === r.id}
                className="focus-ring rounded-md border border-bad/40 bg-bad/10 px-3 py-1.5 text-[11px] text-bad hover:bg-bad/20 disabled:opacity-50 min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="border-t border-line px-4 py-2 text-[11px] text-bad">{error}</p>}
    </div>
  )
}
