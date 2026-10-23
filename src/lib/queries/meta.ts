/** Data freshness — drives the top-bar badge and settings diagnostics. */
import 'server-only'
import { connection, all, one } from './sql'

export interface Freshness {
  /** most recent production date across all sites */
  latestProductionDate: string | null
  /** most recent environment reading across all sites */
  latestEnvDate: string | null
  /** most recent safety incident across all sites */
  latestIncidentDate: string | null
  lastImport: {
    entity: string
    filename: string
    rowsOk: number
    rowsFailed: number
    createdAt: string
  } | null
}

export async function getFreshness(): Promise<Freshness> {
  await connection()
  const latestProductionDate =
    one<{ d: string | null }>(`SELECT MAX(date) AS d FROM production_daily`)?.d ?? null
  const latestEnvDate =
    one<{ d: string | null }>(`SELECT MAX(date) AS d FROM env_readings`)?.d ?? null
  const latestIncidentDate =
    one<{ d: string | null }>(`SELECT MAX(date) AS d FROM safety_incidents`)?.d ?? null
  const lastImport = one<{
    entity: string
    filename: string
    rows_ok: number
    rows_failed: number
    created_at: string
  }>(`SELECT entity, filename, rows_ok, rows_failed, created_at
        FROM import_batches ORDER BY id DESC LIMIT 1`)
  return {
    latestProductionDate,
    latestEnvDate,
    latestIncidentDate,
    lastImport: lastImport
      ? {
          entity: lastImport.entity,
          filename: lastImport.filename,
          rowsOk: lastImport.rows_ok,
          rowsFailed: lastImport.rows_failed,
          createdAt: lastImport.created_at,
        }
      : null,
  }
}

export interface ImportBatchRow {
  id: number
  entity: string
  filename: string
  rowsOk: number
  rowsFailed: number
  errors: unknown
  createdAt: string
}

export async function listImportBatches(limit = 20): Promise<ImportBatchRow[]> {
  await connection()
  const rows = all<{
    id: number
    entity: string
    filename: string
    rows_ok: number
    rows_failed: number
    errors_json: string
    created_at: string
  }>(
    `SELECT id, entity, filename, rows_ok, rows_failed, errors_json, created_at
       FROM import_batches ORDER BY id DESC LIMIT ?`,
    [limit],
  )
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    filename: r.filename,
    rowsOk: r.rows_ok,
    rowsFailed: r.rows_failed,
    errors: safeParse(r.errors_json),
    createdAt: r.created_at,
  }))
}

export interface AuditLogRow {
  id: number
  action: string
  detail: string | null
  createdAt: string
}

export async function getAuditLog(limit = 10): Promise<AuditLogRow[]> {
  await connection()
  const rows = all<{
    id: number
    action: string
    detail: string | null
    created_at: string
  }>(`SELECT id, action, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ?`, [limit])
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    detail: r.detail,
    createdAt: r.created_at,
  }))
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}
