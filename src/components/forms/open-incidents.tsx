'use client'
/**
 * OpenIncidentList — open-incident list with an inline Close action.
 * Satisfies F-SAFE-2 (open-incident list) and F-SAFE-3 (close incident).
 */
import { useState, useTransition } from 'react'
import { closeIncident } from '@/lib/actions/safety'
import { Badge } from '@/components/ui/status-dot'
import { toneFor } from '@/lib/tones'

export interface OpenIncident {
  id: number
  site: string
  date: string
  type: string
  severity: string
  description: string
  lostTimeDays: number
}

export function OpenIncidentList({ incidents }: { incidents: OpenIncident[] }) {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const close = (id: number) => {
    const fd = new FormData()
    fd.set('id', String(id))
    setPendingId(id)
    setError(null)
    startTransition(async () => {
      const res = await closeIncident(fd)
      setPendingId(null)
      if (!res.ok) setError(res.message)
    })
  }

  if (incidents.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-ink-dim">
        No open incidents — nothing to action.
      </p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {incidents.map((inc) => (
          <li key={inc.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11.5px] text-ink-dim">{inc.date}</span>
                <span className="text-[12.5px]">{inc.site}</span>
                <span className="text-[11.5px] text-ink-dim">{inc.type}</span>
                <Badge tone={toneFor('severity', inc.severity)}>{inc.severity}</Badge>
                {inc.lostTimeDays > 0 && (
                  <Badge tone="bad">{inc.lostTimeDays} lost-time d</Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-dim">{inc.description}</p>
            </div>
            <button
              type="button"
              onClick={() => close(inc.id)}
              disabled={pendingId === inc.id}
              className="focus-ring shrink-0 rounded-md border border-line bg-panel px-2 py-1 text-[11px] hover:border-ink-dim/50 disabled:opacity-50"
            >
              {pendingId === inc.id ? 'Closing…' : 'Close'}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="border-t border-line px-4 py-2 text-[11px] text-bad">{error}</p>
      )}
    </div>
  )
}
