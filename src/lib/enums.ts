/**
 * Shared enums — the single vocabulary for forms, CSV validation, seed data and UI badges.
 * Kept free of DB/ORM imports so client components can use it safely.
 */

export const MINERALS = [
  'lithium',
  'cobalt',
  'nickel',
  'graphite',
  'rare-earth',
  'copper',
  'manganese',
  'chromite',
] as const
export type Mineral = (typeof MINERALS)[number]

export const MINE_TYPES = ['open-pit', 'underground', 'brine', 'placer'] as const
export type MineType = (typeof MINE_TYPES)[number]

export const SITE_STATUSES = ['active', 'maintenance', 'care-maintenance', 'exploration'] as const
export type SiteStatus = (typeof SITE_STATUSES)[number]

export const EQUIPMENT_TYPES = [
  'drill',
  'excavator',
  'haul-truck',
  'loader',
  'crusher',
  'concentrator',
  'dozer',
  'grader',
] as const
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

export const EQUIPMENT_STATUSES = ['operational', 'maintenance', 'standby', 'down'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export const INCIDENT_TYPES = [
  'injury',
  'near-miss',
  'spill',
  'environmental',
  'vehicle',
] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type Severity = (typeof SEVERITIES)[number]

export const INCIDENT_STATUSES = ['open', 'closed'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export const SHIPMENT_STATUSES = ['planned', 'in-transit', 'delivered', 'delayed'] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

export const COMPARATORS = ['>', '>=', '<', '<='] as const
export type Comparator = (typeof COMPARATORS)[number]

/** Entities accepted by the CSV import wizard. */
export const IMPORT_ENTITIES = [
  'production',
  'equipment_events',
  'safety',
  'environment',
  'shipments',
] as const
export type ImportEntity = (typeof IMPORT_ENTITIES)[number]

/** Metric keys addressable by the alert engine (see lib/metrics.ts). */
export const METRIC_KEYS = [
  'recovery_pct',
  'availability_pct',
  'tailings_level_pct',
  'water_recycled_pct',
  'head_grade_pct',
  'co2e_intensity',
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]

/** Status → signal colour class maps (design system, docs/04). */
export const SITE_STATUS_TONE: Record<SiteStatus, string> = {
  active: 'good',
  maintenance: 'warn',
  'care-maintenance': 'warn',
  exploration: 'dim',
}

export const EQUIPMENT_STATUS_TONE: Record<EquipmentStatus, 'good' | 'warn' | 'bad' | 'dim'> = {
  operational: 'good',
  standby: 'warn',
  maintenance: 'warn',
  down: 'bad',
}

export const SEVERITY_TONE: Record<Severity, 'good' | 'warn' | 'bad' | 'dim'> = {
  low: 'dim',
  medium: 'warn',
  high: 'warn',
  critical: 'bad',
}

export const SHIPMENT_STATUS_TONE: Record<ShipmentStatus, 'good' | 'warn' | 'bad' | 'dim'> = {
  planned: 'dim',
  'in-transit': 'warn',
  delivered: 'good',
  delayed: 'bad',
}
