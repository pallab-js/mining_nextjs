/**
 * Threshold alert engine — pure evaluation of stored rules against current
 * metric values. State is derived at read time; nothing is persisted, so the
 * bell can never go stale or lie about history.
 */
import type { Comparator, MetricKey, Severity } from './enums'
import { METRICS } from './metrics'

export interface RuleInput {
  id: number
  name: string
  metric: MetricKey
  comparator: Comparator
  threshold: number
  severity: Severity
  siteId: number | null
  active: boolean
}

export interface ActiveAlert {
  ruleId: number
  name: string
  metric: MetricKey
  metricLabel: string
  unit: string
  decimals: number
  comparator: Comparator
  threshold: number
  severity: Severity
  siteId: number | null
  /** null metric = cannot evaluate (never alerts). */
  currentValue: number | null
}

export function compare(value: number, comparator: Comparator, threshold: number): boolean {
  switch (comparator) {
    case '>':
      return value > threshold
    case '>=':
      return value >= threshold
    case '<':
      return value < threshold
    case '<=':
      return value <= threshold
  }
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/** Sort a mixed list of alerts by severity (critical first). */
export function sortAlerts(alerts: ActiveAlert[]): ActiveAlert[] {
  return [...alerts].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/** Rules fire only when active AND the metric resolved to a number. */
export function evaluateAlerts(
  metrics: Partial<Record<MetricKey, number | null>>,
  rules: readonly RuleInput[],
): ActiveAlert[] {
  const out: ActiveAlert[] = []
  for (const rule of rules) {
    if (!rule.active) continue
    const value = metrics[rule.metric]
    if (value === null || value === undefined || !Number.isFinite(value)) continue
    if (!compare(value, rule.comparator, rule.threshold)) continue
    const def = METRICS[rule.metric]
    out.push({
      ruleId: rule.id,
      name: rule.name,
      metric: rule.metric,
      metricLabel: def.label,
      unit: def.unit,
      decimals: def.decimals,
      comparator: rule.comparator,
      threshold: rule.threshold,
      severity: rule.severity,
      siteId: rule.siteId,
      currentValue: value,
    })
  }
  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}
