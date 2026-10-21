'use server'
/**
 * CSV import actions — validate first, then commit.
 *
 * The browser keeps the payload and posts it twice: once to `validateImport`
 * (no writes, returns a per-row report) and once to `commitImport` (writes
 * the valid rows in a single transaction and records the batch).
 */
import { refresh } from 'next/cache'
import { getSQLite } from '../db'
import { validateCsv, ENTITY_COLUMNS } from '../csv'
import { IMPORT_ENTITIES, type ImportEntity } from '../enums'
import type { ImportReport } from '../import-templates'
import { connection } from '../queries/sql'
import { siteResolveMap } from '../queries/sites'
import { equipmentResolveMap } from '../queries/equipment'

/** Hard cap on the uploaded payload. */
const MAX_BYTES = 5 * 1024 * 1024

/** Result shape for the import actions (extends the ActionResult contract). */
export interface ImportResult {
  ok: boolean
  message: string
  report?: ImportReport
}

/** Physical table per entity. */
const TABLES: Record<ImportEntity, string> = {
  production: 'production_daily',
  equipment_events: 'equipment_events',
  safety: 'safety_incidents',
  environment: 'env_readings',
  shipments: 'shipments',
}

/**
 * Entities with a natural key: a repeated row updates the existing record
 * instead of duplicating it.
 */
const CONFLICT: Partial<
  Record<ImportEntity, { target: string; update: readonly string[] }>
> = {
  production: {
    target: '(site_id, date)',
    update: [
      'ore_tonnes',
      'waste_tonnes',
      'concentrate_tonnes',
      'head_grade_pct',
      'recovery_pct',
      'throughput_tpd',
    ],
  },
  equipment_events: {
    target: '(equipment_id, date)',
    update: ['running_hours', 'downtime_hours', 'downtime_reason', 'fuel_litres'],
  },
  environment: {
    target: '(site_id, date)',
    update: [
      'water_withdrawal_m3',
      'water_recycled_pct',
      'energy_mwh',
      'co2e_tonnes',
      'tailings_level_pct',
    ],
  },
}

/** Read the payload from the form: an uploaded file or pasted text. */
async function readPayload(
  fd: FormData,
): Promise<{ text: string; filename: string } | { error: string }> {
  const file = fd.get('file')
  if (file && typeof file === 'object' && typeof (file as File).text === 'function') {
    const f = file as File
    if (f.size > MAX_BYTES) {
      return { error: 'File is larger than 5 MB — split it into smaller files.' }
    }
    if (f.size > 0) return { text: await f.text(), filename: f.name || 'upload.csv' }
  }
  const pasted = fd.get('text')
  if (typeof pasted === 'string' && pasted.trim() !== '') {
    if (pasted.length > MAX_BYTES) {
      return { error: 'Pasted data is larger than 5 MB — split it into smaller files.' }
    }
    return { text: pasted, filename: 'pasted.csv' }
  }
  return { error: 'Choose a CSV file or paste CSV text.' }
}

function parseEntity(raw: FormDataEntryValue | null): ImportEntity | null {
  if (typeof raw !== 'string') return null
  return (IMPORT_ENTITIES as readonly string[]).includes(raw)
    ? (raw as ImportEntity)
    : null
}

/** Insert the validated rows in one transaction; returns the row count. */
function insertRows(entity: ImportEntity, rows: Record<string, unknown>[]): number {
  const db = getSQLite()
  const columns = ENTITY_COLUMNS[entity]
  const placeholders = columns.map(() => '?').join(', ')
  let sql = `INSERT INTO ${TABLES[entity]} (${columns.join(', ')}) VALUES (${placeholders})`
  const conflict = CONFLICT[entity]
  if (conflict) {
    sql += ` ON CONFLICT ${conflict.target} DO UPDATE SET ${conflict.update
      .map((c) => `${c} = excluded.${c}`)
      .join(', ')}`
  }
  const stmt = db.prepare(sql)
  const insertAll = db.transaction((list: Record<string, unknown>[]) => {
    let count = 0
    for (const row of list) {
      stmt.run(...columns.map((c) => row[c] ?? null))
      count += 1
    }
    return count
  })
  return insertAll(rows)
}

/** Record the batch so the import history stays auditable. */
function recordBatch(
  entity: ImportEntity,
  filename: string,
  rowsOk: number,
  rowsFailed: number,
  errors: unknown,
): void {
  getSQLite()
    .prepare(
      `INSERT INTO import_batches (entity, filename, rows_ok, rows_failed, errors_json, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(entity, filename, rowsOk, rowsFailed, JSON.stringify(errors))
}

function reportFor(
  entity: ImportEntity,
  filename: string,
  result: ReturnType<typeof validateCsv>,
): ImportReport {
  return {
    entity,
    filename,
    total: result.total,
    valid: result.rows.length,
    errorCount: result.errorCount,
    errors: result.errors,
    ...(result.fatal ? { fatal: result.fatal } : {}),
  }
}

/** Dry run: parse and validate the payload, write nothing. */
export async function validateImport(fd: FormData): Promise<ImportResult> {
  try {
    await connection()
    const entity = parseEntity(fd.get('entity'))
    if (!entity) return { ok: false, message: 'Pick what you are importing first.' }

    const payload = await readPayload(fd)
    if ('error' in payload) return { ok: false, message: payload.error }

    const ctx = {
      siteIds: await siteResolveMap(),
      equipmentIds: await equipmentResolveMap(),
    }
    const result = validateCsv(entity, payload.text, ctx)
    const report = reportFor(entity, payload.filename, result)
    if (result.fatal) return { ok: false, message: result.fatal, report }

    return {
      ok: true,
      message:
        result.rows.length === 0
          ? `No valid rows found — ${result.errorCount} row error${result.errorCount === 1 ? '' : 's'}.`
          : `${result.rows.length} of ${result.total} rows are ready to import.`,
      report,
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unexpected error — please retry.' }
  }
}

/** Commit: write the valid rows (upserting on the natural key) and log the batch. */
export async function commitImport(fd: FormData): Promise<ImportResult> {
  try {
    await connection()
    const entity = parseEntity(fd.get('entity'))
    if (!entity) return { ok: false, message: 'Pick what you are importing first.' }

    const payload = await readPayload(fd)
    if ('error' in payload) return { ok: false, message: payload.error }

    const ctx = {
      siteIds: await siteResolveMap(),
      equipmentIds: await equipmentResolveMap(),
    }
    const result = validateCsv(entity, payload.text, ctx)
    const report = reportFor(entity, payload.filename, result)
    if (result.fatal) return { ok: false, message: result.fatal, report }
    if (result.rows.length === 0) {
      return { ok: false, message: 'Nothing to import — no rows passed validation.', report }
    }

    const inserted = insertRows(entity, result.rows)
    recordBatch(entity, payload.filename, inserted, result.errorCount, result.errors)
    refresh()

    return {
      ok: true,
      message:
        `Imported ${inserted} row${inserted === 1 ? '' : 's'} into ${entity.replace('_', ' ')}` +
        (result.errorCount > 0 ? ` — ${result.errorCount} invalid row${result.errorCount === 1 ? '' : 's'} skipped.` : '.'),
      report: { ...report, committed: true, inserted },
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unexpected error — please retry.' }
  }
}
