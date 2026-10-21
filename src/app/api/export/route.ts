/**
 * JSON export — a full dump of every table as a downloadable attachment.
 * `connection()` keeps the handler request-time so the dump is never cached.
 */
import { connection } from 'next/server'
import { getSQLite } from '@/lib/db'

const TABLES = [
  'sites',
  'equipment',
  'production_daily',
  'equipment_events',
  'safety_incidents',
  'env_readings',
  'stockpiles',
  'shipments',
  'alert_rules',
  'import_batches',
] as const

export async function GET() {
  await connection()
  const db = getSQLite()

  const tables: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}
  for (const table of TABLES) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all()
    tables[table] = rows
    counts[table] = rows.length
  }

  const exportedAt = new Date().toISOString()
  const body = JSON.stringify(
    { app: 'COMC — Critical Minerals Operations Center', exportedAt, counts, tables },
    null,
    2,
  )

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="comc-export-${exportedAt.slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
