'use server'
import { refresh } from 'next/cache'
import { formDataToObject, parseWith, shipmentSchema, stockpileSchema } from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, resolveSiteId } from './helpers'

export async function createStockpile(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(stockpileSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteId = await resolveSiteId(d.site)
    if (siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    execute(
      `INSERT INTO stockpiles (site_id, product, grade_pct, tonnes, updated_at)
       VALUES (?,?,?,?,datetime('now'))
       ON CONFLICT(site_id, product) DO UPDATE SET grade_pct = excluded.grade_pct, tonnes = excluded.tonnes, updated_at = datetime('now')`,
      [siteId, d.product, d.grade_pct, d.tonnes],
    )
    refresh()
    return ok(`Stockpile updated for ${d.product}.`)
  })
}

export async function createShipment(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(shipmentSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteId = await resolveSiteId(d.site)
    if (siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    execute(
      `INSERT INTO shipments (site_id, product, tonnes, destination, customer, status, eta, shipped_date, price_usd_per_t)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [siteId, d.product, d.tonnes, d.destination, d.customer, d.status, d.eta ?? null, d.shipped_date ?? null, d.price_usd_per_t],
    )
    refresh()
    return ok('Shipment created.')
  })
}
