'use client'
/**
 * Top-bar filters — the URL is the state (`?site=<id>&range=<key>`).
 * Both selects rewrite the query string and let the page Suspense boundaries
 * re-pull fresh data (Cache Components: every query awaits connection()).
 */
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { type RangeKey } from '@/lib/filter'

export interface SiteOption {
  id: number
  code: string
  name: string
}

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '180d': '180 days',
  '365d': '365 days',
}

export function SiteSelect({ sites }: { sites: SiteOption[] }) {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const current = sp.get('site') ?? 'all'

  const onChange = useCallback(
    (v: string) => {
      const params = new URLSearchParams(sp.toString())
      if (v === 'all') params.delete('site')
      else params.set('site', v)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [sp, router, pathname],
  )

  return (
    <label className="focus-ring flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-[12px]">
      <MapPin className="size-3.5 text-ink-dim" aria-hidden />
      <span className="sr-only">Site filter</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring cursor-pointer bg-transparent text-ink outline-none"
      >
        <option value="all">All sites</option>
        {sites.map((s) => (
          <option key={s.id} value={String(s.id)}>
            {s.code} — {s.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function RangeSelect() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const current = sp.get('range') ?? '30d'

  const onChange = useCallback(
    (v: string) => {
      const params = new URLSearchParams(sp.toString())
      if (v === '30d') params.delete('range')
      else params.set('range', v)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [sp, router, pathname],
  )

  return (
    <label className="focus-ring flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-[12px]">
      <CalendarDays className="size-3.5 text-ink-dim" aria-hidden />
      <span className="sr-only">Date range</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring cursor-pointer bg-transparent text-ink outline-none"
      >
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
          <option key={k} value={k}>
            Last {RANGE_LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  )
}
