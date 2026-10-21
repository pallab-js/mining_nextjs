'use server'
import { refresh } from 'next/cache'
import { formDataToObject, parseWith, productionSchema } from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, resolveSiteId, one } from './helpers'

export async function createProduction(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(productionSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteId = await resolveSiteId(d.site)
    if (siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    const existing = one<{ id: number }>(
      `SELECT id FROM production_daily WHERE site_id = ? AND date = ?`,
      [siteId, d.date],
    )
    execute(
      `INSERT INTO production_daily (site_id, date, ore_tonnes, waste_tonnes, concentrate_tonnes, head_grade_pct, recovery_pct, throughput_tpd)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(site_id, date) DO UPDATE SET
         ore_tonnes = excluded.ore_tonnes,
         waste_tonnes = excluded.waste_tonnes,
         concentrate_tonnes = excluded.concentrate_tonnes,
         head_grade_pct = excluded.head_grade_pct,
         recovery_pct = excluded.recovery_pct,
         throughput_tpd = excluded.throughput_tpd`,
      [siteId, d.date, d.ore_tonnes, d.waste_tonnes, d.concentrate_tonnes, d.head_grade_pct, d.recovery_pct, d.throughput_tpd],
    )
    refresh()
    return ok(existing ? `Production updated for ${d.date}.` : `Production record added for ${d.date}.`)
  })
}
