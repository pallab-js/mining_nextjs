/**
 * CSV import contract shared by the server actions and the browser wizard.
 * Deliberately dependency-free so client components can import it without
 * pulling in the parser or the database layer.
 */
import type { ImportEntity } from './enums'

export interface ImportRowError {
  /** 1-based line number in the uploaded file (header = line 1). */
  line: number
  /** canonical field the error belongs to, when known */
  column?: string
  message: string
}

/** Result of validating (and optionally committing) a CSV payload. */
export interface ImportReport {
  entity: ImportEntity
  filename: string
  /** data rows seen in the file */
  total: number
  /** rows that passed validation */
  valid: number
  /** rows rejected (may exceed the number of listed errors) */
  errorCount: number
  /** the first N errors (display-capped by the server) */
  errors: ImportRowError[]
  /** set when the file itself is unusable (bad headers, unparseable) */
  fatal?: string
  /** true once the rows have been written to the database */
  committed?: boolean
  /** rows actually written (upserts counted) */
  inserted?: number
}

/** Downloadable template headers (first column is the foreign key). */
export const TEMPLATE_HEADERS: Record<ImportEntity, readonly string[]> = {
  production: [
    'site',
    'date',
    'ore_tonnes',
    'waste_tonnes',
    'concentrate_tonnes',
    'head_grade_pct',
    'recovery_pct',
    'throughput_tpd',
  ],
  equipment_events: [
    'equipment',
    'date',
    'running_hours',
    'downtime_hours',
    'downtime_reason',
    'fuel_litres',
  ],
  safety: ['site', 'date', 'type', 'severity', 'description', 'lost_time_days', 'reported_by'],
  environment: [
    'site',
    'date',
    'water_withdrawal_m3',
    'water_recycled_pct',
    'energy_mwh',
    'co2e_tonnes',
    'tailings_level_pct',
  ],
  shipments: [
    'site',
    'product',
    'tonnes',
    'destination',
    'customer',
    'status',
    'eta',
    'shipped_date',
    'price_usd_per_t',
  ],
}

/** One illustrative row per entity — the template's second line. */
export const TEMPLATE_SAMPLES: Record<ImportEntity, readonly string[]> = {
  production: ['SAL', '2026-10-21', '12500', '9800', '640', '3.42', '88.5', '12500'],
  equipment_events: ['SAL-DRL-01', '2026-10-21', '20', '4', 'hydraulic fault', '320'],
  safety: ['GBR', '2026-10-21', 'near-miss', 'low', 'Loader reversed near bench edge', '0', ''],
  environment: ['BAL', '2026-10-21', '420', '62', '310', '240', '71.5'],
  shipments: ['MWE', 'lithium', '850', 'Port Hedland', 'Aurum Refining', 'in-transit', '2026-11-04', '', '14500'],
}

/** Human label for each importable entity. */
export const IMPORT_LABELS: Record<ImportEntity, string> = {
  production: 'Production',
  equipment_events: 'Equipment events',
  safety: 'Safety incidents',
  environment: 'Environment readings',
  shipments: 'Shipments',
}

/** Build the downloadable template text (header + one example row). */
export function templateCsv(entity: ImportEntity): string {
  const header = TEMPLATE_HEADERS[entity].join(',')
  const sample = TEMPLATE_SAMPLES[entity].map(quoteCell).join(',')
  return `${header}\n${sample}\n`
}

function quoteCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
