/**
 * Date-range & site filter parsing — URL params are the single source of truth
 * (`?site=all|<id>&range=7d|30d|90d|180d|365d`).
 */
import { format, subDays } from 'date-fns'

export const RANGE_PRESETS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '365d': 365,
} as const
export type RangeKey = keyof typeof RANGE_PRESETS
export const DEFAULT_RANGE: RangeKey = '30d'

export interface Filter {
  /** null = all sites (portfolio view) */
  siteId: number | null
  /** inclusive ISO day, yyyy-MM-dd */
  from: string
  to: string
  range: RangeKey
}

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === 'string' && v in RANGE_PRESETS
}

export function isoDay(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Days-inclusive window ending today. */
export function resolveRange(range?: string | null): { range: RangeKey; from: string; to: string } {
  const key: RangeKey = isRangeKey(range) ? range : DEFAULT_RANGE
  const to = new Date()
  const from = subDays(to, RANGE_PRESETS[key] - 1)
  return { range: key, from: isoDay(from), to: isoDay(to) }
}

export function parseFilter(sp: { site?: string; range?: string } | undefined): Filter {
  const siteId = sp?.site && /^\d+$/.test(sp.site) ? Number(sp.site) : null
  const { range, from, to } = resolveRange(sp?.range)
  return { siteId, from, to, range }
}

/** Accepts raw Next `searchParams` (string | string[] | undefined values). */
export function filterFromSearchParams(
  sp: Record<string, string | string[] | undefined> | undefined,
): Filter {
  return parseFilter({
    site: typeof sp?.site === 'string' ? sp.site : undefined,
    range: typeof sp?.range === 'string' ? sp.range : undefined,
  })
}

/** Optional `?gran=day|week|month` override for series pages. */
export function granFrom(
  sp: Record<string, string | string[] | undefined> | undefined,
): 'day' | 'week' | 'month' | undefined {
  return sp?.gran === 'day' || sp?.gran === 'week' || sp?.gran === 'month' ? sp.gran : undefined
}

/** Equal-length period immediately before `f` (for Δ comparisons). */
export function previousPeriod(f: Filter): Filter {
  const days = RANGE_PRESETS[f.range]
  const to = subDays(new Date(f.from), 1)
  const from = subDays(to, days - 1)
  return { ...f, from: isoDay(from), to: isoDay(to) }
}

export function rangeLabel(f: Filter): string {
  return `last ${RANGE_PRESETS[f.range]} days`
}
