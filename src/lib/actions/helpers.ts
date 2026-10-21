/**
 * Shared server-side helpers for the action layer.
 * Kept out of the `'use server'` modules so they can hold non-action
 * utilities; only the action files' own exports become RPC endpoints.
 */
import 'server-only'
import { connection, one, execute } from '../queries/sql'
import { siteIdByRef } from '../queries/sites'
import type { ActionResult } from './result'

/** Resolve a site identifier (code or name) to site_id; null if unknown. */
export async function resolveSiteId(ref: string | undefined | null): Promise<number | null> {
  if (!ref || ref.trim() === '') return null
  await connection()
  return siteIdByRef(ref)
}

/** Resolve equipment (code or name) to equipment_id; null if unknown. */
export async function resolveEquipmentId(ref: string | undefined | null): Promise<number | null> {
  if (!ref || ref.trim() === '') return null
  await connection()
  const row = one<{ id: number }>(
    `SELECT id FROM equipment WHERE code = ? COLLATE NOCASE OR name = ? COLLATE NOCASE LIMIT 1`,
    [ref, ref],
  )
  return row?.id ?? null
}

/** Extract a positive integer id from form data. */
export function idFrom(fd: FormData, key = 'id'): number | null {
  const raw = fd.get(key)
  if (typeof raw !== 'string') return null
  const n = Number(raw.trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Wrap an action body so it never throws — always returns ActionResult. */
export async function attempt(fn: () => Promise<ActionResult> | ActionResult): Promise<ActionResult> {
  try {
    return await fn()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected database error.'
    return { ok: false, message }
  }
}

export { connection, one, execute }
