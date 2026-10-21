/**
 * Idempotent DDL — SINGLE SOURCE OF TRUTH for the physical schema.
 * Executed on every connection open (cheap: each statement is IF NOT EXISTS).
 * `schema.ts` mirrors these tables for typed queries; if you change a table,
 * change BOTH files (the table name is the join key).
 */

export const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS sites (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     code           TEXT NOT NULL UNIQUE,
     name           TEXT NOT NULL,
     mineral        TEXT NOT NULL,
     region         TEXT NOT NULL,
     mine_type      TEXT NOT NULL,
     status         TEXT NOT NULL DEFAULT 'active',
     capacity_tpd   REAL NOT NULL,
     lat            REAL,
     lon            REAL,
     opened_date    TEXT,
     description    TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS equipment (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     site_id        INTEGER NOT NULL REFERENCES sites(id),
     code           TEXT NOT NULL UNIQUE,
     name           TEXT NOT NULL,
     type           TEXT NOT NULL,
     status         TEXT NOT NULL DEFAULT 'operational',
     manufacturer   TEXT,
     model          TEXT,
     capacity       REAL,
     installed_date TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS equipment_site_idx ON equipment(site_id)`,
  `CREATE TABLE IF NOT EXISTS production_daily (
     id                  INTEGER PRIMARY KEY AUTOINCREMENT,
     site_id             INTEGER NOT NULL REFERENCES sites(id),
     date                TEXT NOT NULL,
     ore_tonnes          REAL NOT NULL,
     waste_tonnes        REAL NOT NULL,
     concentrate_tonnes  REAL NOT NULL,
     head_grade_pct      REAL NOT NULL,
     recovery_pct        REAL NOT NULL,
     throughput_tpd      REAL NOT NULL,
     UNIQUE (site_id, date)
   )`,
  `CREATE INDEX IF NOT EXISTS production_date_idx ON production_daily(date)`,
  `CREATE INDEX IF NOT EXISTS production_site_idx ON production_daily(site_id)`,
  `CREATE TABLE IF NOT EXISTS equipment_events (
     id              INTEGER PRIMARY KEY AUTOINCREMENT,
     equipment_id    INTEGER NOT NULL REFERENCES equipment(id),
     date            TEXT NOT NULL,
     running_hours   REAL NOT NULL,
     downtime_hours  REAL NOT NULL,
     downtime_reason TEXT,
     fuel_litres     REAL,
     UNIQUE (equipment_id, date)
   )`,
  `CREATE INDEX IF NOT EXISTS events_date_idx ON equipment_events(date)`,
  `CREATE INDEX IF NOT EXISTS events_unit_idx ON equipment_events(equipment_id)`,
  `CREATE TABLE IF NOT EXISTS safety_incidents (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     site_id        INTEGER NOT NULL REFERENCES sites(id),
     date           TEXT NOT NULL,
     type           TEXT NOT NULL,
     severity       TEXT NOT NULL,
     description    TEXT NOT NULL,
     lost_time_days INTEGER NOT NULL DEFAULT 0,
     reported_by    TEXT,
     status         TEXT NOT NULL DEFAULT 'open',
     created_at     TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS safety_site_date_idx ON safety_incidents(site_id, date)`,
  `CREATE INDEX IF NOT EXISTS safety_date_idx ON safety_incidents(date)`,
  `CREATE TABLE IF NOT EXISTS env_readings (
     id                  INTEGER PRIMARY KEY AUTOINCREMENT,
     site_id             INTEGER NOT NULL REFERENCES sites(id),
     date                TEXT NOT NULL,
     water_withdrawal_m3 REAL NOT NULL,
     water_recycled_pct  REAL NOT NULL,
     energy_mwh          REAL NOT NULL,
     co2e_tonnes         REAL NOT NULL,
     tailings_level_pct  REAL NOT NULL,
     UNIQUE (site_id, date)
   )`,
  `CREATE INDEX IF NOT EXISTS env_date_idx ON env_readings(date)`,
  `CREATE INDEX IF NOT EXISTS env_site_idx ON env_readings(site_id)`,
  `CREATE TABLE IF NOT EXISTS stockpiles (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     site_id    INTEGER NOT NULL REFERENCES sites(id),
     product    TEXT NOT NULL,
     grade_pct  REAL NOT NULL,
     tonnes     REAL NOT NULL,
     updated_at TEXT NOT NULL,
     UNIQUE (site_id, product)
   )`,
  `CREATE TABLE IF NOT EXISTS shipments (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     site_id        INTEGER NOT NULL REFERENCES sites(id),
     product        TEXT NOT NULL,
     tonnes         REAL NOT NULL,
     destination    TEXT NOT NULL,
     customer       TEXT NOT NULL,
     status         TEXT NOT NULL DEFAULT 'planned',
     eta            TEXT,
     shipped_date   TEXT,
     price_usd_per_t REAL NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS shipments_site_idx ON shipments(site_id)`,
  `CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments(status)`,
  `CREATE TABLE IF NOT EXISTS alert_rules (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     name       TEXT NOT NULL,
     metric     TEXT NOT NULL,
     comparator TEXT NOT NULL,
     threshold  REAL NOT NULL,
     severity   TEXT NOT NULL DEFAULT 'medium',
     site_id    INTEGER REFERENCES sites(id),
     active     INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS alert_rules_active_idx ON alert_rules(active)`,
  `CREATE TABLE IF NOT EXISTS import_batches (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     entity      TEXT NOT NULL,
     filename    TEXT NOT NULL,
     rows_ok     INTEGER NOT NULL,
     rows_failed INTEGER NOT NULL,
     errors_json TEXT NOT NULL,
     created_at  TEXT NOT NULL
   )`,
]
