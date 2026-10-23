/**
 * Drizzle schema — typed view over the tables created by `migrations.ts`.
 * The DDL in migrations.ts is the single source of truth; keep both in sync
 * (comment convention: table name appears verbatim in both files).
 */
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const sites = sqliteTable(
  'sites',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    mineral: text('mineral').notNull(),
    region: text('region').notNull(),
    mineType: text('mine_type').notNull(),
    status: text('status').notNull().default('active'),
    capacityTpd: real('capacity_tpd').notNull(),
    lat: real('lat'),
    lon: real('lon'),
    openedDate: text('opened_date'),
    description: text('description'),
  },
  (t) => [uniqueIndex('sites_code_uq').on(t.code)],
)

export const equipment = sqliteTable(
  'equipment',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull().default('operational'),
    manufacturer: text('manufacturer'),
    model: text('model'),
    capacity: real('capacity'),
    installedDate: text('installed_date'),
  },
  (t) => [uniqueIndex('equipment_code_uq').on(t.code), index('equipment_site_idx').on(t.siteId)],
)

export const productionDaily = sqliteTable(
  'production_daily',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    date: text('date').notNull(),
    oreTonnes: real('ore_tonnes').notNull(),
    wasteTonnes: real('waste_tonnes').notNull(),
    concentrateTonnes: real('concentrate_tonnes').notNull(),
    headGradePct: real('head_grade_pct').notNull(),
    recoveryPct: real('recovery_pct').notNull(),
    throughputTpd: real('throughput_tpd').notNull(),
  },
  (t) => [
    uniqueIndex('production_site_date_uq').on(t.siteId, t.date),
    index('production_date_idx').on(t.date),
    index('production_site_idx').on(t.siteId),
  ],
)

export const equipmentEvents = sqliteTable(
  'equipment_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    equipmentId: integer('equipment_id')
      .notNull()
      .references(() => equipment.id),
    date: text('date').notNull(),
    runningHours: real('running_hours').notNull(),
    downtimeHours: real('downtime_hours').notNull(),
    downtimeReason: text('downtime_reason'),
    fuelLitres: real('fuel_litres'),
  },
  (t) => [
    uniqueIndex('events_unit_date_uq').on(t.equipmentId, t.date),
    index('events_date_idx').on(t.date),
    index('events_unit_idx').on(t.equipmentId),
  ],
)

export const safetyIncidents = sqliteTable(
  'safety_incidents',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    date: text('date').notNull(),
    type: text('type').notNull(),
    severity: text('severity').notNull(),
    description: text('description').notNull(),
    lostTimeDays: integer('lost_time_days').notNull().default(0),
    reportedBy: text('reported_by'),
    status: text('status').notNull().default('open'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('safety_site_date_idx').on(t.siteId, t.date), index('safety_date_idx').on(t.date)],
)

export const envReadings = sqliteTable(
  'env_readings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    date: text('date').notNull(),
    waterWithdrawalM3: real('water_withdrawal_m3').notNull(),
    waterRecycledPct: real('water_recycled_pct').notNull(),
    energyMwh: real('energy_mwh').notNull(),
    co2eTonnes: real('co2e_tonnes').notNull(),
    tailingsLevelPct: real('tailings_level_pct').notNull(),
  },
  (t) => [
    uniqueIndex('env_site_date_uq').on(t.siteId, t.date),
    index('env_date_idx').on(t.date),
    index('env_site_idx').on(t.siteId),
  ],
)

export const stockpiles = sqliteTable(
  'stockpiles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    product: text('product').notNull(),
    gradePct: real('grade_pct').notNull(),
    tonnes: real('tonnes').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('stockpile_site_product_uq').on(t.siteId, t.product)],
)

export const shipments = sqliteTable(
  'shipments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    product: text('product').notNull(),
    tonnes: real('tonnes').notNull(),
    destination: text('destination').notNull(),
    customer: text('customer').notNull(),
    status: text('status').notNull().default('planned'),
    eta: text('eta'),
    shippedDate: text('shipped_date'),
    priceUsdPerT: real('price_usd_per_t').notNull(),
  },
  (t) => [index('shipments_site_idx').on(t.siteId), index('shipments_status_idx').on(t.status)],
)

export const alertRules = sqliteTable(
  'alert_rules',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    metric: text('metric').notNull(),
    comparator: text('comparator').notNull(),
    threshold: real('threshold').notNull(),
    severity: text('severity').notNull().default('medium'),
    siteId: integer('site_id').references(() => sites.id),
    active: integer('active').notNull().default(1),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('alert_rules_active_idx').on(t.active)],
)

export const importBatches = sqliteTable('import_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),
  filename: text('filename').notNull(),
  rowsOk: integer('rows_ok').notNull(),
  rowsFailed: integer('rows_failed').notNull(),
  errorsJson: text('errors_json').notNull(),
  createdAt: text('created_at').notNull(),
})

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  detail: text('detail'),
  createdAt: text('created_at').notNull(),
})


/* Inferred types ---------------------------------------------------------- */
export type Site = typeof sites.$inferSelect
export type NewSite = typeof sites.$inferInsert
export type Equipment = typeof equipment.$inferSelect
export type NewEquipment = typeof equipment.$inferInsert
export type ProductionRow = typeof productionDaily.$inferSelect
export type NewProductionRow = typeof productionDaily.$inferInsert
export type EquipmentEvent = typeof equipmentEvents.$inferSelect
export type NewEquipmentEvent = typeof equipmentEvents.$inferInsert
export type SafetyIncident = typeof safetyIncidents.$inferSelect
export type NewSafetyIncident = typeof safetyIncidents.$inferInsert
export type EnvReading = typeof envReadings.$inferSelect
export type NewEnvReading = typeof envReadings.$inferInsert
export type Stockpile = typeof stockpiles.$inferSelect
export type NewStockpile = typeof stockpiles.$inferInsert
export type Shipment = typeof shipments.$inferSelect
export type NewShipment = typeof shipments.$inferInsert
export type AlertRule = typeof alertRules.$inferSelect
export type NewAlertRule = typeof alertRules.$inferInsert
export type ImportBatch = typeof importBatches.$inferSelect
