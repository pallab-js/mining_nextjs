'use server'
import { refresh } from 'next/cache'
import {
  equipmentEventSchema,
  equipmentSchema,
  formDataToObject,
  parseWith,
} from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, one, resolveEquipmentId, resolveSiteId, idFrom } from './helpers'

export async function createEquipment(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(equipmentSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteId = await resolveSiteId(d.site)
    if (siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    const exists = one<{ id: number }>('SELECT id FROM equipment WHERE code = ? COLLATE NOCASE', [d.code])
    if (exists) return fail('Unit code already exists.', { code: ['This code is already in use.'] })
    execute(
      `INSERT INTO equipment (site_id, code, name, type, status, manufacturer, model, capacity, installed_date)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        siteId,
        d.code,
        d.name,
        d.type,
        d.status,
        d.manufacturer ?? null,
        d.model ?? null,
        d.capacity ?? null,
        d.installed_date ?? null,
      ],
    )
    refresh()
    return ok(`Unit "${d.code} — ${d.name}" added to the fleet.`)
  })
}

export async function createEquipmentEvent(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(equipmentEventSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const equipId = await resolveEquipmentId(d.equipment)
    if (equipId === null) return fail('Unknown equipment reference.', { equipment: ['No unit matches that code or name.'] })
    await connection()
    execute(
      `INSERT INTO equipment_events (equipment_id, date, running_hours, downtime_hours, downtime_reason, fuel_litres)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(equipment_id, date) DO UPDATE SET
         running_hours = excluded.running_hours,
         downtime_hours = excluded.downtime_hours,
         downtime_reason = excluded.downtime_reason,
         fuel_litres = excluded.fuel_litres`,
      [equipId, d.date, d.running_hours, d.downtime_hours, d.downtime_reason ?? null, d.fuel_litres ?? null],
    )
    refresh()
    return ok(`Equipment event logged for ${d.date}.`)
  })
}

export async function setEquipmentStatus(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const id = idFrom(fd, 'equipment_id')
    if (id === null) return fail('Missing equipment id.', { equipment_id: ['Select a unit.'] })
    const status = fd.get('status')
    if (typeof status !== 'string' || !['operational', 'maintenance', 'standby', 'down'].includes(status)) {
      return fail('Select a valid status.', { status: ['Invalid status.'] })
    }
    await connection()
    execute(`UPDATE equipment SET status = ? WHERE id = ?`, [status, id])
    refresh()
    return ok('Equipment status updated.')
  })
}
