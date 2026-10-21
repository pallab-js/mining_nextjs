/** Safety (HSE) — incident KPIs, trends, open list, days-since-LTI. */
import 'server-only'
import { connection, all, one, n, where, bucket, defaultGranularity } from './sql'
import { daysBetween } from '../metrics'
import { isoDay } from '../filter'
import type { Filter } from '../filter'

export interface SafetyTotals {
  incidents: number
  open: number
  closed: number
  lostTimeDays: number
  highAndCritical: number
  nearMisses: number
  /** most recent incident date with lost_time_days > 0 (any time, not range-scoped) */
  lastLtiDate: string | null
  daysSinceLti: number | null
}

export async function getSafetyTotals(f: Filter): Promise<SafetyTotals> {
  await connection()
  const w = where(f, { site: 'i.site_id', date: 'i.date' })
  const r = one<{
    incidents: number
    open: number
    closed: number
    ltd: number
    hc: number
    nm: number
  }>(
    `SELECT COUNT(*) AS incidents,
            SUM(CASE WHEN i.status = 'open' THEN 1 ELSE 0 END) AS open,
            SUM(CASE WHEN i.status = 'closed' THEN 1 ELSE 0 END) AS closed,
            COALESCE(SUM(i.lost_time_days), 0) AS ltd,
            SUM(CASE WHEN i.severity IN ('high','critical') THEN 1 ELSE 0 END) AS hc,
            SUM(CASE WHEN i.type = 'near-miss' THEN 1 ELSE 0 END) AS nm
       FROM safety_incidents i
      WHERE ${w.clause}`,
    w.params,
  )
  // days-since-LTI is a global state metric, independent of the range filter
  const lastLti = one<{ d: string | null }>(
    `SELECT MAX(date) AS d FROM safety_incidents WHERE lost_time_days > 0`,
  )?.d
  return {
    incidents: n(r?.incidents),
    open: n(r?.open),
    closed: n(r?.closed),
    lostTimeDays: n(r?.ltd),
    highAndCritical: n(r?.hc),
    nearMisses: n(r?.nm),
    lastLtiDate: lastLti ?? null,
    daysSinceLti: lastLti ? daysBetween(lastLti, isoDay(new Date())) : null,
  }
}

export interface IncidentByMonth {
  bucket: string
  low: number
  medium: number
  high: number
  critical: number
  total: number
}

export async function getIncidentsByMonth(f: Filter): Promise<IncidentByMonth[]> {
  await connection()
  const g = defaultGranularity(f) === 'day' ? 'month' : defaultGranularity(f)
  const w = where(f, { site: 'i.site_id', date: 'i.date' })
  return all<IncidentByMonth>(
    `SELECT ${bucket('i.date', g)} AS bucket,
            SUM(CASE WHEN i.severity = 'low' THEN 1 ELSE 0 END) AS low,
            SUM(CASE WHEN i.severity = 'medium' THEN 1 ELSE 0 END) AS medium,
            SUM(CASE WHEN i.severity = 'high' THEN 1 ELSE 0 END) AS high,
            SUM(CASE WHEN i.severity = 'critical' THEN 1 ELSE 0 END) AS critical,
            COUNT(*) AS total
       FROM safety_incidents i
      WHERE ${w.clause}
      GROUP BY bucket
      ORDER BY bucket`,
    w.params,
  )
}

export interface IncidentByType {
  type: string
  count: number
  lostTimeDays: number
}

export async function getIncidentsByType(f: Filter): Promise<IncidentByType[]> {
  await connection()
  const w = where(f, { site: 'i.site_id', date: 'i.date' })
  return all<IncidentByType>(
    `SELECT i.type, COUNT(*) AS count, COALESCE(SUM(i.lost_time_days), 0) AS lostTimeDays
       FROM safety_incidents i
      WHERE ${w.clause}
      GROUP BY i.type
      ORDER BY count DESC`,
    w.params,
  )
}

export interface IncidentRow {
  id: number
  site: string
  siteId: number
  date: string
  type: string
  severity: string
  description: string
  lostTimeDays: number
  reportedBy: string | null
  status: string
}

export async function listIncidents(
  f: Filter,
  opts: { status?: 'open' | 'closed'; limit?: number } = {},
): Promise<IncidentRow[]> {
  await connection()
  const w = where(f, { site: 'i.site_id', date: 'i.date' })
  const statusClause = opts.status ? ' AND i.status = ?' : ''
  const params = [...w.params]
  if (opts.status) params.push(opts.status)
  params.push(opts.limit ?? 50)
  return all<IncidentRow>(
    `SELECT i.id, s.code AS site, s.id AS siteId, i.date, i.type, i.severity,
            i.description, i.lost_time_days AS lostTimeDays, i.reported_by AS reportedBy, i.status
       FROM safety_incidents i
       JOIN sites s ON s.id = i.site_id
      WHERE ${w.clause}${statusClause}
      ORDER BY i.date DESC, i.id DESC
      LIMIT ?`,
    params,
  )
}
