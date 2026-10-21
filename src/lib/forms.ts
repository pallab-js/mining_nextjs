/**
 * Form field specs — serialisable descriptions of a form's inputs.
 * Server pages build these; the client ActionForm renders them. No functions
 * cross the boundary, only plain data.
 */

export interface SelectOpt {
  value: string
  label: string
}

export interface FieldSpec {
  name: string
  label?: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'hidden'
  options?: SelectOpt[]
  defaultValue?: string
  placeholder?: string
  step?: string
  min?: string
  max?: string
  hint?: string
  span?: 2
}

export interface SiteOpt {
  id: number
  code: string
  name: string
}

/** Site select options, labelled "CODE — Name". */
export function siteOptions(sites: SiteOpt[]): SelectOpt[] {
  return sites.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }))
}

/** Options from an enum list, humanised ("care-maintenance" → "Care Maintenance"). */
export function enumOptions(values: readonly string[], labels?: Record<string, string>): SelectOpt[] {
  return values.map((v) => ({ value: v, label: labels?.[v] ?? humanizeWord(v) }))
}

export function humanizeWord(v: string): string {
  return v
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Today as YYYY-MM-DD (local). */
export function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
