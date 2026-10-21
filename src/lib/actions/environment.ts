'use server'
import { refresh } from 'next/cache'
import { envReadingSchema, formDataToObject, parseWith } from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, resolveSiteId } from './helpers'

export async function createEnvReading(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(envReadingSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteId = await resolveSiteId(d.site)
    if (siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    execute(
      `INSERT INTO env_readings (site_id, date, water_withdrawal_m3, water_recycled_pct, energy_mwh, co2e_tonnes, tailings_level_pct)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(site_id, date) DO UPDATE SET
         water_withdrawal_m3 = excluded.water_withdrawal_m3,
         water_recycled_pct = excluded.water_recycled_pct,
         energy_mwh = excluded.energy_mwh,
         co2e_tonnes = excluded.co2e_tonnes,
         tailings_level_pct = excluded.tailings_level_pct`,
      [siteId, d.date, d.water_withdrawal_m3, d.water_recycled_pct, d.energy_mwh, d.co2e_tonnes, d.tailings_level_pct],
    )
    refresh()
    return ok(`Environmental reading recorded for ${d.date}.`)
  })
}
