/** Sites & mines — portfolio list, detail, form options. */
import 'server-only'
import { connection, all, one, n, where } from './sql'
import type { Filter } from '../filter'

export interface SiteListItem {
  id: number
  code: string
  name: string
  mineral: string
  region: string
  mineType: string
  status: string
  capacityTpd: number
  lat: number | null
  lon: number | null
  openedDate: string | null
  description: string | null
  /** ore moved on the most recent production day (null when unseeded) */
  latestOreTpd: number | null
  latestDate: string | null
  units: number
  unitsDown: number
  openIncidents: number
}

/** Shared column list (aliases match SiteListItem). */
const SELECT = `
  SELECT s.id, s.code, s.name, s.mineral, s.region, s.mine_type AS mineType,
         s.status, s.capacity_tpd AS capacityTpd, s.lat, s.lon,
         s.opened_date AS openedDate, s.description,
         (SELECT p.ore_tonnes FROM production_daily p
           WHERE p.site_id = s.id ORDER BY p.date DESC LIMIT 1) AS latestOreTpd,
         (SELECT MAX(p.date) FROM production_daily p WHERE p.site_id = s.id) AS latestDate,
         (SELECT COUNT(*) FROM equipment e WHERE e.site_id = s.id) AS units,
         (SELECT COUNT(*) FROM equipment e WHERE e.site_id = s.id AND e.status = 'down') AS unitsDown,
         (SELECT COUNT(*) FROM safety_incidents i
           WHERE i.site_id = s.id AND i.status = 'open') AS openIncidents
    FROM sites s`

export async function listSites(): Promise<SiteListItem[]> {
  await connection()
  return all<SiteListItem>(`${SELECT} ORDER BY s.code`)
}

export async function getSite(id: number): Promise<SiteListItem | null> {
  await connection()
  return one<SiteListItem>(`${SELECT} WHERE s.id = ?`, [id]) ?? null
}

export interface SiteOption {
  id: number
  code: string
  name: string
}

/** Lightweight options for the filter bar and form selects. */
export async function getSiteOptions(): Promise<SiteOption[]> {
  await connection()
  return all<SiteOption>(`SELECT id, code, name FROM sites ORDER BY code`)
}

export async function siteIdByRef(ref: string): Promise<number | null> {
  await connection()
  const row = one<{ id: number }>(
    `SELECT id FROM sites WHERE code = ? COLLATE NOCASE OR name = ? COLLATE NOCASE LIMIT 1`,
    [ref.trim(), ref.trim()],
  )
  return row?.id ?? null
}

/** Site-reference map for CSV import (CODE upper + NAME lower keys). */
export async function siteResolveMap(): Promise<Map<string, number>> {
  await connection()
  const map = new Map<string, number>()
  for (const r of all<{ id: number; code: string; name: string }>(`SELECT id, code, name FROM sites`)) {
    map.set(r.code.toUpperCase(), r.id)
    map.set(r.name.toLowerCase(), r.id)
  }
  return map
}

/** Portfolio rollup (honours filter) for the /sites header strip. */
export async function getPortfolioTotals(
  f: Filter,
): Promise<{ ore: number; concentrate: number; units: number }> {
  await connection()
  const w = where(f, { site: 'p.site_id', date: 'p.date' })
  const row = one<{ ore: number; concentrate: number }>(
    `SELECT COALESCE(SUM(p.ore_tonnes), 0) AS ore,
            COALESCE(SUM(p.concentrate_tonnes), 0) AS concentrate
       FROM production_daily p WHERE ${w.clause}`,
    w.params,
  )
  const units = one<{ units: number }>(
    `SELECT COUNT(*) AS units FROM equipment e ${f.siteId !== null ? 'WHERE e.site_id = ?' : ''}`,
    f.siteId !== null ? [f.siteId] : [],
  )
  return { ore: n(row?.ore), concentrate: n(row?.concentrate), units: n(units?.units) }
}
