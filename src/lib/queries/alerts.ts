/**
 * Alert queries — rules table access + live evaluation.
 *
 * The bell/panel uses a FIXED window (last 30 days, all sites) independent of
 * the top-bar filters so it always answers "is the operation healthy right
 * now?" — per docs/02-prd.md & the alert-engine decision.
 */
import 'server-only'
import { connection, all } from './sql'
import { resolveRange } from '../filter'
import { evaluateAlerts, sortAlerts, type ActiveAlert, type RuleInput } from '../alerts'
import { getMetricValues } from './metrics'
import type { Comparator, MetricKey, Severity } from '../enums'
import type { Filter } from '../filter'

export interface AlertRuleRow extends RuleInput {
  name: string
  threshold: number
  createdAt: string | null
  siteCode: string | null
}

export async function getAlertRules(): Promise<AlertRuleRow[]> {
  await connection()
  const rows = all<{
    id: number
    name: string
    metric: string
    comparator: string
    threshold: number
    severity: string
    site_id: number | null
    siteCode: string | null
    active: number
    created_at: string
  }>(
    `SELECT r.id, r.name, r.metric, r.comparator, r.threshold, r.severity,
            r.site_id, s.code AS siteCode, r.active, r.created_at
       FROM alert_rules r
       LEFT JOIN sites s ON s.id = r.site_id
      ORDER BY r.active DESC, r.id`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    metric: r.metric as MetricKey,
    comparator: r.comparator as Comparator,
    threshold: r.threshold,
    severity: r.severity as Severity,
    siteId: r.site_id,
    siteCode: r.siteCode,
    active: r.active === 1,
    createdAt: r.created_at,
  }))
}

export async function getAlertRule(id: number): Promise<AlertRuleRow | null> {
  await connection()
  return (await getAlertRules()).find((r) => r.id === id) ?? null
}

/**
 * Evaluate all active rules against live metric values.
 * Global rules evaluate portfolio metrics; site-scoped rules evaluate that
 * site's metrics (resolved once per distinct site).
 */
export async function getActiveAlerts(): Promise<ActiveAlert[]> {
  await connection()
  const { range, from, to } = resolveRange('30d')
  const base: Filter = { siteId: null, from, to, range }
  const rules = (await getAlertRules()).filter((r) => r.active)
  if (rules.length === 0) return []

  const globalRules = rules.filter((r) => r.siteId === null)
  const siteRules = rules.filter((r) => r.siteId !== null)

  const out: ActiveAlert[] = []
  if (globalRules.length > 0) {
    out.push(...evaluateAlerts(await getMetricValues(base), globalRules))
  }
  const siteIds = [...new Set(siteRules.map((r) => r.siteId))]
  for (const siteId of siteIds) {
    const values = await getMetricValues({ ...base, siteId })
    out.push(...evaluateAlerts(values, siteRules.filter((r) => r.siteId === siteId)))
  }
  return sortAlerts(out)
}

/** Just the count (top-bar bell) — same engine, no payload. */
export async function getActiveAlertCount(): Promise<number> {
  return (await getActiveAlerts()).length
}
