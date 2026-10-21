/** Production & grades — series, KPI rollups, mineral mix, monthly table. */
import 'server-only'
import { connection, all, one, n, nn, where, bucket, defaultGranularity } from './sql'
import type { Filter } from '../filter'

export interface ProductionPoint {
  bucket: string
  ore: number
  waste: number
  concentrate: number
  throughput: number
  /** ore-weighted head grade % */
  grade: number | null
  /** ore-weighted recovery % */
  recovery: number | null
  strip: number | null
}

export interface ProductionTotals {
  ore: number
  waste: number
  concentrate: number
  throughput: number
  grade: number | null
  recovery: number | null
  strip: number | null
  days: number
}

export type Granularity = 'day' | 'week' | 'month'

export async function getProductionSeries(
  f: Filter,
  granularity?: Granularity,
): Promise<ProductionPoint[]> {
  await connection()
  const g = granularity ?? defaultGranularity(f)
  const w = where(f, { site: 'p.site_id', date: 'p.date' })
  const rows = all<{
    bucket: string
    ore: number
    waste: number
    concentrate: number
    throughput: number
    wgrade: number | null
    wrecov: number | null
  }>(
    `SELECT ${bucket('p.date', g)} AS bucket,
            SUM(p.ore_tonnes) AS ore,
            SUM(p.waste_tonnes) AS waste,
            SUM(p.concentrate_tonnes) AS concentrate,
            AVG(p.throughput_tpd) AS throughput,
            SUM(p.head_grade_pct * p.ore_tonnes) AS wgrade,
            SUM(p.recovery_pct * p.ore_tonnes) AS wrecov
       FROM production_daily p
      WHERE ${w.clause}
      GROUP BY bucket
      ORDER BY bucket`,
    w.params,
  )
  return rows.map((r) => ({
    bucket: r.bucket,
    ore: n(r.ore),
    waste: n(r.waste),
    concentrate: n(r.concentrate),
    throughput: n(r.throughput),
    grade: r.ore > 0 ? nn(r.wgrade !== null ? r.wgrade / r.ore : null) : null,
    recovery: r.ore > 0 ? nn(r.wrecov !== null ? r.wrecov / r.ore : null) : null,
    strip: r.ore > 0 ? n(r.waste) / n(r.ore) : null,
  }))
}

export async function getProductionTotals(f: Filter): Promise<ProductionTotals> {
  await connection()
  const w = where(f, { site: 'p.site_id', date: 'p.date' })
  const r = one<{
    ore: number
    waste: number
    concentrate: number
    throughput: number
    wgrade: number | null
    wrecov: number | null
    days: number
  }>(
    `SELECT COALESCE(SUM(p.ore_tonnes), 0) AS ore,
            COALESCE(SUM(p.waste_tonnes), 0) AS waste,
            COALESCE(SUM(p.concentrate_tonnes), 0) AS concentrate,
            COALESCE(AVG(p.throughput_tpd), 0) AS throughput,
            SUM(p.head_grade_pct * p.ore_tonnes) AS wgrade,
            SUM(p.recovery_pct * p.ore_tonnes) AS wrecov,
            COUNT(DISTINCT p.date) AS days
       FROM production_daily p WHERE ${w.clause}`,
    w.params,
  )
  const ore = n(r?.ore)
  return {
    ore,
    waste: n(r?.waste),
    concentrate: n(r?.concentrate),
    throughput: n(r?.throughput),
    grade: ore > 0 ? nn(r?.wgrade !== null && r?.wgrade !== undefined ? r.wgrade / ore : null) : null,
    recovery: ore > 0 ? nn(r?.wrecov !== null && r?.wrecov !== undefined ? r.wrecov / ore : null) : null,
    strip: ore > 0 ? n(r?.waste) / ore : null,
    days: n(r?.days),
  }
}

export interface MineralMixPoint {
  mineral: string
  concentrate: number
}

/** Concentrate tonnes by mineral (portfolio donut; site filter honoured). */
export async function getMineralMix(f: Filter): Promise<MineralMixPoint[]> {
  await connection()
  const w = where(f, { site: 'p.site_id', date: 'p.date' })
  return all<MineralMixPoint>(
    `SELECT s.mineral, SUM(p.concentrate_tonnes) AS concentrate
       FROM production_daily p JOIN sites s ON s.id = p.site_id
      WHERE ${w.clause}
      GROUP BY s.mineral
      ORDER BY concentrate DESC`,
    w.params,
  )
}

export interface MonthlyRow {
  month: string
  ore: number
  waste: number
  concentrate: number
  grade: number | null
  recovery: number | null
  strip: number | null
}

export async function getMonthlyTable(f: Filter): Promise<MonthlyRow[]> {
  await connection()
  const w = where(f, { site: 'p.site_id', date: 'p.date' })
  const rows = all<{
    month: string
    ore: number
    waste: number
    concentrate: number
    wgrade: number | null
    wrecov: number | null
  }>(
    `SELECT strftime('%Y-%m', p.date) AS month,
            SUM(p.ore_tonnes) AS ore,
            SUM(p.waste_tonnes) AS waste,
            SUM(p.concentrate_tonnes) AS concentrate,
            SUM(p.head_grade_pct * p.ore_tonnes) AS wgrade,
            SUM(p.recovery_pct * p.ore_tonnes) AS wrecov
       FROM production_daily p WHERE ${w.clause}
      GROUP BY month ORDER BY month DESC`,
    w.params,
  )
  return rows.map((r) => ({
    month: r.month,
    ore: n(r.ore),
    waste: n(r.waste),
    concentrate: n(r.concentrate),
    grade: r.ore > 0 && r.wgrade !== null ? r.wgrade / r.ore : null,
    recovery: r.ore > 0 && r.wrecov !== null ? r.wrecov / r.ore : null,
    strip: r.ore > 0 ? n(r.waste) / n(r.ore) : null,
  }))
}

/** Most recent day with production (freshness badge). */
export async function getLatestProductionDate(): Promise<string | null> {
  await connection()
  const row = one<{ d: string | null }>(`SELECT MAX(date) AS d FROM production_daily`)
  return row?.d ?? null
}
