/**
 * Field specs for every record form. Plain data only — server pages build
 * these and hand them to the client ActionForm.
 */
import {
  COMPARATORS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  INCIDENT_TYPES,
  MINE_TYPES,
  MINERALS,
  SEVERITIES,
  SHIPMENT_STATUSES,
  SITE_STATUSES,
} from './enums'
import { METRICS } from './metrics'
import { enumOptions, humanizeWord, siteOptions, today, type FieldSpec, type SiteOpt } from './forms'

export interface EquipmentOpt {
  id: number
  code: string
  name: string
}

const MINERAL_OPTIONS = enumOptions(MINERALS)
const MINE_TYPE_OPTIONS = enumOptions(MINE_TYPES)
const SITE_STATUS_OPTIONS = enumOptions(SITE_STATUSES)
const SEVERITY_OPTIONS = enumOptions(SEVERITIES)
const SHIPMENT_STATUS_OPTIONS = enumOptions(SHIPMENT_STATUSES)

export function siteFields(defaults?: Partial<Record<string, string>>): FieldSpec[] {
  return [
    { name: 'code', label: 'Code', type: 'text', defaultValue: defaults?.code, placeholder: 'e.g. NBO-1', hint: 'Unique, 2–12 chars' },
    { name: 'name', label: 'Name', type: 'text', defaultValue: defaults?.name, placeholder: 'e.g. Northern Basin Operation' },
    { name: 'mineral', label: 'Mineral', type: 'select', options: MINERAL_OPTIONS, defaultValue: defaults?.mineral },
    { name: 'region', label: 'Region', type: 'text', defaultValue: defaults?.region, placeholder: 'e.g. Pilbara, WA' },
    { name: 'mine_type', label: 'Mine type', type: 'select', options: MINE_TYPE_OPTIONS, defaultValue: defaults?.mine_type },
    { name: 'status', label: 'Status', type: 'select', options: SITE_STATUS_OPTIONS, defaultValue: defaults?.status ?? 'active' },
    { name: 'capacity_tpd', label: 'Capacity (t/d)', type: 'number', step: 'any', min: '0', defaultValue: defaults?.capacity_tpd },
    { name: 'opened_date', label: 'Opened', type: 'date', defaultValue: defaults?.opened_date },
    { name: 'lat', label: 'Latitude', type: 'number', step: 'any', defaultValue: defaults?.lat },
    { name: 'lon', label: 'Longitude', type: 'number', step: 'any', defaultValue: defaults?.lon },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, defaultValue: defaults?.description },
  ]
}

export function productionFields(sites: SiteOpt[], defaultSite?: string): FieldSpec[] {
  return [
    { name: 'site', label: 'Site', type: 'select', options: siteOptions(sites), defaultValue: defaultSite },
    { name: 'date', label: 'Date', type: 'date', defaultValue: today() },
    { name: 'ore_tonnes', label: 'Ore (t)', type: 'number', step: 'any', min: '0' },
    { name: 'waste_tonnes', label: 'Waste (t)', type: 'number', step: 'any', min: '0' },
    { name: 'concentrate_tonnes', label: 'Concentrate (t)', type: 'number', step: 'any', min: '0' },
    { name: 'head_grade_pct', label: 'Head grade %', type: 'number', step: 'any', min: '0', max: '100' },
    { name: 'recovery_pct', label: 'Recovery %', type: 'number', step: 'any', min: '0', max: '100' },
    { name: 'throughput_tpd', label: 'Throughput (t/d)', type: 'number', step: 'any', min: '0' },
  ]
}

export function equipmentEventFields(equipment: EquipmentOpt[], defaultUnit?: string): FieldSpec[] {
  return [
    {
      name: 'equipment',
      label: 'Unit',
      type: 'select',
      options: equipment.map((e) => ({ value: e.code, label: `${e.code} — ${e.name}` })),
      defaultValue: defaultUnit,
    },
    { name: 'date', label: 'Date', type: 'date', defaultValue: today() },
    { name: 'running_hours', label: 'Running hours', type: 'number', step: 'any', min: '0', max: '24' },
    { name: 'downtime_hours', label: 'Downtime hours', type: 'number', step: 'any', min: '0', max: '24' },
    { name: 'downtime_reason', label: 'Downtime reason', type: 'text', placeholder: 'e.g. hydraulic fault' },
    { name: 'fuel_litres', label: 'Fuel (L)', type: 'number', step: 'any', min: '0' },
  ]
}

export function equipmentFields(sites: SiteOpt[], defaultSite?: string): FieldSpec[] {
  return [
    { name: 'site', label: 'Site', type: 'select', options: siteOptions(sites), defaultValue: defaultSite },
    { name: 'code', label: 'Code', type: 'text', placeholder: 'e.g. EX-104' },
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Haul Truck 104' },
    { name: 'type', label: 'Type', type: 'select', options: enumOptions(EQUIPMENT_TYPES) },
    { name: 'status', label: 'Status', type: 'select', options: enumOptions(EQUIPMENT_STATUSES), defaultValue: 'operational' },
    { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { name: 'model', label: 'Model', type: 'text' },
    { name: 'capacity', label: 'Capacity', type: 'number', step: 'any', min: '0' },
    { name: 'installed_date', label: 'Installed', type: 'date' },
  ]
}

export function incidentFields(sites: SiteOpt[], defaultSite?: string): FieldSpec[] {
  return [
    { name: 'site', label: 'Site', type: 'select', options: siteOptions(sites), defaultValue: defaultSite },
    { name: 'date', label: 'Date', type: 'date', defaultValue: today() },
    { name: 'type', label: 'Incident type', type: 'select', options: enumOptions(INCIDENT_TYPES) },
    { name: 'severity', label: 'Severity', type: 'select', options: SEVERITY_OPTIONS },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, placeholder: 'What happened?' },
    { name: 'lost_time_days', label: 'Lost-time days', type: 'number', step: 'any', min: '0', defaultValue: '0' },
    { name: 'reported_by', label: 'Reported by', type: 'text' },
  ]
}

export function envReadingFields(sites: SiteOpt[], defaultSite?: string): FieldSpec[] {
  return [
    { name: 'site', label: 'Site', type: 'select', options: siteOptions(sites), defaultValue: defaultSite },
    { name: 'date', label: 'Date', type: 'date', defaultValue: today() },
    { name: 'water_withdrawal_m3', label: 'Water withdrawal (m³)', type: 'number', step: 'any', min: '0' },
    { name: 'water_recycled_pct', label: 'Water recycled %', type: 'number', step: 'any', min: '0', max: '100' },
    { name: 'energy_mwh', label: 'Energy (MWh)', type: 'number', step: 'any', min: '0' },
    { name: 'co2e_tonnes', label: 'CO₂e (t)', type: 'number', step: 'any', min: '0' },
    { name: 'tailings_level_pct', label: 'Tailings level %', type: 'number', step: 'any', min: '0', max: '100' },
  ]
}

export function stockpileFields(sites: SiteOpt[], defaultSite?: string): FieldSpec[] {
  return [
    { name: 'site', label: 'Site', type: 'select', options: siteOptions(sites), defaultValue: defaultSite },
    { name: 'product', label: 'Product', type: 'select', options: MINERAL_OPTIONS },
    { name: 'grade_pct', label: 'Grade %', type: 'number', step: 'any', min: '0', max: '100' },
    { name: 'tonnes', label: 'Tonnes', type: 'number', step: 'any', min: '0' },
  ]
}

export function shipmentFields(sites: SiteOpt[], defaultSite?: string): FieldSpec[] {
  return [
    { name: 'site', label: 'Site', type: 'select', options: siteOptions(sites), defaultValue: defaultSite },
    { name: 'product', label: 'Product', type: 'select', options: MINERAL_OPTIONS },
    { name: 'tonnes', label: 'Tonnes', type: 'number', step: 'any', min: '0' },
    { name: 'status', label: 'Status', type: 'select', options: SHIPMENT_STATUS_OPTIONS, defaultValue: 'planned' },
    { name: 'destination', label: 'Destination', type: 'text', placeholder: 'e.g. Port Hedland' },
    { name: 'customer', label: 'Customer', type: 'text', placeholder: 'e.g. Aurum Refining' },
    { name: 'eta', label: 'ETA', type: 'date' },
    { name: 'shipped_date', label: 'Shipped', type: 'date' },
    { name: 'price_usd_per_t', label: 'Price (USD/t)', type: 'number', step: 'any', min: '0' },
  ]
}

export function alertRuleFields(sites: SiteOpt[]): FieldSpec[] {
  return [
    { name: 'name', label: 'Rule name', type: 'text', placeholder: 'e.g. Recovery below target' },
    {
      name: 'metric',
      label: 'Metric',
      type: 'select',
      options: Object.values(METRICS).map((m) => ({ value: m.key, label: `${m.label} (${m.unit})` })),
    },
    { name: 'comparator', label: 'Comparator', type: 'select', options: enumOptions(COMPARATORS) },
    { name: 'threshold', label: 'Threshold', type: 'number', step: 'any' },
    { name: 'severity', label: 'Severity', type: 'select', options: SEVERITY_OPTIONS },
    {
      name: 'site',
      label: 'Scope',
      type: 'select',
      options: [{ value: '', label: 'All sites' }, ...siteOptions(sites)],
      hint: 'Leave on “All sites” for a portfolio-wide rule.',
    },
  ]
}

export { humanizeWord }
