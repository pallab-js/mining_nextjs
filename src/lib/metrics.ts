/**
 * KPI formulas — pure, unit-tested, shared by dashboard tiles, tables and alerts.
 * See docs/02-prd.md §6 for the authoritative formula list.
 */
import type { MetricKey } from './enums'

export interface MetricDef {
  key: MetricKey
  label: string
  unit: string
  decimals: number
  /** Whether a higher value is "good" (drives ▲/▼ colouring and alert tone). */
  higherIsBetter: boolean
  /** How the metric is derived over a filter window. */
  basis: 'range-aggregate' | 'latest-reading'
  note: string
}

export const METRICS: Record<MetricKey, MetricDef> = {
  recovery_pct: {
    key: 'recovery_pct',
    label: 'Recovery',
    unit: '%',
    decimals: 1,
    higherIsBetter: true,
    basis: 'range-aggregate',
    note: 'Ore-weighted mean recovery over the window',
  },
  availability_pct: {
    key: 'availability_pct',
    label: 'Fleet availability',
    unit: '%',
    decimals: 1,
    higherIsBetter: true,
    basis: 'range-aggregate',
    note: 'Σ running / Σ (running + downtime)',
  },
  tailings_level_pct: {
    key: 'tailings_level_pct',
    label: 'Tailings level',
    unit: '%',
    decimals: 1,
    higherIsBetter: false,
    basis: 'latest-reading',
    note: 'Most recent dam/pond level reading',
  },
  water_recycled_pct: {
    key: 'water_recycled_pct',
    label: 'Water recycled',
    unit: '%',
    decimals: 1,
    higherIsBetter: true,
    basis: 'range-aggregate',
    note: 'Mean recycle rate over the window',
  },
  head_grade_pct: {
    key: 'head_grade_pct',
    label: 'Head grade',
    unit: '%',
    decimals: 2,
    higherIsBetter: true,
    basis: 'range-aggregate',
    note: 'Ore-weighted mean head grade',
  },
  co2e_intensity: {
    key: 'co2e_intensity',
    label: 'CO₂e intensity',
    unit: 'kg/t',
    decimals: 2,
    higherIsBetter: false,
    basis: 'range-aggregate',
    note: 'Σ CO₂e (t) / Σ ore (t) × 1000',
  },
}

/* ------------------------------------------------------------ formulas */

/** Weighted mean (e.g. grade/recovery weighted by ore tonnes). Null when no weight. */
export function weightedAvg(pairs: readonly { value: number; weight: number }[]): number | null {
  let sumV = 0
  let sumW = 0
  for (const { value, weight } of pairs) {
    if (!Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) continue
    sumV += value * weight
    sumW += weight
  }
  return sumW > 0 ? sumV / sumW : null
}

/** Straight mean of non-null values. */
export function mean(values: readonly (number | null | undefined)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

/** Relative change vs a previous period; null if either side is missing/0. */
export function pctDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || !Number.isFinite(previous) || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

export function stripRatio(waste: number, ore: number): number | null {
  return ore > 0 ? waste / ore : null
}

/** availability = running / (running + downtime) in %. */
export function availabilityPct(running: number, downtime: number): number | null {
  const total = running + downtime
  return total > 0 ? (100 * running) / total : null
}

/** utilization = running / planned hours in %. */
export function utilizationPct(running: number, planned: number): number | null {
  return planned > 0 ? (100 * running) / planned : null
}

/** kg CO₂e per tonne of ore. */
export function co2eIntensity(co2eTonnes: number, oreTonnes: number): number | null {
  return oreTonnes > 0 ? (1000 * co2eTonnes) / oreTonnes : null
}

/** Whole days between two ISO days (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00Z`)
  const b = Date.parse(`${bIso}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN
  return Math.round((b - a) / 86_400_000)
}

export function formatMetricValue(key: MetricKey, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const { decimals, unit } = METRICS[key]
  const n = value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return unit === '%' ? `${n}%` : `${n} ${unit}`
}
