'use server'
import { refresh } from 'next/cache'
import { formDataToObject, parseWith, siteSchema } from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, idFrom, one } from './helpers'

export async function createSite(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(siteSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    await connection()
    const exists = one<{ id: number }>('SELECT id FROM sites WHERE code = ? COLLATE NOCASE', [d.code])
    if (exists) return fail('Site code already exists.', { code: ['This code is already in use.'] })
    execute(
      `INSERT INTO sites (code, name, mineral, region, mine_type, status, capacity_tpd, lat, lon, opened_date, description)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        d.code,
        d.name,
        d.mineral,
        d.region,
        d.mine_type,
        d.status,
        d.capacity_tpd,
        d.lat ?? null,
        d.lon ?? null,
        d.opened_date ?? null,
        d.description ?? null,
      ],
    )
    refresh()
    return ok(`Site "${d.code} — ${d.name}" created.`)
  })
}

export async function updateSite(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const id = idFrom(fd)
    if (id === null) return fail('Missing site id.', { id: ['Invalid site reference.'] })
    const parsed = parseWith(siteSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    await connection()
    execute(
      `UPDATE sites SET code=?, name=?, mineral=?, region=?, mine_type=?, status=?, capacity_tpd=?, lat=?, lon=?, opened_date=?, description=?
       WHERE id=?`,
      [
        d.code,
        d.name,
        d.mineral,
        d.region,
        d.mine_type,
        d.status,
        d.capacity_tpd,
        d.lat ?? null,
        d.lon ?? null,
        d.opened_date ?? null,
        d.description ?? null,
        id,
      ],
    )
    refresh()
    return ok(`Site "${d.code} — ${d.name}" updated.`)
  })
}
