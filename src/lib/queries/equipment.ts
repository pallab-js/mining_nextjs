/** Equipment / fleet — status board, availability, Pareto, heatmaps, roster. */
import 'server-only'
import { format, subDays } from 'date-fns'
import { connection, all, one, n, where, bucket, defaultGranularity } from './sql'
import type { Filter } from '../filter'

/* --------------------------------------------------------------- totals */

export interface AvailabilityTotals {
  running: number
  downtime: number
  planned: number
  availability: number | null
  utilization: number | null
  fuel: number
}

/** Σ running / downtime / planned over the filtered window. */
export async function getAvailabilityTotals(f: Filter): Promise<AvailabilityTotals> {
  await connection()
  const w = where(f, { site: 'e.site_id', date: 'v.date' })
  const r = one<{ running: number; downtime: number; fuel: number; rows: number }>(
    `SELECT COALESCE(SUM(v.running_hours), 0) AS running,
            COALESCE(SUM(v.downtime_hours), 0) AS downtime,
            COALESCE(SUM(v.fuel_litres), 0) AS fuel,
            COUNT(*) AS rows
       FROM equipment_events v
       JOIN equipment e ON e.id = v.equipment_id
      WHERE ${w.clause}`,
    w.params,
  )
  const running = n(r?.running)
  const downtime = n(r?.downtime)
  const planned = n(r?.rows) * 24
  const total = running + downtime
  return {
    running,
    downtime,
    planned,
    availability: total > 0 ? (100 * running) / total : null,
    utilization: planned > 0 ? (100 * running) / planned : null,
    fuel: n(r?.fuel),
  }
}

/* --------------------------------------------------------------- series */

export interface AvailabilityPoint {
  bucket: string
  running: number
  downtime: number
  /** units × days with an event row in this bucket */
  unitDays: number
  availability: number | null
  utilization: number | null
}

export async function getAvailabilitySeries(
  f: Filter,
  granularity?: 'day' | 'week' | 'month',
): Promise<AvailabilityPoint[]> {
  await connection()
  const g = granularity ?? defaultGranularity(f)
  const w = where(f, { site: 'e.site_id', date: 'v.date' })
  const rows = all<{
    bucket: string
    running: number
    downtime: number
    unit_days: number
  }>(
    `SELECT ${bucket('v.date', g)} AS bucket,
            SUM(v.running_hours) AS running,
            SUM(v.downtime_hours) AS downtime,
            COUNT(*) AS unit_days
       FROM equipment_events v
       JOIN equipment e ON e.id = v.equipment_id
      WHERE ${w.clause}
      GROUP BY bucket
      ORDER BY bucket`,
    w.params,
  )
  return rows.map((r) => {
    const running = n(r.running)
    const total = running + n(r.downtime)
    const planned = n(r.unit_days) * 24
    return {
      bucket: r.bucket,
      running,
      downtime: n(r.downtime),
      unitDays: n(r.unit_days),
      availability: total > 0 ? (100 * running) / total : null,
      utilization: planned > 0 ? (100 * running) / planned : null,
    }
  })
}

/* -------------------------------------------------------------- pareto */

export interface DowntimeReason {
  reason: string
  hours: number
  events: number
}

/** Downtime hours grouped by reason, descending (Pareto). */
export async function getDowntimePareto(f: Filter, limit = 10): Promise<DowntimeReason[]> {
  await connection()
  const w = where(f, { site: 'e.site_id', date: 'v.date' })
  return all<DowntimeReason>(
    `SELECT v.downtime_reason AS reason,
            SUM(v.downtime_hours) AS hours,
            COUNT(*) AS events
       FROM equipment_events v
       JOIN equipment e ON e.id = v.equipment_id
      WHERE ${w.clause}
        AND v.downtime_reason IS NOT NULL
        AND v.downtime_reason <> ''
        AND v.downtime_hours > 0
      GROUP BY v.downtime_reason
      ORDER BY hours DESC
      LIMIT ?`,
    [...w.params, limit],
  )
}

/* ------------------------------------------------------------ matrices */

export interface SiteAvailabilityMatrix {
  sites: string[]
  dates: string[]
  /** [siteCode][date] → availability % (null = no data) */
  cells: (number | null)[][]
}

/** Availability heatmap: site × day (last `days` days ending on f.to). */
export async function getSiteAvailabilityMatrix(f: Filter, days = 14): Promise<SiteAvailabilityMatrix> {
  await connection()
  const span = Math.min(Math.max(days, 1), 31)
  const end = new Date(`${f.to}T00:00:00`)
  const dates = Array.from({ length: span }, (_, i) => format(subDays(end, span - 1 - i), 'yyyy-MM-dd'))
  const from = dates[0]

  const siteRows = all<{ code: string }>(
    `SELECT code FROM sites ${f.siteId !== null ? 'WHERE id = ?' : ''} ORDER BY code`,
    f.siteId !== null ? [f.siteId] : [],
  )
  const sites = siteRows.map((r) => r.code)

  const rows = all<{ code: string; d: string; running: number; downtime: number }>(
    `SELECT s.code, v.date AS d,
            SUM(v.running_hours) AS running,
            SUM(v.downtime_hours) AS downtime
       FROM equipment_events v
       JOIN equipment e ON e.id = v.equipment_id
       JOIN sites s ON s.id = e.site_id
      WHERE v.date BETWEEN ? AND ? ${f.siteId !== null ? 'AND e.site_id = ?' : ''}
      GROUP BY s.code, v.date`,
    [from, f.to, ...(f.siteId !== null ? [f.siteId] : [])],
  )
  const lookup = new Map<string, number | null>()
  for (const r of rows) {
    const total = r.running + r.downtime
    lookup.set(`${r.code}:${r.d}`, total > 0 ? (100 * r.running) / total : null)
  }
  const cells = sites.map((code) =>
    dates.map((d) => {
      const v = lookup.get(`${code}:${d}`)
      return v === undefined ? null : v
    }),
  )
  return { sites, dates, cells }
}

export interface UnitUtilizationMatrix {
  units: { code: string; name: string; status: string; site: string }[]
  dates: string[]
  /** [unitCode][date] → utilization % running/24 (null = no event row) */
  cells: (number | null)[][]
}

/** Utilization heatmap: unit × day for the roster (last `days` days). */
export async function getUnitUtilizationMatrix(f: Filter, days = 14): Promise<UnitUtilizationMatrix> {
  await connection()
  const span = Math.min(Math.max(days, 1), 31)
  const end = new Date(`${f.to}T00:00:00`)
  const dates = Array.from({ length: span }, (_, i) => format(subDays(end, span - 1 - i), 'yyyy-MM-dd'))
  const from = dates[0]

  const units = all<{ code: string; name: string; status: string; site: string }>(
    `SELECT e.code, e.name, e.status, s.code AS site
       FROM equipment e JOIN sites s ON s.id = e.site_id
      ${f.siteId !== null ? 'WHERE e.site_id = ?' : ''}
      ORDER BY e.code`,
    f.siteId !== null ? [f.siteId] : [],
  )

  const rows = all<{ code: string; d: string; running: number }>(
    `SELECT e.code, v.date AS d, SUM(v.running_hours) AS running
       FROM equipment_events v
       JOIN equipment e ON e.id = v.equipment_id
      WHERE v.date BETWEEN ? AND ? ${f.siteId !== null ? 'AND e.site_id = ?' : ''}
      GROUP BY e.code, v.date`,
    [from, f.to, ...(f.siteId !== null ? [f.siteId] : [])],
  )
  const lookup = new Map<string, number>()
  for (const r of rows) lookup.set(`${r.code}:${r.d}`, (100 * r.running) / 24)

  const cells = units.map((u) => dates.map((d) => lookup.get(`${u.code}:${d}`) ?? null))
  return { units, dates, cells }
}

/* --------------------------------------------------------------- roster */

export interface RosterRow {
  id: number
  code: string
  name: string
  type: string
  status: string
  site: string
  siteId: number
  manufacturer: string | null
  model: string | null
  running: number
  downtime: number
  availability: number | null
  fuel: number
  lastEvent: string | null
}

/** Fleet roster with per-unit stats for the filtered window. */
export async function getRoster(f: Filter): Promise<RosterRow[]> {
  await connection()
  const rows = all<RosterRow>(
    `SELECT e.id, e.code, e.name, e.type, e.status, s.code AS site, s.id AS siteId,
            e.manufacturer, e.model,
            COALESCE(SUM(v.running_hours), 0) AS running,
            COALESCE(SUM(v.downtime_hours), 0) AS downtime,
            COALESCE(SUM(v.fuel_litres), 0) AS fuel,
            MAX(v.date) AS lastEvent
       FROM equipment e
       JOIN sites s ON s.id = e.site_id
       LEFT JOIN equipment_events v ON v.equipment_id = e.id AND v.date BETWEEN ? AND ?
      WHERE (? IS NULL OR e.site_id = ?)
      GROUP BY e.id
      ORDER BY e.code`,
    [f.from, f.to, f.siteId, f.siteId],
  )
  return rows.map((r) => ({
    ...r,
    availability: r.running + r.downtime > 0 ? (100 * r.running) / (r.running + r.downtime) : null,
  }))
}

/* ------------------------------------------------------ status board */

export interface FleetStatusCounts {
  operational: number
  standby: number
  maintenance: number
  down: number
  total: number
}

export async function getFleetStatusCounts(f: Filter): Promise<FleetStatusCounts> {
  await connection()
  const rows = all<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count FROM equipment
      ${f.siteId !== null ? 'WHERE site_id = ?' : ''}
      GROUP BY status`,
    f.siteId !== null ? [f.siteId] : [],
  )
  const out: FleetStatusCounts = { operational: 0, standby: 0, maintenance: 0, down: 0, total: 0 }
  for (const r of rows) {
    if (r.status in out) out[r.status as keyof FleetStatusCounts] = r.count
    out.total += r.count
  }
  return out
}

/* ----------------------------------------------------------- lookups */

export interface EquipmentOption {
  id: number
  code: string
  name: string
}

export async function getEquipmentOptions(siteId?: number | null): Promise<EquipmentOption[]> {
  await connection()
  return all<EquipmentOption>(
    `SELECT id, code, name FROM equipment
      ${siteId ? 'WHERE site_id = ?' : ''}
      ORDER BY code`,
    siteId ? [siteId] : [],
  )
}

/** CODE (upper) + NAME (lower) → id, for CSV import resolution. */
export async function equipmentResolveMap(): Promise<Map<string, number>> {
  await connection()
  const map = new Map<string, number>()
  for (const r of all<{ id: number; code: string; name: string }>(
    `SELECT id, code, name FROM equipment`,
  )) {
    map.set(r.code.toUpperCase(), r.id)
    map.set(r.name.toLowerCase(), r.id)
  }
  return map
}

/** Latest event date per unit (roster freshness). */
export async function getFleetLatestEventDate(): Promise<string | null> {
  await connection()
  return one<{ d: string | null }>(`SELECT MAX(date) AS d FROM equipment_events`)?.d ?? null
}
