/**
 * CSV import pipeline — parse → fuzzy header mapping → per-row Zod validation
 * → entity-specific DB row objects. Pure (no DB access): id resolution comes
 * from caller-provided lookup maps, which keeps this module unit-testable.
 */
import Papa from 'papaparse'
import type { ImportEntity } from './enums'
import {
  envReadingSchema,
  equipmentEventSchema,
  incidentSchema,
  productionSchema,
  shipmentSchema,
} from './validation'

export interface RowError {
  /** 1-based line number in the uploaded file (header = line 1). */
  line: number
  column?: string
  message: string
}

export interface ResolveContext {
  /** keyed by site CODE (upper) and NAME (lower) → id */
  siteIds: Map<string, number>
  /** keyed by equipment CODE (upper) and NAME (lower) → id */
  equipmentIds: Map<string, number>
}

export interface CsvResult {
  /** number of data rows seen */
  total: number
  /** validated rows, keyed by exact DB column names — ready for INSERT */
  rows: Record<string, unknown>[]
  /** row-level failures (display-capped) */
  errors: RowError[]
  /** total failures including those beyond the display cap */
  errorCount: number
  /** file-level failure (unreadable CSV / missing columns / no header) */
  fatal?: string
}

const DISPLAY_CAP = 25

/** 'Ore Tonnes (t)' → 'oretonnes' (parenthesised units stripped first) */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/g, '')
}

/** Lookup keys for a human identifier: CODE (upper) and NAME (lower). */
export function contextKeys(s: string): string[] {
  const t = s.trim()
  return [t.toUpperCase(), t.toLowerCase()]
}

/* ---------------------------------------------------------------- specs */

/** canonical field → accepted normalised header aliases (canonical always accepted) */
const ALIASES: Record<ImportEntity, Record<string, string[]>> = {
  production: {
    site: ['sitecode', 'sitename', 'mine', 'operation', 'minecode'],
    date: ['day', 'dateiso'],
    ore_tonnes: ['ore', 'oret', 'oretonne'],
    waste_tonnes: ['waste', 'wastet'],
    concentrate_tonnes: ['concentrate', 'conc', 'conct', 'product'],
    head_grade_pct: ['grade', 'headgrade', 'gradepercent'],
    recovery_pct: ['recovery', 'recov'],
    throughput_tpd: ['throughput', 'feed', 'plantfeed'],
  },
  equipment_events: {
    equipment: ['unit', 'machine', 'equipmentcode', 'asset', 'assetcode'],
    date: ['day'],
    running_hours: ['running', 'runhours', 'runhrs', 'hoursrun'],
    downtime_hours: ['downtime', 'downhours', 'downhrs', 'hoursdown'],
    downtime_reason: ['reason', 'downreason', 'failure'],
    fuel_litres: ['fuel', 'fuellitres', 'fuelliters', 'diesel'],
  },
  safety: {
    site: ['sitecode', 'sitename', 'mine'],
    date: ['day'],
    type: ['incidenttype', 'eventtype'],
    severity: ['sev'],
    description: ['details', 'desc', 'summary'],
    lost_time_days: ['losttime', 'lostdays', 'ltdays'],
    reported_by: ['reporter', 'reportedby'],
  },
  environment: {
    site: ['sitecode', 'sitename', 'mine'],
    date: ['day'],
    water_withdrawal_m3: ['water', 'withdrawal', 'waterwithdrawal'],
    water_recycled_pct: ['recycle', 'recycled', 'recyclepct'],
    energy_mwh: ['energy'],
    co2e_tonnes: ['co2', 'co2e', 'emissions', 'carbon'],
    tailings_level_pct: ['tailings', 'damlevel', 'tailingslevel', 'pondlevel'],
  },
  shipments: {
    site: ['sitecode', 'sitename', 'mine'],
    product: ['mineral', 'commodity'],
    tonnes: ['quantity', 'qty', 'volume'],
    destination: ['port'],
    customer: ['buyer', 'offtaker', 'client'],
    status: ['state'],
    eta: ['etaiso'],
    shipped_date: ['shipdate', 'shippingdate', 'dispatchdate'],
    price_usd_per_t: ['price', 'unitprice', 'priceusd'],
  },
}

/** DB columns inserted per entity (order matters for VALUES binding). */
export const ENTITY_COLUMNS: Record<ImportEntity, readonly string[]> = {
  production: [
    'site_id',
    'date',
    'ore_tonnes',
    'waste_tonnes',
    'concentrate_tonnes',
    'head_grade_pct',
    'recovery_pct',
    'throughput_tpd',
  ],
  equipment_events: ['equipment_id', 'date', 'running_hours', 'downtime_hours', 'downtime_reason', 'fuel_litres'],
  safety: [
    'site_id',
    'date',
    'type',
    'severity',
    'description',
    'lost_time_days',
    'reported_by',
    'status',
    'created_at',
  ],
  environment: [
    'site_id',
    'date',
    'water_withdrawal_m3',
    'water_recycled_pct',
    'energy_mwh',
    'co2e_tonnes',
    'tailings_level_pct',
  ],
  shipments: [
    'site_id',
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

/** Downloadable template headers (first column is the foreign key). */
export const TEMPLATE_HEADERS: Record<ImportEntity, readonly string[]> = {
  production: ['site', 'date', 'ore_tonnes', 'waste_tonnes', 'concentrate_tonnes', 'head_grade_pct', 'recovery_pct', 'throughput_tpd'],
  equipment_events: ['equipment', 'date', 'running_hours', 'downtime_hours', 'downtime_reason', 'fuel_litres'],
  safety: ['site', 'date', 'type', 'severity', 'description', 'lost_time_days', 'reported_by'],
  environment: ['site', 'date', 'water_withdrawal_m3', 'water_recycled_pct', 'energy_mwh', 'co2e_tonnes', 'tailings_level_pct'],
  shipments: ['site', 'product', 'tonnes', 'destination', 'customer', 'status', 'eta', 'shipped_date', 'price_usd_per_t'],
}

const SCHEMAS = {
  production: productionSchema,
  equipment_events: equipmentEventSchema,
  safety: incidentSchema,
  environment: envReadingSchema,
  shipments: shipmentSchema,
} as const

const REQUIRED: Record<ImportEntity, string[]> = {
  production: ['site', 'date', 'ore_tonnes', 'waste_tonnes', 'concentrate_tonnes', 'head_grade_pct', 'recovery_pct', 'throughput_tpd'],
  equipment_events: ['equipment', 'date', 'running_hours', 'downtime_hours'],
  safety: ['site', 'date', 'type', 'severity', 'description', 'lost_time_days'],
  environment: ['site', 'date', 'water_withdrawal_m3', 'water_recycled_pct', 'energy_mwh', 'co2e_tonnes', 'tailings_level_pct'],
  shipments: ['site', 'product', 'tonnes', 'destination', 'customer', 'status', 'price_usd_per_t'],
}

/* ------------------------------------------------------------ parsing */

export interface ParsedCsv {
  headers: string[]
  records: Record<string, string>[]
  fatal?: string
}

export function parseCsvText(text: string): ParsedCsv {
  const cleaned = text.replace(/^﻿/, '')
  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  const headers = (result.meta.fields ?? []).filter((f) => f.length > 0)
  if (headers.length === 0) {
    return { headers: [], records: [], fatal: 'No header row found in the file.' }
  }
  const fatal = result.errors.find((e) => e.code === 'UndetectableDelimiter')?.message
  return { headers, records: result.data, fatal }
}

/** header → canonical field (exact canonical match first, then aliases) */
export function buildHeaderMap(entity: ImportEntity, headers: readonly string[]): Map<string, string> {
  const aliases = ALIASES[entity]
  const map = new Map<string, string>()
  const claimed = new Set<string>()

  for (const header of headers) {
    const n = normalizeHeader(header)
    for (const field of Object.keys(aliases)) {
      if (n === normalizeHeader(field) && !claimed.has(field)) {
        map.set(header, field)
        claimed.add(field)
      }
    }
  }
  for (const header of headers) {
    if (map.has(header)) continue
    const n = normalizeHeader(header)
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (claimed.has(field)) continue
      if (aliasList.some((a) => normalizeHeader(a) === n)) {
        map.set(header, field)
        claimed.add(field)
        break
      }
    }
  }
  return map
}

/** Map a raw record → canonical input object using the fuzzy header map. */
export function canonicalize(
  headerMap: Map<string, string>,
  record: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [header, field] of headerMap) {
    const value = record[header]
    out[field] = value === undefined || value.trim() === '' ? undefined : value.trim()
  }
  return out
}

function resolveId(raw: unknown, map: Map<string, number>): number | undefined {
  if (typeof raw !== 'string') return undefined
  for (const key of contextKeys(raw)) {
    const id = map.get(key)
    if (id !== undefined) return id
  }
  return undefined
}

/* ------------------------------------------------------- full pipeline */

export function validateCsv(entity: ImportEntity, text: string, ctx: ResolveContext): CsvResult {
  const parsed = parseCsvText(text)
  if (parsed.fatal) return { total: 0, rows: [], errors: [], errorCount: 0, fatal: parsed.fatal }

  const headerMap = buildHeaderMap(entity, parsed.headers)
  const mapped = [...headerMap.values()]
  const missing = REQUIRED[entity].filter((f) => !mapped.includes(f))
  if (missing.length > 0) {
    const message = `Missing required column(s): ${missing.join(', ')}`
    return {
      total: parsed.records.length,
      rows: [],
      errors: [{ line: 1, message }],
      errorCount: missing.length,
      fatal: message,
    }
  }

  const schema = SCHEMAS[entity]
  const rows: Record<string, unknown>[] = []
  const errors: RowError[] = []
  let errorCount = 0

  parsed.records.forEach((record, idx) => {
    const line = idx + 2 // header is line 1
    const canonical = canonicalize(headerMap, record)

    // FK resolution (clearer errors than zod's "expected string") — the raw
    // identifier stays in `canonical` so the schema can still validate it.
    let siteId: number | undefined
    if (typeof canonical.site === 'string' && canonical.site !== '') {
      siteId = resolveId(canonical.site, ctx.siteIds)
      if (siteId === undefined) {
        errors.push({ line, column: 'site', message: `Unknown site "${canonical.site}"` })
        errorCount++
        return
      }
    }
    let equipmentId: number | undefined
    if (typeof canonical.equipment === 'string' && canonical.equipment !== '') {
      equipmentId = resolveId(canonical.equipment, ctx.equipmentIds)
      if (equipmentId === undefined) {
        errors.push({ line, column: 'equipment', message: `Unknown equipment "${canonical.equipment}"` })
        errorCount++
        return
      }
    }

    const result = schema.safeParse(canonical)
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ line, column: String(issue.path[0] ?? ''), message: issue.message })
        errorCount++
      }
      return
    }
    rows.push(toDbRow(entity, result.data, { siteId, equipmentId }))
  })

  return { total: parsed.records.length, rows, errors: errors.slice(0, DISPLAY_CAP), errorCount }
}

export interface ResolvedIds {
  siteId?: number
  equipmentId?: number
}

/** canonical input (validated) → DB row keyed by ENTITY_COLUMNS */
export function toDbRow(
  entity: ImportEntity,
  data: Record<string, unknown>,
  ids: ResolvedIds = {},
): Record<string, unknown> {
  if (entity === 'safety') {
    return {
      site_id: ids.siteId ?? null,
      date: data.date,
      type: data.type,
      severity: data.severity,
      description: data.description,
      lost_time_days: data.lost_time_days ?? 0,
      reported_by: data.reported_by ?? null,
      status: 'open',
      created_at: `${data.date as string}T09:00:00`,
    }
  }
  const row: Record<string, unknown> = {}
  for (const column of ENTITY_COLUMNS[entity]) {
    if (column === 'site_id') row.site_id = ids.siteId ?? null
    else if (column === 'equipment_id') row.equipment_id = ids.equipmentId ?? null
    else row[column] = data[column] ?? null
  }
  return row
}
