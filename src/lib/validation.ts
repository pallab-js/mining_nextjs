/**
 * Zod schemas — ONE validation pipeline for manual forms and CSV import.
 * Field naming convention: snake_case everywhere (form input names = CSV
 * columns = schema keys), with site/equipment referenced by `site`/`equipment`
 * identifier (code or name) and resolved to ids by the caller.
 */
import { z } from 'zod'
import {
  COMPARATORS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  INCIDENT_TYPES,
  METRIC_KEYS,
  MINE_TYPES,
  MINERALS,
  SEVERITIES,
  SHIPMENT_STATUSES,
  SITE_STATUSES,
} from './enums'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
const num = z.coerce.number().finite()
const nonNeg = num.min(0, 'must be ≥ 0')
const positive = num.positive('must be > 0')
const pct = num.min(0, 'must be ≥ 0').max(100, 'must be ≤ 100')
const optionalNum = nonNeg.optional()
const shortStr = z.string().trim().min(1, 'required')
const longStr = z.string().trim().min(3, 'describe in at least 3 characters')

/* ---------------------------------------------------------------- forms */

export const siteSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, 'letters, digits and dashes only')
    .toUpperCase(),
  name: z.string().trim().min(2),
  mineral: z.enum(MINERALS),
  region: z.string().trim().min(2),
  mine_type: z.enum(MINE_TYPES),
  status: z.enum(SITE_STATUSES),
  capacity_tpd: positive,
  lat: num.min(-90).max(90).optional(),
  lon: num.min(-180).max(180).optional(),
  opened_date: isoDate.optional(),
  description: z.string().trim().max(600).optional(),
})

export const productionSchema = z.object({
  site: shortStr,
  date: isoDate,
  ore_tonnes: nonNeg,
  waste_tonnes: nonNeg,
  concentrate_tonnes: nonNeg,
  head_grade_pct: pct,
  recovery_pct: pct,
  throughput_tpd: nonNeg,
})

export const equipmentEventSchema = z.object({
  equipment: shortStr,
  date: isoDate,
  running_hours: num.min(0).max(24, 'must be ≤ 24'),
  downtime_hours: num.min(0).max(24, 'must be ≤ 24'),
  downtime_reason: z.string().trim().max(120).optional(),
  fuel_litres: optionalNum,
})

export const equipmentSchema = z.object({
  site: shortStr,
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/, 'letters, digits and dashes only')
    .toUpperCase(),
  name: z.string().trim().min(2),
  type: z.enum(EQUIPMENT_TYPES),
  status: z.enum(EQUIPMENT_STATUSES),
  manufacturer: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  capacity: nonNeg.optional(),
  installed_date: isoDate.optional(),
})

export const incidentSchema = z.object({
  site: shortStr,
  date: isoDate,
  type: z.enum(INCIDENT_TYPES),
  severity: z.enum(SEVERITIES),
  description: longStr,
  lost_time_days: num.int().min(0),
  reported_by: z.string().trim().max(60).optional(),
})

export const envReadingSchema = z.object({
  site: shortStr,
  date: isoDate,
  water_withdrawal_m3: nonNeg,
  water_recycled_pct: pct,
  energy_mwh: nonNeg,
  co2e_tonnes: nonNeg,
  tailings_level_pct: pct,
})

export const stockpileSchema = z.object({
  site: shortStr,
  product: z.enum(MINERALS),
  grade_pct: pct,
  tonnes: nonNeg,
})

export const shipmentSchema = z.object({
  site: shortStr,
  product: z.enum(MINERALS),
  tonnes: positive,
  destination: shortStr,
  customer: shortStr,
  status: z.enum(SHIPMENT_STATUSES),
  eta: isoDate.optional(),
  shipped_date: isoDate.optional(),
  price_usd_per_t: nonNeg,
})

export const alertRuleSchema = z.object({
  name: z.string().trim().min(3).max(80),
  metric: z.enum(METRIC_KEYS),
  comparator: z.enum(COMPARATORS),
  threshold: num,
  severity: z.enum(SEVERITIES),
  site: z.string().trim().optional(), // '' / undefined = global rule
})

/* ------------------------------------------------------------- helpers */

/** FormData → plain object; blank inputs become undefined (so .optional() works). */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of fd.entries()) {
    if (typeof value !== 'string') continue
    const v = value.trim()
    out[key] = v === '' ? undefined : v
  }
  return out
}

/** `{ ok: true, data }` | `{ ok: false, fieldErrors, message }` */
export type Parsed<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string[]>; message: string }

export function parseWith<S extends z.ZodType>(schema: S, input: unknown): Parsed<z.infer<S>> {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const k = issue.path.join('.') || '_'
    ;(fieldErrors[k] ??= []).push(issue.message)
  }
  return { ok: false, fieldErrors, message: 'Please correct the highlighted fields.' }
}
