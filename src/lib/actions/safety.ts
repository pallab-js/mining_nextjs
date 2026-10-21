'use server'
import { refresh } from 'next/cache'
import { formDataToObject, incidentSchema, parseWith } from '../validation'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection, execute, resolveSiteId, idFrom } from './helpers'

export async function createIncident(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const parsed = parseWith(incidentSchema, formDataToObject(fd))
    if (!parsed.ok) return fail(parsed.message, parsed.fieldErrors)
    const d = parsed.data
    const siteId = await resolveSiteId(d.site)
    if (siteId === null) return fail('Unknown site reference.', { site: ['No site matches that code or name.'] })
    await connection()
    execute(
      `INSERT INTO safety_incidents (site_id, date, type, severity, description, lost_time_days, reported_by, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
      [siteId, d.date, d.type, d.severity, d.description, d.lost_time_days, d.reported_by ?? null, 'open'],
    )
    refresh()
    return ok('Incident logged.')
  })
}

export async function closeIncident(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const id = idFrom(fd)
    if (id === null) return fail('Missing incident id.', { id: ['Invalid incident reference.'] })
    await connection()
    execute(`UPDATE safety_incidents SET status = 'closed' WHERE id = ? AND status = 'open'`, [id])
    refresh()
    return ok('Incident closed.')
  })
}
