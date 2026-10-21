'use server'
import { refresh } from 'next/cache'
import { alertRuleSchema, formDataToObject, parseWith } from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, resolveSiteId, idFrom, one } from './helpers'

export async function createRule(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(alertRuleSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteRef = d.site && d.site.trim() !== '' ? d.site : undefined
    const siteId = siteRef ? await resolveSiteId(siteRef) : null
    if (siteRef && siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    execute(
      `INSERT INTO alert_rules (name, metric, comparator, threshold, severity, site_id, active, created_at)
       VALUES (?,?,?,?,?,?,1,datetime('now'))`,
      [d.name, d.metric, d.comparator, d.threshold, d.severity, siteId],
    )
    refresh()
    return ok(`Alert rule "${d.name}" created.`)
  })
}

export async function toggleRule(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const id = idFrom(fd)
    if (id === null) return fail('Missing rule id.', { id: ['Invalid rule reference.'] })
    await connection()
    const row = one<{ active: number }>(`SELECT active FROM alert_rules WHERE id = ?`, [id])
    if (!row) return fail('Rule not found.', { id: ['Unknown rule.'] })
    execute(`UPDATE alert_rules SET active = ? WHERE id = ?`, [row.active === 1 ? 0 : 1, id])
    refresh()
    return ok(row.active === 1 ? 'Rule disabled.' : 'Rule enabled.')
  })
}

export async function deleteRule(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const id = idFrom(fd)
    if (id === null) return fail('Missing rule id.', { id: ['Invalid rule reference.'] })
    await connection()
    const row = one<{ id: number }>(`SELECT id FROM alert_rules WHERE id = ?`, [id])
    if (!row) return fail('Rule not found.', { id: ['Unknown rule.'] })
    execute(`DELETE FROM alert_rules WHERE id = ?`, [id])
    refresh()
    return ok('Rule deleted.')
  })
}
