/**
 * Deterministic demo dataset generator + database reset.
 * Exported so both `scripts/*` and the in-app Settings actions can use it.
 *
 * Determinism: mulberry32 PRNG with a fixed seed — the same run date always
 * produces the same data; the 12-month window simply shifts with the calendar.
 */
import { format, subDays } from 'date-fns'
import { getSQLite } from './index'
import type { EquipmentType } from '../enums'

/* ------------------------------------------------------------------ PRNG */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20261021)
const rnd = () => rng()
const rrange = (min: number, max: number) => min + rnd() * (max - min)
const rint = (min: number, max: number) => Math.floor(rrange(min, max + 1))
const pick = <T>(arr: readonly T[]): T => arr[rint(0, arr.length - 1)]
function wpick<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let r = rnd() * total
  for (const [v, w] of items) {
    r -= w
    if (r <= 0) return v
  }
  return items[items.length - 1][0]
}
const r2 = (n: number) => Math.round(n * 100) / 100

/* --------------------------------------------------------- site profiles */
interface SiteProfile {
  code: string
  name: string
  mineral: string
  region: string
  mineType: string
  capacityTpd: number
  lat: number
  lon: number
  openedDate: string
  description: string
  utilization: number // fraction of design capacity
  strip: number // waste / ore
  yieldPct: number // concentrate / ore
  grade: number // head grade %
  recovery: number // nominal recovery %
  recycleBase: number // water recycled % baseline
  tailBase: number // tailings / pond level % starting point
  energyIntensity: number // MWh per tonne of ore
}

const SITE_PROFILES: SiteProfile[] = [
  {
    code: 'SAL',
    name: 'Salar Atacama Lithium',
    mineral: 'lithium',
    region: 'Atacama, Chile',
    mineType: 'brine',
    capacityTpd: 15000,
    lat: -23.45,
    lon: -68.15,
    openedDate: '1994-06-01',
    description:
      'Brine extraction from sub-surface aquifers with solar evaporation ponds and lime-soda purification to lithium carbonate.',
    utilization: 0.82,
    strip: 0.15,
    yieldPct: 0.012,
    grade: 0.62,
    recovery: 0.89,
    recycleBase: 77,
    tailBase: 58,
    energyIntensity: 0.009,
  },
  {
    code: 'GBR',
    name: 'Greenbushes Ridge',
    mineral: 'lithium',
    region: 'Western Australia',
    mineType: 'open-pit',
    capacityTpd: 18000,
    lat: -33.87,
    lon: 116.06,
    openedDate: '1985-01-15',
    description:
      'Hard-rock spodumene operation mining a pegmatite ridge: direct-feed ore plus tailings retreatment, dense-media separation.',
    utilization: 0.79,
    strip: 4.2,
    yieldPct: 0.052,
    grade: 1.45,
    recovery: 0.91,
    recycleBase: 71,
    tailBase: 66,
    energyIntensity: 0.019,
  },
  {
    code: 'MFC',
    name: 'Mufulira Cobalt-Nickel',
    mineral: 'cobalt',
    region: 'Copperbelt, Zambia',
    mineType: 'underground',
    capacityTpd: 9000,
    lat: -12.54,
    lon: 28.24,
    openedDate: '2008-09-01',
    description:
      'Underground sub-level caving feeding a mixed sulphide concentrator producing cobalt and nickel concentrates.',
    utilization: 0.76,
    strip: 0.55,
    yieldPct: 0.035,
    grade: 0.42,
    recovery: 0.87,
    recycleBase: 61,
    tailBase: 71,
    energyIntensity: 0.032,
  },
  {
    code: 'BAL',
    name: 'Balama Graphite',
    mineral: 'graphite',
    region: 'Cabo Delgado, Mozambique',
    mineType: 'open-pit',
    capacityTpd: 6000,
    lat: -13.33,
    lon: 38.61,
    openedDate: '2017-03-20',
    description:
      'Open-pit flake graphite deposit with ore sorting, flotation and thermal treatment circuits producing battery-grade concentrate.',
    utilization: 0.74,
    strip: 2.6,
    yieldPct: 0.085,
    grade: 12.4,
    recovery: 0.9,
    recycleBase: 69,
    tailBase: 63,
    energyIntensity: 0.016,
  },
  {
    code: 'MWE',
    name: 'Mount Weld North',
    mineral: 'rare-earth',
    region: 'Western Australia',
    mineType: 'open-pit',
    capacityTpd: 5000,
    lat: -29.71,
    lon: 122.31,
    openedDate: '2011-11-05',
    description:
      'Lateritic rare-earth open pit with high-intensity scrubbing and flotation producing a rare-earth concentrate (Nd-Pr rich).',
    utilization: 0.77,
    strip: 3.4,
    yieldPct: 0.02,
    grade: 8.4,
    recovery: 0.84,
    recycleBase: 74,
    tailBase: 79,
    energyIntensity: 0.021,
  },
]

/* ------------------------------------------------------- fleet template */
interface FleetUnit {
  type: EquipmentType
  suffix: string
  name: string
  manufacturer: string
  model: string
  capacity: number | null
  fuelPerHour: number
}
const FLEET: FleetUnit[] = [
  { type: 'drill', suffix: 'DRL', name: 'Production Drill', manufacturer: 'Atlas Copco', model: 'ROC D9', capacity: null, fuelPerHour: 28 },
  { type: 'excavator', suffix: 'EXC', name: 'Hydraulic Shovel', manufacturer: 'Hitachi', model: 'ZX1200', capacity: 7, fuelPerHour: 95 },
  { type: 'excavator', suffix: 'EXC', name: 'Hydraulic Shovel', manufacturer: 'Komatsu', model: 'PC2000', capacity: 14, fuelPerHour: 120 },
  { type: 'haul-truck', suffix: 'HLT', name: 'Haul Truck', manufacturer: 'Caterpillar', model: '793F', capacity: 226, fuelPerHour: 310 },
  { type: 'haul-truck', suffix: 'HLT', name: 'Haul Truck', manufacturer: 'Caterpillar', model: '793F', capacity: 226, fuelPerHour: 310 },
  { type: 'haul-truck', suffix: 'HLT', name: 'Haul Truck', manufacturer: 'Komatsu', model: 'HD785', capacity: 213, fuelPerHour: 285 },
  { type: 'loader', suffix: 'LDR', name: 'Wheel Loader', manufacturer: 'Caterpillar', model: '992K', capacity: 12, fuelPerHour: 70 },
  { type: 'crusher', suffix: 'CRS', name: 'Primary Crusher', manufacturer: 'Metso', model: 'C160', capacity: 1800, fuelPerHour: 90 },
  { type: 'concentrator', suffix: 'CCT', name: 'Concentrator Line', manufacturer: 'FLSmidth', model: 'DualOK', capacity: 2600, fuelPerHour: 140 },
  { type: 'dozer', suffix: 'DZR', name: 'Dozer', manufacturer: 'Caterpillar', model: 'D11T', capacity: null, fuelPerHour: 42 },
]

const DOWNTIME_REASONS: readonly (readonly [string, number])[] = [
  ['Mechanical failure', 17],
  ['Electrical fault', 10],
  ['Tyre change', 12],
  ['Scheduled maintenance', 20],
  ['No operator available', 8],
  ['Blasting clearance', 15],
  ['Weather', 8],
  ['Ore body constraint', 10],
]

const REPORTERS = [
  'A. Mokoena',
  'J. Silva',
  'R. Patel',
  'M. Chen',
  'K. Nkosi',
  'T. Haugen',
  'L. Okafor',
  'D. Reyes',
] as const

const INCIDENT_TEMPLATES: Record<string, readonly string[]> = {
  injury: [
    'Strain while coupling discharge hoses on the pump station',
    'Hand injury during cutter-head maintenance',
    'Slip on walkway at the screening plant',
    'Back strain lifting tooling in the workshop bay',
  ],
  'near-miss': [
    'Haul truck entered blast exclusion zone before all-clear',
    'Fall of ground on stope access (no injury)',
    'Light vehicle crossed ramp below loaded truck',
    'Conveyor restart without audible warning',
  ],
  spill: [
    'Hydraulic oil spill from excavator boom cylinder',
    'Diesel top-up overflow at the fuel farm',
    'Reagent spill at the dosing skid',
  ],
  environmental: [
    'Dust exceedance recorded at ROM pad boundary monitor',
    'Sediment plume observed after storm event',
    'Noise complaint from community monitoring station',
  ],
  vehicle: [
    'Low-speed collision between light vehicle and service truck',
    'Haul truck underride with ramp batter (no injury)',
    'Loader struck handrail in workshop apron',
  ],
}

const DESTINATIONS = ['Shanghai', 'Rotterdam', 'Busan', 'Antwerp', 'Yokohama', 'Hamburg', 'Singapore'] as const
const CUSTOMERS: Record<string, readonly string[]> = {
  lithium: ['Ganfeng Lithium', 'HanKook Materials', 'SQM Trading'],
  cobalt: ['Umicore NV', 'POSCO Future M', 'EcoPro Co'],
  nickel: ['Sumitomo Metal', 'EcoPro Co'],
  graphite: ['Grafit Werke', 'Anode Materials K.K.'],
  'rare-earth': ['Lynas Feed Co', 'Shin-Etsu Materials'],
}
const PRICES: Record<string, number> = {
  lithium: 7200,
  cobalt: 6100,
  nickel: 4800,
  graphite: 850,
  'rare-earth': 12500,
}
const STOCK_GRADE: Record<string, number> = {
  lithium: 5.9,
  cobalt: 26.4,
  nickel: 11.8,
  graphite: 96.5,
  'rare-earth': 55.2,
}

/* -------------------------------------------------------------- helpers */
function insertBatch(
  table: string,
  cols: readonly string[],
  rows: readonly (readonly unknown[])[],
  chunkSize = 300,
): void {
  if (rows.length === 0) return
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  const stmt = getSQLite().prepare(sql)
  const tx = getSQLite().transaction((batch: readonly (readonly unknown[])[]) => {
    for (const r of batch) stmt.run(...(r as never[]))
  })
  for (let i = 0; i < rows.length; i += chunkSize) tx(rows.slice(i, i + chunkSize))
}

/** Remove every row (children first) — used by seed and reset. */
export function clearAllData(): void {
  const sqlite = getSQLite()
  sqlite.exec(`
    DELETE FROM import_batches;
    DELETE FROM alert_rules;
    DELETE FROM shipments;
    DELETE FROM stockpiles;
    DELETE FROM env_readings;
    DELETE FROM safety_incidents;
    DELETE FROM equipment_events;
    DELETE FROM production_daily;
    DELETE FROM equipment;
    DELETE FROM sites;
  `)
}

/** Empty database with schema intact. */
export function runReset(): void {
  clearAllData()
}

export interface SeedStats {
  sites: number
  equipment: number
  productionDays: number
  eventRows: number
  envRows: number
  incidents: number
  stockpiles: number
  shipments: number
  alertRules: number
}

/** Full demo dataset: 4 sites × 12 months + fleet, incidents, env, shipments. */
export function runSeed(): SeedStats {
  clearAllData()
  const today = new Date()

  /* sites */
  insertBatch(
    'sites',
    ['code', 'name', 'mineral', 'region', 'mine_type', 'status', 'capacity_tpd', 'lat', 'lon', 'opened_date', 'description'],
    SITE_PROFILES.map((p) => [
      p.code,
      p.name,
      p.mineral,
      p.region,
      p.mineType,
      'active',
      p.capacityTpd,
      p.lat,
      p.lon,
      p.openedDate,
      p.description,
    ]),
  )
  const siteId = new Map<string, number>()
  for (const r of getSQLite().prepare('SELECT id, code FROM sites').all() as { id: number; code: string }[]) {
    siteId.set(r.code, r.id)
  }
  const idOf = (code: string) => {
    const id = siteId.get(code)
    if (id === undefined) throw new Error(`seed: unknown site code ${code}`)
    return id
  }

  /* equipment */
  const equipRows: unknown[][] = []
  const equipMeta: { id: number; siteCode: string; unit: FleetUnit }[] = []
  const counters = new Map<string, number>()
  for (const p of SITE_PROFILES) {
    for (const unit of FLEET) {
      const n = (counters.get(p.code + unit.suffix) ?? 0) + 1
      counters.set(p.code + unit.suffix, n)
      const code = `${p.code}-${unit.suffix}-${String(n).padStart(2, '0')}`
      const status = wpick([
        ['operational', 78],
        ['standby', 9],
        ['maintenance', 9],
        ['down', 4],
      ])
      equipRows.push([
        idOf(p.code),
        code,
        `${unit.name} ${n}`,
        unit.type,
        status,
        unit.manufacturer,
        unit.model,
        unit.capacity,
        format(subDays(today, rint(400, 3200)), 'yyyy-MM-dd'),
      ])
    }
  }
  insertBatch(
    'equipment',
    ['site_id', 'code', 'name', 'type', 'status', 'manufacturer', 'model', 'capacity', 'installed_date'],
    equipRows,
  )
  for (const row of getSQLite()
    .prepare('SELECT e.id, e.code, s.code AS site_code FROM equipment e JOIN sites s ON s.id = e.site_id')
    .all() as { id: number; code: string; site_code: string }[]) {
    const suffix = row.code.split('-')[1]
    const unit = FLEET.find((f) => f.suffix === suffix)!
    equipMeta.push({ id: row.id, siteCode: row.site_code, unit })
  }

  /* production (365 days) + environment share the same ore numbers */
  const prodRows: unknown[][] = []
  const envRows: unknown[][] = []
  const dayCount = 365
  const oreBySiteDay = new Map<string, number>()

  for (const p of SITE_PROFILES) {
    const sid = idOf(p.code)
    for (let i = dayCount - 1; i >= 0; i--) {
      const date = subDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dow = date.getDay()
      const weekFactor = dow === 0 ? 0.88 : dow === 6 ? 0.9 : 1
      const monthFactor = 1 + 0.05 * Math.sin((i / 30.4) * Math.PI * 2)
      const noise = 1 + (rnd() - 0.5) * 0.14
      let ore = p.capacityTpd * p.utilization * weekFactor * monthFactor * noise
      if (i % 97 < 4) ore *= 0.35 // planned annual shutdown — visible dip in trends
      const waste = ore * p.strip * (0.92 + rnd() * 0.16)
      const conc = ore * p.yieldPct * (0.95 + rnd() * 0.1)
      const grade = p.grade * (0.93 + rnd() * 0.14)
      let recovery = p.recovery * (0.985 + rnd() * 0.03)
      if (rnd() < 0.06) recovery *= 0.78 + rnd() * 0.1 // circuit upsets / low-grade ore
      const throughput = ore * (0.9 + rnd() * 0.12)
      oreBySiteDay.set(`${sid}:${dateStr}`, ore)

      prodRows.push([
        sid,
        dateStr,
        Math.round(ore),
        Math.round(waste),
        Math.round(conc),
        r2(grade),
        r2(recovery * 100),
        Math.round(throughput),
      ])

      /* env reading for the same day (tailings level is written in the walk below) */
      const energy = ore * p.energyIntensity * (0.95 + rnd() * 0.1)
      const co2e = energy * 0.38 + ore * 0.0015
      const recycle = Math.max(
        40,
        Math.min(95, p.recycleBase + (dayCount - i) * 0.014 + (rnd() - 0.5) * 4),
      )
      envRows.push([
        sid,
        dateStr,
        Math.round(ore * (p.mineType === 'brine' ? 0.72 : 0.42) * (0.9 + rnd() * 0.2)),
        r2(recycle),
        r2(energy),
        r2(co2e),
        0, // tailings_level_pct — filled in by the level walk below
      ])
    }
  }
  insertBatch(
    'production_daily',
    ['site_id', 'date', 'ore_tonnes', 'waste_tonnes', 'concentrate_tonnes', 'head_grade_pct', 'recovery_pct', 'throughput_tpd'],
    prodRows,
  )

  /* tailings/pond level: slow rise + periodic drawdown (writes into envRows) */
  for (const p of SITE_PROFILES) {
    const sid = idOf(p.code)
    const slice = envRows.filter((r) => r[0] === sid)
    let level = p.tailBase + rrange(-2, 2)
    const minLevel = p.code === 'MWE' ? 76 : 55
    for (let i = 0; i < slice.length; i++) {
      const drift = p.mineType === 'brine' ? 0.1 : 0.17
      level += drift + (rnd() - 0.5) * 0.5
      if (level > (p.code === 'MWE' ? 88 : 85)) level = minLevel + rnd() * 2
      level = Math.max(45, Math.min(90, level))
      slice[i][6] = r2(level)
    }
  }
  insertBatch(
    'env_readings',
    ['site_id', 'date', 'water_withdrawal_m3', 'water_recycled_pct', 'energy_mwh', 'co2e_tonnes', 'tailings_level_pct'],
    envRows,
  )

  /* equipment events (180 days) */
  const eventRows: unknown[][] = []
  for (const m of equipMeta) {
    for (let i = 0; i < 180; i++) {
      const dateStr = format(subDays(today, i), 'yyyy-MM-dd')
      let running: number
      const roll = rnd()
      if (roll < 0.1) running = 6 + rnd() * 7 // breakdown day
      else if (roll < 0.24) running = 15 + rnd() * 3 // maintenance
      else running = 20 + rnd() * 3.5 // normal shift pattern
      const downtime = Math.max(0, 24 - running)
      const reason =
        downtime > 6
          ? wpick(DOWNTIME_REASONS)
          : downtime > 2
            ? (['Scheduled maintenance', 'Tyre change', 'Blasting clearance', 'Mechanical failure'] as const)[rint(0, 3)]
            : null
      const fuel = running * m.unit.fuelPerHour * (0.9 + rnd() * 0.2)
      eventRows.push([m.id, dateStr, r2(running), r2(downtime), reason, Math.round(fuel)])
    }
  }
  insertBatch(
    'equipment_events',
    ['equipment_id', 'date', 'running_hours', 'downtime_hours', 'downtime_reason', 'fuel_litres'],
    eventRows,
  )

  /* safety incidents */
  const incidentRows: unknown[][] = []
  let incidentCount = 0
  for (const p of SITE_PROFILES) {
    const sid = idOf(p.code)
    const n = rint(14, 26)
    for (let k = 0; k < n; k++) {
      const daysAgo = rint(0, 364)
      const dateStr = format(subDays(today, daysAgo), 'yyyy-MM-dd')
      const type = wpick([
        ['near-miss', 44],
        ['injury', 24],
        ['vehicle', 15],
        ['spill', 9],
        ['environmental', 8],
      ])
      const severity =
        type === 'injury'
          ? wpick([['low', 25], ['medium', 45], ['high', 25], ['critical', 5]])
          : type === 'near-miss'
            ? wpick([['low', 55], ['medium', 33], ['high', 10], ['critical', 2]])
            : type === 'vehicle'
              ? wpick([['low', 20], ['medium', 40], ['high', 30], ['critical', 10]])
              : wpick([['low', 30], ['medium', 45], ['high', 20], ['critical', 5]])
      const lost =
        type === 'injury' ? (rnd() < 0.55 ? rint(1, 10) : 0) : type === 'vehicle' && rnd() < 0.2 ? rint(1, 4) : 0
      const status = daysAgo > 60 ? 'closed' : rnd() < (daysAgo > 20 ? 0.8 : 0.35) ? 'closed' : 'open'
      incidentRows.push([
        sid,
        dateStr,
        type,
        severity,
        pick(INCIDENT_TEMPLATES[type]),
        lost,
        pick(REPORTERS),
        status,
        `${dateStr}T${String(rint(6, 18)).padStart(2, '0')}:00:00`,
      ])
      incidentCount++
    }
  }
  insertBatch(
    'safety_incidents',
    ['site_id', 'date', 'type', 'severity', 'description', 'lost_time_days', 'reported_by', 'status', 'created_at'],
    incidentRows,
  )

  /* stockpiles */
  const stockRows: unknown[][] = []
  for (const p of SITE_PROFILES) {
    const products = p.code === 'MFC' ? ['cobalt', 'nickel'] : [p.mineral]
    for (const product of products) {
      stockRows.push([
        idOf(p.code),
        product,
        STOCK_GRADE[product],
        Math.round(p.capacityTpd * rrange(18, 55)),
        format(subDays(today, rint(0, 8)), 'yyyy-MM-dd'),
      ])
    }
  }
  insertBatch('stockpiles', ['site_id', 'product', 'grade_pct', 'tonnes', 'updated_at'], stockRows)

  /* shipments (12 months) */
  const shipRows: unknown[][] = []
  const siteForShipment = () => wpick(SITE_PROFILES.map((p) => [p, p.capacityTpd] as const))
  for (let k = 0; k < 260; k++) {
    const p = siteForShipment()
    const products = p.code === 'MFC' ? ['cobalt', 'nickel'] : [p.mineral]
    const product = pick(products)
    const tonnes =
      product === 'graphite' ? rint(2000, 9000) : product === 'rare-earth' ? rint(800, 4200) : rint(3000, 18000)
    const price = Math.round(PRICES[product] * (0.85 + rnd() * 0.3))
    const bucket = rnd()
    let status: string
    let shippedDate: string | null
    let eta: string
    if (bucket < 0.6) {
      status = 'delivered'
      const shipAgo = rint(35, 330)
      shippedDate = format(subDays(today, shipAgo), 'yyyy-MM-dd')
      eta = format(subDays(today, shipAgo - rint(18, 45)), 'yyyy-MM-dd')
    } else if (bucket < 0.75) {
      status = 'in-transit'
      const shipAgo = rint(3, 16)
      shippedDate = format(subDays(today, shipAgo), 'yyyy-MM-dd')
      eta = format(subDays(today, -rint(4, 26)), 'yyyy-MM-dd')
    } else if (bucket < 0.85) {
      status = 'delayed'
      shippedDate = format(subDays(today, rint(1, 22)), 'yyyy-MM-dd')
      eta = format(subDays(today, -rint(20, 45)), 'yyyy-MM-dd')
    } else {
      status = 'planned'
      shippedDate = null
      eta = format(subDays(today, -rint(6, 60)), 'yyyy-MM-dd')
    }
    shipRows.push([
      idOf(p.code),
      product,
      tonnes,
      pick(DESTINATIONS),
      pick(CUSTOMERS[product] ?? ['Generic Trading Co']),
      status,
      eta,
      shippedDate,
      price,
    ])
  }
  insertBatch(
    'shipments',
    ['site_id', 'product', 'tonnes', 'destination', 'customer', 'status', 'eta', 'shipped_date', 'price_usd_per_t'],
    shipRows,
  )

  /* default alert rules (global scope) */
  const nowIso = `${format(today, 'yyyy-MM-dd')}T09:00:00`
  insertBatch(
    'alert_rules',
    ['name', 'metric', 'comparator', 'threshold', 'severity', 'site_id', 'active', 'created_at'],
    [
      ['Recovery below plan', 'recovery_pct', '<', 72, 'high', null, 1, nowIso],
      ['Fleet availability low', 'availability_pct', '<', 85, 'medium', null, 1, nowIso],
      ['Tailings dam level high', 'tailings_level_pct', '>=', 80, 'critical', null, 1, nowIso],
      ['Water recycling below target', 'water_recycled_pct', '<', 65, 'medium', null, 1, nowIso],
      ['Carbon intensity high', 'co2e_intensity', '>', 10, 'low', null, 1, nowIso],
    ],
  )

  return {
    sites: SITE_PROFILES.length,
    equipment: equipRows.length,
    productionDays: prodRows.length,
    eventRows: eventRows.length,
    envRows: envRows.length,
    incidents: incidentCount,
    stockpiles: stockRows.length,
    shipments: shipRows.length,
    alertRules: 5,
  }
}
