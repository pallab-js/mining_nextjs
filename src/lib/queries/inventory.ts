/** Stockpiles & shipments — inventory levels, shipment pipeline, value. */
import 'server-only'
import { connection, all, n, where } from './sql'
import type { Filter } from '../filter'

export interface StockpileRow {
  id: number
  site: string
  siteId: number
  product: string
  gradePct: number
  tonnes: number
  updatedAt: string
}

export async function listStockpiles(f: Filter): Promise<StockpileRow[]> {
  await connection()
  const siteClause = f.siteId !== null ? 'WHERE sp.site_id = ?' : ''
  return all<StockpileRow>(
    `SELECT sp.id, s.code AS site, s.id AS siteId, sp.product,
            sp.grade_pct AS gradePct, sp.tonnes, sp.updated_at AS updatedAt
       FROM stockpiles sp
       JOIN sites s ON s.id = sp.site_id
       ${siteClause}
      ORDER BY sp.tonnes DESC`,
    f.siteId !== null ? [f.siteId] : [],
  )
}

export interface ProductStock {
  product: string
  tonnes: number
}

export async function getStockpileByProduct(f: Filter): Promise<ProductStock[]> {
  await connection()
  const siteClause = f.siteId !== null ? 'WHERE site_id = ?' : ''
  return all<ProductStock>(
    `SELECT product, SUM(tonnes) AS tonnes
       FROM stockpiles
       ${siteClause}
      GROUP BY product
      ORDER BY tonnes DESC`,
    f.siteId !== null ? [f.siteId] : [],
  )
}

export interface ShipmentKpis {
  planned: number
  inTransit: number
  delivered: number
  delayed: number
  tonnesInTransit: number
  tonnesPlanned: number
  /** realised value of delivered shipments in window (tonnes × price) */
  deliveredValue: number
}

export async function getShipmentKpis(f: Filter): Promise<ShipmentKpis> {
  await connection()
  const w = where(f, { site: 'sh.site_id', date: "COALESCE(sh.shipped_date, sh.eta)" })
  const rows = all<{ status: string; count: number; tonnes: number; value: number }>(
    `SELECT sh.status,
            COUNT(*) AS count,
            COALESCE(SUM(sh.tonnes), 0) AS tonnes,
            COALESCE(SUM(CASE WHEN sh.status = 'delivered' THEN sh.tonnes * sh.price_usd_per_t ELSE 0 END), 0) AS value
       FROM shipments sh
      WHERE ${w.clause}
      GROUP BY sh.status`,
    w.params,
  )
  const by = (s: string) => rows.find((x) => x.status === s)
  return {
    planned: n(by('planned')?.count),
    inTransit: n(by('in-transit')?.count),
    delivered: n(by('delivered')?.count),
    delayed: n(by('delayed')?.count),
    tonnesInTransit: n(by('in-transit')?.tonnes),
    tonnesPlanned: n(by('planned')?.tonnes),
    deliveredValue: n(by('delivered')?.value),
  }
}

export interface ShipmentRow {
  id: number
  site: string
  siteId: number
  product: string
  tonnes: number
  destination: string
  customer: string
  status: string
  eta: string | null
  shippedDate: string | null
  priceUsdPerT: number
}

export async function listShipments(f: Filter, limit = 60): Promise<ShipmentRow[]> {
  await connection()
  const w = where(f, { site: 'sh.site_id', date: "COALESCE(sh.shipped_date, sh.eta)" })
  return all<ShipmentRow>(
    `SELECT sh.id, s.code AS site, s.id AS siteId, sh.product, sh.tonnes,
            sh.destination, sh.customer, sh.status, sh.eta,
            sh.shipped_date AS shippedDate, sh.price_usd_per_t AS priceUsdPerT
       FROM shipments sh
       JOIN sites s ON s.id = sh.site_id
      WHERE ${w.clause}
      ORDER BY COALESCE(sh.eta, sh.shipped_date, '') DESC, sh.id DESC
      LIMIT ?`,
    [...w.params, limit],
  )
}
