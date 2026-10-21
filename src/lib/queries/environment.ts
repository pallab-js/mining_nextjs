/** Environment & tailings — water, energy, CO₂e, dam level. */
import 'server-only'
import { connection, all, one, n, nn, where, bucket, defaultGranularity } from './sql'
import { co2eIntensity } from '../metrics'
import type { Filter } from '../filter'

export interface EnvKpis {
  waterWithdrawal: number
  waterRecycled: number | null
  energy: number
  co2e: number
  /** kg CO₂e per tonne of ore in the same window/scope */
  co2eIntensity: number | null
  /** worst (highest) latest dam level across the scope */
  tailingsLevel: number | null
  tailingsDate: string | null
}

export async function getEnvKpis(f: Filter): Promise<EnvKpis> {
  await connection()
  const w = where(f, { site: 'e.site_id', date: 'e.date' })
  const r = one<{
    water: number
    recycle: number | null
    energy: number
    co2e: number
  }>(
    `SELECT COALESCE(SUM(e.water_withdrawal_m3), 0) AS water,
            AVG(e.water_recycled_pct) AS recycle,
            COALESCE(SUM(e.energy_mwh), 0) AS energy,
            COALESCE(SUM(e.co2e_tonnes), 0) AS co2e
       FROM env_readings e
      WHERE ${w.clause}`,
    w.params,
  )
  const wp = where(f, { site: 'p.site_id', date: 'p.date' })
  const ore = n(
    one<{ ore: number }>(
      `SELECT COALESCE(SUM(p.ore_tonnes), 0) AS ore FROM production_daily p WHERE ${wp.clause}`,
      wp.params,
    )?.ore,
  )
  const tail = one<{ level: number; d: string }>(
    `SELECT e.tailings_level_pct AS level, e.date AS d
       FROM env_readings e
      WHERE ${w.clause}
        AND e.date = (SELECT MAX(x.date) FROM env_readings x WHERE x.site_id = e.site_id)
      ORDER BY e.tailings_level_pct DESC
      LIMIT 1`,
    w.params,
  )
  return {
    waterWithdrawal: n(r?.water),
    waterRecycled: nn(r?.recycle),
    energy: n(r?.energy),
    co2e: n(r?.co2e),
    co2eIntensity: co2eIntensity(n(r?.co2e), ore),
    tailingsLevel: nn(tail?.level),
    tailingsDate: tail?.d ?? null,
  }
}

export interface WaterPoint {
  bucket: string
  water: number
  recycled: number | null
}

export async function getWaterSeries(
  f: Filter,
  granularity?: 'day' | 'week' | 'month',
): Promise<WaterPoint[]> {
  await connection()
  const g = granularity ?? defaultGranularity(f)
  const w = where(f, { site: 'e.site_id', date: 'e.date' })
  return all<WaterPoint>(
    `SELECT ${bucket('e.date', g)} AS bucket,
            SUM(e.water_withdrawal_m3) AS water,
            AVG(e.water_recycled_pct) AS recycled
       FROM env_readings e
      WHERE ${w.clause}
      GROUP BY bucket
      ORDER BY bucket`,
    w.params,
  )
}

export interface Co2ePoint {
  bucket: string
  co2e: number
  energy: number
}

export async function getCo2eSeries(
  f: Filter,
  granularity?: 'day' | 'week' | 'month',
): Promise<Co2ePoint[]> {
  await connection()
  const g = granularity ?? defaultGranularity(f)
  const w = where(f, { site: 'e.site_id', date: 'e.date' })
  return all<Co2ePoint>(
    `SELECT ${bucket('e.date', g)} AS bucket,
            SUM(e.co2e_tonnes) AS co2e,
            SUM(e.energy_mwh) AS energy
       FROM env_readings e
      WHERE ${w.clause}
      GROUP BY bucket
      ORDER BY bucket`,
    w.params,
  )
}

export interface TailingsLatest {
  site: string
  siteId: number
  level: number
  date: string
}

/** Latest dam/pond level per site (state metric — latest reading regardless of range). */
export async function getTailingsLatest(f: Filter): Promise<TailingsLatest[]> {
  await connection()
  return all<TailingsLatest>(
    `SELECT s.code AS site, s.id AS siteId,
            e.tailings_level_pct AS level, e.date AS date
       FROM env_readings e
       JOIN sites s ON s.id = e.site_id
      WHERE e.date = (SELECT MAX(x.date) FROM env_readings x WHERE x.site_id = e.site_id)
        ${f.siteId !== null ? 'AND s.id = ?' : ''}
      ORDER BY level DESC`,
    f.siteId !== null ? [f.siteId] : [],
  )
}

export interface EnvReadingRow {
  id: number
  site: string
  siteId: number
  date: string
  waterWithdrawal: number
  waterRecycled: number
  energy: number
  co2e: number
  tailingsLevel: number
}

export async function listEnvReadings(f: Filter, limit = 60): Promise<EnvReadingRow[]> {
  await connection()
  const w = where(f, { site: 'e.site_id', date: 'e.date' })
  return all<EnvReadingRow>(
    `SELECT e.id, s.code AS site, s.id AS siteId, e.date,
            e.water_withdrawal_m3 AS waterWithdrawal,
            e.water_recycled_pct AS waterRecycled,
            e.energy_mwh AS energy,
            e.co2e_tonnes AS co2e,
            e.tailings_level_pct AS tailingsLevel
       FROM env_readings e
       JOIN sites s ON s.id = e.site_id
      WHERE ${w.clause}
      ORDER BY e.date DESC, s.code
      LIMIT ?`,
    [...w.params, limit],
  )
}
