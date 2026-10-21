/**
 * Query-layer helpers: parameterised raw SQL over better-sqlite3 with the
 * standard filter scoping. Every query module calls `await connection()` first
 * (Next 16 Cache Components) so reads happen per-request, never at build time.
 */
import 'server-only'
import { connection } from 'next/server'
import { getSQLite } from '../db'
import type { Filter } from '../filter'

/** Prepare + fetch rows (positional params). */
export function all<T>(sql: string, params: readonly unknown[] = []): T[] {
  return getSQLite().prepare(sql).all(...(params as unknown[])) as T[]
}

/** Prepare + fetch first row. */
export function one<T>(sql: string, params: readonly unknown[] = []): T | undefined {
  return getSQLite().prepare(sql).get(...(params as unknown[])) as T | undefined
}

export function execute(sql: string, params: readonly unknown[] = []): void {
  getSQLite().prepare(sql).run(...(params as unknown[]))
}

/** WHERE fragment honouring site scope (null = all sites) + date range. */
export function where(
  f: Filter,
  cols: { site?: string; date?: string } = {},
): { clause: string; params: unknown[] } {
  const parts: string[] = []
  const params: unknown[] = []
  if (cols.site && f.siteId !== null) {
    parts.push(`${cols.site} = ?`)
    params.push(f.siteId)
  }
  if (cols.date) {
    parts.push(`${cols.date} BETWEEN ? AND ?`)
    params.push(f.from, f.to)
  }
  return { clause: parts.length > 0 ? parts.join(' AND ') : '1=1', params }
}

/** SQLite date bucket by granularity. */
export function bucket(dateCol: string, granularity: 'day' | 'week' | 'month'): string {
  switch (granularity) {
    case 'day':
      return `strftime('%Y-%m-%d', ${dateCol})`
    case 'week':
      return `strftime('%Y-W%W', ${dateCol})`
    case 'month':
      return `strftime('%Y-%m', ${dateCol})`
  }
}

/** Sensible default granularity per range (overridable in the UI). */
export function defaultGranularity(f: Filter): 'day' | 'week' | 'month' {
  if (f.range === '7d' || f.range === '30d') return 'day'
  if (f.range === '90d' || f.range === '180d') return 'week'
  return 'month'
}

/** Coerce SQLite SUM/NULL to a finite number (default 0). */
export function n(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** Coerce to nullable number (AVG over no rows → null → UI shows "—"). */
export function nn(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export { connection }
