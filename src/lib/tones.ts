/**
 * One tone vocabulary for statuses & severities across all modules.
 * Keeps every page saying the same thing about the same state.
 */
import type { DotTone } from '@/components/ui/status-dot'

const SITE_STATUS: Record<string, DotTone> = {
  active: 'good',
  care: 'warn',
  care_and_maintenance: 'warn',
  suspended: 'bad',
  closed: 'idle',
}

const EQUIP_STATUS: Record<string, DotTone> = {
  operational: 'good',
  standby: 'idle',
  maintenance: 'warn',
  down: 'bad',
}

const SHIPMENT_STATUS: Record<string, DotTone> = {
  planned: 'idle',
  'in-transit': 'warn',
  delivered: 'good',
  delayed: 'bad',
}

const SEVERITY: Record<string, DotTone> = {
  low: 'idle',
  medium: 'warn',
  high: 'bad',
  critical: 'bad',
}

const INCIDENT_STATUS: Record<string, DotTone> = {
  open: 'bad',
  closed: 'good',
}

const MAPS: Record<string, Record<string, DotTone>> = {
  site: SITE_STATUS,
  equipment: EQUIP_STATUS,
  shipment: SHIPMENT_STATUS,
  severity: SEVERITY,
  incident: INCIDENT_STATUS,
}

/** Fallback tone for unmapped values: text → idle. */
export function toneFor(kind: keyof typeof MAPS | string, value: string | null | undefined): DotTone {
  if (!value) return 'idle'
  return MAPS[kind]?.[value.toLowerCase()] ?? 'idle'
}

/** Humanise a raw enum value: 'care_and_maintenance' → 'Care & maintenance'. */
export function humanize(v: string | null | undefined): string {
  if (!v) return '—'
  return v
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bAnd\b/g, '&')
}
