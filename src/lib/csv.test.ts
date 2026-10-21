import { describe, expect, it } from 'vitest'
import {
  buildHeaderMap,
  canonicalize,
  contextKeys,
  normalizeHeader,
  parseCsvText,
  toDbRow,
  validateCsv,
  type ResolveContext,
} from './csv'

const ctx: ResolveContext = {
  siteIds: new Map([
    ['SAL', 1],
    ['sal atacama lithium', 1],
    ['GBR', 2],
    ['greenbushes ridge', 2],
  ]),
  equipmentIds: new Map([
    ['GBR-HLT-01', 41],
    ['GBR-HLT-01'.toLowerCase(), 41],
  ]),
}

describe('normalizeHeader', () => {
  it('strips case, spaces and punctuation', () => {
    expect(normalizeHeader('Ore Tonnes (t)')).toBe('oretonnes')
    expect(normalizeHeader('  Head-Grade %')).toBe('headgrade')
    expect(normalizeHeader('CO2e (t)')).toBe('co2e')
  })
})

describe('contextKeys', () => {
  it('produces upper (code) and lower (name) forms', () => {
    expect(contextKeys('SAL')).toEqual(['SAL', 'sal'])
    expect(contextKeys('Greenbushes Ridge ')).toEqual(['GREENBUSHES RIDGE', 'greenbushes ridge'])
  })
})

describe('buildHeaderMap', () => {
  it('maps exact canonical headers', () => {
    const m = buildHeaderMap('production', ['site', 'date', 'ore_tonnes'])
    expect(m.get('site')).toBe('site')
    expect(m.get('ore_tonnes')).toBe('ore_tonnes')
  })
  it('maps aliases case/spacing-insensitively', () => {
    const m = buildHeaderMap('production', ['Mine Code', 'ORE TONNES', 'Grade', 'Recov'])
    expect(m.get('Mine Code')).toBe('site')
    expect(m.get('ORE TONNES')).toBe('ore_tonnes')
    expect(m.get('Grade')).toBe('head_grade_pct')
    expect(m.get('Recov')).toBe('recovery_pct')
  })
  it('ignores unknown columns', () => {
    const m = buildHeaderMap('production', ['site', 'comment'])
    expect(m.has('comment')).toBe(false)
  })
})

describe('parseCsvText', () => {
  it('parses header + records', () => {
    const out = parseCsvText('site,date,ore_tonnes\nSAL,2026-01-01,100\n')
    expect(out.headers).toEqual(['site', 'date', 'ore_tonnes'])
    expect(out.records).toHaveLength(1)
  })
  it('flags empty files', () => {
    expect(parseCsvText('').fatal).toBeTruthy()
  })
})

describe('validateCsv (production)', () => {
  const csv = [
    'site,date,ore_tonnes,waste_tonnes,concentrate_tonnes,head_grade_pct,recovery_pct,throughput_tpd',
    'SAL,2026-01-01,1000,120,12,0.61,88,950',
    'greenbushes ridge,2026-01-01,2000,8400,104,1.42,91,1900',
  ].join('\n')

  it('accepts valid rows resolving site by code and by name', () => {
    const out = validateCsv('production', csv, ctx)
    expect(out.fatal).toBeUndefined()
    expect(out.total).toBe(2)
    expect(out.rows).toHaveLength(2)
    expect(out.rows[0].site_id).toBe(1)
    expect(out.rows[1].site_id).toBe(2)
    expect(out.rows[0].ore_tonnes).toBe(1000)
  })

  it('reports unknown sites with line + column', () => {
    const bad = csv + '\nNowhere,2026-01-02,1,1,1,1,1,1'
    const out = validateCsv('production', bad, ctx)
    expect(out.rows).toHaveLength(2)
    expect(out.errorCount).toBe(1)
    expect(out.errors[0]).toMatchObject({ line: 4, column: 'site' })
    expect(out.errors[0].message).toContain('Nowhere')
  })

  it('reports out-of-range values from zod', () => {
    const bad = 'site,date,ore_tonnes,waste_tonnes,concentrate_tonnes,head_grade_pct,recovery_pct,throughput_tpd\nSAL,2026-01-01,1,1,1,1,150,1'
    const out = validateCsv('production', bad, ctx)
    expect(out.rows).toHaveLength(0)
    expect(out.errors[0].column).toBe('recovery_pct')
  })

  it('fails fast with fatal when required columns are absent', () => {
    const out = validateCsv('production', 'site,date\nSAL,2026-01-01', ctx)
    expect(out.fatal).toContain('ore_tonnes')
    expect(out.rows).toHaveLength(0)
  })
})

describe('validateCsv (equipment_events + safety)', () => {
  it('resolves equipment by code and builds DB row', () => {
    const csv = [
      'equipment,date,running_hours,downtime_hours,downtime_reason,fuel_litres',
      'gbr-hlt-01,2026-01-01,21.5,2.5,Scheduled maintenance,6500',
    ].join('\n')
    const out = validateCsv('equipment_events', csv, ctx)
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].equipment_id).toBe(41)
    expect(out.rows[0].running_hours).toBe(21.5)
    expect(out.rows[0].downtime_reason).toBe('Scheduled maintenance')
  })

  it('defaults safety rows to open with created_at from date', () => {
    const csv = [
      'site,date,type,severity,description,lost_time_days,reported_by',
      'SAL,2026-01-01,near-miss,low,Conveyor restart without warning,0,A. Mokoena',
    ].join('\n')
    const out = validateCsv('safety', csv, ctx)
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].status).toBe('open')
    expect(out.rows[0].created_at).toBe('2026-01-01T09:00:00')
    expect(out.rows[0].site_id).toBe(1)
  })

  it('rejects unknown enum values', () => {
    const csv = 'site,date,type,severity,description,lost_time_days\nSAL,2026-01-01,explosion,low,desc,0'
    const out = validateCsv('safety', csv, ctx)
    expect(out.rows).toHaveLength(0)
    expect(out.errors[0].column).toBe('type')
  })
})

describe('toDbRow / canonicalize', () => {
  it('maps site → site_id and leaves other columns untouched', () => {
    const row = toDbRow(
      'environment',
      {
        site: 'SAL',
        date: '2026-01-01',
        water_withdrawal_m3: 100,
        water_recycled_pct: 80,
        energy_mwh: 10,
        co2e_tonnes: 4,
        tailings_level_pct: 60,
      },
      { siteId: 3 },
    )
    expect(row.site_id).toBe(3)
    expect(row.water_recycled_pct).toBe(80)
    expect(Object.keys(row)).toEqual([
      'site_id',
      'date',
      'water_withdrawal_m3',
      'water_recycled_pct',
      'energy_mwh',
      'co2e_tonnes',
      'tailings_level_pct',
    ])
  })

  it('canonicalize trims and blanks to undefined', () => {
    const map = new Map([['Site', 'site'], ['Notes', 'downtime_reason']])
    const out = canonicalize(map, { Site: '  SAL ', Notes: '  ' })
    expect(out.site).toBe('SAL')
    expect(out.downtime_reason).toBeUndefined()
  })
})
