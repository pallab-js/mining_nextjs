/**
 * Metric resolution for the alert engine: MetricKey → current numeric value
 * over a filter window. Reuses the domain read models so dashboard KPIs and
 * alert evaluations can never disagree about what a metric means.
 */
import 'server-only'
import { connection } from './sql'
import { getProductionTotals } from './production'
import { getAvailabilityTotals } from './equipment'
import { getEnvKpis } from './environment'
import type { MetricKey } from '../enums'
import type { Filter } from '../filter'

export type MetricValues = Record<MetricKey, number | null>

/**
 * Resolve every registry metric for the given window/scope.
 * - rates (recovery, availability, water recycled, grade): window aggregates
 * - state (tailings level): latest reading (worst dam in scope)
 * - co2e_intensity: kg CO₂e per tonne of ore
 */
export async function getMetricValues(f: Filter): Promise<MetricValues> {
  await connection()
  const [prod, fleet, env] = await Promise.all([
    getProductionTotals(f),
    getAvailabilityTotals(f),
    getEnvKpis(f),
  ])
  return {
    recovery_pct: prod.recovery,
    head_grade_pct: prod.grade,
    availability_pct: fleet.availability,
    water_recycled_pct: env.waterRecycled,
    co2e_intensity: env.co2eIntensity,
    tailings_level_pct: env.tailingsLevel,
  }
}
